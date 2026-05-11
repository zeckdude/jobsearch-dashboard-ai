import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseUploadedResumeSchema } from "@/lib/resumes/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsedJson = parseUploadedResumeSchema.parse(body.parsedJson);
    const upload = await prisma.resumeUpload.update({
      where: { id: params.id },
      data: {
        parsedJson: parsedJson as Prisma.InputJsonValue,
        parsingStatus: "needs_review",
      },
    });

    return NextResponse.json({ upload });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const upload = await prisma.resumeUpload.update({
      where: { id: params.id },
      data: { parsingStatus: "failed" },
    });

    return NextResponse.json({ upload });
  } catch (error) {
    return apiError(error, 400);
  }
}
