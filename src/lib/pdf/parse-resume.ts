import { wrapLine } from "@/lib/pdf/pdf-utils";
import type { LineKind, PdfLine, Preprocessed, StyleDef, ThemeTokens } from "@/lib/pdf/types";

export function makeStyles(p: ThemeTokens): Record<LineKind, StyleDef> {
  return {
    section: { size: p.sectionSize, font: p.sectionFont, leading: p.sectionLeading, gapBefore: p.sectionGapBefore, xOffset: 0, width: p.wrapSection },
    role: { size: p.roleSize, font: p.roleFont, leading: p.roleLeading, gapBefore: p.roleGapBefore, xOffset: 0, width: p.wrapRole },
    project: { size: p.roleSize, font: p.roleFont, leading: p.roleLeading, gapBefore: p.roleGapBefore, xOffset: 0, width: p.wrapRole },
    bullet: { size: p.bulletSize, font: "regular", leading: p.bulletLeading, gapBefore: p.bulletGapBefore, xOffset: p.bulletIndent, width: p.wrapBullet },
    body: { size: p.bodySize, font: p.bodyFont, leading: p.bodyLeading, gapBefore: p.bodyGapBefore, xOffset: 0, width: p.wrapBody },
    space: { size: 0, font: "regular", leading: p.spaceLeading, gapBefore: 0, xOffset: 0, width: 1 },
  };
}

export function preprocess(text: string): Preprocessed {
  const lines = text.replace(/\r/g, "").split("\n");
  const nameIdx = lines.findIndex((l) => l.trim());
  if (nameIdx === -1) return { name: "", contactLine: "", bodyText: text };

  const name = lines[nameIdx].trim().replace(/^#+\s*/, "");
  const contactParts: string[] = [];
  let bodyStart = nameIdx + 1;

  for (let j = nameIdx + 1; j < Math.min(nameIdx + 8, lines.length); j += 1) {
    const trimmed = lines[j].trim();
    if (!trimmed) {
      bodyStart = j + 1;
      continue;
    }
    if (isContactLine(trimmed)) {
      contactParts.push(
        ...trimmed.split(/\s*\|\s*/).map((p) => normalizeContactPart(p.trim())).filter(Boolean),
      );
      bodyStart = j + 1;
    } else if (isSectionHeading(trimmed)) {
      bodyStart = j;
      break;
    } else {
      bodyStart = j;
      break;
    }
  }

  return { name, contactLine: contactParts.join("  |  "), bodyText: lines.slice(bodyStart).join("\n") };
}

function isSectionHeading(line: string): boolean {
  return /^(Summary|Skills|Professional Experience|Projects|Education|Certifications|Experience|Cover Letter)$/i.test(
    line.replace(/^#+\s*/, ""),
  );
}

function isContactLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/@|https?:\/\/|\|/.test(trimmed)) return true;
  if (/^\+?[\d\s().-]{7,}$/.test(trimmed)) return true;
  if (/\b(linkedin|github)\./i.test(trimmed)) return true;
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(trimmed)) return true;
  // Standalone location line (e.g. "Seattle, WA") before first section
  if (/^[A-Za-z][A-Za-z\s.,-]{2,48}$/.test(trimmed) && !isSectionHeading(trimmed)) return true;
  return false;
}

function normalizeContactPart(part: string): string {
  const labelStripped = part.replace(/^(email|phone|tel|mobile|cell|linkedin|github|location|address|website|url|portfolio)\s*:\s*/i, "").trim();
  if (/^https?:\/\//i.test(labelStripped)) {
    try {
      const u = new URL(labelStripped);
      const host = u.hostname.replace(/^www\./, "");
      const path = u.pathname.replace(/\/$/, "");
      return path && path !== "/" ? `${host}${path}` : host;
    } catch {
      return labelStripped;
    }
  }
  return labelStripped;
}

