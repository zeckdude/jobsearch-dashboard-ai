import mammoth from "mammoth";
import { cleanupExtractedResumeText } from "@/lib/resumes/extract-cleanup";
import { normalizePdfLigatures } from "@/lib/resumes/pdf-ligatures";

export async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();
  const fileType = file.type || inferFileType(fileName);

  return extractResumeTextFromBuffer(buffer, fileName, fileType);
}

export async function extractResumeTextFromBuffer(buffer: Buffer, fileName: string, fileType: string) {
  const normalizedFileName = fileName.toLowerCase();
  const normalizedFileType = fileType || inferFileType(normalizedFileName);

  if (normalizedFileName.endsWith(".txt") || normalizedFileName.endsWith(".md") || normalizedFileType.includes("text")) {
    return cleanupExtractedResumeText(buffer.toString("utf8"));
  }

  if (normalizedFileName.endsWith(".docx") || normalizedFileType.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    return cleanupExtractedResumeText(result.value);
  }

  if (normalizedFileName.endsWith(".pdf") || normalizedFileType.includes("pdf")) {
    return cleanupExtractedResumeText(await extractPdfText(buffer));
  }

  throw new Error("Unsupported resume file type. Upload PDF, DOCX, Markdown, or plain text.");
}

async function extractPdfText(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
  await import("pdfjs-dist/legacy/build/pdf.worker.js");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
  } as object).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(assemblePdfPageText(content.items));
  }

  await document.destroy();
  return normalizePdfLigatures(pages.join("\n\n").trim());
}

type PdfTextItem = { str?: string; hasEOL?: boolean };

function assemblePdfPageText(items: PdfTextItem[]) {
  const lines: string[] = [];
  let current = "";

  for (const item of items) {
    if (!("str" in item) || item.str === undefined) continue;

    if (item.str === "") {
      if (item.hasEOL && current.trim()) {
        lines.push(current.trim());
        current = "";
      }
      continue;
    }

    current = current ? `${current} ${item.str}` : item.str;
    if (item.hasEOL) {
      lines.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) lines.push(current.trim());
  return lines.join("\n");
}

function inferFileType(fileName: string) {
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (fileName.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (fileName.endsWith(".md")) return "text/markdown";
  if (fileName.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}
