import { describe, expect, it } from "vitest";
import {
  cleanupExtractedResumeText,
  dedupeWorkAchievements,
  formatExtractedResumeLayout,
} from "@/lib/resumes/extract-cleanup";

describe("cleanupExtractedResumeText", () => {
  it("fixes known grammar issues and RFC pluralization", () => {
    const input = [
      "Developed suite of customer support tools in that enabled quick access.",
      "Wrote automated scripts to customer tickets.",
      "Wrote RFC's to identify bottlenecks.",
    ].join("\n");

    const output = cleanupExtractedResumeText(input);
    expect(output).toContain("tools that enabled");
    expect(output).toContain("scripts for customer tickets");
    expect(output).toContain("RFCs");
  });
});

describe("formatExtractedResumeLayout", () => {
  it("splits embedded section headers and adds blank lines before sections", () => {
    const output = formatExtractedResumeLayout(
      [
        "Christopher Seckler",
        "Senior Front-End Engineer",
        "CONTACT INFO",
        "Phone:   650-339-1655",
        "TECHNOLOGIES   Frontend",
        "React, TypeScript",
        "EXPERIENCE   Aerospike",
        "Senior Front-End Engineer (Cloud Team)",
      ].join("\n"),
    );

    expect(output).toContain("Christopher Seckler\nSenior Front-End Engineer\n\nCONTACT INFO");
    expect(output).toContain("Phone: 650-339-1655");
    expect(output).toContain("\n\nTECHNOLOGIES\nFrontend");
    expect(output).toContain("\n\nEXPERIENCE\nAerospike");
  });

  it("merges split AI section headers and page-break sentence fragments", () => {
    const output = formatExtractedResumeLayout(
      [
        "EDUCATION   Art Institute of California - Orange County",
        "AI ENGINEERING &",
        "MODERN",
        "DEVELOPMENT",
        "Currently completing the bootcamp.",
        "Built to categorize or find",
        "",
        "them. Designed and built end-to-end.",
      ].join("\n"),
    );

    expect(output).toContain("\n\nAI ENGINEERING & MODERN DEVELOPMENT\n");
    expect(output).toContain("categorize or find them. Designed");
    expect(output).not.toContain("MODERN\nDEVELOPMENT");
  });

  it("adds blank lines before each experience and project entry", () => {
    const output = formatExtractedResumeLayout(
      [
        "EXPERIENCE",
        "Aerospike",
        "Senior Front-End Engineer (Cloud Team)",
        "09/2024 - 01/2026",
        "Owned the Cloud console.",
        "Adim",
        "Senior Front-End Engineer",
        "05/2023 - 03/2024",
        "Led the design system.",
        "PROJECTS",
        "HuntCalm",
        "A Chrome extension built to solve a problem.",
        "NumPy Dojo",
        "numpydojo.com",
        "Built while completing an AI engineering bootcamp.",
      ].join("\n"),
    );

    expect(output).toContain("09/2024 - 01/2026\nOwned the Cloud console.\n\nAdim");
    expect(output).toContain("Led the design system.\n\nPROJECTS");
    expect(output).toContain("A Chrome extension built to solve a problem.\n\nNumPy Dojo");
  });
});

describe("dedupeWorkAchievements", () => {
  it("removes near-duplicate bullets for the same role", () => {
    const achievements = [
      "Led integration of the ACMS console into the main Cloud platform, enabling successful customer migrations.",
      "Rebuilt and integrated the ACMS console into the main Cloud console under tight deadlines, enabling customer migrations.",
      "Owned the front-end architecture of Aerospike's Cloud console used by enterprise customers to manage distributed databases.",
    ];

    expect(dedupeWorkAchievements(achievements)).toHaveLength(2);
  });
});
