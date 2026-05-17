import { z } from "zod";
import { apiError } from "@/lib/api";
import { runLearningAutoRollback } from "@/lib/observability/auto-rollback";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  dryRun: z.boolean().optional(),
}).optional();

export async function POST(request: Request) {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!user) throw new Error("No user profile found.");

    const json = await request.json().catch(() => undefined);
    const body = BodySchema.parse(json);
    const result = await runLearningAutoRollback({ userId: user.id, dryRun: body?.dryRun ?? false });
    const message = body?.dryRun
      ? `${result.eligible} learning rule${result.eligible === 1 ? "" : "s"} eligible for auto rollback.`
      : `Auto rollback disabled ${result.rolledBack} learning rule${result.rolledBack === 1 ? "" : "s"}.`;

    return Response.json({ ok: true, ...result, message });
  } catch (error) {
    return apiError(error, 400);
  }
}
