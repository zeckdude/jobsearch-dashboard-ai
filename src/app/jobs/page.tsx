export const metadata = {
  title: "Jobs | Job Search OS",
  description: "Search, review, approve, reject, and dedupe job matches.",
};

import AddIcon from "@mui/icons-material/Add";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import type { Prisma } from "@prisma/client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/app/app-shell";
import { ActionButton } from "@/components/action-button";
import { BulkPrepareControl } from "@/components/bulk-prepare-control";
import { DetectJobQualityControl } from "@/components/detect-job-quality-control";
import { EvaluateJobsControl } from "@/components/evaluate-jobs-control";
import { PageHeader } from "@/components/ui/page-header";
import { RunSearchControl } from "@/components/run-search-control";
import { WorkflowStepBanner } from "@/components/workflow-coach/WorkflowStepBanner";
import { submittedApplicationStatuses } from "@/lib/applications/job-filters";
import { createApplicationCanonicalJobKeys, reconcileApplicationCanonicalState } from "@/lib/applications/reconciliation";
import { jsonArray, jsonRecordArray } from "@/lib/json";
import { uniqueMatchesByCanonicalJob } from "@/lib/job-search/unique-matches";
import { loadFavoritedJobIds } from "@/lib/jobs/favorites";
import { isJobSuppressed, loadJobSuppressionStatesByUserIds } from "@/lib/jobs/suppression";
import { formatStoredJobSourceLabel } from "@/lib/job-search/source-display";
import { prisma } from "@/lib/prisma";
import { getServiceFallbacks } from "@/lib/service-fallbacks";
import { ServiceFallbackBanners } from "@/components/ui/service-fallback-banners";
import { ProfileLink } from "@/components/profile-link";
import { JobsTable } from "./jobs-table";

export const dynamic = "force-dynamic";

type StatusView = "active" | "rejected" | "archived" | "all";
type MatchView = "full" | "partial";

