import type { FontFace } from "@/lib/pdf/types";

export function fontResource(font: FontFace): string {
  switch (font) {
    case "bold":
      return "F2";
    case "serif":
      return "F3";
    case "serifBold":
      return "F4";
    default:
      return "F1";
  }
}

export function wrapLine(line: string, width: number): string[] {
  if (!line) return [""];
  const words = line.split(/\s+/);
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > width) {
      if (current) {
        result.push(current);
        current = "";
      }
      result.push(...chunkLongWord(word, width));
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      if (current) result.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) result.push(current);
  return result;
}

function chunkLongWord(word: string, width: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < word.length; i += width) chunks.push(word.slice(i, i + width));
  return chunks;
}

function charAdvance(ch: string, fontSize: number): number {
  const specific: Record<string, number> = {
    " ": 0.28, ".": 0.28, ",": 0.28, ":": 0.28, ";": 0.28,
    "|": 0.26, "/": 0.30, "-": 0.33, "@": 0.94, "_": 0.56,
    "!": 0.28, "(": 0.33, ")": 0.33, "+": 0.56,
  };
  if (specific[ch] !== undefined) return specific[ch] * fontSize;
  if (/[0-9]/.test(ch)) return 0.56 * fontSize;
  if (/[MWQG]/.test(ch)) return 0.72 * fontSize;
  if (/[A-Z]/.test(ch)) return 0.65 * fontSize;
  return 0.54 * fontSize;
}

export function textWidth(s: string, fontSize: number): number {
  let w = 0;
  for (const ch of s) w += charAdvance(ch, fontSize);
  return w;
}

export function isWebUrl(part: string): boolean {
  if (part.includes("@")) return false;
  return /^[a-z0-9-]+\.[a-z]{2,}/i.test(part);
}

export function displayTextToUri(part: string): string | null {
  if (part.includes("@")) return `mailto:${part}`;
  if (/^linkedin\.com/i.test(part)) return `https://www.${part}`;
  if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(part)) return `https://${part}`;
  return null;
}

export function escapePdfText(value: string): string {
  const map: Array<[RegExp, string]> = [
    [/[–—‒―]/g, "-"],
    [/[''‚]/g, "'"],
    [/[""„]/g, '"'],
    [/[•·]/g, "-"],
    [/…/g, "..."],
    [/ /g, " "],
    [/™/g, "TM"],
    [/®/g, "(R)"],
    [/©/g, "(C)"],
    [/[àáâãäå]/g, "a"],
    [/[èéêë]/g, "e"],
    [/[ìíîï]/g, "i"],
    [/[òóôõö]/g, "o"],
    [/[ùúûü]/g, "u"],
    [/[ÀÁÂÃÄÅ]/g, "A"],
    [/[ÈÉÊË]/g, "E"],
    [/[ÌÍÎÏ]/g, "I"],
    [/[ÒÓÔÕÖ]/g, "O"],
    [/[ÙÚÛÜ]/g, "U"],
    [/ñ/g, "n"],
    [/ç/g, "c"],
    [/ß/g, "ss"],
  ];
  let s = value;
  for (const [pattern, replacement] of map) s = s.replace(pattern, replacement);
  s = s.replace(/[^\x00-\x7F]/g, "");
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function splitSkillsIntoColumns(text: string, columns: number): string[] {
  const items = text.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return [text];
  const perCol = Math.ceil(items.length / columns);
  const cols: string[] = [];
  for (let c = 0; c < columns; c += 1) {
    const slice = items.slice(c * perCol, (c + 1) * perCol);
    if (slice.length) cols.push(slice.join(", "));
  }
  return cols.length ? cols : [text];
}
