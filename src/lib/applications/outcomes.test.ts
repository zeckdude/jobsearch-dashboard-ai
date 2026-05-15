import { describe, expect, it } from "vitest";
import { labelForOutcome, statusForOutcome } from "@/lib/applications/outcomes";

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
});
