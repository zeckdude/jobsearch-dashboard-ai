import { beforeEach, describe, expect, it, vi } from "vitest";
import { runDuplicateStaleJobDetectorAgent } from "@/lib/agents/duplicate-stale-job-detector";
import { repairSuppressedJobResurfacing } from "@/lib/jobs/suppression-repair";
import { POST } from "./route";

vi.mock("@/lib/agents/duplicate-stale-job-detector", () => ({
  runDuplicateStaleJobDetectorAgent: vi.fn(),
}));

vi.mock("@/lib/jobs/suppression-repair", () => ({
  repairSuppressedJobResurfacing: vi.fn(),
}));

const detectorMock = vi.mocked(runDuplicateStaleJobDetectorAgent);
const repairMock = vi.mocked(repairSuppressedJobResurfacing);

describe("POST /api/jobs/detect-duplicates", () => {
  beforeEach(() => {
    detectorMock.mockReset();
    repairMock.mockReset();
  });

  it("detects duplicates and repairs resurfaced suppressed jobs", async () => {
    detectorMock.mockResolvedValue({
      output: {
        analyzedJobs: 8,
        updatedJobs: 2,
        duplicateGroups: [],
        staleJobs: [],
        confidence: 0.74,
        reasoningSummary: "Grouped jobs.",
      },
    } as never);
    repairMock.mockResolvedValue({
      scannedActiveMatches: 10,
      sourceSignals: 4,
      repairedMatches: 2,
      recordedSuppressions: 3,
      byReason: {
        submitted: 1,
        rejected: 1,
        archived: 0,
        ready_to_apply_duplicate: 0,
      },
      decisions: [],
    });

    const response = await POST(new Request("http://localhost/api/jobs/detect-duplicates", {
      method: "POST",
      body: JSON.stringify({ limit: 500 }),
    }));

    expect(detectorMock).toHaveBeenCalledWith({ jobPostingId: undefined, limit: 500 });
    expect(repairMock).toHaveBeenCalledWith({ source: "check_duplicates" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      analyzedJobs: 8,
      suppressionRepair: {
        repairedMatches: 2,
        byReason: {
          submitted: 1,
          rejected: 1,
        },
      },
      message: "Duplicate and stale job check finished. Repaired 2 resurfaced duplicate jobs.",
    });
  });
});
