import { describe, expect, it } from "vitest";
import { followUpAtForOutcome, labelForOutcome, shouldTriggerInterviewPrepForOutcome, statusForOutcome } from "@/lib/applications/outcomes";

describe("application outcome mapping", () => {
  it("maps explicit outcomes to board statuses", () => {
    expect(statusForOutcome("APPLIED")).toBe("applied");
    expect(statusForOutcome("RECRUITER_SCREEN")).toBe("screening");
    expect(statusForOutcome("TECH_SCREEN")).toBe("interviewing");
    expect(statusForOutcome("ONSITE")).toBe("interviewing");
    expect(statusForOutcome("FINAL")).toBe("interviewing");
    expect(statusForOutcome("OFFER")).toBe("offer");
    expect(statusForOutcome("REJECTED")).toBe("rejected_by_company");
    expect(statusForOutcome("GHOSTED")).toBe("follow_up_due");
    expect(statusForOutcome("CLOSED")).toBe("archived");
  });

  it("formats outcome labels for UI messages", () => {
    expect(labelForOutcome("RECRUITER_SCREEN")).toBe("Recruiter Screen");
  });

  it("triggers interview prep for interview-stage outcomes", () => {
    expect(shouldTriggerInterviewPrepForOutcome("RECRUITER_SCREEN")).toBe(true);
    expect(shouldTriggerInterviewPrepForOutcome("TECH_SCREEN")).toBe(true);
    expect(shouldTriggerInterviewPrepForOutcome("ONSITE")).toBe(true);
    expect(shouldTriggerInterviewPrepForOutcome("FINAL")).toBe(true);
    expect(shouldTriggerInterviewPrepForOutcome("APPLIED")).toBe(false);
    expect(shouldTriggerInterviewPrepForOutcome("REJECTED")).toBe(false);
  });

  it("schedules and clears follow-up dates from outcomes", () => {
    const appliedAt = new Date("2026-05-15T12:00:00.000Z");
    const existingFollowUpAt = new Date("2026-05-20T12:00:00.000Z");

    expect(followUpAtForOutcome({
      outcome: "APPLIED",
      occurredAt: appliedAt,
      existingFollowUpAt: null,
    })?.toISOString()).toBe("2026-05-22T12:00:00.000Z");
    expect(followUpAtForOutcome({
      outcome: "APPLIED",
      occurredAt: appliedAt,
      existingFollowUpAt,
    })).toBe(existingFollowUpAt);
    expect(followUpAtForOutcome({
      outcome: "GHOSTED",
      occurredAt: appliedAt,
      existingFollowUpAt: null,
    })).toBe(appliedAt);
    expect(followUpAtForOutcome({
      outcome: "REJECTED",
      occurredAt: appliedAt,
      existingFollowUpAt,
    })).toBeNull();
  });
});
