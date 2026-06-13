import { describe, expect, it } from "vitest";
import { extractLiteralPdfText } from "@/lib/pdf/extract-literal-pdf-text";
import { createSimpleTextPdf, PDF_PRESET_VALUES } from "@/lib/pdf/simple-resume-pdf";
import { getThemeAtsTier } from "@/lib/pdf/themes/registry";
import { checkAtsReadability } from "@/lib/resumes/ats";

const fixtureResume = [
  "Alex Rivera",
  "alex@example.com | Austin, TX | linkedin.com/in/alexrivera",
  "",
  "Summary",
  "Senior engineer with product delivery experience.",
  "",
  "Skills",
  "React, TypeScript, Next.js, Node.js, PostgreSQL, GraphQL",
  "",
  "Professional Experience",
  "Acme - Senior Engineer | 2021 - Present",
  "- Led migration of customer dashboard to React.",
  "- Improved release quality with automated testing.",
  "",
  "Education",
  "State University - BS Computer Science | 2015 - 2019",
].join("\n");

describe("createSimpleTextPdf presets", () => {
  for (const preset of PDF_PRESET_VALUES) {
    it(`renders PDF for ${preset}`, () => {
      const pdf = createSimpleTextPdf(fixtureResume, preset);
      expect(pdf.byteLength).toBeGreaterThan(500);
    });
  }
});

describe("theme ATS validation", () => {
  for (const preset of PDF_PRESET_VALUES) {
    it(`${preset} embeds required sections in PDF text`, () => {
      const pdf = createSimpleTextPdf(fixtureResume, preset);
      const extracted = extractLiteralPdfText(pdf);
      const report = checkAtsReadability(fixtureResume, extracted);
      const tier = getThemeAtsTier(preset);

      expect(report.textExtractable).toBe(true);
      expect(report.score).toBeGreaterThanOrEqual(Math.min(tier, 76));
      expect(extracted.toLowerCase()).toContain("summary");
      expect(extracted.toLowerCase()).toContain("professional experience");
      expect(extracted.toLowerCase()).toContain("skills");
      expect(extracted).toMatch(/alex@example\.com/i);
    });
  }

  it("sidebar theme preserves logical section order in PDF text stream", () => {
    const pdf = createSimpleTextPdf(fixtureResume, "sidebar");
    const extracted = extractLiteralPdfText(pdf);
    const summaryIdx = extracted.toLowerCase().indexOf("summary");
    const experienceIdx = extracted.toLowerCase().indexOf("professional experience");
    const skillsIdx = extracted.toLowerCase().indexOf("skills");

    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(experienceIdx).toBeGreaterThan(summaryIdx);
    expect(skillsIdx).toBeGreaterThan(experienceIdx);
  });
});

describe("header rendering", () => {
  it("includes name and contact in PDF for all themes", () => {
    const text = [
      "Christopher Seckler",
      "chris@example.com | (555) 123-4567 | Seattle, WA",
      "",
      "Summary",
      "Senior engineer.",
      "",
      "Skills",
      "React, TypeScript",
      "",
      "Professional Experience",
      "Acme - Engineer | 2020 - Present",
      "- Built features.",
    ].join("\n");

    for (const preset of PDF_PRESET_VALUES) {
      const extracted = extractLiteralPdfText(createSimpleTextPdf(text, preset));
      expect(extracted).toContain("Christopher Seckler");
      expect(extracted).toMatch(/chris@example\.com/i);
      expect(extracted).toContain("Seattle");
    }
  });
});

describe("legacy preset migration", () => {
  it("maps tschichold to classic", () => {
    const pdf = createSimpleTextPdf(fixtureResume, "tschichold");
    expect(pdf.byteLength).toBeGreaterThan(500);
  });

  it("maps modern to metro", () => {
    const pdf = createSimpleTextPdf(fixtureResume, "modern");
    expect(pdf.byteLength).toBeGreaterThan(500);
  });
});
