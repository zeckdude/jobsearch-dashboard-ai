import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseUploadedResumeSchema } from "@/lib/resumes/schemas";

export const dynamic = "force-dynamic";

const supplementalSchema = z.object({
  education: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  additionalSections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
});

export async function PATCH(request: Request) {
  try {
    const body = supplementalSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: {
        profile: {
          include: {
            resumeUploads: {
              where: { parsingStatus: "approved" },
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile) {
      return NextResponse.json({ error: "No candidate profile exists." }, { status: 400 });
    }

    const upload = user.profile.resumeUploads[0];
    if (!upload) {
      return NextResponse.json({ error: "No approved resume upload found." }, { status: 400 });
    }

    const parsed = parseUploadedResumeSchema.parse(upload.parsedJson);
    const nextParsed = {
      ...parsed,
      education: body.education ?? parsed.education,
      certifications: body.certifications ?? parsed.certifications,
      additionalSections: body.additionalSections ?? parsed.additionalSections ?? [],
    };

    await prisma.resumeUpload.update({
      where: { id: upload.id },
      data: { parsedJson: nextParsed },
    });

    return NextResponse.json({
      education: nextParsed.education,
      certifications: nextParsed.certifications,
      additionalSections: nextParsed.additionalSections,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
