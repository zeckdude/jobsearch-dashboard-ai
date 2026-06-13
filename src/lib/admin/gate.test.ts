import { describe, expect, it } from "vitest";
import { createAdminGateToken, verifyAdminGateToken, verifyAdminPassword } from "@/lib/admin/gate";

describe("admin gate", () => {
  it("verifies configured password", () => {
    process.env.ADMIN_PASSWORD = "test-password";
    expect(verifyAdminPassword("test-password")).toBe(true);
    expect(verifyAdminPassword("wrong")).toBe(false);
  });

  it("creates and verifies signed gate tokens", () => {
    process.env.ADMIN_PASSWORD = "test-password";
    const token = createAdminGateToken();
    expect(token).toContain(".");
    expect(verifyAdminGateToken(token)).toBe(true);
    expect(verifyAdminGateToken("bad.token")).toBe(false);
  });
});
