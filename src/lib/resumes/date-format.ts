import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const INPUT_FORMATS = ["MM/YYYY", "M/YYYY", "YYYY-MM", "YYYY", "MMM YYYY", "MMMM YYYY"] as const;
const PRESENT_VALUES = new Set(["present", "current", "now"]);

export type ResumeDateFormat = (typeof INPUT_FORMATS)[number];

export function isPresentDate(value: string | null | undefined) {
  return Boolean(value && PRESENT_VALUES.has(value.trim().toLowerCase()));
}

export function parseResumeDate(value: string | null | undefined): Dayjs | null {
  if (!value?.trim() || isPresentDate(value)) return null;
  for (const format of INPUT_FORMATS) {
    const parsed = dayjs(value.trim(), format, true);
    if (parsed.isValid()) return parsed;
  }
  const loose = dayjs(value.trim());
  return loose.isValid() ? loose : null;
}

export function formatResumeDate(value: Dayjs | null, preferredFormat: ResumeDateFormat = "MM/YYYY") {
  if (!value?.isValid()) return "";
  return value.format(preferredFormat);
}

export function detectResumeDateFormat(value: string | null | undefined): ResumeDateFormat {
  if (!value?.trim() || isPresentDate(value)) return "MM/YYYY";
  for (const format of INPUT_FORMATS) {
    if (dayjs(value.trim(), format, true).isValid()) return format;
  }
  return "MM/YYYY";
}

export function normalizeResumeDateInput(value: string, preferredFormat: ResumeDateFormat = "MM/YYYY") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isPresentDate(trimmed)) return trimmed;
  const parsed = parseResumeDate(trimmed);
  return parsed ? formatResumeDate(parsed, preferredFormat) : trimmed;
}
