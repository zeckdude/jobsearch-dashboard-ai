import { describe, expect, it, vi } from "vitest";
import { buildEmailOAuthAuthorizeUrl, emailOAuthConfig, normalizeEmailOAuthProvider } from "@/lib/email/oauth";

describe("email OAuth helpers", () => {
  it("builds Gmail authorization URLs with offline access", () => {
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "gmail-client");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "gmail-secret");
    vi.stubEnv("GMAIL_OAUTH_REDIRECT_URI", "http://localhost:3000/api/email/oauth/gmail/callback");

    const url = new URL(buildEmailOAuthAuthorizeUrl({ provider: "gmail", state: "state_1" }));

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("gmail-client");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("scope")).toContain("gmail.readonly");
  });

  it("uses provider-specific default callback URLs", () => {
    const config = emailOAuthConfig("outlook", "http://localhost:3001");

    expect(config.redirectUri).toBe("http://localhost:3001/api/email/oauth/outlook/callback");
    expect(config.scopes).toContain("Mail.Read");
  });

  it("normalizes supported OAuth providers", () => {
    expect(normalizeEmailOAuthProvider("gmail")).toBe("gmail");
    expect(normalizeEmailOAuthProvider("outlook")).toBe("outlook");
    expect(normalizeEmailOAuthProvider("imap")).toBeNull();
  });
});
