import { CustomOpportunityClient } from "./custom-opportunity-client";
import { prisma } from "@/lib/prisma";
import { normalizePdfPreset, type PdfPreset } from "@/lib/pdf/simple-resume-pdf";

export const metadata = {
  title: "Custom Opportunity Resume | Job Search OS",
  description: "Generate a tailored resume from a recruiter-provided role brief.",
};

export const dynamic = "force-dynamic";

export default async function CustomOpportunityPage() {
  const profile = await prisma.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: { resumePdfPreset: true },
  });
  const preset: PdfPreset = profile?.resumePdfPreset
    ? normalizePdfPreset(profile.resumePdfPreset)
    : "atelier";

  return <CustomOpportunityClient preset={preset} />;
}
