import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractResumeTextFromBuffer } from "@/lib/resumes/extract";

const CHRIS_RESUME_PDF = "/Users/cseckler/Documents/Resume/AI at bottom/Chris Seckler Resume.pdf";

describe("extractResumeTextFromBuffer PDF ligatures", () => {
  it("repairs corrupted ligatures in the Chris Seckler resume fixture", async () => {
    if (!existsSync(CHRIS_RESUME_PDF)) {
      return;
    }

    const buffer = readFileSync(CHRIS_RESUME_PDF);
    const text = await extractResumeTextFromBuffer(buffer, "Chris Seckler Resume.pdf", "application/pdf");

    expect(text).toContain("Christopher Seckler");
    expect(text).toContain("chrisseckler@gmail.com");
    expect(text).toContain("650-339-1655");
    expect(text).toContain("applications");
    expect(text).toContain("platforms");
    expect(text).toContain("Testing");
    expect(text).toContain("Software");
    expect(text).toContain("patterns");
    expect(text).toContain("Institute");
    expect(text).toContain("Interactive");
    expect(text).toContain("notifications");
    expect(text).toContain("Node/Express");
    expect(text).toContain("09/2024 - 01/2026");
    expect(text).toContain("Aerospike");
    expect(text).toContain("HuntCalm");
    expect(text).toContain("NumPy Dojo");
    expect(text).toContain("Exact Recall");
    expect(text).toContain("Tag My Web");

    expect(text).not.toMatch(/[\u001d\u0002]/);
    expect(text).not.toContain("pla)orm");
    expect(text).not.toContain("Tes$ng");
    expect(text).not.toContain("So/ware");
    expect(text).not.toContain("soPware");
    expect(text).not.toContain("paEern");

    expect(text).toContain("\n\nTECHNOLOGIES\n");
    expect(text).toContain("\n\nEXPERIENCE\n\nAerospike");
    expect(text).toContain("\n\nEDUCATION\nArt Institute");
    expect(text).toContain("\n\nAI ENGINEERING & MODERN DEVELOPMENT\n");
    expect(text).toContain("\n\nPROJECTS\n\nHuntCalm");
    expect(text).toMatch(/categorize or find them\./i);
    expect(text).not.toMatch(/\nMODERN\nDEVELOPMENT/);
    expect(text).toMatch(/productivity\.\n\nAdim\n/);
    expect(text).toMatch(/already working\.\n\nNumPy Dojo\n/);
    expect(text).toMatch(/PROJECTS\n\nHuntCalm\n/);
  });
});
