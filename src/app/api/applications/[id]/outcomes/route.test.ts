import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordApplicationOutcome } from "@/lib/applications/outcomes";
import { POST } from "./route";

vi.mock("@/lib/applications/outcomes", () => ({
  recordApplicationOutcome: vi.fn(),
}));

const recordOutcomeMock = vi.mocked(recordApplicationOutcome);

describe("POST /api/applications/[id]/outcomes", () => {
  beforeEach(() => {
    recordOutcomeMock.mockReset();
  });

  it("records an explicit application outcome", async () => {
    recordOutcomeMock.mockResolvedValue({
      outcome: { id: "outcome_1", outcome: "RECRUITER_SCREEN" },
      status: "screening",
      message: "Recruiter Screen recorded for Linear - Senior Frontend Engineer.",
    } as Awaited<ReturnType<typeof recordApplicationOutcome>>);

    const response = await POST(new Request("http://localhost/api/applications/app_1/outcomes", {
      method: "POST",
      body: JSON.stringify({
        outcome: "RECRUITER_SCREEN",
        notes: "Initial recruiter call scheduled.",
        occurredAt: "2026-05-15T12:00:00.000Z",
      }),
    }), {
      params: { id: "app_1" },
    });

    expect(recordOutcomeMock).toHaveBeenCalledWith({
      applicationId: "app_1",
      outcome: "RECRUITER_SCREEN",
      notes: "Initial recruiter call scheduled.",
      occurredAt: new Date("2026-05-15T12:00:00.000Z"),
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      outcome: { id: "outcome_1", outcome: "RECRUITER_SCREEN" },
      status: "screening",
      message: "Recruiter Screen recorded for Linear - Senior Frontend Engineer.",
    });
  });

  it("rejects invalid outcomes before writing", async () => {
    const response = await POST(new Request("http://localhost/api/applications/app_1/outcomes", {
      method: "POST",
      body: JSON.stringify({ outcome: "MAYBE_LATER" }),
    }), {
      params: { id: "app_1" },
    });

    expect(recordOutcomeMock).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid enum value");
  });
});
