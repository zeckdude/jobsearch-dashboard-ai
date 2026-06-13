import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toExperienceCategory } from "@/lib/resumes/db";
import { normalizeBulletText, normalizeJobKey } from "@/lib/resumes/profile-content";
import { parseUploadedResumeSchema, type ParsedResume } from "@/lib/resumes/schemas";

export const importPatchesSchema = z.object({
  contact: z.boolean().optional(),
  summary: z.boolean().optional(),
  coreSkills: z.enum(["replace", "append"]).optional(),
  jobs: z
    .array(
      z.object({
        importJobIndex: z.number().int().min(0),
        targetJobKey: z.string().optional(),
        bulletIndices: z.array(z.number().int().min(0)).optional(),
      }),
    )
    .optional(),
  education: z.array(z.number().int().min(0)).optional(),
  projects: z.array(z.number().int().min(0)).optional(),
  certifications: z.array(z.number().int().min(0)).optional(),
  additionalSections: z.array(z.number().int().min(0)).optional(),
});

export const importCommitSchema = z.object({
  mode: z.enum(["replace", "merge"]),
  extractedText: z.string().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  parsedJson: parseUploadedResumeSchema,
  patches: importPatchesSchema.optional(),
});

export type ImportCommitInput = z.infer<typeof importCommitSchema>;
export type ImportPatches = z.infer<typeof importPatchesSchema>;

type MergedResumeData = {
  profile: {
    fullName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    professionalSummary: string | null;
    masterSummary: string;
    coreSkills: string[];
    technicalSkills: string[];
    domainExpertise: string[];
  };
  workExperience: ParsedResume["workExperience"];
  experienceBullets: ParsedResume["experienceBullets"];
  projects: ParsedResume["projects"];
  education: string[];
  certifications: string[];
  additionalSections: ParsedResume["additionalSections"];
};

export function buildImportAllNewPatches(parsed: ParsedResume, current: MergedResumeData): ImportPatches {
  const existingJobKeys = new Set(current.workExperience.map((work) => normalizeJobKey(work.company, work.title)));
  const existingBulletTexts = new Set(current.experienceBullets.map((bullet) => normalizeBulletText(bullet.text)));
  const existingEducation = new Set(current.education.map((line) => line.toLowerCase().trim()));
  const existingCerts = new Set(current.certifications.map((line) => line.toLowerCase().trim()));
  const existingProjectNames = new Set(current.projects.map((project) => project.name.toLowerCase().trim()));
  const existingSectionTitles = new Set(current.additionalSections.map((section) => section.title.toLowerCase().trim()));

  const jobs = parsed.workExperience
    .map((work, importJobIndex) => ({ work, importJobIndex }))
    .filter(({ work }) => !existingJobKeys.has(normalizeJobKey(work.company, work.title)))
    .map(({ importJobIndex }) => ({ importJobIndex }));

  const partialJobs = parsed.workExperience
    .map((work, importJobIndex) => {
      const key = normalizeJobKey(work.company, work.title);
      if (!existingJobKeys.has(key)) return null;
      const bulletIndices = work.achievements
        .map((text, index) => ({ text, index }))
        .filter(({ text }) => text.trim() && !existingBulletTexts.has(normalizeBulletText(text)))
        .map(({ index }) => index);
      if (!bulletIndices.length) return null;
      return { importJobIndex, targetJobKey: key, bulletIndices };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    contact: false,
    summary: !current.profile.professionalSummary?.trim() && Boolean(parsed.professionalSummary?.trim()),
    coreSkills: current.profile.coreSkills.length ? "append" : "replace",
    jobs: [...jobs, ...partialJobs],
    education: parsed.education
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.trim() && !existingEducation.has(line.toLowerCase().trim()))
      .map(({ index }) => index),
    projects: parsed.projects
      .map((project, index) => ({ project, index }))
      .filter(({ project }) => project.name.trim() && !existingProjectNames.has(project.name.toLowerCase().trim()))
      .map(({ index }) => index),
    certifications: parsed.certifications
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.trim() && !existingCerts.has(line.toLowerCase().trim()))
      .map(({ index }) => index),
    additionalSections: parsed.additionalSections
      .map((section, index) => ({ section, index }))
      .filter(({ section }) => section.title.trim() && !existingSectionTitles.has(section.title.toLowerCase().trim()))
      .map(({ index }) => index),
  };
}

