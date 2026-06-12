function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (/^\d{10}$/.test(trimmed)) {
      const date = new Date(Number(trimmed) * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseRelativeAge(value: string, now = new Date()): Date | null {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const unit = match[2];
  const date = new Date(now);

  if (unit === "minute") date.setMinutes(date.getMinutes() - amount);
  else if (unit === "hour") date.setHours(date.getHours() - amount);
  else if (unit === "day") date.setDate(date.getDate() - amount);
  else if (unit === "week") date.setDate(date.getDate() - amount * 7);
  else if (unit === "month") date.setMonth(date.getMonth() - amount);
  else if (unit === "year") date.setFullYear(date.getFullYear() - amount);

  return Number.isNaN(date.getTime()) ? null : date;
}

function extractFromRecord(record: Record<string, unknown>): Date | null {
  for (const key of [
    "datePosted",
    "date_posted",
    "postedAt",
    "posted_at",
    "publishedAt",
    "published_at",
    "createdAt",
    "created_at",
    "date",
    "listingDate",
    "listing_date",
  ]) {
    const parsed = parseDateValue(record[key]);
    if (parsed) return parsed;
  }

  if (typeof record.createdAtEpoch === "number") return parseDateValue(record.createdAtEpoch);
  if (typeof record.t_create === "number") return parseDateValue(record.t_create);

  const result = asRecord(record.result);
  if (result) {
    const pageAge = typeof result.age === "string" ? parseRelativeAge(result.age) : null;
    if (pageAge) return pageAge;
    const pageDate = parseDateValue(result.page_age) ?? parseDateValue(result.page_fetched);
    if (pageDate) return pageDate;
  }

  const item = asRecord(record.item);
  if (item) {
    const fromItem = parseDateValue(item.datePosted) ?? parseDateValue(item.datePublished);
    if (fromItem) return fromItem;
  }

  return null;
}

export function extractListedAt(rawData: unknown, fallback?: Date | null): Date | null {
  const record = asRecord(rawData);
  if (record) {
    const extracted = extractFromRecord(record);
    if (extracted) return extracted;
  }

  return fallback ?? null;
}

export function formatListedAt(value: Date | string | null | undefined) {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
