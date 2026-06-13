import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractResumeTextFromBuffer } from "@/lib/resumes/extract";
import { CHRIS_RESUME_SNIPPET } from "@/lib/resumes/fixtures/chris-resume-snippet";
import { buildExperienceBulletsFromWork, normalizeResumeLines, parseResumeHeuristically } from "@/lib/resumes/parse";

const CHRIS_RESUME_PDF = "/Users/cseckler/Documents/Resume/AI at bottom/Chris Seckler Resume.pdf";

describe("parseResumeHeuristically", () => {
  it("parses stacked company, title, and date lines", () => {
    const parsed = parseResumeHeuristically(
      [
        "EXPERIENCE",
        "Dave.com",
        "Senior Full-stack Engineer",
        "03/2018 - 10/2019",
        "Developed suite of customer support tools that enabled quick access to and analysis of bank data.",
        "EDUCATION",
        "Art Institute",
      ].join("\n"),
    );

    const dave = parsed.workExperience.find((work) => work.company === "Dave.com");
    expect(dave?.title).toBe("Senior Full-stack Engineer");
    expect(dave?.achievements).toHaveLength(1);
  });

  it("keeps deployment achievement bullets under the current role", () => {
    const parsed = parseResumeHeuristically(
      [
        "EXPERIENCE",
        "United States Army Reserve",
        "Team Leader - Sergeant",
        "06/2002 - 06/2010",
        "As a leader in the US Army, I oversaw and directed soldiers in a variety of situations in non-combat operations.",
        "Supervised and delegated tasks to 12 lower enlisted soldiers, resulting in increased productivity and successful mission accomplishment.",
        "Conducted and oversaw patrols, convoy operations, and traffic control points, ensuring the safety and security of personnel and equipment.",
        "Deployed in Operation Iraqi Freedom, March 2003 - July 2004.",
        "EDUCATION",
        "Art Institute",
      ].join("\n"),
    );

    expect(parsed.workExperience).toHaveLength(1);
    const army = parsed.workExperience[0];
    expect(army?.company).toBe("United States Army Reserve");
    expect(army?.achievements.some((bullet) => /Deployed in Operation Iraqi Freedom/i.test(bullet))).toBe(true);
    expect(parsed.workExperience.some((work) => /Operation Iraqi Freedom/i.test(work.company))).toBe(false);
  });

  it("parses supplemental sections without creating phantom jobs", () => {
    const parsed = parseResumeHeuristically(CHRIS_RESUME_SNIPPET);

    expect(parsed.workExperience).toHaveLength(3);
    expect(parsed.workExperience.map((work) => work.company)).toEqual([
      "Aerospike",
      "Dave.com",
      "United States Army Reserve",
    ]);
    expect(parsed.workExperience.some((work) => /HuntCalm|NumPy|Art Institute|Exact Recall/i.test(work.company))).toBe(false);

    expect(parsed.education.some((line) => /Art Institute/i.test(line))).toBe(true);
    expect(parsed.education.some((line) => /Bootcamp/i.test(line))).toBe(false);

    expect(parsed.additionalSections).toHaveLength(1);
    expect(parsed.additionalSections[0]?.title).toMatch(/AI ENGINEERING/i);
    expect(parsed.additionalSections[0]?.content).toMatch(/Bootcamp/i);

    expect(parsed.projects).toHaveLength(4);
    expect(parsed.projects.map((project) => project.name)).toEqual([
      "HuntCalm",
      "NumPy Dojo",
      "Exact Recall",
      "Tag My Web",
    ]);
    expect(parsed.projects[1]?.url).toBe("https://numpydojo.com");
  });

  it("extracts stacked job headers, dates, and achievement bullets from the Chris resume", async () => {
    if (!existsSync(CHRIS_RESUME_PDF)) {
      return;
    }

    const buffer = readFileSync(CHRIS_RESUME_PDF);
    const text = await extractResumeTextFromBuffer(buffer, "Chris Seckler Resume.pdf", "application/pdf");
    const lines = normalizeResumeLines(text);
    const experienceStart = lines.findIndex((line) => line === "EXPERIENCE");
    const educationIndex = lines.findIndex((line, index) => index > experienceStart && line === "EDUCATION");
    const experienceLines = lines.slice(experienceStart + 1, educationIndex);
    expect(experienceLines.some((line) => line === "Dave.com")).toBe(true);
    expect(experienceLines.some((line) => line.includes("Jest Dave.com"))).toBe(false);

    expect(experienceLines.some((line) => /^Technologies used:/i.test(line))).toBe(true);
    expect(experienceLines.some((line) => line === "TECHNOLOGIES")).toBe(false);

    const parsed = parseResumeHeuristically(text);
    expect(parsed.contactInfo.fullName).toContain("Christopher Seckler");
    expect(parsed.professionalSummary).toMatch(/15\+ years/i);
    expect(parsed.workExperience.length).toBeGreaterThanOrEqual(8);
    expect(parsed.experienceBullets.length).toBeGreaterThanOrEqual(30);

    const aerospike = parsed.workExperience.find((work) => work.company === "Aerospike");
    expect(aerospike?.title).toContain("Senior Front-End Engineer");
    expect(aerospike?.startDate).toBe("09/2024");
    expect(aerospike?.endDate).toBe("01/2026");
    expect(aerospike?.achievements.length).toBeGreaterThanOrEqual(5);

    const dave = parsed.workExperience.find((work) => work.company.includes("Dave"));
    expect(dave?.achievements.some((bullet) => /tools that enabled/i.test(bullet))).toBe(true);
    expect(dave?.achievements.some((bullet) => /scripts for customer tickets/i.test(bullet))).toBe(true);

    const toucan = parsed.workExperience.find((work) => work.company === "Toucan");
    expect(toucan?.achievements.some((bullet) => /RFCs/i.test(bullet))).toBe(true);

    const aerospikeBullets = parsed.experienceBullets.filter((bullet) => bullet.company === "Aerospike");
    expect(aerospikeBullets.length).toBe(aerospike?.achievements.length);
    expect(aerospikeBullets.every((bullet) => bullet.role.includes("Senior Front-End Engineer"))).toBe(true);
  });
});

describe("buildExperienceBulletsFromWork", () => {
  it("preserves category and keywords when achievement text is edited", () => {
    const previous = [
      {
        company: "Aerospike",
        role: "Senior Engineer",
        text: "Built dashboards",
        category: "visualization",
        metrics: {},
        keywords: ["React"],
        sourceText: "Built dashboards",
        truthLevel: "verified" as const,
      },
    ];
    const work = [
      {
        company: "Aerospike",
        title: "Senior Engineer",
        achievements: ["Built interactive dashboards"],
      },
    ];

    const synced = buildExperienceBulletsFromWork(work, [], previous);
    expect(synced).toHaveLength(1);
    expect(synced[0]?.text).toBe("Built interactive dashboards");
    expect(synced[0]?.category).toBe("visualization");
    expect(synced[0]?.keywords).toEqual(["React"]);
  });
});
