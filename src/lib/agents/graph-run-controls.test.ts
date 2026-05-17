import { beforeEach, describe, expect, it, vi } from "vitest";
import { runRecruitingAgency } from "@/lib/applications/recruiting-agency";
import { controlGraphAgentRun, graphRunControlState } from "@/lib/agents/graph-run-controls";
import { createQualityExampleFromAgentRun } from "@/lib/observability/quality";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/applications/recruiting-agency", () => ({
  runRecruitingAgency: vi.fn(),
}));

vi.mock("@/lib/observability/quality", () => ({
  createQualityExampleFromAgentRun: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentRun: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    agentRunEvent: {
      create: vi.fn(),
    },
  },
}));

const findRunMock = vi.mocked(prisma.agentRun.findUnique);
const updateRunMock = vi.mocked(prisma.agentRun.update);
const createEventMock = vi.mocked(prisma.agentRunEvent.create);
const runAgencyMock = vi.mocked(runRecruitingAgency);
const createQualityExampleMock = vi.mocked(createQualityExampleFromAgentRun);

describe("graph run controls", () => {
  beforeEach(() => {
    findRunMock.mockReset();
    updateRunMock.mockReset();
    createEventMock.mockReset();
    runAgencyMock.mockReset();
    createQualityExampleMock.mockReset();
    createEventMock.mockResolvedValue(event("event_1", "control_event") as any);
    (updateRunMock as any).mockImplementation(async (input: { data: Record<string, unknown> }) => ({ ...run(), ...input.data }));
    createQualityExampleMock.mockResolvedValue(null);
  });

  it("detects stale graph-backed runs", () => {
    expect(graphRunControlState(run({ updatedAt: new Date(Date.now() - 11 * 60 * 1000) })).stale).toBe(true);
    expect(graphRunControlState(run({ updatedAt: new Date() })).stale).toBe(false);
  });

  it("repairs stale running runs into failed terminal state", async () => {
    findRunMock.mockResolvedValue(run({ updatedAt: new Date(Date.now() - 11 * 60 * 1000), events: [] }) as any);

    const result = await controlGraphAgentRun("run_1", "repair");

    expect(updateRunMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "run_1" },
      data: expect.objectContaining({
        status: "FAILED",
        currentNode: "stale_graph_run",
      }),
    }));
    expect(createQualityExampleMock).toHaveBeenCalledWith("run_1", "RECRUITING_AGENCY", "stale_graph_run");
    expect(result).toMatchObject({ runId: "run_1", status: "FAILED", currentNode: "stale_graph_run" });
  });

  it("retries failed recruiting agency runs as child runs", async () => {
    findRunMock.mockResolvedValue(run({ status: "FAILED", inputJson: { minimumScore: 88, limit: 4, triggeredBy: "cron" } }) as any);
    runAgencyMock.mockResolvedValue({
      agentRunId: "child_run_1",
      requested: { minimumScore: 88, limit: 4, triggeredBy: "manual" },
      approved: 0,
      prepared: 0,
      failed: 0,
      skipped: 4,
      results: [],
      message: "Retry completed.",
    });

    const result = await controlGraphAgentRun("run_1", "retry");

    expect(runAgencyMock).toHaveBeenCalledWith(expect.objectContaining({
      minimumScore: 88,
      limit: 4,
      triggeredBy: "manual",
      parentRunId: "run_1",
    }));
    expect(result).toMatchObject({ runId: "run_1", childRunId: "child_run_1" });
  });

  it("cancels running graph-backed runs", async () => {
    findRunMock.mockResolvedValue(run() as any);

    const result = await controlGraphAgentRun("run_1", "cancel");

    expect(updateRunMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "FAILED",
        currentNode: "manual_cancel",
      }),
    }));
    expect(createQualityExampleMock).toHaveBeenCalledWith("run_1", "RECRUITING_AGENCY", "manual_cancel");
    expect(result.message).toBe("Graph run cancelled.");
  });
});

function run(overrides: Record<string, unknown> = {}) {
  return {
    id: "run_1",
    userId: "user_1",
    agentType: "RECRUITING_AGENCY" as const,
    inputJson: { minimumScore: 90, limit: 10, triggeredBy: "manual" },
    outputJson: null,
    observabilityJson: {},
    graphThreadId: "recruiting-agency:user_1:1",
    currentNode: "prepareApplicationPacket",
    workflowStateJson: {},
    workflowVersion: "recruiting-agency-graph-v1",
    parentRunId: null,
    status: "RUNNING" as const,
    error: null,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000),
    events: [],
    ...overrides,
  };
}

function event(id: string, type: string) {
  return {
    id,
    agentRunId: "run_1",
    type,
    message: "event",
    payloadJson: {},
    createdAt: new Date(),
  };
}
