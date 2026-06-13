import type { z } from "zod";
import { isPdfPreset, normalizePdfPreset, type PdfPreset } from "@/lib/pdf/simple-resume-pdf";
import { prisma } from "@/lib/prisma";
import type { resumePreviewRequestSchema } from "@/lib/resumes/preview-schema";

type MasterPreviewRequest = Extract<z.infer<typeof resumePreviewRequestSchema>, { profile: unknown }>;

export type LoadedMasterPreview = {
  preset: PdfPreset;
  request: MasterPreviewRequest;
  profileName: string;
};

export async function loadMasterResumePreview(): Promise<LoadedMasterPreview | null> {
  const profile = await prisma.userProfile.findFirst({
    include: {
      experienceBullets: { orderBy: { createdAt: "desc" } },
      workExperiences: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" }, take: 6 },
      resumeUploads: {
        where: { parsingStatus: "approved" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) return null;

  const parsedUpload = profile.resumeUploads[0]?.parsedJson as {
    education?: string[];
    certifications?: string[];
    additionalSections?: Array<{ title: string; content: string }>;
  } | undefined;
  const preset = isPdfPreset(profile.resumePdfPreset)
    ? profile.resumePdfPreset
    : normalizePdfPreset(profile.resumePdfPreset);

  return {
    preset,
    profileName: profile.fullName,
    request: {
      preset,
      profile: {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        portfolioUrl: profile.portfolioUrl,
        professionalSummary: profile.professionalSummary,
        masterSummary: profile.masterSummary,
        coreSkills: profile.coreSkills,
        technicalSkills: profile.technicalSkills,
      },
      bullets: profile.experienceBullets.map((bullet) => ({
        company: bullet.company,
        role: bullet.role,
        text: bullet.text,
        truthLevel: bullet.truthLevel,
        category: bullet.category,
      })),
      workExperiences: profile.workExperiences.map((work) => ({
        company: work.company,
        title: work.title,
        startDate: work.startDate,
        endDate: work.endDate,
        isCurrent: work.isCurrent,
        summary: work.summary,
        skills: work.skills,
        achievements: work.achievements,
        createdAt: work.createdAt.toISOString(),
      })),
      projects: profile.projects.map((project) => ({
        name: project.name,
        description: project.description,
        technologies: project.technologies,
      })),
      education: Array.isArray(parsedUpload?.education)
        ? parsedUpload.education.filter((item): item is string => typeof item === "string")
        : [],
      certifications: Array.isArray(parsedUpload?.certifications)
        ? parsedUpload.certifications.filter((item): item is string => typeof item === "string")
        : [],
      additionalSections: Array.isArray(parsedUpload?.additionalSections)
        ? parsedUpload.additionalSections.filter(
            (section): section is { title: string; content: string } =>
              typeof section === "object" && section !== null && typeof section.title === "string" && typeof section.content === "string",
          )
        : [],
    },
  };
}
