import { NextResponse } from "next/server";
import { runDuplicateStaleJobDetectorAgent } from "@/lib/agents/duplicate-stale-job-detector";
import { apiError } from "@/lib/api";
import { repairSuppressedJobResurfacing } from "@/lib/jobs/suppression-repair";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runDuplicateStaleJobDetectorAgent({
      jobPostingId: typeof body.jobPostingId === "string" ? body.jobPostingId : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    const suppressionRepair = await repairSuppressedJobResurfacing({
      source: "check_duplicates",
    });
    return NextResponse.json({
      ...result.output,
      suppressionRepair,
      message: [
        "Duplicate and stale job check finished.",
        suppressionRepair.repairedMatches
          ? `Repaired ${suppressionRepair.repairedMatches} resurfaced duplicate job${suppressionRepair.repairedMatches === 1 ? "" : "s"}.`
          : "No resurfaced suppressed jobs needed repair.",
      ].join(" "),
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