function mergeSkills(current: string[], imported: string[], mode?: "replace" | "append") {
  if (mode === "replace" || !current.length) return imported;
  if (!mode) return current;
  const seen = new Set(current.map((skill) => skill.toLowerCase().trim()));
  const next = [...current];
  for (const skill of imported) {
    const key = skill.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(skill);
  }
  return next;
}

export function buildMergedResumeData(parsed: ParsedResume, current: MergedResumeData, mode: ImportCommitInput["mode"], patches?: ImportPatches): MergedResumeData {
  if (mode === "replace") {
    return {
      profile: {
        fullName: parsed.contactInfo.fullName ?? current.profile.fullName,
        email: parsed.contactInfo.email ?? current.profile.email,
        phone: parsed.contactInfo.phone ?? null,
        location: parsed.contactInfo.location ?? null,
        linkedinUrl: parsed.contactInfo.linkedinUrl ?? null,
        githubUrl: parsed.contactInfo.githubUrl ?? null,
        portfolioUrl: parsed.contactInfo.portfolioUrl ?? null,
        professionalSummary: parsed.professionalSummary ?? null,
        masterSummary: parsed.professionalSummary ?? "",
        coreSkills: parsed.skills.coreSkills,
        technicalSkills: parsed.skills.technicalSkills,
        domainExpertise: parsed.inferredTags,
      },
      workExperience: parsed.workExperience,
      experienceBullets: parsed.experienceBullets,
      projects: parsed.projects,
      education: parsed.education,
      certifications: parsed.certifications,
      additionalSections: parsed.additionalSections,
    };
  }

  const next: MergedResumeData = {
    profile: { ...current.profile },
    workExperience: current.workExperience.map((work) => ({ ...work })),
    experienceBullets: [...current.experienceBullets],
    projects: [...current.projects],
    education: [...current.education],
    certifications: [...current.certifications],
    additionalSections: [...current.additionalSections],
  };

  if (!patches) return next;

  if (patches.contact) {
    next.profile.fullName = parsed.contactInfo.fullName ?? next.profile.fullName;
    next.profile.email = parsed.contactInfo.email ?? next.profile.email;
    next.profile.phone = parsed.contactInfo.phone ?? null;
    next.profile.location = parsed.contactInfo.location ?? null;
    next.profile.linkedinUrl = parsed.contactInfo.linkedinUrl ?? null;
    next.profile.githubUrl = parsed.contactInfo.githubUrl ?? null;
    next.profile.portfolioUrl = parsed.contactInfo.portfolioUrl ?? null;
  }

  if (patches.summary) {
    next.profile.professionalSummary = parsed.professionalSummary ?? null;
    next.profile.masterSummary = parsed.professionalSummary ?? next.profile.masterSummary;
  }

  if (patches.coreSkills) {
    next.profile.coreSkills = mergeSkills(current.profile.coreSkills, parsed.skills.coreSkills, patches.coreSkills);
    next.profile.technicalSkills = mergeSkills(current.profile.technicalSkills, parsed.skills.technicalSkills, patches.coreSkills);
  }

  for (const index of patches.education ?? []) {
    const line = parsed.education[index];
    if (line?.trim() && !next.education.some((entry) => entry.toLowerCase().trim() === line.toLowerCase().trim())) {
      next.education.push(line);
    }
  }

  for (const index of patches.certifications ?? []) {
    const line = parsed.certifications[index];
    if (line?.trim() && !next.certifications.some((entry) => entry.toLowerCase().trim() === line.toLowerCase().trim())) {
      next.certifications.push(line);
    }
  }

  for (const index of patches.projects ?? []) {
    const project = parsed.projects[index];
    if (!project?.name.trim()) continue;
    if (next.projects.some((entry) => entry.name.toLowerCase().trim() === project.name.toLowerCase().trim())) continue;
    next.projects.push(project);
  }

  for (const index of patches.additionalSections ?? []) {
    const section = parsed.additionalSections[index];
    if (!section?.title.trim()) continue;
    if (next.additionalSections.some((entry) => entry.title.toLowerCase().trim() === section.title.toLowerCase().trim())) continue;
    next.additionalSections.push(section);
  }

  for (const jobPatch of patches.jobs ?? []) {
    const importedJob = parsed.workExperience[jobPatch.importJobIndex];
    if (!importedJob) continue;

    const bulletIndices = jobPatch.bulletIndices ?? importedJob.achievements.map((_, index) => index);
    const importedBullets = bulletIndices
      .map((index) => importedJob.achievements[index])
      .filter((text): text is string => Boolean(text?.trim()))
      .filter((text) => !next.experienceBullets.some((bullet) => normalizeBulletText(bullet.text) === normalizeBulletText(text)));

    const targetKey = jobPatch.targetJobKey ?? normalizeJobKey(importedJob.company, importedJob.title);
    let target = next.workExperience.find((work) => normalizeJobKey(work.company, work.title) === targetKey);

    if (!target) {
      target = {
        company: importedJob.company,
        title: importedJob.title,
        location: importedJob.location,
        startDate: importedJob.startDate,
        endDate: importedJob.endDate,
        isCurrent: importedJob.isCurrent,
        summary: importedJob.summary,
        skills: importedJob.skills,
        achievements: [],
      };
      next.workExperience.push(target);
    }

    const newAchievements = [...target.achievements];
    for (const text of importedBullets) {
      if (!newAchievements.some((entry) => normalizeBulletText(entry) === normalizeBulletText(text))) {
        newAchievements.push(text);
      }
      const matchingParsedBullet = parsed.experienceBullets.find(
        (bullet) =>
          normalizeJobKey(bullet.company, bullet.role) === normalizeJobKey(importedJob.company, importedJob.title) &&
          normalizeBulletText(bullet.text) === normalizeBulletText(text),
      );
      next.experienceBullets.push(
        matchingParsedBullet ?? {
          company: importedJob.company,
          role: importedJob.title,
          text,
          category: "fullstack",
          metrics: {},
          keywords: [],
          sourceText: text,
          truthLevel: "verified",
        },
      );
    }
    target.achievements = newAchievements;
  }

  return next;
}

