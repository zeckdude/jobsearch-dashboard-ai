import { dedupeWorkAchievements } from "@/lib/resumes/extract-cleanup";
import { parseUploadedResumeSchema, type ParsedResume } from "./schemas";

const skillTerms = [
  "React",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "React Native",
  "Redux",
  "Redux-Saga",
  "Material UI",
  "Storybook",
  "React Hook Form",
  "Jest",
  "Playwright",
  "OpenAPI",
  "API integrations",
  "Mock Service Worker",
  "MSW",
  "AWS Lambda",
  "ElasticSearch",
  "Kafka",
  "WebAuthn",
  "passkeys",
  "identity",
  "security",
  "SaaS",
  "design system",
  "component library",
  "analytics",
  "developer experience",
  "frontend architecture",
  "VR",
  "AR",
  "defense",
];

const CORE_RESUME_SECTIONS = new Set([
  "SUMMARY",
  "EXPERIENCE",
  "EDUCATION",
  "SKILLS",
  "TECHNOLOGIES",
  "CERTIFICATIONS",
  "PROJECTS",
  "CONTACT INFO",
  "CONTACT",
]);

const sectionHeaders = new Set([
  ...CORE_RESUME_SECTIONS,
  "AI ENGINEERING &",
  "MODERN",
  "DEVELOPMENT",
  "AI ENGINEERING & MODERN DEVELOPMENT",
]);

const SUPPLEMENTAL_SECTION_END_MARKERS = [
  "EDUCATION",
  "PROJECTS",
  "CERTIFICATIONS",
  "SKILLS",
  "EXPERIENCE",
  "SUMMARY",
  "TECHNOLOGIES",
  "CONTACT INFO",
  "CONTACT",
  "AI ENGINEERING &",
];

const experienceSubheadings = new Set([
  "key achievements",
  "technologies used",
  "responsibilities",
  "highlights",
  "accomplishments",
]);

type ParsedWork = {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  summary?: string;
  skills: string[];
  achievements: string[];
};

type ParsedHeader = {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  consumedLines: number;
};

export function parseResumeHeuristically(extractedText: string): ParsedResume {
  const lines = normalizeResumeLines(extractedText);
  const email = extractedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = extractedText.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0];
  const linkedinUrl = extractedText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const githubUrl = extractedText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
  const portfolioUrl = extractedText.match(/https?:\/\/(?!.*(?:linkedin|github))[^\s)]+/i)?.[0];
  const fullName = lines.find((line) => !line.includes("@") && !line.startsWith("http") && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)) ?? lines[0];
  const summary = extractProfessionalSummary(lines);
  const detectedSkills = unique([
    ...skillTerms.filter((term) => new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(extractedText)),
    ...extractSkillsSection(lines),
  ]);
  const workExperience = extractWorkExperience(lines, detectedSkills).map((work) => ({
    ...work,
    achievements: dedupeWorkAchievements(work.achievements),
  }));
  const experienceBullets = buildExperienceBulletsFromWork(workExperience, detectedSkills);

  return parseUploadedResumeSchema.parse({
    contactInfo: {
      fullName,
      email,
      phone,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
    },
    professionalSummary: summary || lines.slice(0, 4).join(" "),
    skills: {
      coreSkills: detectedSkills.slice(0, 18),
      technicalSkills: detectedSkills,
      toolsFrameworksLibraries: detectedSkills.filter((skill) => /React|Material|Storybook|Playwright|OpenAPI|MSW|Redux|Jest|Kafka|Elastic/i.test(skill)),
      programmingLanguages: detectedSkills.filter((skill) => /TypeScript|JavaScript|Node/i.test(skill)),
    },
    workExperience,
    experienceBullets,
    projects: extractProjectsFromSection(lines, detectedSkills),
    education: extractSection(lines, "EDUCATION", ["SKILLS", "CERTIFICATIONS", "PROJECTS", "AI ENGINEERING &"]).filter((line) => !sectionHeaders.has(line.toUpperCase())),
    certifications: extractSection(lines, "CERTIFICATIONS", ["SKILLS", "PROJECTS", "AI ENGINEERING &"]),
    additionalSections: extractAdditionalSections(lines),
    inferredTags: detectedSkills,
    fieldsNeedingReview: experienceBullets.length < 8 ? ["experienceBullets"] : [],
    confidence: workExperience.length >= 5 && experienceBullets.length >= 15 ? 0.86 : 0.68,
  });
}

