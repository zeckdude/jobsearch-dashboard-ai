import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = await prisma.jobSearchProfile.findMany({
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = z.object({
      name: z.string().min(1),
      searchIntent: z.enum(["us_remote", "global_remote", "europe_relocation", "specific_country", "industry_specific", "custom"]).default("custom"),
      remotePreference: z.enum(["remote_us_only", "remote_global", "remote_europe", "hybrid", "onsite_relocation", "any"]).default("any"),
      relocationPreference: z.enum(["not_interested", "open_to_relocation", "requires_relocation_support", "visa_sponsorship_required", "eu_blue_card_possible", "unknown"]).default("unknown"),
      salaryCurrency: z.enum(["USD", "EUR", "GBP", "SEK"]).default("USD"),
      salaryMin: z.number().nullable().optional(),
      salaryMax: z.number().nullable().optional(),
      includeUnknownSalary: z.boolean().default(true),
      minimumMatchScore: z.number().int().min(0).max(100).default(75),
      maxResultsPerRun: z.number().int().min(1).max(250).default(50),
      titles: z.array(z.string()).default([]),
      jobTypes: z.array(z.string()).default([]),
      countries: z.array(z.string()).default([]),
      industries: z.array(z.string()).default([]),
      keywordsRequired: z.array(z.string()).default([]),
      keywordsPreferred: z.array(z.string()).default([]),
      keywordsExcluded: z.array(z.string()).default([]),
      excludedCompanies: z.array(z.string()).default([]),
    }).parse(await request.json());
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });

    if (!user) return NextResponse.json({ error: "No user exists. Run seed first." }, { status: 400 });

    const profile = await prisma.jobSearchProfile.create({
      data: {
        userId: user.id,
        name: body.name,
        searchIntent: body.searchIntent,
        remotePreference: body.remotePreference,
        relocationPreference: body.relocationPreference,
        salaryCurrency: body.salaryCurrency,
        salaryMin: body.salaryMin,
        salaryMax: body.salaryMax,
        includeUnknownSalary: body.includeUnknownSalary,
        minimumMatchScore: body.minimumMatchScore,
        maxResultsPerRun: body.maxResultsPerRun,
        titles: body.titles as Prisma.InputJsonValue,
        jobTypes: body.jobTypes as Prisma.InputJsonValue,
        countries: body.countries as Prisma.InputJsonValue,
        industries: body.industries as Prisma.InputJsonValue,
        keywordsRequired: body.keywordsRequired as Prisma.InputJsonValue,
        keywordsPreferred: body.keywordsPreferred as Prisma.InputJsonValue,
        keywordsExcluded: body.keywordsExcluded as Prisma.InputJsonValue,
        excludedCompanies: body.excludedCompanies as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
