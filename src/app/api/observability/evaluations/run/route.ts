import { apiError } from "@/lib/api";
import { runApplicationAssistantEvaluations } from "@/lib/observability/quality";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    const result = await runApplicationAssistantEvaluations(user?.id);
    return Response.json({
      ok: true,
      scanned: result.scanned,
      evaluated: result.evaluated,
      proposals: result.proposals,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
