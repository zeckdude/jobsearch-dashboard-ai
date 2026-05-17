import { apiError } from "@/lib/api";
import { recomputeOutcomeCalibration } from "@/lib/observability/outcome-calibration";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z.object({
  source: z.enum(["settings_manual", "job_rejected", "application_outcome", "email_outcome", "assistant_state", "search_state"]).default("settings_manual"),
});

export async function POST(request: Request) {
  try {
    const body = request.headers.get("content-type")?.includes("application/json") ? await request.json() : {};
    const input = requestSchema.parse(body);
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    const report = await recomputeOutcomeCalibration(user?.id, { source: input.source });
    return Response.json({ ok: true, ...report });
  } catch (error) {
    return apiError(error, 400);
  }
}
