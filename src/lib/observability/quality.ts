import type {
  AgentImprovementProposalStatus,
  AgentQualityEvaluationStatus,
  AgentQualityExampleSource,
  AgentQualityTarget,
  ApplicationAutomationRunStatus,
  Prisma,
} from "@prisma/client";
import { sanitizeTraceInput } from "@/lib/observability/langsmith";
import { prisma } from "@/lib/prisma";

const APPLICATION_ASSISTANT_DATASET = "application_assistant_autofill";
const EVALUATOR_VERSION = "application-assistant-quality-v1";
const DATASET_NAMES: Record<AgentQualityTarget, string> = {
  APPLICATION_ASSISTANT: APPLICATION_ASSISTANT_DATASET,
  RECRUITING_AGENCY: "recruiting_agency_decisions",
  JOB_SEARCH: "job_search_results",
  JOB_MATCHING: "job_matching_decisions",
  GENERATED_MATERIALS: "generated_materials_quality",
  GITHUB_REVIEW: "github_portfolio_review",
  OUTREACH: "outreach_quality",
  OUTCOME_LEARNING: "outcome_learning",
  COMMAND_CENTER: "command_center_recommendations",
};

type AutomationRunForQuality = Prisma.ApplicationAutomationRunGetPayload<{
  include: {
    application: true;
    jobPosting: true;
  };
}>;

export async function ensureApplicationAssistantDataset(userId: string) {
  return ensureAgentQualityDataset(
    userId,
    "APPLICATION_ASSISTANT",
    "Redacted examples for application assistant autofill, user handoff, submit detection, and watcher reliability.",
  );
}

export async function ensureAgentQualityDataset(userId: string, target: AgentQualityTarget, description?: string) {
  const name = DATASET_NAMES[target] ?? target.toLowerCase();
  return prisma.agentQualityDataset.upsert({
    where: { userId_name: { userId, name } },
    create: {
      userId,
      name,
      target,
      description: description ?? `Quality examples for ${target.toLowerCase().replaceAll("_", " ")}.`,
      metadataJson: {
        redactionMode: "metadata",
        langSmithOptional: true,
      },
    },
    update: {
      active: true,
    },
  });
}

export async function createQualityExampleFromAgentRun(
  agentRunId: string,
  target: AgentQualityTarget,
  failureCategory = "agent_run_issue",
) {
  const run = await prisma.agentRun.findUnique({
    where: { id: agentRunId },
    include: {
      events: { orderBy: { createdAt: "asc" }, take: 100 },
    },
  });
  if (!run?.userId) return null;

  const existing = await prisma.agentQualityExample.findFirst({
    where: {
      agentRunId: run.id,
      source: "AGENT_RUN",
      target,
      failureCategory,
    },
  });
  if (existing) return existing;

  const dataset = await ensureAgentQualityDataset(run.userId, target);
  const recentEvents = run.events.slice(-20).map((event) => ({
    type: event.type,
    message: event.message,
    payload: event.payloadJson,
    at: event.createdAt,
  }));

  return prisma.agentQualityExample.create({
    data: {
      userId: run.userId,
      datasetId: dataset.id,
      target,
      source: "AGENT_RUN",
      title: `${target.replaceAll("_", " ")} run ${run.status.toLowerCase()}`,
      summary: run.error ?? `Agent run captured ${failureCategory}.`,
      failureCategory,
      inputJson: sanitizeTraceInput({
        agentType: run.agentType,
        currentNode: run.currentNode,
        workflowVersion: run.workflowVersion,
      }),
      expectedJson: toJson({
        expectedBehavior: "Workflow should complete with consistent state, useful events, and no repeated avoidable failures.",
      }),
      actualJson: sanitizeTraceInput({
        status: run.status,
        error: run.error,
        currentNode: run.currentNode,
        workflowState: compactAgentRunWorkflowState(run.workflowStateJson),
        recentEvents,
      }),
      metadataJson: sanitizeTraceInput({
        source: "agent_run",
        graphThreadId: run.graphThreadId,
        workflowVersion: run.workflowVersion,
        observability: run.observabilityJson,
      }),
      agentRunId: run.id,
    },
  });
}

