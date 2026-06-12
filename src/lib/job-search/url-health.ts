export type UrlHealthStatus = "dead" | "closed" | "ok" | "blocked";

const fetchHeaders = {
  Accept: "text/html,application/xhtml+xml",
  "User-Agent": "Mozilla/5.0 (compatible; JobSearchOS/1.0)",
};

const maxBodyScanChars = 128_000;

export const closedPagePatterns = [
  /this job is no longer available/i,
  /job is no longer available/i,
  /this job is not available anymore/i,
  /not available anymore/i,
  /this position has been filled/i,
  /position has been filled/i,
  /this job posting has expired/i,
  /job posting has (expired|been removed)/i,
  /posting has expired/i,
  /we couldn['']t find (this job|anything here)/i,
  /couldn['']t find anything here/i,
  /might have closed/i,
  /has been removed/i,
  /job not found/i,
  /page not found/i,
  /no longer accepting applications/i,
  /not accepting applications/i,
  /this listing has been (closed|removed|deleted)/i,
  /this opportunity is (closed|no longer available)/i,
  /(?:career )?opportunity is no longer available/i,
  /looks like this career opportunity is no longer available/i,
  /role is no longer (open|available|accepting applications)/i,
  /404 error/i,
];

export function isClosedListingText(text: string): boolean {
  const sample = text.slice(0, maxBodyScanChars).toLowerCase();
  if (closedPagePatterns.some((pattern) => pattern.test(sample))) return true;
  return hasExpiredJobPostingMetadata(sample);
}

export function hasExpiredJobPostingMetadata(text: string, now = Date.now()): boolean {
  const matches = text.matchAll(/"validThrough"\s*:\s*"(\d{4}-\d{2}-\d{2})"/gi);
  for (const match of matches) {
    const end = Date.parse(`${match[1]}T23:59:59.999Z`);
    if (!Number.isNaN(end) && end < now) return true;
  }
  return false;
}

export async function checkJobApplicationUrl(url: string): Promise<{ status: UrlHealthStatus }> {
  try {
    const signal = AbortSignal.timeout(8000);
    const getResponse = await fetch(url, { method: "GET", redirect: "follow", headers: fetchHeaders, signal });
    if (getResponse.status === 404 || getResponse.status === 410) return { status: "dead" };
    if (getResponse.status === 401 || getResponse.status === 403) return { status: "blocked" };
    if (!getResponse.ok) return { status: "dead" };

    const text = await getResponse.text().catch(() => "");
    if (isClosedListingText(text)) return { status: "closed" };
    return { status: "ok" };
  } catch {
    return { status: "blocked" };
  }
}

export function staleScoreForUrlHealth(status: UrlHealthStatus, current = 0) {
  if (status === "dead") return Math.max(current, 90);
  if (status === "closed") return Math.max(current, 75);
  return current;
}
