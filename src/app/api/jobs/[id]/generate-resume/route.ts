import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { tailorResumeForJob } from "@/lib/ai/resume";
import { checkAtsReadability } from "@/lib/resumes/ats";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.jobPosting.findUnique({
      where: { id: params.id },
      include: { matches: true },
    });
    const user = await prisma.user.findFirst({
      include: {
        profile: {
          include: {
            experienceBullets: { where: { truthLevel: "verified" }, orderBy: { createdAt: "desc" }, take: 100 },
            projects: { orderBy: { createdAt: "desc" }, take: 6 },
            githubRepositories: { orderBy: [{ pushedAt: "desc" }, { stars: "desc" }], take: 30 },
            resumeUploads: { where: { parsingStatus: "approved" }, orderBy: { updatedAt: "desc" }, take: 1 },
            workExperiences: { orderBy: { createdAt: "desc" }, take: 50 },
          },
        },
      },
    });

    if (!job || !user?.profile || !job.matches[0]) {
      return NextResponse.json({ error: "Job, match, and approved candidate profile are required." }, { status: 400 });
    }

    const latestUploadId = user.profile.resumeUploads[0]?.id;
    const uploadBullets = latestUploadId
      ? user.profile.experienceBullets.filter((bullet) => bullet.sourceResumeUploadId === latestUploadId)
      : [];
    const parsedUpload = user.profile.resumeUploads[0]?.parsedJson as { education?: string[]; certifications?: string[] } | undefined;
    const bullets = uploadBullets.length >= 8 ? uploadBullets : user.profile.experienceBullets;
    const tailored = await tailorResumeForJob({
      userProfile: user.profile,
      job,
      bullets,
      projects: user.profile.projects,
      workExperiences: user.profile.workExperiences.filter((work) => !latestUploadId || work.sourceResumeUploadId === latestUploadId),
      githubRepositories: user.profile.githubRepositories,
      education: Array.isArray(parsedUpload?.education) ? parsedUpload.education : [],
      certifications: Array.isArray(parsedUpload?.certifications) ? parsedUpload.certifications : [],
    });
    const markdown = tailored.markdownResume;
    const plainText = tailored.plainTextResume;
    const atsChecks = checkAtsReadability(plainText);

    const resume = await prisma.generatedResume.create({
      data: {
        userId: user.id,
        jobPostingId: job.id,
        jobProfileMatchId: job.matches[0].id,
        markdown,
        plainText,
        html: `<pre>${escapeHtml(plainText)}</pre>`,
        selectedBulletIds: tailored.selectedExperienceBullets.map((selection) => selection.bulletId) as Prisma.InputJsonValue,
        keywordAlignment: tailored.keywordAlignment as Prisma.InputJsonValue,
        generationNotes: {
          generatedBy: tailored.generatedBy,
          warnings: tailored.warnings,
          unsupportedClaimsDetected: tailored.unsupportedClaimsDetected,
          validation: tailored.validation,
          selectedExperienceBullets: tailored.selectedExperienceBullets,
          projectSelections: tailored.projectSelections,
        } as Prisma.InputJsonValue,
        atsChecks: atsChecks as Prisma.InputJsonValue,
      },
    });
    await prisma.jobProfileMatch.update({
      where: { id: job.matches[0].id },
      data: { status: "resume_generated" },
    });

    return NextResponse.json({ resume });
  } catch (error) {
    return apiError(error, 400);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}
