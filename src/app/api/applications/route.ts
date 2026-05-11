import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createApplicationSchema = z.object({
  jobPostingId: z.string().min(1),
  jobProfileMatchId: z.string().optional(),
  status: z.enum(["approved", "ready_to_apply", "applied", "follow_up_due", "screening", "interviewing", "offer", "archived"]).default("approved"),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      include: {
        jobPosting: true,
        jobProfileMatch: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createApplicationSchema.parse(await request.json());
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

    if (!user) return NextResponse.json({ error: "No user exists. Run seed first." }, { status: 400 });

    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobPostingId: body.jobPostingId,
        jobProfileMatchId: body.jobProfileMatchId || null,
        status: body.status,
        approvedAt: body.status === "approved" ? new Date() : null,
        appliedAt: body.status === "applied" ? new Date() : null,
        notes: body.notes,
      },
    });

    if (body.jobProfileMatchId) {
      await prisma.jobProfileMatch.update({
        where: { id: body.jobProfileMatchId },
        data: { status: body.status },
      });
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