export function normalizeResumeLines(text: string) {
  const raw = text
    .replace(/\r/g, "")
    .replace(/\u2022/g, "\n• ")
    .replace(/#(?=[A-Z])/g, "\n• ")
    .split("\n")
    .flatMap((line) => splitEmbeddedSectionHeader(line))
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/^Carl Welch - page(?: \d+)?(?: of \d+)?$/i.test(line))
    .filter((line) => !/^(?:of )?\d+$/.test(line));

  const lines: string[] = [];
  for (const line of raw) {
    const previous = lines[lines.length - 1];
    if (
      previous &&
      !isSectionHeader(previous) &&
      !isSectionHeader(line) &&
      !isBullet(line) &&
      !looksLikeJobHeader(line) &&
      !looksLikeDateLine(line) &&
      shouldJoin(previous, line)
    ) {
      lines[lines.length - 1] = `${previous} ${line}`;
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function shouldJoin(previous: string, line: string) {
  if (previous.endsWith(".") || previous.endsWith(":")) return false;
  if (isBullet(previous) && /^[A-Z]/.test(line)) return false;
  if (previous.length < 70) return false;
  if (/^[A-Z][A-Za-z .&/-]+,\s/.test(line)) return false;
  if (/^technologies used:/i.test(previous)) return false;
  if (looksLikeDateLine(line) || looksLikeRole(line)) return false;
  if (looksLikeCompany(line)) return false;
  return true;
}

function splitEmbeddedSectionHeader(line: string) {
  if (/^technologies\s+used:/i.test(line)) return [line];

  const match = line.match(
    /^(SUMMARY|EXPERIENCE|EDUCATION|SKILLS|TECHNOLOGIES|PROJECTS|CONTACT(?: INFO)?|CERTIFICATIONS)\s+(.+)$/i,
  );
  if (!match) return [line];
  return [match[1].toUpperCase().replace(/^CONTACT$/, "CONTACT INFO"), match[2].trim()];
}

function findSectionIndex(lines: string[], section: string) {
  const upper = section.toUpperCase();
  return lines.findIndex((line) => {
    const value = line.toUpperCase();
    return value === upper || value.startsWith(`${upper} `);
  });
}

function extractProfessionalSummary(lines: string[]) {
  const labeled = extractSection(lines, "SUMMARY", ["EXPERIENCE", "TECHNOLOGIES", "SKILLS", "EDUCATION", "PROJECTS"]);
  if (labeled.length) return labeled.join(" ");

  const technologiesIndex = findSectionIndex(lines, "TECHNOLOGIES");
  const experienceIndex = findSectionIndex(lines, "EXPERIENCE");
  const stopIndex = [technologiesIndex, experienceIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  if (stopIndex === undefined) return "";

  const contactIndex = lines.findIndex((line) => /^CONTACT\b/i.test(line));
  const startIndex = contactIndex >= 0 ? contactIndex + 1 : 0;
  const summaryLines = lines
    .slice(startIndex, stopIndex)
    .filter((line) => !isContactDetailLine(line) && !isSectionHeader(line) && line.length > 40);

  return summaryLines.join(" ");
}

function isContactDetailLine(line: string) {
  return /^(phone|email|location|linkedin|github|portfolio)\b/i.test(line) || /^[\d().+\-\s]{10,}$/.test(line) || /@/.test(line);
}

function extractWorkExperience(lines: string[], detectedSkills: string[]) {
  const start = findSectionIndex(lines, "EXPERIENCE");
  const end = findNextSection(lines, start + 1, ["EDUCATION", "SKILLS", "TECHNOLOGIES", "CERTIFICATIONS", "PROJECTS", "AI ENGINEERING &"]);
  const experienceLines = lines.slice(start === -1 ? 0 : start + 1, end === -1 ? lines.length : end);
  const work: ParsedWork[] = [];
  let current: ParsedWork | null = null;

  for (let index = 0; index < experienceLines.length; index += 1) {
    const line = experienceLines[index];
    if (isSectionHeader(line)) continue;

    const next = experienceLines[index + 1];
    const header = parseJobHeader(line, next, experienceLines[index + 2]);
    if (header) {
      if (current) work.push(current);
      current = {
        company: header.company,
        title: header.title,
        startDate: header.startDate,
        endDate: header.endDate,
        isCurrent: /present|current/i.test(header.endDate ?? ""),
        skills: [],
        achievements: [],
      };
      index += header.consumedLines;
      continue;
    }

    if (!current) continue;

    if (experienceSubheadings.has(line.toLowerCase().replace(/:$/, ""))) continue;
    if (/^technologies used:/i.test(line)) continue;

    if (isBullet(line)) {
      pushAchievement(current, cleanBullet(line), detectedSkills);
    } else if (!looksLikeDateLine(line) && !looksLikeRoleOnlyHeader(line, next) && line.length > 30) {
      pushAchievement(current, cleanBullet(line), detectedSkills);
    }
  }

  if (current) work.push(current);
  return work;
}

function pushAchievement(current: ParsedWork, achievement: string, detectedSkills: string[]) {
  if (!achievement) return;
  current.achievements.push(achievement);
  current.skills = unique([
    ...current.skills,
    ...detectedSkills.filter((skill) => achievement.toLowerCase().includes(skill.toLowerCase())),
  ]);
}

function parseJobHeader(line: string, next?: string, following?: string): ParsedHeader | null {
  if (looksLikeAchievementLine(line)) return null;

  if (next && following && looksLikeCompany(line) && looksLikeRole(next) && looksLikeDateLine(following)) {
    return {
      company: cleanCompany(line),
      title: next.trim(),
      ...parseDates(following),
      consumedLines: 2,
    };
  }

  if (next && looksLikeCompany(line) && looksLikeRole(next) && looksLikeDateLine(line)) {
    return {
      company: cleanCompany(line),
      title: next.trim(),
      ...parseDates(line),
      consumedLines: 1,
    };
  }

  const inline = line.match(/^(.+?),\s*(.+?),?\s*((?:[A-Z][a-z]{2,8}|\d{4}).*)$/);
  if (
    inline
    && looksLikeDateLine(inline[3])
    && looksLikeCompany(inline[1])
    && looksLikeRole(inline[2])
    && !looksLikeMonthOnlyTitle(inline[2])
  ) {
    const dates = parseDates(inline[3]);
    return {
      company: cleanCompany(inline[1]),
      title: inline[2].trim(),
      ...dates,
      consumedLines: 0,
    };
  }

  const companyRole = line.match(/^(.+?),\s*(.+)$/);
  if (
    companyRole
    && next
    && looksLikeDateLine(next)
    && looksLikeCompany(companyRole[1])
    && looksLikeRole(companyRole[2])
    && !looksLikeMonthOnlyTitle(companyRole[2])
  ) {
    return {
      company: cleanCompany(companyRole[1]),
      title: companyRole[2].trim(),
      ...parseDates(next),
      consumedLines: 1,
    };
  }

  if (next && following && /,$/.test(line) && looksLikeRole(next) && looksLikeDateLine(following)) {
    return {
      company: cleanCompany(line),
      title: next.trim(),
      ...parseDates(following),
      consumedLines: 2,
    };
  }

  if (next && looksLikeRole(next) && /company|studios|llc|international|systems|bosch|bridg|yubico|revenue|grindr|sapient|taser|david/i.test(line)) {
    return {
      company: cleanCompany(line.replace(/,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}).*$/i, "")),
      title: next.trim(),
      ...parseDates(line),
      consumedLines: 1,
    };
  }

  return null;
}

function parseDates(value: string) {
  const monthYear = value.match(
    /(\d{1,2}\/\d{4}|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})\s*[-–]\s*(\d{1,2}\/\d{4}|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|Present|Current)/i,
  );
  if (monthYear) {
    return {
      startDate: monthYear[1]?.trim(),
      endDate: monthYear[2]?.trim(),
    };
  }

  return {
    startDate: undefined,
    endDate: undefined,
  };
}

function extractSection(lines: string[], section: string, endSections: string[]) {
  const start = findSectionIndex(lines, section);
  if (start === -1) return [];
  const end = findNextSection(lines, start + 1, endSections);
  const firstLine = lines[start];
  const embedded = splitEmbeddedSectionHeader(firstLine);
  const inlineContent = embedded.length > 1 ? [embedded[1]] : [];
  return [...inlineContent, ...lines.slice(start + 1, end === -1 ? lines.length : end)].filter((line) => !isSectionHeader(line));
}

function findNextSection(lines: string[], start: number, sections: string[]) {
  return lines.findIndex((line, index) => index >= start && sections.some((section) => sectionMatchesLine(line, section)));
}

function sectionMatchesLine(line: string, section: string) {
  const upper = line.toUpperCase();
  const target = section.toUpperCase();
  if (upper === target) return true;
  if (target.startsWith("AI ENGINEERING") && upper.startsWith("AI ENGINEERING")) return true;
  if (!upper.startsWith(`${target} `)) return false;
  if (target === "TECHNOLOGIES" && upper.startsWith("TECHNOLOGIES USED")) return false;
  return true;
}

function extractSkillsSection(lines: string[]) {
  const fromSkills = extractSection(lines, "SKILLS", ["EDUCATION", "CERTIFICATIONS", "PROJECTS", "EXPERIENCE"]);
  const fromTechnologies = extractSection(lines, "TECHNOLOGIES", ["EDUCATION", "CERTIFICATIONS", "PROJECTS", "EXPERIENCE"]);
  return [...fromSkills, ...fromTechnologies]
    .flatMap((line) => line.split(/\s*[•,|]\s*/))
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 2 && skill.length < 40 && !/^page$/i.test(skill) && !/^(frontend|state|data|testing|other|infrastructure|tools|product|analytics)$/i.test(skill));
}

