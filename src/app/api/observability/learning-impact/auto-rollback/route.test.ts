import { beforeEach, describe, expect, it, vi } from "vitest";
import { runLearningAutoRollback } from "@/lib/observability/auto-rollback";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("@/lib/observability/auto-rollback", () => ({
  runLearningAutoRollback: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
  },
}));

const runAutoRollbackMock = vi.mocked(runLearningAutoRollback);
const userFindFirstMock = vi.mocked(prisma.user.findFirst);

describe("POST /api/observability/learning-impact/auto-rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindFirstMock.mockResolvedValue({ id: "user_1" } as never);
    runAutoRollbackMock.mockResolvedValue({
      scanned: 2,
      eligible: 1,
      rolledBack: 0,
      results: [],
    });
  });

  it("runs auto rollback in dry-run mode", async () => {
    const response = await POST(new Request("http://localhost/api/observability/learning-impact/auto-rollback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    }));

    expect(runAutoRollbackMock).toHaveBeenCalledWith({ userId: "user_1", dryRun: true });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      scanned: 2,
      eligible: 1,
      rolledBack: 0,
      message: "1 learning rule eligible for auto rollback.",
    });
  });

  it("runs live auto rollback by default", async () => {
    runAutoRollbackMock.mockResolvedValue({
      scanned: 2,
      eligible: 1,
      rolledBack: 1,
      results: [],
    });

    const response = await POST(new Request("http://localhost/api/observability/learning-impact/auto-rollback", { method: "POST" }));

    expect(runAutoRollbackMock).toHaveBeenCalledWith({ userId: "user_1", dryRun: false });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      rolledBack: 1,
      message: "Auto rollback disabled 1 learning rule.",
    });
  });
});
