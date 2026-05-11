import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { extractResumeText, extractResumeTextFromBuffer } from "@/lib/resumes/extract";
import { parseUploadedResume } from "@/lib/ai/resume";

export const dynamic = "force-dynamic";

type UploadedResumeFile =
  | {
      file: File;
      fileName: string;
      fileType: string;
    }
  | {
      buffer: Buffer;
      fileName: string;
      fileType: string;
    };

export async function POST(request: Request) {
  try {
    const uploadedFile = await readUploadedFile(request);

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error:
            "DATABASE_URL is not configured. Resume text extraction works, but uploads cannot be saved until PostgreSQL is configured.",
        },
        { status: 503 },
      );
    }

    const user = await prisma.user.findFirst({ include: { profile: true } });
    if (!user) {
      return NextResponse.json({ error: "Seed or create a user before uploading a resume." }, { status: 400 });
    }

    const extractedText =
      "file" in uploadedFile
        ? await extractResumeText(uploadedFile.file)
        : await extractResumeTextFromBuffer(uploadedFile.buffer, uploadedFile.fileName, uploadedFile.fileType);
    const parsedJson = await parseUploadedResume(extractedText);
    const upload = await prisma.resumeUpload.create({
      data: {
        userId: user.id,
        userProfileId: user.profile?.id,
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        extractedText,
        parsedJson: parsedJson as Prisma.InputJsonValue,
        parsingStatus: "needs_review",
      },
    });

    return NextResponse.json({ upload, extractedText, parsedJson }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}

async function readUploadedFile(request: Request): Promise<UploadedResumeFile> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      fileName?: string;
      fileType?: string;
      base64?: string;
    };

    if (!body.fileName || !body.base64) {
      throw new Error("Resume file is required.");
    }

    return {
      fileName: body.fileName,
      fileType: body.fileType || "application/octet-stream",
      buffer: Buffer.from(body.base64, "base64"),
    };
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Resume file is required.");
  }

  return {
    file,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
  };
}
