import JSZip from "jszip";
import type { ParsedResume } from "@/lib/resumes/schemas";

type LinkedInPosition = {
  "Company Name"?: string;
  Title?: string;
  "Started On"?: string;
  "Finished On"?: string;
  Description?: string;
  Location?: string;
  companyName?: string;
  title?: string;
  startedOn?: string;
  finishedOn?: string;
  description?: string;
  location?: string;
};

type LinkedInProfile = {
  "First Name"?: string;
  "Last Name"?: string;
  "Geo Location"?: string;
  Headline?: string;
  Summary?: string;
  firstName?: string;
  lastName?: string;
  geoLocation?: string;
  headline?: string;
  summary?: string;
};

type LinkedInEducation = {
  "School Name"?: string;
  "Degree Name"?: string;
  "Start Date"?: string;
  "End Date"?: string;
  schoolName?: string;
  degreeName?: string;
};

async function readJsonFile<T>(zip: JSZip, candidates: string[]) {
  for (const name of candidates) {
    const direct = zip.file(name);
    const matchedPath = direct ? name : Object.keys(zip.files).find((path) => path.endsWith(name));
    const file = direct ?? (matchedPath ? zip.file(matchedPath) : null);
    if (!file) continue;
    const raw = await file.async("string");
    if (!raw) continue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeArray<T>(value: T | T[] | null | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function formatLinkedInDate(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  if (/present/i.test(trimmed)) return "Present";
  const parts = trimmed.split(/[/-]/).map((part) => part.trim());
  if (parts.length >= 2) {
    const [month, year] = parts;
    if (year && month) return `${month.padStart(2, "0")}/${year}`;
  }
  return trimmed;
}

function splitDescription(description: string) {
  return description
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter((line) => line.length > 12);
}

function emptyParsedResume(): ParsedResume {
  return {
    contactInfo: {},
    professionalSummary: "",
    skills: { coreSkills: [], technicalSkills: [], toolsFrameworksLibraries: [], programmingLanguages: [] },
    workExperience: [],
    experienceBullets: [],
    projects: [],
    education: [],
    certifications: [],
    additionalSections: [],
    inferredTags: [],
    fieldsNeedingReview: [],
    confidence: 0.75,
  };
}

export async function parseLinkedInExportZip(buffer: ArrayBuffer) {
  const zip = await JSZip.loadAsync(buffer);
  const profileRecords = normalizeArray(await readJsonFile<LinkedInProfile | LinkedInProfile[]>(zip, [
    "Profile.json",
    "profile.json",
  ]));
  const positionRecords = normalizeArray(await readJsonFile<LinkedInPosition | LinkedInPosition[]>(zip, [
    "Positions.json",
    "positions.json",
    "Position.json",
  ]));
  const educationRecords = normalizeArray(await readJsonFile<LinkedInEducation | LinkedInEducation[]>(zip, [
    "Education.json",
    "education.json",
  ]));
  const certificationRecords = normalizeArray(await readJsonFile<Record<string, unknown> | Record<string, unknown>[]>(zip, [
    "Certifications.json",
    "certifications.json",
  ]));
  const skillRecords = normalizeArray(await readJsonFile<Record<string, unknown> | Record<string, unknown>[]>(zip, [
    "Skills.json",
    "skills.json",
  ]));

  if (!profileRecords.length && !positionRecords.length) {
    throw new Error("Could not find LinkedIn profile or positions data in this ZIP export.");
  }

  const profile = profileRecords[0] ?? {};
  const firstName = pickString(profile as Record<string, unknown>, ["First Name", "firstName"]);
  const lastName = pickString(profile as Record<string, unknown>, ["Last Name", "lastName"]);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const summary = pickString(profile as Record<string, unknown>, ["Summary", "summary", "Headline", "headline"]);
  const location = pickString(profile as Record<string, unknown>, ["Geo Location", "geoLocation"]);

  const workExperience = positionRecords.map((position) => {
    const company = pickString(position as Record<string, unknown>, ["Company Name", "companyName"]);
    const title = pickString(position as Record<string, unknown>, ["Title", "title"]);
    const description = pickString(position as Record<string, unknown>, ["Description", "description"]);
    const achievements = splitDescription(description);
    return {
      company: company || "Unknown company",
      title: title || "Role",
      location: pickString(position as Record<string, unknown>, ["Location", "location"]) || undefined,
      startDate: formatLinkedInDate(pickString(position as Record<string, unknown>, ["Started On", "startedOn"])),
      endDate: formatLinkedInDate(pickString(position as Record<string, unknown>, ["Finished On", "finishedOn"])),
      isCurrent: /present/i.test(pickString(position as Record<string, unknown>, ["Finished On", "finishedOn"])),
      summary: description || undefined,
      skills: [],
      achievements,
    };
  });

  const experienceBullets = workExperience.flatMap((work) =>
    work.achievements.map((text) => ({
      company: work.company,
      role: work.title,
      text,
      category: "fullstack",
      metrics: {},
      keywords: [],
      sourceText: text,
      truthLevel: "needs_review" as const,
    })),
  );

  const education = educationRecords
    .map((entry) => {
      const school = pickString(entry as Record<string, unknown>, ["School Name", "schoolName"]);
      const degree = pickString(entry as Record<string, unknown>, ["Degree Name", "degreeName"]);
      const start = pickString(entry as Record<string, unknown>, ["Start Date", "startDate"]);
      const end = pickString(entry as Record<string, unknown>, ["End Date", "endDate"]);
      const dates = [start, end].filter(Boolean).join(" – ");
      return [school, degree, dates].filter(Boolean).join(" — ");
    })
    .filter(Boolean);

  const certifications = certificationRecords
    .map((entry) => pickString(entry, ["Name", "name", "Title", "title", "Certification Name"]))
    .filter(Boolean);

  const coreSkills = skillRecords
    .map((entry) => pickString(entry, ["Name", "name", "Skill Name", "skillName"]))
    .filter(Boolean);

  const parsed: ParsedResume = {
    ...emptyParsedResume(),
    contactInfo: {
      fullName: fullName || undefined,
      location: location || undefined,
    },
    professionalSummary: summary || undefined,
    skills: {
      coreSkills,
      technicalSkills: [],
      toolsFrameworksLibraries: [],
      programmingLanguages: [],
    },
    workExperience,
    experienceBullets,
    education,
    certifications,
    confidence: 0.8,
    fieldsNeedingReview: workExperience.length ? ["Review imported LinkedIn dates and bullet grouping."] : [],
  };

  const extractedText = [
    fullName,
    summary,
    ...workExperience.map((work) => [work.company, work.title, work.startDate, work.endDate, work.summary].filter(Boolean).join(" | ")),
    ...education,
    ...certifications,
    ...coreSkills,
  ]
    .filter(Boolean)
    .join("\n");

  return { parsed, extractedText };
}
