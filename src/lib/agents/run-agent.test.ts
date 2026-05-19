import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAgent } from "@/lib/agents/run-agent";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/observability/langsmith", () => ({
  langSmithTraceMetadata: vi.fn(() => ({ tracing: false })),
  sanitizeTraceInput: vi.fn((input) => input),
  sanitizeTraceOutput: vi.fn((output) => output),
  traceAgentOperation: vi.fn((_, __, execute) => execute()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    agentRunEvent: {
      create: vi.fn(),
    },
  },
}));

const createRunMock = vi.mocked(prisma.agentRun.create);
const updateRunMock = vi.mocked(prisma.agentRun.update);
const createEventMock = vi.mocked(prisma.agentRunEvent.create);

describe("runAgent ADK control plane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    createRunMock.mockResolvedValue({
      id: "run_1",
      userId: "user_1",
      agentType: "DAILY_COMMAND_CENTER",
      inputJson: {},
      outputJson: null,
      observabilityJson: {},
      graphThreadId: null,
      currentNode: null,
      workflowStateJson: {},
      workflowVersion: null,
      parentRunId: null,
      status: "RUNNING",
      error: null,
      createdAt: new Date("2026-05-19T12:00:00.000Z"),
      updatedAt: new Date("2026-05-19T12:00:00.000Z"),
    } as never);
    updateRunMock.mockImplementation((async (args: { data: object }) => ({ id: "run_1", ...args.data })) as never);
    createEventMock.mockResolvedValue({ id: "event_1" } as never);
  });

  it("falls back to a standard service run when ADK is disabled", async () => {
    vi.stubEnv("ADK_ENABLED", "false");

    const result = await runAgent({
      agentType: "DAILY_COMMAND_CENTER",
      userId: "user_1",
      input: { userId: "user_1" },
      execute: async () => ({ summary: "Plan ready" }),
    });

    expect(result.output).toEqual({ summary: "Plan ready" });
    expect(createEventMock).not.toHaveBeenCalled();
    expect(updateRunMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        observabilityJson: expect.objectContaining({ runtime: "service" }),
      }),
    }));
  });

  it("records ADK control-plane events and metadata when enabled", async () => {
    vi.stubEnv("ADK_ENABLED", "true");
    vi.stubEnv("ADK_MODEL", "gemini-test");

    const result = await runAgent({
      agentType: "DAILY_COMMAND_CENTER",
      userId: "user_1",
      input: { userId: "user_1" },
      execute: async () => ({ summary: "Plan ready" }),
    });

    expect(result.output).toEqual({ summary: "Plan ready" });
    expect(createEventMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "adk_control_plane_started" }),
    }));
    expect(createEventMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "adk_control_plane_completed" }),
    }));
    expect(updateRunMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        observabilityJson: expect.objectContaining({
          runtime: "adk",
          adk: expect.objectContaining({ agentId: "daily-command-center", model: "gemini-test" }),
        }),
      }),
    }));
  });
});
