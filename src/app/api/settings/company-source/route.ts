import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { addCompanySourceToConfig, configToPrismaJson, defaultCompanySourceConfig, normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const source = await getCompanySource();
    const current = normalizeCompanySourceConfig(source.config);
    const reset = body.reset === true;
    const nextConfig = reset
      ? defaultCompanySourceConfig()
      : {
          ...current,
          priorityMax: typeof body.priorityMax === "number" ? body.priorityMax : current.priorityMax,
          maxCompanies: typeof body.maxCompanies === "number" ? body.maxCompanies : current.maxCompanies,
          maxJobsPerCompany: typeof body.maxJobsPerCompany === "number" ? body.maxJobsPerCompany : current.maxJobsPerCompany,
          maxFetch: typeof body.maxFetch === "number" ? body.maxFetch : current.maxFetch,
        };
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
      message: reset ? "Company source list reset to defaults." : "Company source settings saved.",
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
      message: `${body.name} added to the company source list.`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

async function getCompanySource() {
  return prisma.jobSource.upsert({
    where: { type_name: { type: "company_site", name: "Company Source List" } },
    update: {},
    create: {
      name: "Company Source List",
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
