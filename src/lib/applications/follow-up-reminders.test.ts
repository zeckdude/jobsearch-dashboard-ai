import { describe, expect, it } from "vitest";
import { clampFollowUpReminderLimit } from "@/lib/applications/follow-up-reminders";

describe("follow-up reminders", () => {
  it("clamps scan limits to a safe batch size", () => {
    expect(clampFollowUpReminderLimit(Number.NaN)).toBe(50);
    expect(clampFollowUpReminderLimit(0)).toBe(1);
    expect(clampFollowUpReminderLimit(12.4)).toBe(12);
    expect(clampFollowUpReminderLimit(200)).toBe(100);
  });
});
