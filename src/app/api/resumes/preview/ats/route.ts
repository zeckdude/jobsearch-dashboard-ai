import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { plainTextFromPreviewRequest } from "@/lib/resumes/preview-request";
import { resumePreviewRequestSchema } from "@/lib/resumes/preview-schema";
import { checkAtsReadability } from "@/lib/resumes/ats";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = resumePreviewRequestSchema.parse(await request.json());
    const plainText = plainTextFromPreviewRequest(body);
    const ats = checkAtsReadability(plainText);
    return NextResponse.json(ats);
  } catch (error) {
    return apiError(error, 400);
  }
}
