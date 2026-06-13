import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseLinkedInExportZip } from "@/lib/resumes/parse-linkedin-export";

async function buildFixtureZip() {
  const zip = new JSZip();
  zip.file(
    "Profile.json",
    JSON.stringify({
      "First Name": "Alex",
      "Last Name": "Rivera",
      Summary: "Senior engineer focused on React platforms.",
      "Geo Location": "San Francisco, CA",
    }),
  );
  zip.file(
    "Positions.json",
    JSON.stringify([
      {
        "Company Name": "Acme Corp",
        Title: "Senior Engineer",
        "Started On": "01/2020",
        "Finished On": "Present",
        Description: "Built React dashboards.\n- Improved performance by 30%.",
      },
    ]),
  );
  zip.file(
    "Education.json",
    JSON.stringify([
      {
        "School Name": "State University",
        "Degree Name": "B.S. Computer Science",
      },
    ]),
  );
  zip.file(
    "Skills.json",
    JSON.stringify([{ Name: "React" }, { Name: "TypeScript" }]),
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseLinkedInExportZip", () => {
  it("maps LinkedIn export JSON files into ParsedResume", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseLinkedInExportZip(buffer);

    expect(result.parsed.contactInfo.fullName).toBe("Alex Rivera");
    expect(result.parsed.professionalSummary).toContain("React platforms");
    expect(result.parsed.workExperience).toHaveLength(1);
    expect(result.parsed.workExperience[0]).toMatchObject({
      company: "Acme Corp",
      title: "Senior Engineer",
      startDate: "01/2020",
    });
    expect(result.parsed.experienceBullets.length).toBeGreaterThan(0);
    expect(result.parsed.education[0]).toContain("State University");
    expect(result.parsed.skills.coreSkills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
  });

  it("throws when export is missing recognizable files", async () => {
    const zip = new JSZip();
    zip.file("README.txt", "not linkedin data");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    await expect(parseLinkedInExportZip(buffer)).rejects.toThrow(/Could not find LinkedIn/);
  });
});
