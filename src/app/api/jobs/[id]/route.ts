import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.jobPosting.findUnique({
      where: { id: params.id },
      include: {
        matches: {
          include: {
            jobSearchProfile: { select: { id: true, name: true, userId: true } },
            discoveredByProfile: { select: { id: true, name: true } },
          },
          orderBy: { overallScore: "desc" },
        },
        evaluations: {
          include: { jobSearchProfile: { select: { id: true, name: true } } },
          orderBy: { fitScore: "desc" },
        },
        source: true,
        coverLetters: { orderBy: { createdAt: "desc" }, take: 1 },
        resumes: { orderBy: { createdAt: "desc" }, take: 1 },
        applications: {
          where: { status: "ready_to_apply" },
          include: { coverLetter: true, resume: true },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    return NextResponse.json({ job });
  } catch (error) {
    return apiError(error, 400);
  }
}
