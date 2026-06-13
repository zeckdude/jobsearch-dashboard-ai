import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/resumes/preview/pdf", () => {
  it("returns a PDF for a valid preview request", async () => {
    const response = await POST(new Request("http://localhost/api/resumes/preview/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preset: "metro",
        profile: {
          fullName: "Alex Rivera",
          email: "alex@example.com",
          professionalSummary: "Senior engineer with product delivery experience.",
          coreSkills: ["React", "TypeScript"],
          technicalSkills: ["Next.js"],
        },
        bullets: [
          {
            company: "Acme",
            role: "Senior Engineer",
            text: "Led migration of customer dashboard to React.",
            truthLevel: "verified",
            category: "frontend",
          },
        ],
      }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(Number(response.headers.get("x-ats-score"))).toBeGreaterThan(0);
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it("returns a PDF for plain text preview requests", async () => {
    const response = await POST(new Request("http://localhost/api/resumes/preview/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        preset: "compact",
        plainText: [
          "Alex Rivera",
          "alex@example.com",
          "",
          "Summary",
          "Senior engineer.",
          "",
          "Skills",
          "React, TypeScript",
          "",
          "Professional Experience",
          "Acme - Senior Engineer | 2021 - Present",
          "- Led migration of customer dashboard to React.",
        ].join("\n"),
      }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it("rejects invalid preview requests", async () => {
    const response = await POST(new Request("http://localhost/api/resumes/preview/pdf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile: { fullName: "", email: "not-an-email" }, bullets: [] }),
    }));

    expect(response.status).toBe(400);
  });
});
