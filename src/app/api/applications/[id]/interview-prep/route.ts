import { NextResponse } from "next/server";
import { runInterviewPrepAgent } from "@/lib/agents/interview-prep";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const result = await runInterviewPrepAgent({
      applicationId: params.id,
      userId: application.userId,
    });

    return NextResponse.json({
      ...result.output,
      message: "Interview prep generated.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
