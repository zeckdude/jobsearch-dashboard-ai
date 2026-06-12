export const metadata = {
  title: "Search Profile | Job Search OS",
  description: "Read-only command center for a search profile — performance, targeting, queue, and discovery activity.",
};

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/app-shell";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { ScoreChip } from "@/components/ui/score-chip";
import { StatusChip, formatStatus } from "@/components/ui/status-chip";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import type { OptimizerOutput } from "../profile-optimizer-panel";
import type { SearchExpansionPanelOutput } from "../search-expansion-panel";
import { CallbackTooltip, HealthScoreTooltip, ThresholdTooltip } from "../profile-actions";
import { ProfileDangerZone } from "../profile-danger-zone";
import { ProfileDetailActions } from "../profile-detail-actions";

export const dynamic = "force-dynamic";

const APPROVED_STATUSES = ["approved", "resume_generated", "cover_letter_generated"] as const;
const ACTIVE_STATUSES = ["needs_review", "approved", "resume_generated", "cover_letter_generated", "discovered"] as const;

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  const [
    profile,
    matchGroups,
    recentMatches,
    recentRuns,
    latestOptimizerRun,
    latestExpansionRun,
  ] = await Promise.all([
    prisma.jobSearchProfile.findUnique({
      where: { id: params.id },
      include: {
        performanceSnapshots: { orderBy: { lastEvaluatedAt: "desc" }, take: 1 },
      },
    }),
    prisma.jobProfileMatch.groupBy({
      by: ["status", "matchTier"],
      where: { jobSearchProfileId: params.id },
      _count: { _all: true },
    }),
    prisma.jobProfileMatch.findMany({
      where: { jobSearchProfileId: params.id },
      include: {
        jobPosting: { select: { id: true, title: true, company: true } },
      },
      orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.jobSearchRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    prisma.agentRun.findFirst({
      where: { agentType: "SEARCH_PROFILE_MANAGER", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentRun.findFirst({
      where: { agentType: "SEARCH_EXPANSION", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!profile) notFound();

  const performance = profile.performanceSnapshots[0] ?? null;
  const queueCounts = summarizeQueueCounts(matchGroups);
  const profileRuns = recentRuns
    .filter((run) => jsonArray(run.profileIds).includes(params.id))
    .slice(0, 5);
  const agentRecommendations = extractAgentRecommendations(params.id, profile.name, latestOptimizerRun, latestExpansionRun);

  const remotePrefs = jsonArray(profile.remotePreferences).length > 0
    ? jsonArray(profile.remotePreferences)
    : [profile.remotePreference];

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Search profile"
          title={profile.name}
          description={
            profile.enabled
              ? "This campaign is active — scheduled searches will look for new jobs that match the criteria below and add them to your review queue."
              : "This campaign is paused — no new jobs will be fetched until you enable it again. Existing matches stay in your queue."
          }
          actions={
            <ProfileDetailActions profileId={profile.id} enabled={profile.enabled} name={profile.name} />
          }
        />

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <Chip
            size="small"
            color={profile.enabled ? "success" : "default"}
            variant="outlined"
            label={profile.enabled ? "Active" : "Paused"}
          />
          <Chip size="small" variant="outlined" label={formatStatus(profile.searchIntent)} />
          <Typography variant="caption" color="text.secondary">
            Updated {formatDate(profile.updatedAt)} · Created {formatDate(profile.createdAt)}
          </Typography>
        </Stack>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <SectionHeader
                title="How is this profile doing?"
                description="Tracks match quality, the decisions you've made on jobs, and how applications from this profile are converting. Refreshed when you run the Profile Optimizer."
                action={
                  <ActionButton href="/profiles#strategy-tools" variant="text" size="small">
                    Open strategy tools
                  </ActionButton>
                }
              />

              {performance ? (
                <>
                  <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <MetricBlock label="Profile health" helper="Overall targeting quality (0–100)">
                      <HealthScoreTooltip score={performance.healthScore}>
                        <ScoreChip score={performance.healthScore} />
                      </HealthScoreTooltip>
                    </MetricBlock>
                    <MetricBlock label="Callback rate" helper="% of applications that led to a screen or interview">
                      <CallbackTooltip rate={performance.callbackRate} applied={performance.applicationsSubmitted}>
                        <Typography sx={{ fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>{performance.callbackRate}%</Typography>
                      </CallbackTooltip>
                    </MetricBlock>
                    <MetricBlock label="Average match score" helper="Typical fit score for jobs this profile found">
                      <ScoreChip score={performance.averageFitScore} />
                    </MetricBlock>
                    {performance.averageOpportunityScore > 0 ? (
                      <MetricBlock label="Average opportunity" helper="Compensation and career upside signal">
                        <ScoreChip score={performance.averageOpportunityScore} />
                      </MetricBlock>
                    ) : null}
                  </Stack>

                  <SubsectionLabel title="Pipeline" description="What happened to jobs discovered by this profile — from first match through outcomes." />
                  <FunnelRow
                    items={[
                      { label: "Jobs found", value: performance.jobsFound },
                      { label: "You approved", value: performance.jobsApproved },
                      { label: "You rejected", value: performance.jobsRejected },
                      { label: "Applications sent", value: performance.applicationsSubmitted },
                      { label: "Phone screens", value: performance.recruiterScreens },
                      { label: "Interviews", value: performance.interviews },
                      { label: "Offers", value: performance.offers },
                      { label: "No response", value: performance.noResponseCount },
                      { label: "Duplicate listings", value: `${performance.duplicateRate}%` },
                    ]}
                  />

                  <SubsectionLabel title="Search settings" description="How picky this profile is and how many jobs it adds per search." />
                  <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <MetricBlock
                      label="Minimum match score"
                      helper="Lowest score (out of 100) a job needs to reach your queue"
                    >
                      <ThresholdTooltip score={profile.minimumMatchScore}>
                        <ScoreChip score={profile.minimumMatchScore} />
                      </ThresholdTooltip>
                    </MetricBlock>
                    <MetricBlock
                      label="Top matches per search"
                      helper="Best-ranked matches kept from each search run"
                    >
                      <Typography sx={{ fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>{profile.maxResultsPerRun}</Typography>
                    </MetricBlock>
                    {profile.pushNotificationsEnabled ? (
                      <MetricBlock
                        label="Push alert minimum"
                        helper="Notify only when a job scores this high or better"
                      >
                        <Typography sx={{ fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>{profile.minimumPushScore}</Typography>
                      </MetricBlock>
                    ) : null}
                  </Stack>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No performance data yet. Run the Profile Optimizer from{" "}
                  <Link href="/profiles#strategy-tools">Search Profiles</Link>{" "}
                  to score this profile and fill in health, callback rate, and pipeline stats.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Box>
          <SectionHeader
            title="What jobs is this profile looking for?"
            description="Every field below is used during discovery and scoring. A job must pass these filters before it can appear in your queue."
            action={
              <ActionButton href={`/profiles/${profile.id}/edit`} variant="outlined" size="small">
                Edit criteria
              </ActionButton>
            }
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
            <CriteriaCard
              title="Role targets"
              description="Which job titles to search for, and which titles to skip even if they look similar."
            >
              <ChipList label="Target titles" items={jsonArray(profile.titles)} emptyLabel="None set" />
              <ChipList label="Excluded titles" items={jsonArray(profile.excludedTitles)} emptyLabel="None" />
              <ChipList label="Job types" items={jsonArray(profile.jobTypes)} emptyLabel="Any type" />
            </CriteriaCard>
            <CriteriaCard
              title="Location & work mode"
              description="Geography and remote/hybrid/onsite rules. Hybrid and onsite roles can be narrowed to specific cities."
            >
              <TextRow label="Countries" value={jsonArray(profile.countries).join(", ") || "Any country"} />
              <TextRow label="Regions" value={jsonArray(profile.regions).join(", ") || "Not narrowed"} />
              <TextRow label="Cities" value={jsonArray(profile.cities).join(", ") || "Not narrowed"} />
              <ChipList label="Work mode" items={remotePrefs.map(formatStatus)} emptyLabel="Any mode" />
              <TextRow label="Relocation" value={formatStatus(profile.relocationPreference)} />
            </CriteriaCard>
            <CriteriaCard
              title="Compensation"
              description="Salary floor and ceiling used when scoring whether a listing is worth your time."
            >
              <TextRow label="Salary range" value={formatSalaryRange(profile.salaryMin, profile.salaryMax, profile.salaryCurrency)} />
              <TextRow label="Listings without salary" value={profile.includeUnknownSalary ? "Still allowed" : "Automatically rejected"} />
            </CriteriaCard>
            <CriteriaCard
              title="Keywords & signals"
              description="Skills and terms that must appear, give a boost, or disqualify a listing."
            >
              <ChipList label="Required keywords" items={jsonArray(profile.keywordsRequired)} emptyLabel="None" />
              <ChipList label="Preferred keywords" items={jsonArray(profile.keywordsPreferred)} emptyLabel="None" />
              <ChipList label="Excluded keywords" items={jsonArray(profile.keywordsExcluded)} emptyLabel="None" />
            </CriteriaCard>
            <CriteriaCard
              title="Companies & industries"
              description="Employers and sectors you want to prioritize or never see again."
            >
              <ChipList label="Preferred companies" items={jsonArray(profile.preferredCompanies)} emptyLabel="None" />
              <ChipList label="Excluded companies" items={jsonArray(profile.excludedCompanies)} emptyLabel="None" />
              <ChipList label="Industries" items={jsonArray(profile.industries)} emptyLabel="Any industry" />
            </CriteriaCard>
            <CriteriaCard
              title="Schedule & notifications"
              description="When automated searches run for this profile and how you get notified about new matches."
            >
              <TextRow label="Scheduled searches" value={profile.scheduleEnabled ? "On" : "Off"} />
              <TextRow label="Schedule timing" value={profile.cronExpression ?? "Uses your default schedule"} />
              <TextRow label="Email digest" value={profile.emailDigestEnabled ? "On" : "Off"} />
              <TextRow label="Push notifications" value={profile.pushNotificationsEnabled ? "On" : "Off"} />
            </CriteriaCard>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <SectionHeader
                title="Jobs this profile found"
                description="Your review queue for this campaign — jobs waiting for a decision, ones you've already approved or rejected, and the strongest recent matches. Open the full queue to approve, reject, or prepare applications."
                action={
                  <ActionButton href={`/jobs?profile=${profile.id}`} variant="contained" size="small">
                    Open job queue
                  </ActionButton>
                }
              />

              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <CountChip label="Waiting for your review" count={queueCounts.needsReview} />
                <CountChip label="Approved by you" count={queueCounts.approved} />
                <CountChip label="Rejected by you" count={queueCounts.rejected} />
                <CountChip label="Archived" count={queueCounts.archived} />
                <CountChip label="Full matches" count={queueCounts.fullMatches} />
                <CountChip label="Partial matches" count={queueCounts.partialMatches} />
              </Stack>

              {recentMatches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing here yet. Enable this profile and run a search from the Command Center — matching jobs will show up here and on the Jobs page.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Role</TableCell>
                        <TableCell>Fit</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Discovered</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentMatches.map((match) => (
                        <TableRow key={match.id} hover>
                          <TableCell>
                            <Link href={`/jobs/${match.jobPosting.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                              <Typography sx={{ fontWeight: 800 }}>{match.jobPosting.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{match.jobPosting.company}</Typography>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                              <ScoreChip score={match.overallScore} />
                              <Chip
                                size="small"
                                variant="outlined"
                                color={match.matchTier === "partial" ? "warning" : "success"}
                                label={match.matchTier === "partial" ? "Partial" : "Full"}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell><StatusChip status={match.status} /></TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">{formatRelativeDate(match.createdAt)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <SectionHeader
                title="Recent job searches"
                description="Each search run scans your configured sources and saves listings that pass this profile's filters. Shows the last few runs that included this profile."
                action={
                  <ActionButton href="/runs" variant="text" size="small">View all search runs</ActionButton>
                }
              />

              {profileRuns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No search runs have included this profile yet. Run discovery from the Command Center or wait for the next scheduled search.
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Started</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>How it started</TableCell>
                        <TableCell align="right">Jobs saved</TableCell>
                        <TableCell align="right">Jobs fetched</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profileRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>{run.startedAt.toLocaleString()}</TableCell>
                          <TableCell><StatusChip status={run.status} /></TableCell>
                          <TableCell>{formatStatus(run.triggeredBy)}</TableCell>
                          <TableCell align="right">{run.jobsSaved}</TableCell>
                          <TableCell align="right">{run.jobsFetched}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <SectionHeader
                title="AI suggestions for this profile"
                description="Advice from the Profile Optimizer and Search Expansion agents after their most recent analysis — things like tightening keywords, pausing an underperforming campaign, or expanding coverage."
              />
              {agentRecommendations.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No suggestions yet. Run Analyze profiles or Find gaps from Search Profiles to get tailored recommendations.
                </Typography>
              ) : (
                agentRecommendations.map((item) => (
                  <Box key={`${item.agent}-${item.action}-${item.summary}`} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        {item.agent} · {item.runAt.toLocaleString()}
                      </Typography>
                      <Chip size="small" variant="outlined" label={formatStatus(item.action)} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{item.summary}</Typography>
                  </Box>
                ))
              )}
              <ActionButton href="/profiles#strategy-tools" variant="outlined" size="small">
                Open strategy tools
              </ActionButton>
            </Stack>
          </CardContent>
        </Card>

        <ProfileDangerZone profileId={profile.id} name={profile.name} />
      </Stack>
    </AppShell>
  );
}

function summarizeQueueCounts(groups: Array<{ status: string; matchTier: string; _count: { _all: number } }>) {
  let needsReview = 0;
  let approved = 0;
  let rejected = 0;
  let archived = 0;
  let fullMatches = 0;
  let partialMatches = 0;

  for (const group of groups) {
    const count = group._count._all;
    if (group.status === "needs_review") needsReview += count;
    if (APPROVED_STATUSES.includes(group.status as typeof APPROVED_STATUSES[number])) approved += count;
    if (group.status === "rejected") rejected += count;
    if (group.status === "archived") archived += count;
    if (ACTIVE_STATUSES.includes(group.status as typeof ACTIVE_STATUSES[number])) {
      if (group.matchTier === "full") fullMatches += count;
      if (group.matchTier === "partial") partialMatches += count;
    }
  }

  return { needsReview, approved, rejected, archived, fullMatches, partialMatches };
}

function extractAgentRecommendations(
  profileId: string,
  profileName: string,
  optimizerRun: { outputJson: unknown; createdAt: Date } | null,
  expansionRun: { outputJson: unknown; createdAt: Date } | null,
) {
  const items: Array<{ agent: string; action: string; summary: string; runAt: Date }> = [];

  if (optimizerRun && isRecord(optimizerRun.outputJson)) {
    const output = optimizerRun.outputJson as OptimizerOutput;
    for (const change of output.recommendedChanges ?? []) {
      if (change.profileId === profileId) {
        items.push({
          agent: "Profile Optimizer",
          action: change.action,
          summary: change.summary,
          runAt: optimizerRun.createdAt,
        });
      }
    }
  }

  if (expansionRun && isRecord(expansionRun.outputJson)) {
    const output = expansionRun.outputJson as SearchExpansionPanelOutput;
    for (const suggestion of output.profilesToExpand ?? []) {
      if (suggestion.profileId === profileId || suggestion.profileName === profileName) {
        items.push({
          agent: "Search Expansion",
          action: "expand",
          summary: suggestion.rationale,
          runAt: expansionRun.createdAt,
        });
      }
    }
  }

  return items;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
    >
      <Box sx={{ maxWidth: 720 }}>
        <Typography variant="h3">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>
          {description}
        </Typography>
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Stack>
  );
}

function SubsectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", display: "block" }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
        {description}
      </Typography>
    </Box>
  );
}

function CriteriaCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5, lineHeight: 1.45 }}>
          {description}
        </Typography>
        <Stack spacing={1.25}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

function ChipList({ label, items, emptyLabel }: { label: string; items: string[]; emptyLabel: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>{label}</Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.disabled">{emptyLabel}</Typography>
      ) : (
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
          {items.map((item) => <Chip key={`${label}-${item}`} size="small" variant="outlined" label={item} />)}
        </Stack>
      )}
    </Box>
  );
}

function TextRow({ label, value }: { label: string; value: string | number }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function MetricBlock({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5, minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: "block" }}>{label}</Typography>
      {helper ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>{helper}</Typography> : null}
      {children}
    </Box>
  );
}

function FunnelRow({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(5, 1fr)" }, gap: 1 }}>
      {items.map((item) => (
        <Box key={item.label} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block" }}>{item.label}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.25, fontVariantNumeric: "tabular-nums" }}>{item.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function CountChip({ label, count }: { label: string; count: number }) {
  return <Chip size="small" variant="outlined" label={`${label}: ${count}`} />;
}

function formatSalaryRange(min: number | null, max: number | null, currency: string) {
  if (min && max) return `${currency} ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (min) return `${currency} ${min.toLocaleString()}+`;
  if (max) return `Up to ${currency} ${max.toLocaleString()}`;
  return "No floor";
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeDate(date: Date) {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
