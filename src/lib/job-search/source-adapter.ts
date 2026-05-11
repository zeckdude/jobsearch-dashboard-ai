import type { JobSearchProfile, JobSource } from "@prisma/client";

export type RawJobPosting = {
  sourceJobId?: string;
  company: string;
  title: string;
  location?: string;
  description: string;
  applicationUrl?: string;
  rawData?: unknown;
};

export type NormalizedJobPosting = {
  sourceJobId?: string;
  company: string;
  title: string;
  location?: string;
  country?: string;
  city?: string;
  remoteType: "remote" | "hybrid" | "onsite" | "unknown";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: "USD" | "EUR" | "GBP" | "SEK";
  description: string;
  requirements: string[];
  niceToHaves: string[];
  benefits: string[];
  applicationUrl?: string;
  atsProvider:
    | "greenhouse"
    | "lever"
    | "ashby"
    | "workday"
    | "workable"
    | "smartrecruiters"
    | "other"
    | "unknown";
  rawData: unknown;
};

export interface JobSourceAdapter {
  name: string;
  fetchJobs(profile: JobSearchProfile, source: JobSource): Promise<RawJobPosting[]>;
  normalize(raw: RawJobPosting): Promise<NormalizedJobPosting>;
}
