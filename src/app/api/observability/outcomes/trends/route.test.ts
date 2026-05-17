import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOutcomeCalibrationTrends } from "@/lib/observability/outcome-calibration";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

vi.mock("@/lib/observability/outcome-calibration", () => ({
  getOutcomeCalibrationTrends: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
  },
}));

const getOutcomeCalibrationTrendsMock = vi.mocked(getOutcomeCalibrationTrends);
const userFindFirstMock = vi.mocked(prisma.user.findFirst);

describe("GET /api/observability/outcomes/trends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindFirstMock.mockResolvedValue({ id: "user_1" } as never);
    getOutcomeCalibrationTrendsMock.mockResolvedValue({
      snapshots: [{ id: "snapshot_1", source: "settings_manual", createdAt: new Date(), summary: { applications: 1 }, workflows: [] }],
      metrics: [{ key: "callbackRate", label: "Callback rate", latest: 20, previous: 10, delta: 10, direction: "improving" }],
      workflows: [{ target: "JOB_SEARCH", latestScore: 90, previousScore: 70, delta: 20, direction: "improving" }],
    } as never);
  });

  it("returns outcome calibration trends for the default user", async () => {
    const response = await GET();

    expect(getOutcomeCalibrationTrendsMock).toHaveBeenCalledWith("user_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      snapshots: [{ id: "snapshot_1" }],
      metrics: [{ key: "callbackRate", direction: "improving" }],
      workflows: [{ target: "JOB_SEARCH", direction: "improving" }],
    });
  });
});
