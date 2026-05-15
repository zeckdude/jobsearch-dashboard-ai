import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { ensureInterviewPrepForApplication } from "@/lib/applications/interview-prep-workflow";
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

    const result = await ensureInterviewPrepForApplication({
      applicationId: params.id,
      userId: application.userId,
      source: "manual",
    });

    return NextResponse.json({
      ...(result.run.outputJson && typeof result.run.outputJson === "object" ? result.run.outputJson : {}),
      message: result.created ? "Interview prep generated." : "Interview prep already exists. Tasks were refreshed.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
