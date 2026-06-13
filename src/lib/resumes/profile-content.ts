import type { ParsedResume } from "@/lib/resumes/schemas";

export type ProfileContentSnapshot = {
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  professionalSummary: string | null;
  coreSkills: string[];
  bullets: Array<{ id: string; company: string; role: string; text: string; category: string }>;
  workExperiences: Array<{ id: string; company: string; title: string; startDate: string | null; endDate: string | null }>;
  projects: Array<{ id: string; name: string; description: string | null }>;
  education: string[];
  certifications: string[];
  additionalSections: Array<{ title: string; content: string }>;
};

export function profileHasContent(snapshot: ProfileContentSnapshot): boolean {
  if (snapshot.bullets.some((bullet) => bullet.text.trim())) return true;
  if (snapshot.workExperiences.some((work) => work.company.trim() || work.title.trim())) return true;
  if (snapshot.projects.some((project) => project.name.trim())) return true;
  if (snapshot.education.some((line) => line.trim())) return true;
  if (snapshot.certifications.some((line) => line.trim())) return true;
  if (snapshot.additionalSections.some((section) => section.title.trim() || section.content.trim())) return true;
  if (snapshot.professionalSummary?.trim()) return true;
  if (snapshot.coreSkills.length > 0) return true;
  if (snapshot.fullName.trim() && snapshot.fullName !== "Unknown") return true;
  return false;
}

export function normalizeJobKey(company: string, title: string) {
  return `${company}`.toLowerCase().replace(/\s+/g, " ").trim() + "|" + `${title}`.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeBulletText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function profileHasDuplicateSources(workExperiences: Array<{ sourceResumeUploadId: string | null }>) {
  const uploadIds = new Set(workExperiences.map((work) => work.sourceResumeUploadId).filter(Boolean));
  return uploadIds.size > 1;
}

export function parsedToProfileSnapshot(parsed: ParsedResume, email: string): Omit<ProfileContentSnapshot, "bullets" | "workExperiences" | "projects"> & {
  workExperience: ParsedResume["workExperience"];
  experienceBullets: ParsedResume["experienceBullets"];
  projects: ParsedResume["projects"];
} {
  return {
    fullName: parsed.contactInfo.fullName ?? "",
    email: parsed.contactInfo.email ?? email,
    phone: parsed.contactInfo.phone ?? null,
    location: parsed.contactInfo.location ?? null,
    linkedinUrl: parsed.contactInfo.linkedinUrl ?? null,
    githubUrl: parsed.contactInfo.githubUrl ?? null,
    portfolioUrl: parsed.contactInfo.portfolioUrl ?? null,
    professionalSummary: parsed.professionalSummary ?? null,
    coreSkills: parsed.skills.coreSkills,
    workExperience: parsed.workExperience,
    experienceBullets: parsed.experienceBullets,
    projects: parsed.projects,
    education: parsed.education,
    certifications: parsed.certifications,
    additionalSections: parsed.additionalSections,
  };
}
