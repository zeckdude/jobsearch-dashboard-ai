import { describe, expect, it } from "vitest";
import { isNavItemActive, navSections } from "@/lib/navigation";

describe("navigation active state", () => {
  const reviewMatches = navSections.flatMap((section) => section.items).find((item) => item.href === "/jobs");
  const favorites = navSections.flatMap((section) => section.items).find((item) => item.href === "/jobs/favorites");

  it("highlights Review Matches for /jobs and job detail pages", () => {
    expect(reviewMatches).toBeDefined();
    expect(isNavItemActive("/jobs", reviewMatches!)).toBe(true);
    expect(isNavItemActive("/jobs/job_123", reviewMatches!)).toBe(true);
  });

  it("does not highlight Review Matches on the favorites page", () => {
    expect(isNavItemActive("/jobs/favorites", reviewMatches!)).toBe(false);
  });

  it("highlights Favorites only on /jobs/favorites", () => {
    expect(favorites).toBeDefined();
    expect(isNavItemActive("/jobs/favorites", favorites!)).toBe(true);
    expect(isNavItemActive("/jobs", favorites!)).toBe(false);
    expect(isNavItemActive("/jobs/job_123", favorites!)).toBe(false);
  });

  const searchProfiles = navSections.flatMap((section) => section.items).find((item) => item.href === "/profiles");

  it("highlights Search Profiles on profile detail and edit routes", () => {
    expect(searchProfiles).toBeDefined();
    expect(isNavItemActive("/profiles", searchProfiles!)).toBe(true);
    expect(isNavItemActive("/profiles/profile_123", searchProfiles!)).toBe(true);
    expect(isNavItemActive("/profiles/profile_123/edit", searchProfiles!)).toBe(true);
  });
});
