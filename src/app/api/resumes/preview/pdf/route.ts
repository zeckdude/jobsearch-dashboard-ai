import { apiError } from "@/lib/api";
import { pdfFromPreviewRequest } from "@/lib/resumes/preview-request";
import { resumePreviewRequestSchema } from "@/lib/resumes/preview-schema";
import type { PdfPreset } from "@/lib/pdf/simple-resume-pdf";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = resumePreviewRequestSchema.parse(await request.json());
    const preset = (body.preset ?? "atelier") as PdfPreset;
    const { pdf, ats } = pdfFromPreviewRequest(body, preset);

    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "cache-control": "no-store",
        "x-ats-score": String(ats.score),
        "x-ats-warnings": encodeURIComponent(JSON.stringify(ats.warnings)),
      },
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