export default async function JobsPage({ searchParams }: { searchParams?: { statusView?: string; matchView?: string; q?: string; company?: string; job?: string; profile?: string } }) {
  await reconcileApplicationCanonicalState({ source: "jobs_page" }).catch(() => null);
  const statusView = normalizeStatusView(searchParams?.statusView);
  const matchView = normalizeMatchView(searchParams?.matchView);
  const searchQuery = normalizeSearchQuery(searchParams?.q ?? searchParams?.company);
  const profileFilterId = searchParams?.profile?.trim() || undefined;
  const initialSelectedJobId = searchParams?.job ?? undefined;
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const favoritedJobIds = user ? Array.from(await loadFavoritedJobIds(user.id)) : [];
  const filteredProfile = profileFilterId
    ? await prisma.jobSearchProfile.findUnique({ where: { id: profileFilterId }, select: { id: true, name: true } })
    : null;

  const [matches, partialCount, submittedApplications] = await Promise.all([
    prisma.jobProfileMatch.findMany({
      where: statusWhere(statusView, matchView, searchQuery, profileFilterId),
      include: {
        jobPosting: {
          include: { source: true },
        },
        jobSearchProfile: {
          select: { id: true, name: true, userId: true },
        },
      },
      orderBy: [{ status: "asc" }, { overallScore: "desc" }, { createdAt: "desc" }],
      take: 250,
    }),
    statusView === "active"
      ? prisma.jobProfileMatch.count({ where: statusWhere("active", "partial", searchQuery, profileFilterId) })
      : Promise.resolve(0),
    prisma.application.findMany({
      where: { status: { in: submittedApplicationStatuses } },
      select: {
        id: true,
        status: true,
        appliedAt: true,
        updatedAt: true,
        jobPosting: {
          select: {
            company: true,
            title: true,
            location: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: [{ appliedAt: "desc" }, { updatedAt: "desc" }],
    }),
  ]);
  const submittedApplicationByJobKey = new Map<string, typeof submittedApplications[number]>();
  for (const application of submittedApplications) {
    for (const key of createApplicationCanonicalJobKeys(application.jobPosting)) {
      if (!submittedApplicationByJobKey.has(key)) submittedApplicationByJobKey.set(key, application);
    }
  }
  const suppressionStates = await loadJobSuppressionStatesByUserIds(matches.map((match) => match.jobSearchProfile.userId));
  const reviewableMatches = statusView === "active"
    ? matches.filter((match) => {
      const suppressionState = suppressionStates.get(match.jobSearchProfile.userId);
      return !suppressionState || !isJobSuppressed(match.jobPosting, suppressionState);
    })
    : matches;
  const visibleMatches = uniqueMatchesByCanonicalJob(reviewableMatches).slice(0, 100);
  const evaluations = visibleMatches.length
    ? await prisma.jobEvaluation.findMany({
        where: {
          OR: visibleMatches.map((match) => ({
            jobPostingId: match.jobPostingId,
            jobSearchProfileId: match.jobSearchProfileId,
          })),
        },
      })
    : [];
  const evaluationByMatch = new Map(evaluations.map((evaluation) => [`${evaluation.jobPostingId}:${evaluation.jobSearchProfileId}`, evaluation]));
  const topReviewMatch = visibleMatches.find((match) => match.status === "needs_review" && (statusView !== "active" || match.matchTier === (matchView === "partial" ? "partial" : "full"))) ?? null;
  const approvedForPrep = visibleMatches.filter((match) => ["approved", "resume_generated", "cover_letter_generated"].includes(match.status));

  const fallbacks = getServiceFallbacks(["openai", "brave"]);

  return (
    <AppShell>
      <WorkflowStepBanner stepKey="jobs-review" />
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Decision queue"
          title={matchView === "partial" ? "Partial Matches" : "Full Matches"}
          description={matchView === "partial"
            ? "These jobs passed core role checks but missed secondary requirements like unknown salary or contract wording. Review when you have time."
            : "Jobs that meet every hard requirement for their profile. Start here for the most conclusive opportunities."}
          actions={
            <>
              <ActionButton href="/jobs/manual" variant="outlined" startIcon={<AddIcon />}>Add manual job</ActionButton>
              <DetectJobQualityControl />
              <EvaluateJobsControl />
              <RunSearchControl compact />
            </>
          }
        />
        <ServiceFallbackBanners items={fallbacks} />

        {filteredProfile ? (
          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Showing review queue for <ProfileLink profileId={filteredProfile.id} name={filteredProfile.name} fontWeight={700} />.
                </Typography>
                <ActionButton href="/jobs" variant="outlined" size="small">Clear profile filter</ActionButton>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        <Card sx={{ borderColor: topReviewMatch ? "primary.main" : approvedForPrep.length ? "success.main" : "divider", bgcolor: topReviewMatch ? "rgba(37, 99, 235, 0.08)" : approvedForPrep.length ? "rgba(16, 185, 129, 0.08)" : "background.paper" }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
              <Box>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
                  <Chip size="small" color={topReviewMatch ? "primary" : approvedForPrep.length ? "success" : "default"} label="Next action" />
                  {topReviewMatch ? <Chip size="small" variant="outlined" label={`${topReviewMatch.overallScore} score`} /> : null}
                  {approvedForPrep.length ? <Chip size="small" variant="outlined" label={`${approvedForPrep.length} approved`} /> : null}
                </Stack>
                <Typography variant="h3">
                  {topReviewMatch ? (matchView === "partial" ? "Review top partial match" : "Review top full match") : approvedForPrep.length ? "Prepare approved jobs" : "Run discovery"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {topReviewMatch
                    ? `${topReviewMatch.jobPosting.company} - ${topReviewMatch.jobPosting.title} is ready for your decision.`
                    : approvedForPrep.length
                      ? "Approved jobs are ready for tailored resumes, cover letters, and application packets."
                      : "No reviewable jobs are waiting. Run discovery or add a manual job."}
                </Typography>
              </Box>
              {topReviewMatch ? (
                <ActionButton href={`/jobs/${topReviewMatch.jobPostingId}`} variant="contained">
                  Open top match
                </ActionButton>
              ) : approvedForPrep.length ? (
                <BulkPrepareControl compact defaultMinimumScore={75} defaultLimit={10} />
              ) : (
                <RunSearchControl compact />
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack
              component="form"
              method="GET"
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              sx={{ alignItems: { md: "center" } }}
            >
              {statusView === "active" ? null : <input type="hidden" name="statusView" value={statusView} />}
              {matchView === "full" ? null : <input type="hidden" name="matchView" value={matchView} />}
              <TextField
                fullWidth
                size="small"
                name="q"
                label="Search jobs"
                placeholder="Company, title, location, profile, source, or signal"
                defaultValue={searchQuery}
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
              {searchQuery ? (
                <ActionButton href={statusView === "active" ? "/jobs" : `/jobs?statusView=${statusView}`} variant="outlined">
                  Clear
                </ActionButton>
              ) : null}
            </Stack>
            {searchQuery ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Showing jobs matching {searchQuery}.
              </Typography>
            ) : null}
          </CardContent>
        </Card>

        {matchView === "partial" && statusView === "active" ? (
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Partial matches did not fail hard filters (wrong country, wrong work mode, closed listing, wrong title). They failed softer checks like salary unknown, below-minimum pay, or contract wording.
              </Typography>
            </CardContent>
          </Card>
        ) : null}

        <JobsTable
          searchQuery={searchQuery}
          statusView={statusView}
          matchView={matchView}
          partialCount={partialCount}
          initialSelectedJobId={initialSelectedJobId}
          favoritedJobIds={favoritedJobIds}
          matches={visibleMatches.map((match) => {
            const evaluation = evaluationByMatch.get(`${match.jobPostingId}:${match.jobSearchProfileId}`);
            return {
              action: evaluation?.recommendedAction ?? null,
              confidenceScore: evaluation?.confidenceScore ?? null,
              id: match.id,
              jobId: match.jobPosting.id,
              opportunityScore: evaluation?.opportunityScore ?? null,
              duplicateGroupId: match.jobPosting.duplicateGroupId,
              score: match.overallScore,
              matchTier: match.matchTier,
              staleScore: match.jobPosting.staleScore,
              title: match.jobPosting.title,
              company: match.jobPosting.company,
              location: match.jobPosting.location ?? "Unknown location",
              status: match.status,
              applicationUrl: match.jobPosting.applicationUrl ?? null,
              profileId: match.jobSearchProfile.id,
              profileName: match.jobSearchProfile.name,
              failedRequirements: jsonRecordArray<{ code: string; label: string; severity: string }>(match.failedRequirements),
              passedRequirements: jsonRecordArray<{ code: string; label: string }>(match.passedRequirements),
              sourceName: formatStoredJobSourceLabel(match.jobPosting.source, match.jobPosting),
              strongestMatches: jsonArray(match.strongestMatches),
              applicationState: (() => {
                const application = createApplicationCanonicalJobKeys(match.jobPosting)
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
            };
          })}
        />
      </Stack>
    </AppShell>
  );
}

function normalizeStatusView(value: string | undefined): StatusView {
  return value === "rejected" || value === "archived" || value === "all" ? value : "active";
}

function normalizeMatchView(value: string | undefined): MatchView {
  return value === "partial" ? "partial" : "full";
}

function normalizeSearchQuery(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";
}

function statusWhere(statusView: StatusView, matchView: MatchView = "full", searchQuery = "", profileId?: string): Prisma.JobProfileMatchWhereInput {
  const jobPostingWhere: Prisma.JobPostingWhereInput = {
    ...(searchQuery
      ? {
          OR: [
            { company: { contains: searchQuery, mode: "insensitive" } },
            { title: { contains: searchQuery, mode: "insensitive" } },
            { location: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const profileWhere = profileId ? { jobSearchProfileId: profileId } : {};
  if (statusView === "rejected") return { ...profileWhere, status: { in: ["rejected"] }, jobPosting: jobPostingWhere };
  if (statusView === "archived") return { ...profileWhere, status: { in: ["archived"] }, jobPosting: jobPostingWhere };
  if (statusView === "all") return { ...profileWhere, jobPosting: jobPostingWhere };
  return {
    ...profileWhere,
    status: { notIn: ["rejected", "archived"] },
    matchTier: matchView === "partial" ? "partial" : "full",
    jobPosting: {
      ...jobPostingWhere,
      applications: {
        none: {
          status: { in: submittedApplicationStatuses },
        },
      },
    },
  };
}
