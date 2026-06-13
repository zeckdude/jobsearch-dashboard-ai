/**
 * Repairs common PDF font-ligature substitutions produced when pdfjs maps
 * custom glyph encodings to Unicode incorrectly (control chars, $, ), E, P, /).
 */
export function normalizePdfLigatures(text: string): string {
  return text
    .replace(/[\u001d\u0002]/g, "ti")
    .replace(/(?<=[a-z])\)(?=[a-z])/g, "tf")
    .replace(/(?<=[a-zA-Z])\$(?=[a-z])/g, "ti")
    .replace(/(?<=[a-z])E(?=[a-z])/g, "tt")
    .replace(/(?<=[oa])P(?=[ewr])/g, "ft")
    .replace(/\bSo\/ware\b/gi, "Software");
}
