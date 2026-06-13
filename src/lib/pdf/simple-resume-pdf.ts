import { buildLayoutContext, pageCount, renderFirstPageHeader, renderFullPage } from "@/lib/pdf/layouts";
import {
  getTheme,
  getThemeAtsTier,
  normalizePdfPreset,
  RESUME_THEME_OPTIONS,
  THEME_BY_ID,
  THEME_VIBE_LABELS,
} from "@/lib/pdf/themes/registry";
import type { PdfPreset } from "@/lib/pdf/types";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/pdf/types";

export { PDF_PRESET_VALUES } from "@/lib/pdf/types";
export type { AtsTier, PdfPreset, ThemeVibe } from "@/lib/pdf/types";
export {
  RESUME_THEME_OPTIONS,
  THEME_VIBE_LABELS,
  getTheme,
  getThemeAtsTier,
  normalizePdfPreset,
  THEME_BY_ID,
};

export function isPdfPreset(value: string): value is PdfPreset {
  return value in THEME_BY_ID;
}

export function isStoredPdfPreset(value: string): boolean {
  return isPdfPreset(value) || value === "tschichold" || value === "swiss" || value === "modern";
}

export function createSimpleTextPdf(text: string, presetName: PdfPreset | string = "atelier"): Uint8Array<ArrayBuffer> {
  const preset = normalizePdfPreset(presetName);
  const theme = getTheme(preset);
  const ctx = buildLayoutContext(text, theme);
  const totalPages = pageCount(ctx);

  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");

  const fontRegId = 3;
  const fontBoldId = 4;
  const fontSerifId = 5;
  const fontSerifBoldId = 6;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");

  const pageObjectIds: number[] = [];
  const firstPageHeader = renderFirstPageHeader(ctx);

  for (let pg = 0; pg < totalPages; pg += 1) {
    const pageObjId = objects.length + 1;
    const contentObjId = pageObjId + 1;
    const pageAnnotations = pg === 0 ? firstPageHeader.annotations : [];
    const annotStartId = contentObjId + 1;
    const annotIds = pageAnnotations.map((_, i) => annotStartId + i);
    pageObjectIds.push(pageObjId);

    const annotsEntry = annotIds.length > 0
      ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(" ")}]`
      : "";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegId} 0 R /F2 ${fontBoldId} 0 R /F3 ${fontSerifId} 0 R /F4 ${fontSerifBoldId} 0 R >> >>${annotsEntry} /Contents ${contentObjId} 0 R >>`,
    );

    const headerContent = pg === 0 ? firstPageHeader.content : "";
    const content = renderFullPage(ctx, pg, headerContent);
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);

    for (const ann of pageAnnotations) {
      objects.push(
        `<< /Type /Annot /Subtype /Link /Rect [${ann.rect.map((v) => v.toFixed(2)).join(" ")}] /Border [0 0 0] /A << /Type /Action /S /URI /URI (${ann.uri}) >> >>`,
      );
    }
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets = [0];
  for (const [i, obj] of objects.entries()) {
    offsets.push(Buffer.byteLength(chunks.join("")));
    chunks.push(`${i + 1} 0 obj\n${obj}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (const off of offsets.slice(1)) chunks.push(`${off.toString().padStart(10, "0")} 00000 n \n`);
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const buffer = Buffer.from(chunks.join(""), "latin1");
  return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}