function extractProjectsFromSection(lines: string[], detectedSkills: string[]) {
  const start = findSectionIndex(lines, "PROJECTS");
  if (start === -1) return [];

  const end = findNextSection(lines, start + 1, SUPPLEMENTAL_SECTION_END_MARKERS.filter((section) => section !== "PROJECTS"));
  const projectLines = lines.slice(start + 1, end === -1 ? lines.length : end);
  const projects: ParsedResume["projects"] = [];
  let current: { name: string; url?: string; body: string[]; technologies: string[] } | null = null;

  for (const line of projectLines) {
    if (isSectionHeader(line)) continue;

    if (looksLikeProjectName(line)) {
      if (current) projects.push(finalizeParsedProject(current, detectedSkills));
      current = { name: line.trim(), body: [], technologies: [] };
      continue;
    }

    if (!current) continue;

    const urlMatch = line.trim().match(/^(?:https?:\/\/)?([a-z0-9][a-z0-9.-]+\.[a-z]{2,})\/?$/i);
    if (urlMatch) {
      current.url = line.trim().startsWith("http") ? line.trim() : `https://${line.trim()}`;
      continue;
    }

    if (/^stack:/i.test(line)) {
      current.technologies = line
        .replace(/^stack:\s*/i, "")
        .split(",")
        .flatMap((part) => part.trim())
        .filter(Boolean);
      current.body.push(line);
      continue;
    }

    current.body.push(line);
  }

  if (current) projects.push(finalizeParsedProject(current, detectedSkills));
  return projects;
}

