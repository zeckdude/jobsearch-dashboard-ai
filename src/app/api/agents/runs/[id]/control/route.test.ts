import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { controlGraphAgentRun } from "@/lib/agents/graph-run-controls";
import { POST } from "./route";

vi.mock("@/lib/agents/graph-run-controls", () => ({
  controlGraphAgentRun: vi.fn(),
}));

const controlGraphAgentRunMock = vi.mocked(controlGraphAgentRun);

describe("/api/agents/runs/[id]/control", () => {
  beforeEach(() => {
    controlGraphAgentRunMock.mockReset();
  });

  it("runs a graph control action", async () => {
    controlGraphAgentRunMock.mockResolvedValue({
      runId: "run_1",
      status: "FAILED",
      currentNode: "stale_graph_run",
      message: "Stale graph run repaired. Retry is now available.",
      latestEvent: null,
    });

    const response = await POST(new NextRequest("http://localhost/api/agents/runs/run_1/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "repair" }),
    }), { params: { id: "run_1" } });

    expect(controlGraphAgentRunMock).toHaveBeenCalledWith("run_1", "repair");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ runId: "run_1", currentNode: "stale_graph_run" });
  });

  it("rejects unsupported actions", async () => {
    const response = await POST(new NextRequest("http://localhost/api/agents/runs/run_1/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "destroy" }),
    }), { params: { id: "run_1" } });

    expect(response.status).toBe(400);
    expect(controlGraphAgentRunMock).not.toHaveBeenCalled();
  });
});
