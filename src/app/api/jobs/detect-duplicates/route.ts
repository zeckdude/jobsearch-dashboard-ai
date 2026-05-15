import { NextResponse } from "next/server";
import { runDuplicateStaleJobDetectorAgent } from "@/lib/agents/duplicate-stale-job-detector";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runDuplicateStaleJobDetectorAgent({
      jobPostingId: typeof body.jobPostingId === "string" ? body.jobPostingId : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return NextResponse.json(result.output);
  } catch (error) {
    return apiError(error, 400);
  }
}
