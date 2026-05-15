import type { ApplicationAutomationSettings, CompanyAutoSubmitPolicyMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AutoSubmitEligibility = {
  allowed: boolean;
  reasons: string[];
  effectiveAutoSubmitEnabled: boolean;
  override: boolean | null;
  companyPolicy: {
    company: string;
    mode: CompanyAutoSubmitPolicyMode;
  } | null;
  settings: Pick<
    ApplicationAutomationSettings,
    | "autoSubmitEnabled"
    | "requireApprovedPacket"
    | "requireNoOpenUserRequests"
    | "requireFreshAssistantRun"
    | "maxRunAgeMinutes"
    | "allowDemographicSubmission"
  >;
};

const defaultSettings = {
  autoSubmitEnabled: false,
  requireApprovedPacket: true,
  requireNoOpenUserRequests: true,
  requireFreshAssistantRun: true,
  maxRunAgeMinutes: 30,
  allowDemographicSubmission: false,
};

export async function getApplicationAutomationSettings(userId: string) {
  return prisma.applicationAutomationSettings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...defaultSettings,
    },
  });
}

export async function updateApplicationAutomationSettings(input: {
  userId: string;
  autoSubmitEnabled: boolean;
  requireApprovedPacket: boolean;
  requireNoOpenUserRequests: boolean;
  requireFreshAssistantRun: boolean;
  maxRunAgeMinutes: number;
  allowDemographicSubmission: boolean;
}) {
  return prisma.applicationAutomationSettings.upsert({
    where: { userId: input.userId },
    update: {
      autoSubmitEnabled: input.autoSubmitEnabled,
      requireApprovedPacket: input.requireApprovedPacket,
      requireNoOpenUserRequests: input.requireNoOpenUserRequests,
      requireFreshAssistantRun: input.requireFreshAssistantRun,
      maxRunAgeMinutes: clampInteger(input.maxRunAgeMinutes, 5, 240),
      allowDemographicSubmission: input.allowDemographicSubmission,
    },
    create: {
      userId: input.userId,
      autoSubmitEnabled: input.autoSubmitEnabled,
      requireApprovedPacket: input.requireApprovedPacket,
      requireNoOpenUserRequests: input.requireNoOpenUserRequests,
      requireFreshAssistantRun: input.requireFreshAssistantRun,
      maxRunAgeMinutes: clampInteger(input.maxRunAgeMinutes, 5, 240),
      allowDemographicSubmission: input.allowDemographicSubmission,
    },
  });
}

