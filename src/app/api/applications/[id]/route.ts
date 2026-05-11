import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const deletableStatuses = new Set(["approved", "ready_to_apply"]);

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        jobProfileMatchId: true,
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!deletableStatuses.has(application.status)) {
      return NextResponse.json(
        { error: "Only approved and ready to apply applications can be deleted from this board." },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.application.delete({ where: { id: application.id } }),
      ...(application.jobProfileMatchId
        ? [
            prisma.jobProfileMatch.update({
              where: { id: application.jobProfileMatchId },
              data: { status: "approved" },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ deleted: true, message: "Application removed." });
  } catch (error) {
    return apiError(error, 400);
  }
}
