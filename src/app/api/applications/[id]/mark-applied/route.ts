import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        jobPosting: { select: { company: true, title: true, applicationUrl: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.status === "applied") {
      return NextResponse.json({ application, message: "Application is already marked applied." });
    }

    if (application.status !== "ready_to_apply") {
      return NextResponse.json({ error: "Only ready to apply applications can be marked applied." }, { status: 400 });
    }

    const appliedAt = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.application.update({
        where: { id: application.id },
        data: {
          status: "applied",
          appliedAt,
        },
      });

      if (application.jobProfileMatchId) {
        await tx.jobProfileMatch.update({
          where: { id: application.jobProfileMatchId },
          data: {
            status: "applied",
            reviewedAt: appliedAt,
          },
        });
      }

      const payload = {
        fromStatus: application.status,
        status: "applied",
        appliedAt: appliedAt.toISOString(),
        company: application.jobPosting.company,
        title: application.jobPosting.title,
        applicationUrl: application.jobPosting.applicationUrl,
      } as Prisma.InputJsonValue;

      await tx.applicationEvent.createMany({
        data: [
          {
            applicationId: application.id,
            type: "status_changed",
            payload,
          },
          {
            applicationId: application.id,
            type: "applied",
            payload,
          },
        ],
      });

      return updatedApplication;
    });

    return NextResponse.json({
      application: updated,
      message: `Marked applied: ${application.jobPosting.company} - ${application.jobPosting.title}.`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