export async function loadCurrentMergedResumeData(userId: string): Promise<{ userId: string; profileId: string; data: MergedResumeData } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          experienceBullets: { orderBy: { createdAt: "desc" } },
          workExperiences: { orderBy: { createdAt: "desc" } },
          projects: { orderBy: { createdAt: "desc" } },
          resumeUploads: {
            where: { parsingStatus: "approved" },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user?.profile) return null;

  const parsedUpload = user.profile.resumeUploads[0]?.parsedJson as {
    education?: string[];
    certifications?: string[];
    additionalSections?: ParsedResume["additionalSections"];
  } | undefined;

  return {
    userId: user.id,
    profileId: user.profile.id,
    data: {
      profile: {
        fullName: user.profile.fullName,
        email: user.profile.email,
        phone: user.profile.phone,
        location: user.profile.location,
        linkedinUrl: user.profile.linkedinUrl,
        githubUrl: user.profile.githubUrl,
        portfolioUrl: user.profile.portfolioUrl,
        professionalSummary: user.profile.professionalSummary,
        masterSummary: user.profile.masterSummary,
        coreSkills: Array.isArray(user.profile.coreSkills)
          ? user.profile.coreSkills.filter((item): item is string => typeof item === "string")
          : [],
        technicalSkills: Array.isArray(user.profile.technicalSkills)
          ? user.profile.technicalSkills.filter((item): item is string => typeof item === "string")
          : [],
        domainExpertise: Array.isArray(user.profile.domainExpertise)
          ? user.profile.domainExpertise.filter((item): item is string => typeof item === "string")
          : [],
      },
      workExperience: user.profile.workExperiences.map((work) => ({
        company: work.company,
        title: work.title,
        location: work.location ?? undefined,
        startDate: work.startDate ?? undefined,
        endDate: work.endDate ?? undefined,
        isCurrent: work.isCurrent,
        summary: work.summary ?? undefined,
        skills: Array.isArray(work.skills) ? work.skills.filter((item): item is string => typeof item === "string") : [],
        achievements: Array.isArray(work.achievements)
          ? work.achievements.filter((item): item is string => typeof item === "string")
          : [],
      })),
      experienceBullets: user.profile.experienceBullets.map((bullet) => ({
        company: bullet.company,
        role: bullet.role,
        text: bullet.text,
        category: bullet.category,
        metrics: {},
        keywords: Array.isArray(bullet.keywords) ? bullet.keywords.filter((item): item is string => typeof item === "string") : [],
        sourceText: bullet.sourceText ?? bullet.text,
        truthLevel: "verified" as const,
      })),
      projects: user.profile.projects.map((project) => ({
        name: project.name,
        description: project.description ?? undefined,
        url: project.url ?? undefined,
        repoUrl: project.repoUrl ?? undefined,
        technologies: Array.isArray(project.technologies)
          ? project.technologies.filter((item): item is string => typeof item === "string")
          : [],
        highlights: Array.isArray(project.highlights)
          ? project.highlights.filter((item): item is string => typeof item === "string")
          : [],
      })),
      education: Array.isArray(parsedUpload?.education) ? parsedUpload.education.filter((item): item is string => typeof item === "string") : [],
      certifications: Array.isArray(parsedUpload?.certifications)
        ? parsedUpload.certifications.filter((item): item is string => typeof item === "string")
        : [],
      additionalSections: Array.isArray(parsedUpload?.additionalSections) ? parsedUpload.additionalSections : [],
    },
  };
}

