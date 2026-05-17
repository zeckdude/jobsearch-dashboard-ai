import { apiError } from "@/lib/api";
import { getOutcomeCalibrationTrends } from "@/lib/observability/outcome-calibration";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    const trends = await getOutcomeCalibrationTrends(user?.id);
    return Response.json({ ok: true, ...trends });
  } catch (error) {
    return apiError(error, 400);
  }
}
