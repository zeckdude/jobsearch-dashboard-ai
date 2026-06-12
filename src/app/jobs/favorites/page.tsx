export const metadata = {
  title: "Job Favorites | Job Search OS",
  description: "Saved job listings you want to keep regardless of queue changes.",
};

import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/app/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { submittedApplicationStatuses } from "@/lib/applications/job-filters";
import { createApplicationCanonicalJobKeys } from "@/lib/applications/reconciliation";
import { loadFavoritedJobIds } from "@/lib/jobs/favorites";
import { jsonArray, jsonRecordArray } from "@/lib/json";
import { formatStoredJobSourceLabel } from "@/lib/job-search/source-display";
import { prisma } from "@/lib/prisma";
import { JobsTable } from "../jobs-table";

export const dynamic = "force-dynamic";

export default async function JobFavoritesPage({ searchParams }: { searchParams?: { q?: string; job?: string } }) {
  const searchQuery = searchParams?.q?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";
  const initialSelectedJobId = searchParams?.job ?? undefined;
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const favoritedJobIds = user ? await loadFavoritedJobIds(user.id) : new Set<string>();

  const favorites = user
    ? await prisma.jobFavorite.findMany({
        where: { userId: user.id },
        include: {
          jobPosting: {
            include: {
              source: true,
              matches: {
                include: {
                  jobSearchProfile: { select: { id: true, name: true, userId: true } },
                },
                orderBy: [{ overallScore: "desc" }, { updatedAt: "desc" }],
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const submittedApplications = await prisma.application.findMany({
    where: { status: { in: submittedApplicationStatuses } },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      jobPosting: {
        select: {
          company: true,
          title: true,
          location: true,
          lastSeenAt: true,
        },
      },
    },
  });
  const submittedApplicationByJobKey = new Map<string, typeof submittedApplications[number]>();
  for (const application of submittedApplications) {
    for (const key of createApplicationCanonicalJobKeys(application.jobPosting)) {
      if (!submittedApplicationByJobKey.has(key)) submittedApplicationByJobKey.set(key, application);
    }
  }

  const matchRows = favorites.flatMap((favorite) => {
    const match = favorite.jobPosting.matches[0];
    if (!match) return [];
    const hardFailures = jsonRecordArray<{ code: string; label: string; severity: string }>(match.failedRequirements)
      .filter((item) => item.severity === "hard");
    return [{
      action: null,
      confidenceScore: null,
      id: match.id,
      jobId: favorite.jobPosting.id,
      opportunityScore: null,
      duplicateGroupId: favorite.jobPosting.duplicateGroupId,
      score: match.overallScore,
      matchTier: match.matchTier,
      staleScore: favorite.jobPosting.staleScore,
      title: favorite.jobPosting.title,
      company: favorite.jobPosting.company,
      location: favorite.jobPosting.location ?? "Unknown location",
      status: match.status,
      applicationUrl: favorite.jobPosting.applicationUrl ?? null,
      profileId: match.jobSearchProfile.id,
      profileName: match.jobSearchProfile.name,
      failedRequirements: jsonRecordArray<{ code: string; label: string; severity: string }>(match.failedRequirements),
      passedRequirements: jsonRecordArray<{ code: string; label: string }>(match.passedRequirements),
      sourceName: formatStoredJobSourceLabel(favorite.jobPosting.source, favorite.jobPosting),
      strongestMatches: jsonArray(match.strongestMatches),
      failsCurrentRules: hardFailures.length > 0,
      applicationState: (() => {
        const application = createApplicationCanonicalJobKeys(favorite.jobPosting)
          .map((key) => submittedApplicationByJobKey.get(key))
          .find(Boolean);
        return application
          ? {
              id: application.id,
              status: application.status,
              appliedAt: application.appliedAt?.toISOString() ?? null,
            }
          : null;
      })(),
    }];
  });
  const visibleMatchRows = searchQuery
    ? matchRows.filter((row) => favoriteMatchesSearch(row, searchQuery))
    : matchRows;

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Saved listings"
          title="Favorites"
          description="Jobs you starred stay here even when they stop passing your current profile rules or leave the review queue."
        />

        <Card>
          <CardContent>
            <Stack component="form" method="GET" direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                name="q"
                defaultValue={searchQuery}
                placeholder="Search favorites"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" sx={{ minWidth: 120 }}>
                Search
              </Button>
            </Stack>
            {searchQuery ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Showing favorites matching {searchQuery}.
              </Typography>
            ) : null}
          </CardContent>
        </Card>

        {visibleMatchRows.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary">
                Star jobs from Review Matches or Command Center to save them here.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <JobsTable
            mode="favorites"
            pagePath="/jobs/favorites"
            searchQuery={searchQuery}
            statusView="all"
            initialSelectedJobId={initialSelectedJobId}
            favoritedJobIds={Array.from(favoritedJobIds)}
            matches={visibleMatchRows}
          />
        )}
      </Stack>
    </AppShell>
  );
}

function favoriteMatchesSearch(
  row: {
    title: string;
    company: string;
    location: string;
    profileName: string;
    sourceName: string;
    strongestMatches: string[];
  },
  query: string,
) {
  const haystack = [
    row.title,
    row.company,
    row.location,
    row.profileName,
    row.sourceName,
    ...row.strongestMatches,
  ].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).every((token) => haystack.includes(token));
}
