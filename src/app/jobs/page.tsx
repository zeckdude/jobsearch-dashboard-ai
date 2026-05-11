import AddIcon from "@mui/icons-material/Add";
import type { Prisma } from "@prisma/client";
import Stack from "@mui/material/Stack";
import { AppShell } from "@/app/app-shell";
import { ActionButton } from "@/components/action-button";
import { BulkPrepareControl } from "@/components/bulk-prepare-control";
import { PageHeader } from "@/components/ui/page-header";
import { RunSearchControl } from "@/components/run-search-control";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { JobsTable } from "./jobs-table";

export const dynamic = "force-dynamic";

type StatusView = "active" | "rejected" | "archived" | "all";

export default async function JobsPage({ searchParams }: { searchParams?: { statusView?: string } }) {
  const statusView = normalizeStatusView(searchParams?.statusView);
  const matches = await prisma.jobProfileMatch.findMany({
    where: statusWhere(statusView),
    include: {
      jobPosting: {
        include: { source: true },
      },
      jobSearchProfile: {
        select: { name: true },
      },
    },
    orderBy: [{ status: "asc" }, { overallScore: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Review queue"
          title="Jobs"
          description="Review matched jobs by profile, score, company, remote type, location, and status."
          actions={
            <>
              <ActionButton href="/jobs/manual" variant="outlined" startIcon={<AddIcon />}>Add manual job</ActionButton>
              <RunSearchControl compact />
            </>
          }
        />

        <BulkPrepareControl defaultMinimumScore={75} defaultLimit={10} />

        <JobsTable
          statusView={statusView}
          matches={matches.map((match) => ({
            id: match.id,
            jobId: match.jobPosting.id,
            score: match.overallScore,
            title: match.jobPosting.title,
            company: match.jobPosting.company,
            location: match.jobPosting.location ?? "Unknown location",
            status: match.status,
            profileName: match.jobSearchProfile.name,
            sourceName: match.jobPosting.source?.name ?? "Manual",
            strongestMatches: jsonArray(match.strongestMatches),
          }))}
        />
      </Stack>
    </AppShell>
  );
}

function normalizeStatusView(value: string | undefined): StatusView {
  return value === "rejected" || value === "archived" || value === "all" ? value : "active";
}

function statusWhere(statusView: StatusView): Prisma.JobProfileMatchWhereInput {
  if (statusView === "rejected") return { status: { in: ["rejected"] } };
  if (statusView === "archived") return { status: { in: ["archived"] } };
  if (statusView === "all") return {};
  return { status: { notIn: ["rejected", "archived"] } };
}
