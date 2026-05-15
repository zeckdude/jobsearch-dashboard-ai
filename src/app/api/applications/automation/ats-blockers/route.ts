import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { summarizeAutomationBlockers } from "@/lib/applications/automation-analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 200);
    const providers = await summarizeAutomationBlockers(limit);
    return NextResponse.json({ providers });
  } catch (error) {
    return apiError(error, 400);
  }
}
