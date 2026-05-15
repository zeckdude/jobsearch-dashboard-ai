import { beforeEach, describe, expect, it, vi } from "vitest";
import { scanDueApplicationFollowUps } from "@/lib/applications/follow-up-reminders";
import { POST } from "./route";

vi.mock("@/lib/applications/follow-up-reminders", () => ({
  scanDueApplicationFollowUps: vi.fn(),
}));

const scanDueFollowUpsMock = vi.mocked(scanDueApplicationFollowUps);

describe("POST /api/applications/follow-ups/scan", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    scanDueFollowUpsMock.mockReset();
  });

  it("creates reminders for due follow-ups", async () => {
    scanDueFollowUpsMock.mockResolvedValue({
      scanned: 2,
      created: 1,
      skipped: 1,
      requestIds: ["request_1"],
    });

    const response = await POST(new Request("http://localhost/api/applications/follow-ups/scan", {
      method: "POST",
      body: JSON.stringify({ limit: 10 }),
    }));

    expect(scanDueFollowUpsMock).toHaveBeenCalledWith(expect.any(Date), 10);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      created: 1,
      message: "Created 1 follow-up reminder.",
    });
  });

  it("requires authorization when FOLLOW_UP_SCAN_SECRET is configured", async () => {
    vi.stubEnv("FOLLOW_UP_SCAN_SECRET", "secret");

    const response = await POST(new Request("http://localhost/api/applications/follow-ups/scan", {
      method: "POST",
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(401);
    expect(scanDueFollowUpsMock).not.toHaveBeenCalled();
  });
});
