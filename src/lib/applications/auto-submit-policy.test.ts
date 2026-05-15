import { describe, expect, it } from "vitest";
import { autoSubmitDisabledReason, companyAutomationKey } from "@/lib/applications/auto-submit-policy";

describe("auto-submit policy helpers", () => {
  it("normalizes company names for company-level policy matching", () => {
    expect(companyAutomationKey(" Auth0 / Okta, Inc. ")).toBe("auth0oktainc");
    expect(companyAutomationKey("1Password")).toBe("1password");
  });

  it("explains the highest-priority disabled auto-submit policy", () => {
    expect(autoSubmitDisabledReason({ applicationOverride: false, companyPolicyMode: "ALLOW" })).toBe("Auto-submit is disabled for this application.");
    expect(autoSubmitDisabledReason({ applicationOverride: null, companyPolicyMode: "BLOCK" })).toBe("Auto-submit is blocked for this company.");
    expect(autoSubmitDisabledReason({ applicationOverride: null, companyPolicyMode: null })).toBe("Auto-submit is disabled in settings.");
  });
});
