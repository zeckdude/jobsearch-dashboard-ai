export const metadata = {
  title: "Resume | Job Search OS",
  description: "Create and edit your resume, import from PDF, and preview ATS-friendly output.",
};

import Stack from "@mui/material/Stack";
import { Suspense } from "react";
import { AppShell } from "@/app/app-shell";
import { prisma } from "@/lib/prisma";
import { isPdfPreset, normalizePdfPreset } from "@/lib/pdf/simple-resume-pdf";
import { profileHasContent, profileHasDuplicateSources, type ProfileContentSnapshot } from "@/lib/resumes/profile-content";
import { ResumePageClient } from "./resume-client";

export const dynamic = "force-dynamic";

async function loadResumePageData() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return null;

  let profile = await prisma.userProfile.findFirst({
    where: { userId: user.id },
    include: {
      experienceBullets: { orderBy: { createdAt: "desc" } },
      workExperiences: { orderBy: { createdAt: "desc" } },
      projects: { orderBy: { createdAt: "desc" }, take: 12 },
      resumeUploads: {
        where: { parsingStatus: "approved" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        fullName: user.name ?? "Unknown",
        email: user.email,
        masterSummary: "",
      },
      include: {
        experienceBullets: { orderBy: { createdAt: "desc" } },
        workExperiences: { orderBy: { createdAt: "desc" } },
        projects: { orderBy: { createdAt: "desc" }, take: 12 },
        resumeUploads: {
          where: { parsingStatus: "approved" },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  const parsedUpload = profile.resumeUploads[0]?.parsedJson as {
    education?: string[];
    certifications?: string[];
    additionalSections?: Array<{ title: string; content: string }>;
  } | undefined;

  const snapshot: ProfileContentSnapshot = {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    portfolioUrl: profile.portfolioUrl,
    professionalSummary: profile.professionalSummary,
    coreSkills: Array.isArray(profile.coreSkills)
      ? profile.coreSkills.filter((item): item is string => typeof item === "string")
      : [],
    bullets: profile.experienceBullets.map((bullet) => ({
      id: bullet.id,
      company: bullet.company,
      role: bullet.role,
      text: bullet.text,
      category: bullet.category,
    })),
    workExperiences: profile.workExperiences.map((work) => ({
      id: work.id,
      company: work.company,
      title: work.title,
      startDate: work.startDate,
      endDate: work.endDate,
    })),
    projects: profile.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
    })),
    education: Array.isArray(parsedUpload?.education) ? parsedUpload.education.filter((item): item is string => typeof item === "string") : [],
    certifications: Array.isArray(parsedUpload?.certifications)
      ? parsedUpload.certifications.filter((item): item is string => typeof item === "string")
      : [],
    additionalSections: Array.isArray(parsedUpload?.additionalSections)
      ? parsedUpload.additionalSections.filter(
          (section): section is { title: string; content: string } =>
            typeof section === "object" && section !== null && typeof section.title === "string" && typeof section.content === "string",
        )
      : [],
  };

  return {
    hasContent: profileHasContent(snapshot),
    showDuplicateBanner: profileHasDuplicateSources(profile.workExperiences),
    profile: {
      id: profile.id,
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
      resumePdfPreset: isPdfPreset(profile.resumePdfPreset)
        ? profile.resumePdfPreset
        : normalizePdfPreset(profile.resumePdfPreset),
    },
    bullets: profile.experienceBullets.map((bullet) => ({
      id: bullet.id,
      company: bullet.company,
      role: bullet.role,
      category: bullet.category,
      text: bullet.text,
      keywords: Array.isArray(bullet.keywords) ? bullet.keywords.filter((keyword): keyword is string => typeof keyword === "string") : [],
      sourceText: bullet.sourceText,
      truthLevel: bullet.truthLevel,
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
    education: snapshot.education,
    certifications: snapshot.certifications,
    additionalSections: snapshot.additionalSections,
  };
}

export default async function ResumePage() {
  const data = await loadResumePageData();

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1400, mx: "auto" }}>
        {data ? (
          <Suspense fallback={null}>
            <ResumePageClient
              hasContent={data.hasContent}
              showDuplicateBanner={data.showDuplicateBanner}
              profile={data.profile}
              bullets={data.bullets}
              workExperiences={data.workExperiences}
              projects={data.projects}
              education={data.education}
              certifications={data.certifications}
              additionalSections={data.additionalSections}
            />
          </Suspense>
        ) : null}
      </Stack>
    </AppShell>
  );
}
