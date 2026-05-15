import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { generateCoverLetterForJob } from "@/lib/ai/resume";
import { attachCoverLetterQa, createResumeStrategy } from "@/lib/applications/material-agents";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.jobPosting.findUnique({
      where: { id: params.id },
      include: {
        matches: { orderBy: { overallScore: "desc" } },
        resumes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const user = await prisma.user.findFirst({
      include: {
        profile: {
          include: {
            experienceBullets: { where: { truthLevel: "verified" }, orderBy: { createdAt: "desc" }, take: 100 },
            projects: { orderBy: { createdAt: "desc" }, take: 5 },
            githubRepositories: { orderBy: [{ pushedAt: "desc" }, { stars: "desc" }], take: 30 },
            resumeUploads: { where: { parsingStatus: "approved" }, orderBy: { updatedAt: "desc" }, take: 1 },
            workExperiences: { orderBy: { createdAt: "desc" }, take: 50 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!job || !user?.profile || !job.matches[0]) {
      return NextResponse.json({ error: "Job, match, and approved candidate profile are required." }, { status: 400 });
    }

    const match = job.matches[0];
    const strategy = await createResumeStrategy({
      jobPostingId: job.id,
      jobSearchProfileId: match.jobSearchProfileId,
      userId: user.id,
    });
    const latestUploadId = user.profile.resumeUploads[0]?.id;
    const uploadBullets = latestUploadId
      ? user.profile.experienceBullets.filter((bullet) => bullet.sourceResumeUploadId === latestUploadId)
      : [];
    const generated = await generateCoverLetterForJob({
      userProfile: user.profile,
      job,
      bullets: uploadBullets.length >= 8 ? uploadBullets : user.profile.experienceBullets,
      projects: user.profile.projects,
      githubRepositories: user.profile.githubRepositories,
      tailoredResumeMarkdown: job.resumes[0]?.markdown,
    });

    const coverLetter = await prisma.generatedCoverLetter.create({
      data: {
        userId: user.id,
        jobPostingId: job.id,
        jobProfileMatchId: match.id,
        body: generated.body,
        generationNotes: {
          generatedBy: generated.generatedBy,
          toneNotes: generated.toneNotes,
          warnings: generated.warnings,
          unsupportedClaimsDetected: generated.unsupportedClaimsDetected,
          resumeId: job.resumes[0]?.id ?? null,
          resumeStrategy: strategy,
        } as Prisma.InputJsonValue,
      },
    });
    const coverLetterQa = await attachCoverLetterQa({
      coverLetter,
      resumeMarkdown: job.resumes[0]?.markdown,
      userId: user.id,
      strategy,
    });
    const reviewedCoverLetter = await prisma.generatedCoverLetter.update({
      where: { id: coverLetter.id },
      data: { generationNotes: coverLetterQa.notes },
    });
    await prisma.jobProfileMatch.update({
      where: { id: match.id },
      data: { status: "cover_letter_generated" },
    });

    return NextResponse.json({ coverLetter: reviewedCoverLetter });
  } catch (error) {
    return apiError(error, 400);
  }
}
