import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const approveJobSchema = z.object({
  matchId: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { matchId } = approveJobSchema.parse(await request.json());
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    const match = await prisma.jobProfileMatch.update({
      where: { id: matchId },
      data: { status: "approved", reviewedAt: new Date() },
      include: { jobPosting: { select: { company: true, title: true } } },
    });
    const application = user ? await upsertApprovedApplication({
      userId: user.id,
      jobPostingId: params.id,
      jobProfileMatchId: match.id,
    }) : null;

    return NextResponse.json({
      jobId: params.id,
      match,
      application,
      applicationUrl: application ? `/applications/${application.id}` : null,
      message: application
        ? `Approved ${match.jobPosting.company} - ${match.jobPosting.title} and created an application tracker.`
        : `Approved ${match.jobPosting.company} - ${match.jobPosting.title}.`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

async function upsertApprovedApplication(input: {
  userId: string;
  jobPostingId: string;
  jobProfileMatchId: string;
}) {
  const existing = await prisma.application.findFirst({
    where: {
      userId: input.userId,
      jobPostingId: input.jobPostingId,
    },
  });

  const application = existing
    ? await prisma.application.update({
        where: { id: existing.id },
        data: {
          jobProfileMatchId: input.jobProfileMatchId,
          approvedAt: existing.approvedAt ?? new Date(),
          notes: mergeApprovalNote(existing.notes),
        },
      })
    : await prisma.application.create({
        data: {
          userId: input.userId,
          jobPostingId: input.jobPostingId,
          jobProfileMatchId: input.jobProfileMatchId,
          status: "approved",
          approvedAt: new Date(),
          notes: "Job approved. Application tracker created automatically.",
        },
      });

  if (!existing) {
    await prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        type: "status_changed",
        payload: {
          source: "job_approval",
          status: "approved",
          jobProfileMatchId: input.jobProfileMatchId,
          note: "Application tracker created automatically after job approval.",
        },
      },
    });
  }

  return application;
}

function mergeApprovalNote(existing: string | null) {
  const note = "Job approved. Application tracker created automatically.";
  if (!existing) return note;
  return existing.includes(note) ? existing : `${existing}\n${note}`;
}
