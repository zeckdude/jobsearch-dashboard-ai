import type { Prisma, PrismaClient } from "@prisma/client";
import { CANONICAL_SOURCE_NAMES, LEGACY_SOURCE_NAMES } from "@/lib/job-search/source-display";

type JobSourceClient = Prisma.TransactionClient | PrismaClient;

export async function renameLegacyJobSourceNames(client: JobSourceClient) {
  await client.jobSource.updateMany({
    where: { type: "search_query", name: LEGACY_SOURCE_NAMES.searchQuery },
    data: { name: CANONICAL_SOURCE_NAMES.searchQuery },
  });
  await client.jobSource.updateMany({
    where: { type: "company_site", name: LEGACY_SOURCE_NAMES.companySite },
    data: { name: CANONICAL_SOURCE_NAMES.companySite },
  });
}

export const companySiteSourceWhere = {
  type_name: { type: "company_site" as const, name: CANONICAL_SOURCE_NAMES.companySite },
};

export const searchQuerySourceWhere = {
  type_name: { type: "search_query" as const, name: CANONICAL_SOURCE_NAMES.searchQuery },
};
