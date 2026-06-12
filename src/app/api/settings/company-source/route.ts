import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import {
  addCompanySourceToConfig,
  configToPrismaJson,
  defaultCompanySourceConfig,
  normalizeCompanySourceConfig,
  removeCompanySource,
  setCompanySourceEnabled,
} from "@/lib/job-search/company-source-config";
import { CANONICAL_SOURCE_NAMES } from "@/lib/job-search/source-display";
import { companySiteSourceWhere, renameLegacyJobSourceNames } from "@/lib/job-search/source-records";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const source = await getCompanySource();
    const current = normalizeCompanySourceConfig(source.config);
    const reset = body.reset === true;
    let nextConfig = reset
      ? defaultCompanySourceConfig()
      : {
          ...current,
          priorityMax: typeof body.priorityMax === "number" ? body.priorityMax : current.priorityMax,
          maxCompanies: typeof body.maxCompanies === "number" ? body.maxCompanies : current.maxCompanies,
          maxJobsPerCompany: typeof body.maxJobsPerCompany === "number" ? body.maxJobsPerCompany : current.maxJobsPerCompany,
          maxFetch: typeof body.maxFetch === "number" ? body.maxFetch : current.maxFetch,
        };

    if (!reset && typeof body.removeCompany === "string" && body.removeCompany.trim()) {
      nextConfig = removeCompanySource(nextConfig, body.removeCompany);
    } else if (!reset && typeof body.companyName === "string" && body.companyName.trim() && typeof body.companyEnabled === "boolean") {
      nextConfig = setCompanySourceEnabled(nextConfig, body.companyName, body.companyEnabled);
    }

    const normalized = normalizeCompanySourceConfig(nextConfig);
    const updated = await prisma.jobSource.update({
      where: { id: source.id },
      data: {
        enabled: typeof body.enabled === "boolean" ? body.enabled : source.enabled,
        config: configToPrismaJson(normalized),
      },
    });

    return NextResponse.json({
      enabled: updated.enabled,
      config: normalizeCompanySourceConfig(updated.config),
      message: reset
        ? "Company watchlist reset to defaults."
        : typeof body.removeCompany === "string"
          ? `${body.removeCompany} removed from the company watchlist.`
          : typeof body.companyName === "string"
            ? `${body.companyName} ${body.companyEnabled ? "enabled" : "paused"}.`
            : "Company source settings saved.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source = await getCompanySource();
    const current = normalizeCompanySourceConfig(source.config);
    const nextConfig = addCompanySourceToConfig(current, {
      name: typeof body.name === "string" ? body.name : "",
      priority: typeof body.priority === "number" ? body.priority : Number(body.priority),
      categories: parseList(body.categories),
      greenhouseSlugs: parseList(body.greenhouseSlugs),
      leverSlugs: parseList(body.leverSlugs),
      ashbySlugs: parseList(body.ashbySlugs),
    });
    const updated = await prisma.jobSource.update({
      where: { id: source.id },
      data: { config: configToPrismaJson(nextConfig) },
    });

    return NextResponse.json({
      enabled: updated.enabled,
      config: normalizeCompanySourceConfig(updated.config),
      message: `${body.name} added to the company watchlist.`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

async function getCompanySource() {
  await renameLegacyJobSourceNames(prisma);
  return prisma.jobSource.upsert({
    where: companySiteSourceWhere,
    update: {},
    create: {
      name: CANONICAL_SOURCE_NAMES.companySite,
      type: "company_site",
      enabled: true,
      config: configToPrismaJson(defaultCompanySourceConfig()),
    },
  });
}

function parseList(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
