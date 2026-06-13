import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { checkAtsReadability } from "@/lib/resumes/ats";
import { loadMasterResumePreview } from "@/lib/resumes/load-master-preview";
import { plainTextFromPreviewRequest } from "@/lib/resumes/preview-request";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const loaded = await loadMasterResumePreview();
    if (!loaded) {
      return NextResponse.json({ error: "No candidate profile exists. Upload and approve a resume first." }, { status: 400 });
    }

    const plainText = plainTextFromPreviewRequest(loaded.request);
    return NextResponse.json(checkAtsReadability(plainText));
  } catch (error) {
    return apiError(error, 400);
  }
}
