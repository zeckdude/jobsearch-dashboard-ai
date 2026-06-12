import { describe, expect, it } from "vitest";
import { hasExpiredJobPostingMetadata, isClosedListingText } from "@/lib/job-search/url-health";

describe("isClosedListingText", () => {
  it("detects NoDesk closed banner after large HTML prefix", () => {
    const prefix = "x".repeat(19_000);
    const html = `${prefix}<p>Looks like this career opportunity is no longer available. We know this isn't what you were hoping for.</p>`;
    expect(isClosedListingText(html)).toBe(true);
  });

  it("detects expired schema.org validThrough dates", () => {
    const html = `{"@type":"JobPosting","validThrough":"2025-01-16","title":"Frontend Engineer"}`;
    expect(hasExpiredJobPostingMetadata(html, Date.parse("2026-06-01"))).toBe(true);
  });

  it("returns false for active listings", () => {
    const html = `<html><body><h1>Frontend Engineer</h1><p>Apply now</p></body></html>`;
    expect(isClosedListingText(html)).toBe(false);
  });
});
