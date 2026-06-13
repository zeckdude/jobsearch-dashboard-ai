import { apiError } from "@/lib/api";
import { loadMasterResumePreview } from "@/lib/resumes/load-master-preview";
import { pdfFromPreviewRequest } from "@/lib/resumes/preview-request";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const loaded = await loadMasterResumePreview();
    if (!loaded) {
      return Response.json({ error: "No candidate profile exists. Upload and approve a resume first." }, { status: 400 });
    }

    const { pdf, ats } = pdfFromPreviewRequest(loaded.request, loaded.preset);

    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "cache-control": "no-store",
        "x-ats-score": String(ats.score),
        "x-ats-warnings": encodeURIComponent(JSON.stringify(ats.warnings)),
        "x-resume-preset": loaded.preset,
      },
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
