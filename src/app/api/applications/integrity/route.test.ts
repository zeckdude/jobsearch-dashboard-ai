import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditApplicationIntegrity } from "@/lib/applications/integrity";
import { GET } from "./route";

vi.mock("@/lib/applications/integrity", () => ({
  auditApplicationIntegrity: vi.fn(),
}));

const auditMock = vi.mocked(auditApplicationIntegrity);

describe("GET /api/applications/integrity", () => {
  beforeEach(() => {
    auditMock.mockReset();
  });

  it("returns the integrity report without repairing state", async () => {
    auditMock.mockResolvedValue({
      generatedAt: "2026-05-17T12:00:00.000Z",
      totalIssues: 1,
      issueCounts: {
        STALE_DUPLICATE_APPLICATION: 1,
        MATCH_STATUS_DRIFT: 0,
        EMAIL_CONFIRMED_PENDING_APPLICATION: 0,
        RESURFACED_SUBMITTED_JOB: 0,
        ASSISTANT_SUBMITTED_STATUS_DRIFT: 0,
      },
      visibleApplications: 2,
      issues: [],
    });

    const response = await GET();

    expect(auditMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ totalIssues: 1 });
  });
});
