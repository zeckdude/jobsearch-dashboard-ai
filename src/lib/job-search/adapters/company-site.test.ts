import type { JobSearchProfile } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  filterCompanyJobsForProfile,
  likelyProfileFit,
} from "@/lib/job-search/adapters/company-site";
import type { CompanySource } from "@/lib/job-search/company-sources";
import type { RawJobPosting } from "@/lib/job-search/source-adapter";

function profile(input: Partial<JobSearchProfile> = {}): JobSearchProfile {
  return {
    id: "profile_1",
    userId: "user_1",
    name: "Frontend",
    titles: ["Senior Frontend Engineer"],
    keywordsPreferred: ["React", "TypeScript"],
    ...input,
  } as JobSearchProfile;
}

function companySource(overrides: Partial<CompanySource> = {}): CompanySource {
  return {
    name: "Acme",
    categories: ["saas"],
    priority: 1,
    searchTerms: ["frontend"],
    careersQuery: "acme careers",
    ...overrides,
  };
}

function companyJob(input: {
  title: string;
  description?: string;
  location?: string;
  company?: CompanySource;
}): RawJobPosting {
  const company = input.company ?? companySource();
  return {
    company: company.name,
    title: input.title,
    location: input.location ?? "Remote",
    description: input.description ?? "React TypeScript frontend work",
    applicationUrl: `https://example.com/jobs/${input.title.replace(/\s+/g, "-").toLowerCase()}`,
    rawData: {
      provider: "greenhouse",
      slug: "acme",
      companySource: true,
      categories: company.categories,
      priority: company.priority,
      searchTerms: company.searchTerms,
      careersQuery: company.careersQuery,
    },
  };
}

describe("likelyProfileFit", () => {
  it("accepts frontend roles aligned with profile titles", () => {
    const job = companyJob({ title: "Senior Frontend Engineer" });
    expect(likelyProfileFit(job, companySource(), profile())).toBe(true);
  });

  it("rejects clearly negative titles such as backend-only roles", () => {
    const job = companyJob({
      title: "Senior Backend Engineer",
      description: "Java microservices",
    });
    expect(likelyProfileFit(job, companySource(), profile())).toBe(false);
  });
});

describe("filterCompanyJobsForProfile", () => {
  it("returns different subsets for profiles with different title preferences", () => {
    const nicheJob = companyJob({
      title: "Quantum Widget Engineer",
      description: "Build quantum widgets",
      company: companySource({ searchTerms: [] }),
    });
    const frontendJob = companyJob({
      title: "Senior Frontend Engineer",
      company: companySource({ searchTerms: [] }),
    });
    const allJobs = [nicheJob, frontendJob];

    const nicheProfile = profile({
      id: "niche",
      titles: ["Quantum Widget Engineer"],
      keywordsPreferred: [],
    });
    const frontendProfile = profile({
      id: "frontend",
      titles: ["Senior Frontend Engineer"],
      keywordsPreferred: ["React"],
    });

    const nicheMatches = filterCompanyJobsForProfile(allJobs, nicheProfile);
    const frontendMatches = filterCompanyJobsForProfile(allJobs, frontendProfile);

    expect(nicheMatches.map((job) => job.title)).toEqual(["Quantum Widget Engineer", "Senior Frontend Engineer"]);
    expect(frontendMatches.map((job) => job.title)).toEqual(["Senior Frontend Engineer"]);
  });

  it("passes through jobs without company source metadata", () => {
    const generic = {
      company: "Other",
      title: "Product Designer",
      description: "Design systems",
      applicationUrl: "https://example.com/designer",
    };
    expect(filterCompanyJobsForProfile([generic], profile())).toEqual([generic]);
  });
});
