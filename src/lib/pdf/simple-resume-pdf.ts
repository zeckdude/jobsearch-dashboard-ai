const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 58;
const TOP = 744;
const BOTTOM = 54;

type LineKind = "name" | "contact" | "section" | "role" | "bullet" | "body" | "space";

type PdfLine = {
  text: string;
  kind: LineKind;
  size: number;
  font: "regular" | "bold";
  leading: number;
  gapBefore: number;
  color: "ink" | "muted" | "accent";
};

const styleByKind: Record<LineKind, Omit<PdfLine, "text" | "kind"> & { width: number }> = {
  name: { size: 18, font: "bold", leading: 22, gapBefore: 0, color: "ink", width: 46 },
  contact: { size: 9, font: "regular", leading: 12, gapBefore: 2, color: "muted", width: 96 },
  section: { size: 11, font: "bold", leading: 14, gapBefore: 10, color: "accent", width: 70 },
  role: { size: 10, font: "bold", leading: 13, gapBefore: 7, color: "ink", width: 86 },
  bullet: { size: 9.5, font: "regular", leading: 12.5, gapBefore: 2, color: "ink", width: 88 },
  body: { size: 10, font: "regular", leading: 13.5, gapBefore: 2, color: "ink", width: 92 },
  space: { size: 5, font: "regular", leading: 7, gapBefore: 0, color: "ink", width: 1 },
};

export function createSimpleTextPdf(text: string) {
  const lines = toPdfLines(text);
  const pages = paginate(lines);
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");

  const pageObjectIds: number[] = [];
  const fontRegularObjectId = 3;
  const fontBoldObjectId = 4;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  for (const page of pages) {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularObjectId} 0 R /F2 ${fontBoldObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
    const content = renderPage(page);
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  for (const offset of offsets.slice(1)) {
    chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(chunks.join(""), "utf8");
}

function toPdfLines(text: string) {
  const output: PdfLine[] = [];
  const rawLines = text.replace(/\r/g, "").split("\n");

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim().replace(/^#+\s*/, "");
    const kind = classifyLine(trimmed, output.length);
    const style = styleByKind[kind];

    if (kind === "space") {
      output.push({ text: "", kind, ...style });
      continue;
    }

    const prefix = kind === "bullet" ? "- " : "";
    const wrapped = wrapLine(trimmed.replace(/^- /, ""), style.width);
    wrapped.forEach((line, index) => {
      output.push({
        text: `${index === 0 ? prefix : "  "}${line}`,
        kind,
        ...style,
        gapBefore: index === 0 ? style.gapBefore : 0,
      });
    });
  }

  return output;
}

function classifyLine(line: string, index: number): LineKind {
  if (!line) return "space";
  if (index === 0) return "name";
  if (index <= 2 && /@|https?:\/\//i.test(line)) return "contact";
  if (/^(Summary|Skills|Professional Experience|Projects|Education|Certifications)$/i.test(line)) return "section";
  if (/^- /.test(line)) return "bullet";
  if (/^[A-Z][A-Za-z0-9 .&/-]+ - .+(?:\s\|\s.+)?$/.test(line)) return "role";
  return "body";
}

function paginate(lines: PdfLine[]) {
  const pages: PdfLine[][] = [[]];
  let y = TOP;

  for (const line of lines) {
    y -= line.gapBefore;
    if (y < BOTTOM) {
      pages.push([]);
      y = TOP;
    }
    pages[pages.length - 1].push(line);
    y -= line.leading;
  }

  return pages.length ? pages : [[{ text: "", kind: "space", ...styleByKind.space } as PdfLine]];
}

function renderPage(lines: PdfLine[]) {
  let y = TOP;
  const commands = ["BT"];

  for (const line of lines) {
    y -= line.gapBefore;
    commands.push(colorCommand(line.color));
    commands.push(`/${line.font === "bold" ? "F2" : "F1"} ${line.size} Tf`);
    commands.push(`${LEFT} ${y} Td`);
    commands.push(`(${escapePdfText(line.text)}) Tj`);
    commands.push(`${-LEFT} ${-y} Td`);
    y -= line.leading;
  }

  commands.push("ET");
  return commands.join("\n");
}

function wrapLine(line: string, width: number) {
  if (!line) return [""];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (`${current} ${word}`.trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) lines.push(current);
  return lines;
}

function colorCommand(color: PdfLine["color"]) {
  if (color === "accent") return "0.06 0.35 0.32 rg";
  if (color === "muted") return "0.32 0.38 0.45 rg";
  return "0.09 0.13 0.18 rg";
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
