import { describe, expect, it } from "vitest";
import { atsScoreLabel, checkAtsReadability, normalizeAtsReport } from "@/lib/resumes/ats";

describe("checkAtsReadability", () => {
  const strongResume = [
    "Alex Rivera",
    "alex@example.com",
    "Summary",
    "Senior engineer with delivery experience.",
    "Skills",
    "React, TypeScript, Node.js",
    "Professional Experience",
    "Acme — Senior Engineer",
    "Led migration of customer dashboard to React.",
  ].join("\n");

  it("returns a perfect score for a complete resume", () => {
    const report = checkAtsReadability(strongResume);
    expect(report.score).toBe(100);
    expect(report.factors.filter((factor) => factor.status === "fail")).toHaveLength(0);
    expect(report.acceptableScore).toBe(76);
    expect(report.strongScore).toBe(88);
  });

  it("deducts points for each missing required section", () => {
    const report = checkAtsReadability("Short text without sections.");
    expect(report.score).toBeLessThan(76);
    expect(report.factors.some((factor) => factor.id === "section-summary" && factor.status === "fail")).toBe(true);
  });

  it("normalizes legacy reports without factors", () => {
    const normalized = normalizeAtsReport({
      score: 88,
      sectionsDetected: ["Summary", "Skills", "Professional Experience"],
      missingSections: [],
      warnings: [],
      textExtractable: true,
      contactInfoDetected: true,
      extractedTextLength: 500,
    });
    expect(normalized?.factors.length).toBeGreaterThan(0);
  });
});

describe("atsScoreLabel", () => {
  it("labels score bands", () => {
    expect(atsScoreLabel(95)).toBe("Strong");
    expect(atsScoreLabel(80)).toBe("Acceptable");
    expect(atsScoreLabel(60)).toBe("Needs work");
  });
});
