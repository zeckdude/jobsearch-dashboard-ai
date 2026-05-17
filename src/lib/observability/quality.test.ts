import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createQualityExampleFromAutomationRun,
  proposeImprovementsFromFailedExamples,
  runApplicationAssistantEvaluations,
} from "@/lib/observability/quality";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentQualityDataset: {
      upsert: vi.fn(),
    },
    applicationAutomationRun: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    agentQualityExample: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    agentQualityEvaluation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    agentImprovementProposal: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const datasetUpsertMock = vi.mocked(prisma.agentQualityDataset.upsert);
const runFindUniqueMock = vi.mocked(prisma.applicationAutomationRun.findUnique);
const exampleFindFirstMock = vi.mocked(prisma.agentQualityExample.findFirst);
const exampleCreateMock = vi.mocked(prisma.agentQualityExample.create);
const exampleFindManyMock = vi.mocked(prisma.agentQualityExample.findMany);
const evaluationCreateMock = vi.mocked(prisma.agentQualityEvaluation.create);
const evaluationFindManyMock = vi.mocked(prisma.agentQualityEvaluation.findMany);
const proposalFindFirstMock = vi.mocked(prisma.agentImprovementProposal.findFirst);
const proposalCreateMock = vi.mocked(prisma.agentImprovementProposal.create);

describe("agent quality evaluation loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    datasetUpsertMock.mockResolvedValue({ id: "dataset_1" } as never);
    exampleFindFirstMock.mockResolvedValue(null);
    exampleCreateMock.mockImplementation((input) => ({ id: "example_1", ...(input as any).data }) as never);
    evaluationCreateMock.mockImplementation((input) => ({ id: "eval_1", ...(input as any).data }) as never);
    proposalFindFirstMock.mockResolvedValue(null);
    proposalCreateMock.mockResolvedValue({ id: "proposal_1" } as never);
  });

  it("creates redacted assistant examples from failed automation runs", async () => {
    runFindUniqueMock.mockResolvedValue(automationRun({
      status: "FAILED",
      blockerType: "assistant_error",
      blockerMessage: "The assistant run failed before completing.",
    }) as never);

    await createQualityExampleFromAutomationRun("run_1");

    expect(exampleCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        target: "APPLICATION_ASSISTANT",
        source: "AUTOMATION_RUN",
        failureCategory: "assistant_runtime_error",
        automationRunId: "run_1",
        actualJson: expect.objectContaining({
          blockerMessage: "The assistant run failed before completing.",
        }),
      }),
    }));
  });

  it("evaluates failed examples and creates propose-only improvements", async () => {
    exampleFindManyMock.mockResolvedValue([
      {
        id: "example_1",
        userId: "user_1",
        datasetId: "dataset_1",
        agentRunId: null,
        failureCategory: "manual_submit_detection",
        source: "MANUAL_REPAIR",
        actualJson: { status: "SUBMITTED" },
        evaluations: [],
      },
    ] as never);
    evaluationFindManyMock.mockResolvedValue([
      {
        id: "eval_1",
        userId: "user_1",
        exampleId: "example_1",
        failureCategory: "manual_submit_detection",
        status: "NEEDS_REVIEW",
        example: { id: "example_1" },
      },
    ] as never);

    const result = await runApplicationAssistantEvaluations("user_1");

    expect(result.evaluated).toBe(1);
    expect(evaluationCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "NEEDS_REVIEW",
        failureCategory: "manual_submit_detection",
      }),
    }));
    expect(proposalCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "PROPOSED",
        type: "WORKFLOW",
        title: "Improve manual submit detection",
      }),
    }));
  });

  it("does not create duplicate open proposals for the same failure category", async () => {
    evaluationFindManyMock.mockResolvedValue([
      {
        id: "eval_1",
        userId: "user_1",
        exampleId: "example_1",
        failureCategory: "browser_lifecycle",
        status: "FAILED",
        example: { id: "example_1" },
      },
    ] as never);
    proposalFindFirstMock.mockResolvedValue({ id: "proposal_existing" } as never);

    const result = await proposeImprovementsFromFailedExamples("user_1");

    expect(result.created).toBe(0);
    expect(proposalCreateMock).not.toHaveBeenCalled();
  });
});

function automationRun(input: { status: string; blockerType: string | null; blockerMessage: string | null }) {
  return {
    id: "run_1",
    userId: "user_1",
    applicationId: "app_1",
    jobPostingId: "job_1",
    status: input.status,
    currentNode: "finalizeRun",
    blockerType: input.blockerType,
    blockerMessage: input.blockerMessage,
    workflowStateJson: { status: input.status, events: [] },
    observabilityJson: {},
    application: { id: "app_1" },
    jobPosting: {
      id: "job_1",
      company: "Confluent",
      title: "Senior Software Engineer II",
      atsProvider: "ashby",
    },
  };
}