export async function createQualityExampleFromFeedback(feedbackId: string) {
  const feedback = await prisma.skillFeedback.findUnique({
    where: { id: feedbackId },
    include: {
      application: { include: { jobPosting: true } },
      jobPosting: true,
      agentRun: true,
    },
  });
  if (!feedback) return null;
  if (!isApplicationAssistantFeedback(feedback.skillId, feedback.contextJson, feedback.applicationId)) return null;

  const existing = await prisma.agentQualityExample.findFirst({
    where: { skillFeedbackId: feedback.id, target: "APPLICATION_ASSISTANT" },
  });
  if (existing) return existing;

  const dataset = await ensureApplicationAssistantDataset(feedback.userId);
  const context = objectJson(feedback.contextJson);
  const observability = objectJson(context.observability);
  const automationRun = objectJson(observability.automationRun);
  const failureCategory = failureCategoryFromFeedback(feedback.problemSummary, feedback.rawMessage, automationRun.status);

  return prisma.agentQualityExample.create({
    data: {
      userId: feedback.userId,
      datasetId: dataset.id,
      target: "APPLICATION_ASSISTANT",
      source: "SKILL_FEEDBACK",
      title: `Feedback: ${feedback.problemSummary.slice(0, 80)}`,
      summary: feedback.problemSummary,
      failureCategory,
      inputJson: toJson({
        contextPath: context.contextPath ?? null,
        skillId: feedback.skillId,
        applicationId: feedback.applicationId,
        jobPostingId: feedback.jobPostingId,
      }),
      expectedJson: toJson({
        expectedBehavior: feedback.expectedBehavior ?? "Agent should avoid repeating the reported mistake.",
      }),
      actualJson: toJson({
        problemSummary: feedback.problemSummary,
        automationRunStatus: automationRun.status ?? null,
        automationRunCurrentNode: automationRun.currentNode ?? null,
      }),
      metadataJson: sanitizeTraceInput({
        source: "skill_feedback",
        confidence: feedback.confidence,
        observability,
        company: feedback.application?.jobPosting.company ?? feedback.jobPosting?.company ?? null,
        title: feedback.application?.jobPosting.title ?? feedback.jobPosting?.title ?? null,
      }),
      skillFeedbackId: feedback.id,
      agentRunId: feedback.agentRunId,
      applicationId: feedback.applicationId,
      jobPostingId: feedback.jobPostingId,
    },
  });
}

export async function createQualityExampleFromAutomationRun(runId: string, source: AgentQualityExampleSource = "AUTOMATION_RUN") {
  const run = await prisma.applicationAutomationRun.findUnique({
    where: { id: runId },
    include: {
      application: true,
      jobPosting: true,
    },
  });
  if (!run) return null;

  const category = source === "MANUAL_REPAIR" ? "manual_submit_detection" : failureCategoryFromAutomationRun(run);
  const shouldCapture = Boolean(category || run.status === "SUBMITTED");
  if (!shouldCapture) return null;

  const existing = await prisma.agentQualityExample.findFirst({
    where: {
      automationRunId: run.id,
      source,
      failureCategory: category,
      target: "APPLICATION_ASSISTANT",
    },
  });
  if (existing) return existing;

  const dataset = await ensureApplicationAssistantDataset(run.userId);
  return prisma.agentQualityExample.create({
    data: {
      userId: run.userId,
      datasetId: dataset.id,
      target: "APPLICATION_ASSISTANT",
      source,
      title: `${run.jobPosting.company} - ${run.jobPosting.title}`,
      summary: summaryForAutomationRun(run, category),
      failureCategory: category,
      inputJson: toJson({
        atsProvider: run.jobPosting.atsProvider,
        statusBeforeEvaluation: run.status,
        currentNode: run.currentNode,
      }),
      expectedJson: toJson(expectedForAutomationRun(run, category)),
      actualJson: sanitizeTraceInput({
        status: run.status,
        blockerType: run.blockerType,
        blockerMessage: run.blockerMessage,
        currentNode: run.currentNode,
        workflowState: compactWorkflowState(run.workflowStateJson),
      }),
      metadataJson: sanitizeTraceInput({
        source,
        applicationId: run.applicationId,
        jobPostingId: run.jobPostingId,
        company: run.jobPosting.company,
        title: run.jobPosting.title,
        atsProvider: run.jobPosting.atsProvider,
        observability: run.observabilityJson,
      }),
      automationRunId: run.id,
      applicationId: run.applicationId,
      jobPostingId: run.jobPostingId,
    },
  });
}

