import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { normalizeCompanySourceConfig } from "@/lib/job-search/company-source-config";
import { readCompanySourceRunSettings } from "@/lib/job-search/company-source-run-settings";
import { sourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";
import { sourceRunHint } from "@/lib/job-search/source-run-hints";
import { connectorDisplayName } from "@/lib/job-search/source-display";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.jobSource.findMany({
      where: { NOT: { type: "manual" } },
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        type: true,
        baseUrl: true,
        enabled: true,
        config: true,
      },
    });
    const sources = rows.map((source) => {
      const breakdown = sourceRunBreakdown(source);
      return {
        id: source.id,
        name: source.name,
        displayName: connectorDisplayName(source.name, source.type),
        type: source.type,
        baseUrl: source.baseUrl,
        enabled: source.enabled,
        detail: sourceRunHint(source)?.detail ?? null,
        breakdown: breakdown
          ? {
              totalConfigured: breakdown.totalConfigured,
              includedThisRun: breakdown.includedThisRun,
              footer: breakdown.footer ?? null,
              items: breakdown.items,
            }
          : null,
      };
    });
    const profiles = await prisma.jobSearchProfile.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    const companySite = rows.find((source) => source.type === "company_site");
    const companyConfig = companySite ? normalizeCompanySourceConfig(companySite.config) : null;

    return NextResponse.json({
      sources,
      profiles,
      companySourceRun: companySite && companyConfig
        ? {
            sourceId: companySite.id,
            defaults: readCompanySourceRunSettings(companySite.config),
            companies: companyConfig.companies,
          }
        : null,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
