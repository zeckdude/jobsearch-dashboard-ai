import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { parseUploadedResume } from "@/lib/ai/resume";
import { extractResumeText, extractResumeTextFromBuffer } from "@/lib/resumes/extract";
import { readUploadedResumeFile } from "@/lib/resumes/upload-request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const uploadedFile = await readUploadedResumeFile(request);
    const extractedText =
      "file" in uploadedFile
        ? await extractResumeText(uploadedFile.file)
        : await extractResumeTextFromBuffer(uploadedFile.buffer, uploadedFile.fileName, uploadedFile.fileType);
    const parsedJson = await parseUploadedResume(extractedText);

    return NextResponse.json(
      {
        fileName: uploadedFile.fileName,
        fileType: uploadedFile.fileType,
        extractedText,
        parsedJson,
      },
      { status: 200 },
    );
  } catch (error) {
    return apiError(error, 400);
  }
}
