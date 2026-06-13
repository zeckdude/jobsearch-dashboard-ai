import { describe, expect, it } from "vitest";
import { normalizePdfLigatures } from "@/lib/resumes/pdf-ligatures";

describe("normalizePdfLigatures", () => {
  it("repairs ti ligatures encoded as control characters", () => {
    expect(normalizePdfLigatures("applica\u001dons and mul\u001dple")).toBe("applications and multiple");
    expect(normalizePdfLigatures("produc\u001don")).toBe("production");
  });

  it("repairs ft ligatures encoded as )", () => {
    expect(normalizePdfLigatures("Cloud pla)orms")).toBe("Cloud platforms");
    expect(normalizePdfLigatures("React (Redux), MySQL")).toBe("React (Redux), MySQL");
  });

  it("repairs ti ligatures encoded as $", () => {
    expect(normalizePdfLigatures("Tes$ng and Analy$cs")).toBe("Testing and Analytics");
    expect(normalizePdfLigatures("Art Ins$tute of Interac$ve Media")).toBe(
      "Art Institute of Interactive Media",
    );
  });

  it("repairs tt ligatures encoded as E", () => {
    expect(normalizePdfLigatures("paEerns and beEer boElenecks")).toBe("patterns and better bottlenecks");
    expect(normalizePdfLigatures("aEach freeform notes")).toBe("attach freeform notes");
  });

  it("repairs ft ligatures encoded as P or /", () => {
    expect(normalizePdfLigatures("high-quality soPware")).toBe("high-quality software");
    expect(normalizePdfLigatures("Senior So/ware Engineer")).toBe("Senior Software Engineer");
    expect(normalizePdfLigatures("built aPer finding")).toBe("built after finding");
  });

  it("preserves legitimate slashes in dates and stacks", () => {
    expect(normalizePdfLigatures("09/2024 - 01/2026")).toBe("09/2024 - 01/2026");
    expect(normalizePdfLigatures("Node/Express, PostgreSQL")).toBe("Node/Express, PostgreSQL");
    expect(normalizePdfLigatures("AND/OR logic")).toBe("AND/OR logic");
  });

  it("does not corrupt WordPress or NumPy", () => {
    expect(normalizePdfLigatures("WordPress, Stripe")).toBe("WordPress, Stripe");
    expect(normalizePdfLigatures("NumPy Dojo")).toBe("NumPy Dojo");
  });
});
