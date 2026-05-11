import crypto from "crypto";
import type { NormalizedJobPosting } from "./source-adapter";

export function createJobContentHash(
  job: Pick<NormalizedJobPosting, "title" | "company" | "description" | "applicationUrl">,
) {
  const value = [job.title, job.company, job.description, job.applicationUrl ?? ""]
    .map((part) => part.trim().toLowerCase())
    .join("|");

  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hasSameCompanyTitleLocation(a: NormalizedJobPosting, b: NormalizedJobPosting) {
  return (
    [a.company, a.title, a.location ?? ""].join("|").toLowerCase() ===
    [b.company, b.title, b.location ?? ""].join("|").toLowerCase()
  );
}