function finalizeParsedProject(
  current: { name: string; url?: string; body: string[]; technologies: string[] },
  detectedSkills: string[],
) {
  const description = current.body.join(" ").trim();
  const technologies = current.technologies.length
    ? current.technologies
    : detectedSkills.filter((skill) => description.toLowerCase().includes(skill.toLowerCase())).slice(0, 8);

  return {
    name: current.name,
    description: description || undefined,
    url: current.url,
    repoUrl: current.url,
    technologies,
    highlights: current.body.filter((line) => /^[-*•#]/.test(line)).map((line) => cleanBullet(line)),
  };
}

function looksLikeProjectName(line: string) {
  const trimmed = line.trim();
  if (isBullet(line) || looksLikeDateLine(line) || looksLikeAchievementLine(line) || isSectionHeader(line)) return false;
  if (trimmed.length > 50 || trimmed.length < 2) return false;
  if (/[.!?]$/.test(trimmed) && trimmed.length > 24) return false;
  if (/^stack:/i.test(trimmed)) return false;
  if (/^(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}\/?$/i.test(trimmed)) return false;
  if (/\b(bachelor|master|degree|institute|university|college|bootcamp)\b/i.test(trimmed)) return false;
  return /^[A-Z]/.test(trimmed) && trimmed.split(/\s+/).length <= 5;
}

function extractAdditionalSections(lines: string[]) {
  const sections: ParsedResume["additionalSections"] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!isAdditionalSectionHeader(line)) continue;

    const end = findNextSection(lines, index + 1, SUPPLEMENTAL_SECTION_END_MARKERS);
    const contentLines = lines
      .slice(index + 1, end === -1 ? lines.length : end)
      .filter((value) => !isSectionHeader(value) && !CORE_RESUME_SECTIONS.has(value.toUpperCase()));

    sections.push({
      title: line.trim(),
      content: contentLines.join("\n").trim(),
    });
  }

  return sections;
}