export async function evaluateAutoSubmitEligibility(applicationId: string): Promise<AutoSubmitEligibility> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      applicationPackets: { orderBy: { updatedAt: "desc" }, take: 1 },
      automationRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      coverLetter: true,
      jobPosting: true,
      resume: true,
      user: { include: { automationSettings: true } },
    },
  });
  if (!application) throw new Error("Application not found.");

  const settings = application.user.automationSettings ?? await getApplicationAutomationSettings(application.userId);
  const reasons: string[] = [];
  const packet = application.applicationPackets[0];
  const latestRun = application.automationRuns[0];
  const selectedAnswers = selectedAnswerCount(packet?.applicationAnswersJson);
  const companyPolicy = await findCompanyAutomationPolicy(application.userId, application.jobPosting.company);

  const effectiveAutoSubmitEnabled = application.autoSubmitOverride
    ?? (companyPolicy?.autoSubmitMode === "ALLOW" ? true : companyPolicy?.autoSubmitMode === "BLOCK" ? false : settings.autoSubmitEnabled);

  if (!effectiveAutoSubmitEnabled) {
    reasons.push(autoSubmitDisabledReason({
      applicationOverride: application.autoSubmitOverride,
      companyPolicyMode: companyPolicy?.autoSubmitMode ?? null,
    }));
  }
  if (application.status !== "ready_to_apply") reasons.push("Application is not in ready_to_apply status.");
  if (!application.jobPosting.applicationUrl) reasons.push("Job does not have an application URL.");
  if (!application.resume || !application.coverLetter) reasons.push("Generated resume and cover letter are required.");
  if (settings.requireApprovedPacket && packet?.status !== "APPROVED") reasons.push("Application packet must be approved.");
  if (settings.requireNoOpenUserRequests) {
    const openRequests = await prisma.agentUserRequest.count({
      where: {
        applicationId: application.id,
        status: "OPEN",
      },
    });
    if (openRequests > 0) reasons.push("Open agent questions must be resolved before submit.");
  }
  if (settings.requireFreshAssistantRun) {
    if (!latestRun) {
      reasons.push("A fresh assistant fill run is required before submit.");
    } else {
      const ageMinutes = (Date.now() - latestRun.startedAt.getTime()) / 60000;
      if (ageMinutes > settings.maxRunAgeMinutes) reasons.push(`Latest assistant run is older than ${settings.maxRunAgeMinutes} minutes.`);
      if (latestRun.status === "BLOCKED" || latestRun.status === "NEEDS_USER" || latestRun.status === "FAILED") {
        reasons.push("Latest assistant run is blocked, needs user input, or failed.");
      }
    }
  }
  if (!settings.allowDemographicSubmission && selectedAnswers > 0) {
    reasons.push("Selected custom application answers require manual review before submit.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    effectiveAutoSubmitEnabled,
    override: application.autoSubmitOverride,
    companyPolicy: companyPolicy
      ? {
          company: companyPolicy.company,
          mode: companyPolicy.autoSubmitMode,
        }
      : null,
    settings: {
      autoSubmitEnabled: settings.autoSubmitEnabled,
      requireApprovedPacket: settings.requireApprovedPacket,
      requireNoOpenUserRequests: settings.requireNoOpenUserRequests,
      requireFreshAssistantRun: settings.requireFreshAssistantRun,
      maxRunAgeMinutes: settings.maxRunAgeMinutes,
      allowDemographicSubmission: settings.allowDemographicSubmission,
    },
  };
}

export async function upsertCompanyAutomationPolicy(input: {
  userId: string;
  company: string;
  autoSubmitMode: CompanyAutoSubmitPolicyMode;
  notes?: string | null;
}) {
  const company = input.company.trim();
  const companyKey = companyAutomationKey(company);
  if (!companyKey) throw new Error("Company is required.");

  return prisma.companyAutomationPolicy.upsert({
    where: {
      userId_companyKey: {
        userId: input.userId,
        companyKey,
      },
    },
    create: {
      userId: input.userId,
      company,
      companyKey,
      autoSubmitMode: input.autoSubmitMode,
      notes: input.notes?.trim() || null,
    },
    update: {
      company,
      autoSubmitMode: input.autoSubmitMode,
      notes: input.notes?.trim() || null,
    },
  });
}

export function companyAutomationKey(company: string) {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function autoSubmitDisabledReason(input: {
  applicationOverride?: boolean | null;
  companyPolicyMode?: CompanyAutoSubmitPolicyMode | null;
}) {
  if (input.applicationOverride === false) return "Auto-submit is disabled for this application.";
  if (input.companyPolicyMode === "BLOCK") return "Auto-submit is blocked for this company.";
  return "Auto-submit is disabled in settings.";
}

async function findCompanyAutomationPolicy(userId: string, company: string) {
  const companyKey = companyAutomationKey(company);
  if (!companyKey) return null;
  return prisma.companyAutomationPolicy.findUnique({
    where: {
      userId_companyKey: {
        userId,
        companyKey,
      },
    },
  });
}

function selectedAnswerCount(value: Prisma.JsonValue | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const answers = (value as Record<string, unknown>).answers;
  if (!Array.isArray(answers)) return 0;
  return answers.filter((answer) => Boolean(answer && typeof answer === "object" && (answer as Record<string, unknown>).selected)).length;
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
