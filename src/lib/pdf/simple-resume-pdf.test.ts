import { describe, expect, it } from "vitest";
import { createSimpleTextPdf, normalizePdfPreset, PDF_PRESET_VALUES } from "@/lib/pdf/simple-resume-pdf";

describe("normalizePdfPreset", () => {
  it("maps legacy presets", () => {
    expect(normalizePdfPreset("tschichold")).toBe("classic");
    expect(normalizePdfPreset("swiss")).toBe("metro");
    expect(normalizePdfPreset("modern")).toBe("metro");
  });

  it("defaults unknown to atelier", () => {
    expect(normalizePdfPreset("unknown")).toBe("atelier");
  });
});

describe("PDF_PRESET_VALUES", () => {
  it("includes 10 themes", () => {
    expect(PDF_PRESET_VALUES).toHaveLength(10);
  });

  it("renders each preset", () => {
    const text = "Jane Doe\njane@example.com\n\nSummary\nEngineer.\n\nSkills\nReact\n\nProfessional Experience\nAcme - Engineer | 2020 - Present\n- Built features.";
    for (const preset of PDF_PRESET_VALUES) {
      expect(createSimpleTextPdf(text, preset).byteLength).toBeGreaterThan(400);
    }
  });
});
