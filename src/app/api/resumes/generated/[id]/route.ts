import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { checkAtsReadability } from "@/lib/resumes/ats";

export const dynamic = "force-dynamic";

const updateGeneratedResumeSchema = z.object({
  content: z.string().trim().min(100, "Resume content is too short to save.").max(50000),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = updateGeneratedResumeSchema.parse(await request.json());
    const existing = await prisma.generatedResume.findUnique({
      where: { id: params.id },
    });

    if (!existing) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

    const atsChecks = checkAtsReadability(body.content);
    const resume = await prisma.generatedResume.update({
      where: { id: params.id },
      data: {
        markdown: body.content,
        plainText: body.content,
        html: `<pre>${escapeHtml(body.content)}</pre>`,
        atsChecks,
        generationNotes: {
          ...jsonObject(existing.generationNotes),
          manuallyEdited: true,
          lastEditedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      resume: {
        id: resume.id,
        plainText: resume.plainText,
        markdown: resume.markdown,
        atsChecks: resume.atsChecks,
      },
      message: "Resume saved.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

function jsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
}
