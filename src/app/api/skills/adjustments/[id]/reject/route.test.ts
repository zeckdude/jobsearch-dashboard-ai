import { beforeEach, describe, expect, it, vi } from "vitest";
import { rejectSkillAdjustment } from "@/lib/skills/rollback";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/skills/rollback", () => ({
  rejectSkillAdjustment: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
  },
}));

const rejectSkillAdjustmentMock = vi.mocked(rejectSkillAdjustment);
const userFindFirstMock = vi.mocked(prisma.user.findFirst);

describe("POST /api/skills/adjustments/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindFirstMock.mockResolvedValue({ id: "user_1" } as never);
    rejectSkillAdjustmentMock.mockResolvedValue({ id: "adjustment_1", status: "REJECTED" } as never);
  });

  it("rejects the requested skill adjustment for the current user", async () => {
    const response = await POST(new Request("http://localhost/api/skills/adjustments/adjustment_1/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "It is not helping." }),
    }), { params: { id: "adjustment_1" } });

    expect(rejectSkillAdjustmentMock).toHaveBeenCalledWith({
      adjustmentId: "adjustment_1",
      userId: "user_1",
      reason: "It is not helping.",
      source: "settings_learning_impact",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      adjustment: { id: "adjustment_1", status: "REJECTED" },
      message: "Learning rule disabled.",
    });
  });

  it("requires a user profile", async () => {
    userFindFirstMock.mockResolvedValue(null);

    const response = await POST(new Request("http://localhost/api/skills/adjustments/adjustment_1/reject", { method: "POST" }), {
      params: { id: "adjustment_1" },
    });

    expect(response.status).toBe(400);
    expect(rejectSkillAdjustmentMock).not.toHaveBeenCalled();
  });
});