export function toPdfLines(bodyText: string, styles: Record<LineKind, StyleDef>): PdfLine[] {
  const output: PdfLine[] = [];
  let currentSection = "";

  for (const rawLine of bodyText.replace(/\r/g, "").split("\n")) {
    const leadingSpaces = rawLine.length - rawLine.trimStart().length;
    const trimmed = rawLine.trim().replace(/^#+\s*/, "");
    const kind = classifyLine(trimmed, currentSection);
    const style = {
      ...styles[kind],
      xOffset: styles[kind].xOffset + (kind === "bullet" && leadingSpaces >= 2 ? styles[kind].xOffset * 0.85 : 0),
    };

    if (kind === "space") {
      output.push({ text: "", kind, ...style });
      continue;
    }

    if (kind === "section") {
      currentSection = trimmed.toLowerCase();
    }

    if (currentSection === "projects") {
      const project = parseBulletProject(trimmed);
      if (project) {
        const projectStyle = styles.project;
        const bodyStyle = styles.body;
        for (const [i, seg] of wrapLine(project.name, projectStyle.width).entries()) {
          output.push({ text: seg, kind: "project", ...projectStyle, gapBefore: i === 0 ? projectStyle.gapBefore : 0, sectionName: currentSection });
        }
        for (const [i, seg] of wrapLine(project.description, bodyStyle.width).entries()) {
          output.push({ text: seg, kind: "body", ...bodyStyle, gapBefore: i === 0 ? bodyStyle.gapBefore : 0, continuation: i > 0, sectionName: currentSection });
        }
        continue;
      }
    }

    if (kind === "role") {
      const { main, date } = parseRoleLine(trimmed);
      for (const [i, seg] of wrapLine(main, style.width).entries()) {
        output.push({ text: seg, rightText: i === 0 ? date : undefined, kind, ...style, gapBefore: i === 0 ? style.gapBefore : 0, sectionName: currentSection });
      }
      continue;
    }

    const content = kind === "bullet" ? trimmed.replace(/^[-]\s*/, "") : trimmed;
    for (const [i, seg] of wrapLine(content, style.width).entries()) {
      output.push({ text: seg, kind, ...style, gapBefore: i === 0 ? style.gapBefore : 0, continuation: i > 0, sectionName: currentSection });
    }
  }

  return output;
}

function classifyLine(line: string, currentSection: string): LineKind {
  if (!line) return "space";
  if (/^(Summary|Skills|Professional Experience|Projects|Education|Certifications|Experience|Cover Letter)$/i.test(line)) return "section";
  if (currentSection === "projects" && isProjectTitleLine(line)) return "project";
  if (/^- /.test(line)) return "bullet";
  if (/^[A-Z][A-Za-z0-9 .&,/-]+ - .+/.test(line)) return "role";
  return "body";
}

function isProjectTitleLine(line: string): boolean {
  if (/^(technologies|technology|tech stack|stack)\s*:/i.test(line)) return false;
  if (line.length > 72 || /[.!?]$/.test(line)) return false;
  return /^[a-z0-9][a-z0-9._-]*$/i.test(line) || /^[A-Z][A-Za-z0-9 ._/-]+$/.test(line);
}

function parseBulletProject(line: string): { name: string; description: string } | null {
  const match = line.match(/^-\s*([^:]{2,72}):\s*(.+)$/);
  if (!match) return null;
  return { name: match[1].trim(), description: match[2].trim() };
}

function parseRoleLine(text: string): { main: string; date?: string } {
  const idx = text.lastIndexOf(" | ");
  return idx !== -1 ? { main: text.slice(0, idx).trim(), date: text.slice(idx + 3).trim() } : { main: text };
}

export function paginate(lines: PdfLine[], p: ThemeTokens): PdfLine[][] {
  const pages: PdfLine[][] = [[]];
  let y = p.bodyTopP1;

  for (const line of lines) {
    y -= line.gapBefore;
    if (y < p.bottom) {
      pages.push([]);
      y = p.bodyTopPN;
    }
    pages[pages.length - 1].push(line);
    y -= line.leading;
  }

  if (!pages[0].length) {
    pages[0].push({ text: "", kind: "space", size: 0, font: "regular", leading: 4, gapBefore: 0, xOffset: 0 });
  }
  return pages;
}

export type BodyPartition = {
  sidebarLines: PdfLine[];
  mainLines: PdfLine[];
};

/** Split skills + contact-related content for sidebar layout; main keeps narrative sections. */
export function partitionForSidebar(lines: PdfLine[]): BodyPartition {
  const sidebarLines: PdfLine[] = [];
  const mainLines: PdfLine[] = [];
  let inSkills = false;

  for (const line of lines) {
    if (line.kind === "section" && line.text.toLowerCase() === "skills") {
      inSkills = true;
      sidebarLines.push(line);
      continue;
    }
    if (line.kind === "section" && inSkills) {
      inSkills = false;
    }
    if (inSkills) {
      sidebarLines.push(line);
    } else {
      mainLines.push(line);
    }
  }

  return { sidebarLines, mainLines };
}

export function reorderForSidebarStream(lines: PdfLine[]): PdfLine[] {
  const { sidebarLines, mainLines } = partitionForSidebar(lines);
  return [...mainLines, ...sidebarLines];
}
