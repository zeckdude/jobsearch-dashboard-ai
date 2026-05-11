import { createSimpleTextPdf } from "@/lib/pdf/simple-resume-pdf";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const resume = await prisma.generatedResume.findUnique({
    where: { id: params.id },
    include: { jobPosting: true, user: true },
  });

  if (!resume) return new Response("Resume not found", { status: 404 });

  const pdf = createSimpleTextPdf(resume.plainText ?? resume.markdown);

  return new Response(pdf, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName(resume.user.name, resume.jobPosting.company, resume.jobPosting.title, "pdf")}"`,
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
