import { apiError } from "@/lib/api";
import { backfillApplicationAssistantQualityExamples } from "@/lib/observability/quality";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    const result = await backfillApplicationAssistantQualityExamples(user?.id);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return apiError(error, 400);
  }
}
