import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/resumes/extract", () => {
  it("extracts and parses resume text without writing to the database", async () => {
    const resumeText = [
      "Alex Rivera",
      "alex@example.com",
      "EXPERIENCE",
      "Acme",
      "Senior Engineer",
      "01/2020 - 12/2024",
      "Built customer dashboards with React and TypeScript.",
      "EDUCATION",
      "State University",
    ].join("\n");

    const response = await POST(
      new Request("http://localhost/api/resumes/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: "resume.txt",
          fileType: "text/plain",
          base64: Buffer.from(resumeText).toString("base64"),
        }),
      }),
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.extractedText).toContain("Alex Rivera");
    expect(payload.parsedJson.workExperience.length).toBeGreaterThan(0);
    expect(payload.upload).toBeUndefined();
  });
});
