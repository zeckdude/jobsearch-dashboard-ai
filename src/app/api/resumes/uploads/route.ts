import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseUploadedResumeSchema } from "@/lib/resumes/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            "DATABASE_URL is not configured. Resume uploads cannot be saved until PostgreSQL is configured.",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const parsedJson = parseUploadedResumeSchema.parse(body.parsedJson);
    const extractedText = typeof body.extractedText === "string" ? body.extractedText.trim() : "";
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const fileType = typeof body.fileType === "string" ? body.fileType.trim() : "application/octet-stream";

    if (!fileName || !extractedText) {
      return NextResponse.json({ error: "Resume file name and extracted text are required." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ include: { profile: true } });
    if (!user) {
      return NextResponse.json({ error: "Seed or create a user before uploading a resume." }, { status: 400 });
    }

    const upload = await prisma.resumeUpload.create({
      data: {
        userId: user.id,
        userProfileId: user.profile?.id,
        fileName,
        fileType,
        extractedText,
        parsedJson: parsedJson as Prisma.InputJsonValue,
        parsingStatus: "needs_review",
      },
    });

    return NextResponse.json({ upload }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