export async function commitResumeImport(userId: string, input: ImportCommitInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new Error("User not found.");

  const current = user.profile ? await loadCurrentMergedResumeData(userId) : null;
  const baseData: MergedResumeData = current?.data ?? {
    profile: {
      fullName: "Unknown",
      email: user.email,
      phone: null,
      location: null,
      linkedinUrl: null,
      githubUrl: null,
      portfolioUrl: null,
      professionalSummary: null,
      masterSummary: "",
      coreSkills: [],
      technicalSkills: [],
      domainExpertise: [],
    },
    workExperience: [],
    experienceBullets: [],
    projects: [],
    education: [],
    certifications: [],
    additionalSections: [],
  };

  const merged = buildMergedResumeData(input.parsedJson, baseData, input.mode, input.patches);
  const parsedSnapshot: ParsedResume = {
    contactInfo: {
      fullName: merged.profile.fullName,
      email: merged.profile.email,
      phone: merged.profile.phone ?? undefined,
      location: merged.profile.location ?? undefined,
      linkedinUrl: merged.profile.linkedinUrl ?? undefined,
      githubUrl: merged.profile.githubUrl ?? undefined,
      portfolioUrl: merged.profile.portfolioUrl ?? undefined,
    },
    professionalSummary: merged.profile.professionalSummary ?? undefined,
    skills: {
      coreSkills: merged.profile.coreSkills,
      technicalSkills: merged.profile.technicalSkills,
      toolsFrameworksLibraries: [],
      programmingLanguages: [],
    },
    workExperience: merged.workExperience,
    experienceBullets: merged.experienceBullets,
    projects: merged.projects,
    education: merged.education,
    certifications: merged.certifications,
    additionalSections: merged.additionalSections,
    inferredTags: merged.profile.domainExpertise,
    fieldsNeedingReview: [],
    confidence: input.parsedJson.confidence,
  };

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: {
      fullName: merged.profile.fullName,
      email: merged.profile.email,
      phone: merged.profile.phone,
      location: merged.profile.location,
      linkedinUrl: merged.profile.linkedinUrl,
      githubUrl: merged.profile.githubUrl,
      portfolioUrl: merged.profile.portfolioUrl,
      masterSummary: merged.profile.masterSummary,
      professionalSummary: merged.profile.professionalSummary,
      coreSkills: merged.profile.coreSkills as Prisma.InputJsonValue,
      technicalSkills: merged.profile.technicalSkills as Prisma.InputJsonValue,
      domainExpertise: merged.profile.domainExpertise as Prisma.InputJsonValue,
    },
    create: {
      userId,
      fullName: merged.profile.fullName,
      email: merged.profile.email,
      phone: merged.profile.phone,
      location: merged.profile.location,
      linkedinUrl: merged.profile.linkedinUrl,
      githubUrl: merged.profile.githubUrl,
      portfolioUrl: merged.profile.portfolioUrl,
      masterSummary: merged.profile.masterSummary,
      professionalSummary: merged.profile.professionalSummary,
      coreSkills: merged.profile.coreSkills as Prisma.InputJsonValue,
      technicalSkills: merged.profile.technicalSkills as Prisma.InputJsonValue,
      domainExpertise: merged.profile.domainExpertise as Prisma.InputJsonValue,
    },
  });

  await prisma.experienceBullet.deleteMany({ where: { userProfileId: profile.id } });
  await prisma.workExperience.deleteMany({ where: { userProfileId: profile.id } });
  await prisma.project.deleteMany({ where: { userProfileId: profile.id } });

  const existingUpload = await prisma.resumeUpload.findFirst({
    where: { userId, userProfileId: profile.id, parsingStatus: "approved" },
    orderBy: { updatedAt: "desc" },
  });

  const upload = existingUpload
    ? await prisma.resumeUpload.update({
        where: { id: existingUpload.id },
        data: {
          fileName: input.fileName ?? existingUpload.fileName,
          fileType: input.fileType ?? existingUpload.fileType,
          extractedText: input.extractedText ?? existingUpload.extractedText,
          parsedJson: parsedSnapshot as Prisma.InputJsonValue,
          parsingStatus: "approved",
        },
      })
    : await prisma.resumeUpload.create({
        data: {
          userId,
          userProfileId: profile.id,
          fileName: input.fileName ?? "imported-resume",
          fileType: input.fileType ?? "application/pdf",
          extractedText: input.extractedText ?? "",
          parsedJson: parsedSnapshot as Prisma.InputJsonValue,
          parsingStatus: "approved",
        },
      });

  await prisma.resumeUpload.updateMany({
    where: {
      userId,
      id: { not: upload.id },
      parsingStatus: "approved",
    },
    data: { parsingStatus: "failed" },
  });

  for (const work of merged.workExperience) {
    await prisma.workExperience.create({
      data: {
        userProfileId: profile.id,
        company: work.company,
        title: work.title,
        location: work.location,
        startDate: work.startDate,
        endDate: work.endDate,
        isCurrent: work.isCurrent,
        summary: work.summary,
        skills: work.skills as Prisma.InputJsonValue,
        achievements: work.achievements as Prisma.InputJsonValue,
      },
    });
  }

  for (const bullet of merged.experienceBullets) {
    await prisma.experienceBullet.create({
      data: {
        userProfileId: profile.id,
        company: bullet.company,
        role: bullet.role,
        text: bullet.text,
        category: toExperienceCategory(bullet.category),
        metrics: bullet.metrics as Prisma.InputJsonValue,
        keywords: bullet.keywords as Prisma.InputJsonValue,
        sourceText: bullet.sourceText,
        truthLevel: "verified",
      },
    });
  }

  for (const project of merged.projects) {
    await prisma.project.create({
      data: {
        userProfileId: profile.id,
        name: project.name,
        description: project.description,
        url: project.url,
        repoUrl: project.repoUrl,
        technologies: project.technologies as Prisma.InputJsonValue,
        highlights: project.highlights as Prisma.InputJsonValue,
      },
    });
  }

  return { profileId: profile.id, uploadId: upload.id };
}
