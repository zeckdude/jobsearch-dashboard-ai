import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { parseLinkedInExportZip } from "@/lib/resumes/parse-linkedin-export";

export const dynamic = "force-dynamic";

const linkedinImportSchema = z.object({
  fileName: z.string().min(1),
  base64: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = linkedinImportSchema.parse(await request.json());
    const buffer = Buffer.from(body.base64, "base64");
    const { parsed, extractedText } = await parseLinkedInExportZip(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    );

    return NextResponse.json({
      fileName: body.fileName,
      fileType: "application/zip",
      extractedText,
      parsedJson: parsed,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