function isAdditionalSectionHeader(line: string) {
  const trimmed = line.trim();
  const upper = trimmed.toUpperCase();
  if (CORE_RESUME_SECTIONS.has(upper)) return false;
  if (["MODERN", "DEVELOPMENT", "AI ENGINEERING &"].includes(upper)) return false;
  if (looksLikeDateLine(trimmed)) return false;
  if (!/[A-Z]/.test(trimmed)) return false;
  if (/[a-z]/.test(trimmed)) return false;
  if (/^AI ENGINEERING\b/.test(upper)) return true;
  const words = upper.split(/\s+/).filter(Boolean);
  return words.length >= 2 || upper.includes("&");
}

function looksLikeJobHeader(line: string) {
  return Boolean(parseJobHeader(line)) || /^[A-Z][A-Za-z0-9 .&/-]+,\s*(Senior|Lead|Manager|Front|Art|Technical|Software|Interactive)/i.test(line);
}

function looksLikeDateLine(line: string) {
  return /^(?:\d{1,2}\/\d{4}|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})\s*[-–]\s*(?:\d{1,2}\/\d{4}|\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(?:\d{4}|Present|Current))/i.test(
    line.trim(),
  );
}

function looksLikeAchievementLine(line: string) {
  const text = line.replace(/^[-*•#]\s*/, "").trim();
  if (!text) return false;
  if (isBullet(line)) return true;
  if (/[.!?]$/.test(text) && text.length > 40) return true;
  if (
    /^(deployed|led|built|managed|developed|designed|implemented|created|improved|reduced|increased|delivered|spearheaded|coordinated|supported|maintained|optimized|conducted|supervised|wrote|streamlined|enhanced|navigated|revamped|partnered|took|introduced|rebuilt|leveraged|mentored|devised|added|identified|actively|proactively|early|worked|owned)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/\b(in|during|throughout)\s+(operation|the|a|an)\b/i.test(text)) return true;
  if (/,?\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}\s*[-–]/i.test(text) && text.split(" ").length > 6) return true;
  return false;
}

function looksLikeMonthOnlyTitle(value: string) {
  return /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?$/i.test(value.trim());
}

function looksLikeCompany(line: string) {
  if (isBullet(line) || isSectionHeader(line) || looksLikeDateLine(line) || looksLikeAchievementLine(line)) return false;
  if (line.length > 60 || line.length < 2) return false;
  if (/\b(bachelor|master|b\.s\.|b\.a\.|m\.s\.|ph\.d|degree|diploma)\b/i.test(line)) return false;
  if (/\b(institute|university|college|school|academy)\b/i.test(line) && !/\b(inc|llc|corp|ltd)\b/i.test(line)) return false;
  if (/^(phone|email|senior|lead|software|front-end|full-stack|typescript|javascript|react|delivered|proven|currently|at|deployed|led|built|managed|developed|designed|implemented|created|improved|conducted|supervised|wrote)\b/i.test(line)) return false;
  if (/^(at|in|on|with|for|to)\s/i.test(line)) return false;
  if (/\b(deployed|led|built|managed|developed|designed|implemented|created|improved|conducted|supervised|wrote)\b/i.test(line) && line.split(" ").length > 3) return false;
  if (/[.!?]$/.test(line) && line.length > 40) return false;
  if (/\b(I|my|our|the|and|including|while|with)\b/i.test(line) && line.split(" ").length > 4) return false;
  if (line.includes(",") && line.split(" ").length > 6) return false;
  return /^[A-Z0-9]/.test(line);
}

function looksLikeRoleOnlyHeader(line: string, next?: string) {
  return looksLikeRole(line) && Boolean(next && looksLikeDateLine(next));
}

function isSectionHeader(line: string) {
  const upper = line.toUpperCase();
  if (sectionHeaders.has(upper)) return true;
  if (/^AI ENGINEERING\b/.test(upper)) return true;
  return false;
}

function isBullet(line: string) {
  return /^[-*•#]/.test(line);
}

function looksLikeRole(value: string) {
  const trimmed = value.trim();
  if (trimmed.length > 90) return false;
  return (
    /^(senior|lead|staff|principal|software|front[- ]?end|full[- ]?stack|web|manager|director|developer|engineer|architect|team leader)/i.test(
      trimmed,
    ) || /^team leader\b/i.test(trimmed)
  );
}

function cleanCompany(value: string) {
  return value.replace(/^[-*•#]\s*/, "").replace(/,$/, "").trim();
}

function cleanBullet(line: string) {
  return line.replace(/^[-*•#]\s*/, "").replace(/\s*#\s*/g, " ").trim();
}

export function buildExperienceBulletsFromWork(
  workExperience: Array<{
    company: string;
    title: string;
    achievements: string[];
    skills?: string[];
  }>,
  detectedSkills: string[] = [],
  previousBullets: ParsedResume["experienceBullets"] = [],
) {
  return workExperience.flatMap((work) => {
    const roleBullets = previousBullets.filter((bullet) => bullet.company === work.company && bullet.role === work.title);

    return work.achievements.map((achievement, index) => {
      const previous = roleBullets[index];
      if (previous) {
        return {
          ...previous,
          text: achievement,
          sourceText: achievement,
          truthLevel: "verified" as const,
        };
      }

      const skills = work.skills ?? [];
      return {
        company: work.company,
        role: work.title,
        text: achievement,
        category: inferCategory(achievement),
        metrics: extractMetrics(achievement),
        keywords: skills.length
          ? skills
          : detectedSkills.filter((skill) => achievement.toLowerCase().includes(skill.toLowerCase())),
        sourceText: achievement,
        truthLevel: "verified" as const,
      };
    });
  });
}

function inferCategory(text: string) {
  if (/security|identity|webauthn|passkey|auth|provisioning|device lifecycle/i.test(text)) return "security";
  if (/ai|openai|llm|model/i.test(text)) return "ai";
  if (/storybook|component|design system|material ui/i.test(text)) return "design_systems";
  if (/test|playwright|jest|msw|mock service worker/i.test(text)) return "testing";
  if (/data|visualization|analytics|dashboard|kafka|elasticsearch/i.test(text)) return "visualization";
  if (/node|api|backend|lambda|database|postgres|prisma|openapi/i.test(text)) return "fullstack";
  if (/led|managed|mentored|defined|presented/i.test(text)) return "leadership";
  if (/developer experience|tooling|platform/i.test(text)) return "devtools";
  return "frontend";
}

function extractMetrics(text: string): Record<string, string | number | boolean> {
  const matches = text.match(/\b\d+[%\d,]*(?:\s*(?:users|teams|applications|countries|files|datasets))?\b/g) ?? [];
  if (!matches.length) return {};
  return Object.fromEntries(matches.map((value, index) => [`metric_${index}`, value]));
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
