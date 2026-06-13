export type UploadedResumeFile =
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

export async function readUploadedResumeFile(request: Request): Promise<UploadedResumeFile> {
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
