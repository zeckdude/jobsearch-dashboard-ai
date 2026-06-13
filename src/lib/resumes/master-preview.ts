import type { ExperienceBullet, Project, UserProfile, WorkExperience } from "@prisma/client";
import { jsonArray } from "@/lib/json";

export type MasterPreviewBullet = Pick<ExperienceBullet, "company" | "role" | "text" | "truthLevel" | "category">;
export type MasterPreviewWork = Pick<
  WorkExperience,
  "company" | "title" | "startDate" | "endDate" | "isCurrent" | "summary" | "skills" | "achievements" | "createdAt"
>;
export type MasterPreviewProject = Pick<Project, "name" | "description" | "technologies">;

export type MasterPreviewProfile = Pick<
  UserProfile,
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "linkedinUrl"
  | "githubUrl"
  | "portfolioUrl"
  | "professionalSummary"
  | "masterSummary"
  | "coreSkills"
  | "technicalSkills"
>;

export type BuildMasterResumeInput = {
  profile: MasterPreviewProfile;
  bullets: MasterPreviewBullet[];
  workExperiences?: MasterPreviewWork[];
  projects?: MasterPreviewProject[];
  education?: string[];
  certifications?: string[];
  additionalSections?: Array<{ title: string; content: string }>;
};

export function buildMasterResumePlainText(input: BuildMasterResumeInput): string {
  const verifiedBullets = input.bullets.filter((bullet) => bullet.truthLevel === "verified");
  const bullets = uniqueBullets(verifiedBullets);
  const skills = uniqueStrings([
    ...jsonArray(input.profile.coreSkills),
    ...jsonArray(input.profile.technicalSkills),
  ]);
  const summary = (input.profile.professionalSummary ?? input.profile.masterSummary ?? "").trim()
    || "Experienced professional with a verified track record across product engineering and delivery.";
  const contactLine = [
    input.profile.email,
    input.profile.phone,
    input.profile.location,
    input.profile.linkedinUrl,
    githubProfileUrl(input.profile.githubUrl),
    input.profile.portfolioUrl,
  ]
    .filter((value) => value && value !== "https://")
    .join(" | ");

  const workExperiences = (input.workExperiences ?? []).map((work) => ({
    ...work,
    createdAt: work.createdAt ?? new Date(0),
  }));

  const projects = (input.projects ?? []).slice(0, 6);
  const education = input.education ?? [];
  const certifications = input.certifications ?? [];
  const additionalSections = input.additionalSections ?? [];

  const markdownResume = [
    `# ${input.profile.fullName}`,
    contactLine,
    "",
    "## Summary",
    summary,
    "",
    "## Skills",
    skills.length ? skills.join(", ") : "Product engineering, collaboration, delivery",
    "",
    "## Professional Experience",
    ...formatExperience(bullets, workExperiences),
    ...(education.length ? ["", "## Education", ...education.map((item) => `- ${item}`)] : []),
    ...additionalSections.flatMap((section) => {
      if (!section.title.trim() && !section.content.trim()) return [];
      return ["", `## ${section.title.trim()}`, ...section.content.split("\n").map((line) => line.trim()).filter(Boolean)];
    }),
    ...(projects.length
      ? [
          "",
          "## Projects",
          ...projects.map((project) => {
            const techs = jsonArray(project.technologies);
            const techStr = techs.length ? ` | ${techs.join(", ")}` : "";
            return `- ${project.name}: ${project.description ?? ""}${techStr}`;
          }),
        ]
      : []),
    ...(certifications.length ? ["", "## Certifications", ...certifications.map((item) => `- ${item}`)] : []),
  ].join("\n");

  return markdownResume.replace(/^#+\s/gm, "").trimEnd();
}

function formatExperience(bullets: MasterPreviewBullet[], workExperiences: MasterPreviewWork[]) {
  const chronologicalWork = sortWorkExperiences(workExperiences);
  const workByKey = new Map(chronologicalWork.map((work) => [workKey(work.company, work.title), work]));
  const groups = new Map<string, MasterPreviewBullet[]>();

  for (const bullet of bullets) {
    const key = workKey(bullet.company, bullet.role);
    groups.set(key, [...(groups.get(key) ?? []), bullet]);
  }

  for (const work of chronologicalWork) {
    const key = workKey(work.company, work.title);
    if (!groups.has(key)) groups.set(key, []);
  }

  const groupEntries = Array.from(groups.entries()).sort(([leftKey], [rightKey]) => {
    const leftWork = workByKey.get(leftKey);
    const rightWork = workByKey.get(rightKey);
    const leftDate = workSortValue(leftWork);
    const rightDate = workSortValue(rightWork);
    if (leftDate !== rightDate) return rightDate - leftDate;
    return leftKey.localeCompare(rightKey);
  });

  return groupEntries.flatMap(([key, group]) => {
    const work = workByKey.get(key);
    const [company, role] = work ? [work.company, work.title] : displayKeyParts(key);
    const dates = work?.startDate || work?.endDate ? ` | ${[work.startDate, work.endDate].filter(Boolean).join(" - ")}` : "";
    const bulletsForRole = group.length
      ? group.flatMap((bullet) => {
          const depth = bullet.text.length - bullet.text.trimStart().length;
          const text = bullet.text.trim();
          const prefix = depth >= 2 ? "  " : "";
          return [`${prefix}- ${text}`];
        })
      : fallbackWorkBullets(work).map((bullet) => `- ${bullet}`);
    return [`### ${company} - ${role}${dates}`, ...bulletsForRole, ""];
  });
}

function fallbackWorkBullets(work: MasterPreviewWork | undefined) {
  if (!work) return ["Held a verified role in employment history."];
  const achievements = jsonArray(work.achievements).filter(Boolean);
  if (achievements.length) return achievements.slice(0, 2);
  if (work.summary?.trim()) return [work.summary.trim()];
  const skills = jsonArray(work.skills).slice(0, 6);
  if (skills.length) return [`Worked across ${skills.join(", ")} in this verified role.`];
  return ["Verified role included for employment-history continuity."];
}

function sortWorkExperiences(workExperiences: MasterPreviewWork[]) {
  const seen = new Set<string>();
  return [...workExperiences]
    .sort((a, b) => {
      const dateDiff = workSortValue(b) - workSortValue(a);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .filter((work) => {
      const key = `${workKey(work.company, work.title)}|${work.startDate ?? ""}|${work.endDate ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function workSortValue(work: MasterPreviewWork | undefined) {
  if (!work) return 0;
  return Math.max(parseResumeDate(work.endDate, work.isCurrent), parseResumeDate(work.startDate, false));
}

function parseResumeDate(value: string | null | undefined, isCurrent: boolean) {
  if (isCurrent || /present|current|now/i.test(value ?? "")) return 999999;
  if (!value) return 0;
  const match = value.match(/(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(\d{4})/i);
  if (!match) return 0;
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const month = match[1] ? months[match[1].toLowerCase()] ?? 12 : 12;
  return Number(match[2]) * 100 + month;
}

function workKey(company: string, title: string) {
  return `${normalizeWorkKey(company)}|${normalizeWorkKey(title)}`;
}

function normalizeWorkKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function displayKeyParts(key: string) {
  const [company, role] = key.split("|");
  return [titleCase(company), titleCase(role)];
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function githubProfileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("github.com")) return url;
    const username = u.pathname.split("/").filter(Boolean)[0];
    return username ? `github.com/${username}` : null;
  } catch {
    return url;
  }
}

function uniqueBullets(bullets: MasterPreviewBullet[]) {
  const seen = new Set<string>();
  return bullets.filter((bullet) => {
    const key = bullet.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
