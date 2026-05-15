import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string; taskId: string } }) {
  try {
    const task = await prisma.interviewPrepTask.findFirst({
      where: {
        id: params.taskId,
        applicationId: params.id,
      },
    });
    if (!task) return NextResponse.json({ error: "Prep task not found." }, { status: 404 });

    const nextStatus = task.status === "DONE" ? "OPEN" : "DONE";
    await prisma.interviewPrepTask.update({
      where: { id: task.id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === "DONE" ? new Date() : null,
      },
    });
    return NextResponse.json({
      message: nextStatus === "DONE" ? "Prep task marked done." : "Prep task reopened.",
      status: nextStatus,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
