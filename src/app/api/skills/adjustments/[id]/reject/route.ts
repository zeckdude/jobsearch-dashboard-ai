import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { rejectSkillAdjustment } from "@/lib/skills/rollback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  reason: z.string().max(500).optional(),
}).optional();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!user) throw new Error("No user profile found.");

    const json = await request.json().catch(() => undefined);
    const body = BodySchema.parse(json);
    const adjustment = await rejectSkillAdjustment({
      adjustmentId: params.id,
      userId: user.id,
      reason: body?.reason,
      source: "settings_learning_impact",
    });

    return Response.json({
      ok: true,
      adjustment,
      message: "Learning rule disabled.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