export async function backfillApplicationAssistantQualityExamples(userId?: string) {
  const runs = await prisma.applicationAutomationRun.findMany({
    where: {
      ...(userId ? { userId } : {}),
      OR: [
        { status: "FAILED" },
        { status: "NEEDS_USER" },
        { status: "SUBMITTED" },
        { blockerType: { not: null } },
      ],
    },
    orderBy: { startedAt: "desc" },
    take: 200,
  });
  let createdOrFound = 0;
  for (const run of runs) {
    const example = await createQualityExampleFromAutomationRun(run.id, "BACKFILL");
    if (example) createdOrFound += 1;
  }
  return { scanned: runs.length, examples: createdOrFound };
}

export async function runApplicationAssistantEvaluations(userId?: string) {
  const examples = await prisma.agentQualityExample.findMany({
    where: {
      target: "APPLICATION_ASSISTANT",
      ...(userId ? { userId } : {}),
    },
    include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  let evaluated = 0;
  const evaluations = [];
  for (const example of examples) {
    if (example.evaluations[0]?.evaluatorVersion === EVALUATOR_VERSION) continue;
    const result = evaluateApplicationAssistantExample(example);
    evaluations.push(await prisma.agentQualityEvaluation.create({
      data: {
        userId: example.userId,
        datasetId: example.datasetId,
        exampleId: example.id,
        agentRunId: example.agentRunId,
        target: "APPLICATION_ASSISTANT",
        evaluatorVersion: EVALUATOR_VERSION,
        status: result.status,
        score: result.score,
        failureCategory: result.failureCategory,
        summary: result.summary,
        metricsJson: result.metricsJson,
      },
    }));
    evaluated += 1;
  }

  const proposals = await proposeImprovementsFromFailedExamples(userId);
  return { scanned: examples.length, evaluated, proposals: proposals.created, evaluations };
}

export async function proposeImprovementsFromFailedExamples(userId?: string) {
  const failed = await prisma.agentQualityEvaluation.findMany({
    where: {
      target: "APPLICATION_ASSISTANT",
      status: { in: ["FAILED", "NEEDS_REVIEW"] },
      failureCategory: { not: null },
      ...(userId ? { userId } : {}),
    },
    include: { example: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const groups = new Map<string, typeof failed>();
  for (const evaluation of failed) {
    const key = evaluation.failureCategory ?? "unknown";
    groups.set(key, [...(groups.get(key) ?? []), evaluation]);
  }

  let created = 0;
  for (const [category, items] of groups) {
    if (!items.length) continue;
    const ownerId = items[0]?.userId;
    if (!ownerId) continue;
    const existing = await prisma.agentImprovementProposal.findFirst({
      where: {
        userId: ownerId,
        target: "APPLICATION_ASSISTANT",
        status: "PROPOSED",
        metadataJson: { path: ["failureCategory"], equals: category },
      },
    });
    if (existing) continue;
    const affectedExampleIds = Array.from(new Set(items.map((item) => item.exampleId).filter(Boolean)));
    await prisma.agentImprovementProposal.create({
      data: {
        userId: ownerId,
        target: "APPLICATION_ASSISTANT",
        type: proposalTypeForCategory(category),
        status: "PROPOSED",
        riskLevel: "LOW",
        title: proposalTitleForCategory(category),
        summary: `Detected ${items.length} application-assistant quality issue(s) in category ${category}.`,
        rationale: proposalRationaleForCategory(category),
        affectedExampleIds: affectedExampleIds as Prisma.InputJsonValue,
        patchJson: proposalPatchForCategory(category),
        metadataJson: {
          failureCategory: category,
          evaluatorVersion: EVALUATOR_VERSION,
          exampleCount: affectedExampleIds.length,
        },
      },
    });
    created += 1;
  }
  return { created };
}

export async function setImprovementProposalStatus(id: string, status: AgentImprovementProposalStatus) {
  return prisma.agentImprovementProposal.update({
    where: { id },
    data: {
      status,
      acceptedAt: status === "ACCEPTED" ? new Date() : undefined,
      dismissedAt: status === "DISMISSED" ? new Date() : undefined,
    },
  });
}

function evaluateApplicationAssistantExample(example: {
  failureCategory: string | null;
  source: AgentQualityExampleSource;
  actualJson: Prisma.JsonValue;
}) {
  const actual = objectJson(example.actualJson);
  const status = String(actual.status ?? "");
  const category = example.failureCategory ?? failureCategoryFromText(JSON.stringify(actual));
  if (status === "SUBMITTED" && !category) {
    return {
      status: "PASSED" as AgentQualityEvaluationStatus,
      score: 95,
      failureCategory: null,
      summary: "Assistant state reached submitted without a captured failure category.",
      metricsJson: { submitStateAccuracy: 1 },
    };
  }
  if (category === "manual_submit_detection") {
    return {
      status: "NEEDS_REVIEW" as AgentQualityEvaluationStatus,
      score: 55,
      failureCategory: category,
      summary: "Manual submit or page-close handling required repair or user confirmation.",
      metricsJson: { submitStateAccuracy: 0, manualCorrection: 1 },
    };
  }
  if (category) {
    return {
      status: "FAILED" as AgentQualityEvaluationStatus,
      score: scoreForFailureCategory(category),
      failureCategory: category,
      summary: `Application assistant failed quality check: ${category}.`,
      metricsJson: { failureCategory: category, passed: 0 },
    };
  }
  return {
    status: "NEEDS_REVIEW" as AgentQualityEvaluationStatus,
    score: 70,
    failureCategory: "needs_review",
    summary: "Application assistant example needs manual review.",
    metricsJson: { passed: 0.5 },
  };
}

function isApplicationAssistantFeedback(skillId: string, contextJson: Prisma.JsonValue, applicationId?: string | null) {
  const text = JSON.stringify(contextJson).toLowerCase();
  return Boolean(applicationId || /application|assistant|autofill|field|submit|ashby|greenhouse|lever|workday/.test(text) || skillId === "application_qa");
}

function failureCategoryFromFeedback(summary: string, raw: string, automationStatus: unknown) {
  const text = `${summary} ${raw} ${String(automationStatus ?? "")}`.toLowerCase();
  if (/cover letter/.test(text)) return "cover_letter_field";
  if (/submit|submitted|applied|failed state|running state/.test(text)) return "manual_submit_detection";
  if (/field|autofill|filled/.test(text)) return "field_classification";
  if (/stale|closed|frame|detached|browser/.test(text)) return "browser_lifecycle";
  return "user_reported_mistake";
}

function failureCategoryFromAutomationRun(run: Pick<AutomationRunForQuality, "status" | "blockerType" | "blockerMessage" | "workflowStateJson">) {
  if (run.status === "FAILED") return run.blockerType === "assistant_error" ? "assistant_runtime_error" : "assistant_failed";
  if (run.status === "NEEDS_USER" && run.blockerType === "assistant_closed") return "browser_lifecycle";
  if (run.status === "NEEDS_USER") return run.blockerType ?? "needs_user";
  if (run.status === "SUBMITTED" && workflowEventTypes(run.workflowStateJson).includes("manual_submit_repaired")) return "manual_submit_detection";
  return null;
}

function failureCategoryFromText(text: string) {
  const normalized = text.toLowerCase();
  if (/cover letter/.test(normalized)) return "cover_letter_field";
  if (/submit|submitted|applied/.test(normalized)) return "manual_submit_detection";
  if (/frame|detached|browser|closed/.test(normalized)) return "browser_lifecycle";
  if (/field/.test(normalized)) return "field_classification";
  return null;
}

function summaryForAutomationRun(run: AutomationRunForQuality, category: string | null) {
  if (run.status === "SUBMITTED" && category === "manual_submit_detection") {
    return "Application was submitted, but assistant submit-state tracking required repair or confirmation.";
  }
  if (category) return run.blockerMessage ?? `Assistant run captured ${category}.`;
  return "Assistant run completed successfully.";
}

function expectedForAutomationRun(run: AutomationRunForQuality, category: string | null) {
  if (category === "manual_submit_detection") return { status: "SUBMITTED", shouldRequireRepair: false };
  if (run.status === "FAILED") return { status: "READY_TO_SUBMIT_OR_NEEDS_USER", shouldAvoidRuntimeFailure: true };
  if (run.status === "NEEDS_USER") return { status: "NEEDS_USER", shouldExposeClearBlocker: true };
  return { status: run.status };
}

function compactWorkflowState(value: Prisma.JsonValue) {
  const state = objectJson(value);
  const events = Array.isArray(state.events) ? state.events : [];
  return {
    status: state.status ?? null,
    currentNode: state.currentNode ?? null,
    blockerType: state.blockerType ?? null,
    eventTypes: events.map((event) => objectJson(event).type).filter(Boolean).slice(-20),
    fieldCount: Array.isArray(state.fields) ? state.fields.length : 0,
  };
}

function compactAgentRunWorkflowState(value: Prisma.JsonValue) {
  const state = objectJson(value);
  return {
    currentNode: state.currentNode ?? null,
    candidateCount: Array.isArray(state.candidates) ? state.candidates.length : 0,
    resultCount: Array.isArray(state.results) ? state.results.length : 0,
    hasOutput: Boolean(state.output),
    error: state.error ?? null,
  };
}

function workflowEventTypes(value: Prisma.JsonValue) {
  const state = objectJson(value);
  const events = Array.isArray(state.events) ? state.events : [];
  return events.map((event) => String(objectJson(event).type ?? "")).filter(Boolean);
}

function scoreForFailureCategory(category: string) {
  if (category === "assistant_runtime_error") return 25;
  if (category === "browser_lifecycle") return 45;
  if (category === "cover_letter_field") return 35;
  if (category === "manual_submit_detection") return 55;
  return 50;
}

function proposalTypeForCategory(category: string) {
  if (category === "field_classification" || category === "cover_letter_field") return "CLASSIFIER";
  if (category === "browser_lifecycle" || category === "manual_submit_detection") return "WORKFLOW";
  return "SKILL";
}

function proposalTitleForCategory(category: string) {
  if (category === "cover_letter_field") return "Improve cover-letter field handling";
  if (category === "manual_submit_detection") return "Improve manual submit detection";
  if (category === "browser_lifecycle") return "Harden browser lifecycle handling";
  if (category === "field_classification") return "Improve assistant field classification";
  return "Review repeated assistant quality issue";
}

function proposalRationaleForCategory(category: string) {
  if (category === "cover_letter_field") return "Repeated examples indicate the assistant may miss obvious cover-letter text fields.";
  if (category === "manual_submit_detection") return "Repeated examples indicate submitted applications may require state repair or better submit intent tracking.";
  if (category === "browser_lifecycle") return "Repeated examples indicate browser close/frame detach events should be treated as recoverable workflow states when safe.";
  if (category === "field_classification") return "Repeated examples indicate field labels/categories need stronger normalization.";
  return "Repeated assistant examples should be reviewed before applying behavior changes.";
}

function proposalPatchForCategory(category: string): Prisma.InputJsonValue {
  return {
    category,
    policy: "proposal_only",
    recommendedChange: proposalTitleForCategory(category),
  };
}

function objectJson(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}
