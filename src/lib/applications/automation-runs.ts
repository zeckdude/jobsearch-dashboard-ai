import type { ApplicationAutomationRunStatus, AtsProvider, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AssistantLogClassification = {
  status: ApplicationAutomationRunStatus;
  blockerType?: string | null;
  blockerMessage?: string | null;
};

const blockerPatterns: Array<{ type: string; pattern: RegExp; message: string }> = [
  { type: "closed_job", pattern: /closed|removed|unavailable|no form can be filled/i, message: "The application page appears closed, removed, or unavailable." },
  { type: "captcha", pattern: /captcha|human verification/i, message: "The application page requires CAPTCHA or human verification." },
  { type: "login_block", pattern: /sign-in blocked|complete login|login/i, message: "The application requires login or account access." },
  { type: "manual_handoff", pattern: /manual handling|normal browser|handing off/i, message: "The assistant handed this application off for manual browser handling." },
  { type: "no_fields", pattern: /No fillable application fields|No fillable.*found/i, message: "The assistant could not find fillable application fields." },
];

const safePatternCategories = new Set([
  "cover_letter",
  "email",
  "first_name",
  "full_name",
  "github_url",
  "last_name",
  "linkedin_url",
  "location",
  "phone",
  "portfolio_url",
  "resume",
]);

export async function createApplicationAutomationRun(input: {
  userId: string;
  applicationId: string;
  jobPostingId: string;
  currentUrl?: string | null;
  logPath?: string | null;
  pid?: number | null;
  actionsJson?: Prisma.InputJsonValue;
}) {
  return prisma.applicationAutomationRun.create({
    data: {
      userId: input.userId,
      applicationId: input.applicationId,
      jobPostingId: input.jobPostingId,
      currentUrl: input.currentUrl ?? null,
      logPath: input.logPath ?? null,
      pid: input.pid ?? null,
      actionsJson: input.actionsJson ?? [],
    },
  });
}

export async function updateApplicationAutomationRunFromLog(input: {
  applicationId: string;
  logPath: string;
  log: string;
}) {
  const run = await prisma.applicationAutomationRun.findFirst({
    where: {
      applicationId: input.applicationId,
      logPath: input.logPath,
    },
    include: {
      jobPosting: { select: { atsProvider: true, applicationUrl: true } },
    },
    orderBy: { startedAt: "desc" },
  });
  if (!run) return null;

  const classification = classifyAssistantLog(input.log);
  const finished = classification.status !== "RUNNING";
  await persistFormPatternsFromLog({
    userId: run.userId,
    atsProvider: run.jobPosting.atsProvider,
    host: hostFromUrl(run.currentUrl ?? run.jobPosting.applicationUrl),
    log: input.log,
    success: classification.status === "READY_TO_SUBMIT" || classification.status === "SUBMITTED",
  });

  const actions = assistantLogActions(input.log);
  const screenshots = assistantLogScreenshots(input.log);
  const updatedRun = await prisma.applicationAutomationRun.update({
    where: { id: run.id },
    data: {
      status: classification.status,
      blockerType: classification.blockerType ?? null,
      blockerMessage: classification.blockerMessage ?? null,
      finishedAt: finished ? run.finishedAt ?? new Date() : null,
      actionsJson: actions as Prisma.InputJsonValue,
      screenshotsJson: screenshots as Prisma.InputJsonValue,
    },
  });

  if (run.status !== classification.status && classification.status !== "RUNNING") {
    await prisma.applicationEvent.create({
      data: {
        applicationId: run.applicationId,
        type: classification.status === "SUBMITTED" ? "applied" : "note_added",
        payload: buildAutomationRunEventPayload({
          automationRunId: run.id,
          status: classification.status,
          blockerType: classification.blockerType ?? null,
          blockerMessage: classification.blockerMessage ?? null,
          actionCount: actions.length,
          screenshotCount: screenshots.length,
          logPath: input.logPath,
        }),
      },
    });
  }

  return updatedRun;
}

export function buildAutomationRunEventPayload(input: {
  automationRunId: string;
  status: ApplicationAutomationRunStatus;
  blockerType?: string | null;
  blockerMessage?: string | null;
  actionCount: number;
  screenshotCount: number;
  logPath?: string | null;
}): Prisma.InputJsonValue {
  return {
    source: "application_automation_run",
    automationRunId: input.automationRunId,
    status: input.status,
    blockerType: input.blockerType ?? null,
    blockerMessage: input.blockerMessage ?? null,
    actionCount: input.actionCount,
    screenshotCount: input.screenshotCount,
    logPath: input.logPath ?? null,
  };
}

export async function persistFormPatternsFromLog(input: {
  userId: string;
  atsProvider: AtsProvider;
  host: string;
  log: string;
  success: boolean;
}) {
  const patterns = assistantLogFieldPatterns(input.log);
  if (!patterns.length) return { count: 0 };
  let count = 0;
  for (const pattern of patterns) {
    await prisma.applicationFormPattern.upsert({
      where: {
        userId_host_fieldKey_category: {
          userId: input.userId,
          host: input.host,
          fieldKey: pattern.fieldKey,
          category: pattern.category,
        },
      },
      create: {
        userId: input.userId,
        atsProvider: input.atsProvider,
        host: input.host,
        fieldKey: pattern.fieldKey,
        category: pattern.category,
        label: pattern.label,
        inputType: pattern.inputType,
        selector: pattern.selector,
        successCount: input.success ? 1 : 0,
        failureCount: input.success ? 0 : 1,
        metadataJson: { source: "playwright_assistant_log" },
      },
      update: {
        atsProvider: input.atsProvider,
        label: pattern.label,
        inputType: pattern.inputType,
        selector: pattern.selector,
        successCount: input.success ? { increment: 1 } : undefined,
        failureCount: input.success ? undefined : { increment: 1 },
        lastSeenAt: new Date(),
        metadataJson: { source: "playwright_assistant_log" },
      },
    });
    count += 1;
  }
  return { count };
}

export function classifyAssistantLog(log: string): AssistantLogClassification {
  if (!log.trim()) return { status: "RUNNING" };
  if (/Traceback|Unable to load assistant package|Playwright is not installed|Assistant launch failed/i.test(log)) {
    return { status: "FAILED", blockerType: "assistant_error", blockerMessage: "The assistant run failed before completing." };
  }

  if (/Auto-submit skipped/i.test(log)) {
    return { status: "READY_TO_SUBMIT", blockerType: "auto_submit_skipped", blockerMessage: "Auto-submit was skipped by a page-level safety check." };
  }

  const blocker = blockerPatterns.find((item) => item.pattern.test(log));
  if (blocker) return { status: "BLOCKED", blockerType: blocker.type, blockerMessage: blocker.message };

  if (/Review every field in the browser\. Submit manually only if everything is correct/i.test(log)) {
    return { status: "READY_TO_SUBMIT" };
  }
  if (/Auto-submit (clicked|confirmed) after safety checks passed/i.test(log)) {
    return { status: "SUBMITTED" };
  }

  return { status: "RUNNING" };
}

export function assistantLogActions(log: string) {
  const actions: Array<{ type: string; message: string }> = [];
  const filled = /Filled (\d+) safe text fields\./i.exec(log);
  const demographic = /Filled (\d+) configured demographic field/i.exec(log);
  const uploads = /Uploaded (\d+) material file/i.exec(log);

  if (filled) actions.push({ type: "filled_safe_fields", message: `${filled[1]} safe text fields filled.` });
  if (demographic) actions.push({ type: "filled_demographic_fields", message: `${demographic[1]} configured demographic fields filled.` });
  if (uploads) actions.push({ type: "uploaded_materials", message: `${uploads[1]} material files uploaded.` });
  if (/Selected application answers:/i.test(log)) actions.push({ type: "prepared_selected_answers", message: "Selected custom-answer drafts were prepared." });

  return actions;
}

export function assistantLogFieldPatterns(log: string) {
  const seen = new Set<string>();
  const patterns: Array<{
    category: string;
    fieldKey: string;
    inputType?: string;
    label: string;
    selector?: string;
  }> = [];

  for (const rawLine of log.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("- ") || !line.includes(" | ")) continue;
    const parts = line.slice(2).split("|").map((part) => part.trim()).filter(Boolean);
    const categoryMatch = /^([^:]+):/.exec(parts[0] ?? "");
    if (!categoryMatch) continue;
    const category = categoryMatch[1].trim();
    if (!safePatternCategories.has(category)) continue;
    const inputType = parts[1]?.replace(/\s+/g, " ").trim() || undefined;
    const selectorPart = parts.find((part) => part.startsWith("selector:"));
    const selector = selectorPart?.replace(/^selector:\s*/i, "").trim() || undefined;
    const label = parts[parts.length - 1]?.trim();
    if (!label || label === "(unlabeled field)") continue;
    const fieldKey = canonicalFieldKey(selector ?? label);
    const dedupeKey = `${category}:${fieldKey}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    patterns.push({ category, fieldKey, inputType, label: label.slice(0, 240), selector });
  }

  return patterns;
}

function canonicalFieldKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "field";
}

function hostFromUrl(url?: string | null) {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function assistantLogScreenshots(log: string) {
  const screenshots: Array<{ type: string; path: string; textPath?: string; summary?: string }> = [];
  const screenshotMatch = /Submit confirmation screenshot:\s*(.+)$/im.exec(log);
  if (!screenshotMatch) return screenshots;

  const textMatch = /Submit confirmation text:\s*(.+)$/im.exec(log);
  const summaryMatch = /Submit confirmation summary:\s*(.+)$/im.exec(log);
  screenshots.push({
    type: "submit_confirmation",
    path: screenshotMatch[1].trim(),
    ...(textMatch ? { textPath: textMatch[1].trim() } : {}),
    ...(summaryMatch ? { summary: summaryMatch[1].trim() } : {}),
  });
  return screenshots;
}
