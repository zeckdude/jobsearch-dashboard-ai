import type { z } from "zod";
import { buildMasterResumePlainText } from "@/lib/resumes/master-preview";
import type { resumePreviewRequestSchema } from "@/lib/resumes/preview-schema";
import { checkAtsReadability } from "@/lib/resumes/ats";
import { createSimpleTextPdf, type PdfPreset } from "@/lib/pdf/simple-resume-pdf";

export function plainTextFromPreviewRequest(body: z.infer<typeof resumePreviewRequestSchema>) {
  if ("plainText" in body) return body.plainText.trim();

  return buildMasterResumePlainText({
    profile: {
      fullName: body.profile.fullName,
      email: body.profile.email,
      phone: body.profile.phone ?? null,
      location: body.profile.location ?? null,
      linkedinUrl: body.profile.linkedinUrl ?? null,
      githubUrl: body.profile.githubUrl ?? null,
      portfolioUrl: body.profile.portfolioUrl ?? null,
      professionalSummary: body.profile.professionalSummary ?? null,
      masterSummary: body.profile.masterSummary ?? "",
      coreSkills: body.profile.coreSkills ?? [],
      technicalSkills: body.profile.technicalSkills ?? [],
    },
    bullets: body.bullets,
    workExperiences: (body.workExperiences ?? []).map((work) => ({
      ...work,
      createdAt: work.createdAt ? new Date(work.createdAt) : new Date(0),
    })),
    projects: body.projects ?? [],
    education: body.education ?? [],
    certifications: body.certifications ?? [],
    additionalSections: body.additionalSections ?? [],
  });
}

export function pdfFromPreviewRequest(body: z.infer<typeof resumePreviewRequestSchema>, preset: PdfPreset) {
  const plainText = plainTextFromPreviewRequest(body);
  return {
    plainText,
    pdf: createSimpleTextPdf(plainText, preset),
    ats: checkAtsReadability(plainText),
  };
}
