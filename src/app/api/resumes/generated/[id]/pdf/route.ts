import { createSimpleTextPdf, isPdfPreset, normalizePdfPreset } from "@/lib/pdf/simple-resume-pdf";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const resume = await prisma.generatedResume.findUnique({
    where: { id: params.id },
    include: {
      jobPosting: true,
      user: { include: { profile: true } },
    },
  });

  if (!resume) return new Response("Resume not found", { status: 404 });

  const url = new URL(request.url);
  const presetParam = url.searchParams.get("preset");
  const storedPreset = resume.user.profile?.resumePdfPreset ?? "atelier";
  const preset = presetParam && isPdfPreset(presetParam)
    ? presetParam
    : normalizePdfPreset(storedPreset);
  const pdf = createSimpleTextPdf(resume.plainText ?? resume.markdown, preset);
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${disposition}; filename="${fileName(resume.user.name, resume.jobPosting.company, resume.jobPosting.title, "pdf")}"`,
      "cache-control": "no-store",
    },
  });
}

function fileName(name: string | null, company: string, title: string, extension: string) {
  return [name ?? "candidate", company, title]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .concat(`.${extension}`);
}
