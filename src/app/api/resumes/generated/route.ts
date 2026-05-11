import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resumes = await prisma.generatedResume.findMany({
      include: {
        jobPosting: { select: { company: true, title: true } },
        resumeUpload: { select: { fileName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ resumes });
  } catch (error) {
    return apiError(error);
  }
}
