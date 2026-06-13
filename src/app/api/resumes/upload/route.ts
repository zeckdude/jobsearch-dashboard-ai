import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** @deprecated Use POST /api/resumes/extract for preview and POST /api/resumes/uploads to send to review. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Resume upload now uses a two-step flow. Extract with POST /api/resumes/extract, then send to review with POST /api/resumes/uploads.",
    },
    { status: 410 },
  );
}
