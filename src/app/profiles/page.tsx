export const metadata = {
  title: "Search Profiles | Job Search OS",
  description: "Manage search profiles, market intelligence, and discovery strategy.",
};

import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { AppShell } from "@/app/app-shell";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { WorkflowStepBanner } from "@/components/workflow-coach/WorkflowStepBanner";
import { ScoreChip } from "@/components/ui/score-chip";
import { formatStatus } from "@/components/ui/status-chip";
import { jsonArray } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { ProfileLink } from "@/components/profile-link";
import { ProfileCreateForm } from "./profile-create-form";
import { ProfileActions, ColumnTooltip, HealthScoreTooltip, ThresholdTooltip, CallbackTooltip, CollapsibleSection, WithTooltip } from "./profile-actions";
import { ProfileToolsSection } from "./profile-tools-section";
import type { OptimizerOutput } from "./profile-optimizer-panel";
import type { SearchExpansionPanelOutput } from "./search-expansion-panel";
import type { MarketIntelligenceOutput } from "@/lib/agents/market-intelligence";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [profiles, latestOptimizerRun, latestExpansionRun, latestMarketRun] = await Promise.all([
    prisma.jobSearchProfile.findMany({
      include: {
        performanceSnapshots: {
          orderBy: { lastEvaluatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ enabled: "desc" }, { name: "asc" }],
    }),
    prisma.agentRun.findFirst({
      where: {
        agentType: "SEARCH_PROFILE_MANAGER",
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentRun.findFirst({
      where: {
        agentType: "SEARCH_EXPANSION",
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentRun.findFirst({
      where: {
        agentType: "MARKET_INTELLIGENCE",
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const nextAction = profileNextAction({
    profileCount: profiles.length,
    enabledCount: profiles.filter((profile) => profile.enabled).length,
    optimizerRunAt: latestOptimizerRun?.createdAt ?? null,
    expansionRunAt: latestExpansionRun?.createdAt ?? null,
  });

  return (
    <AppShell>
      <WorkflowStepBanner stepKey="market-intelligence" />
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Search strategy"
          title="Search Profiles"
          description="Manage reusable search strategies, target titles, filters, salary floors, and profile-health recommendations used by discovery and scoring agents."
          actions={<ProfileCreateForm />}
        />

        {(() => {
          const active = profiles.filter((p) => p.enabled);
          const paused = profiles.filter((p) => !p.enabled);

          function renderRows(list: typeof profiles) {
            return list.map((profile) => {
              const performance = profile.performanceSnapshots[0];
              return (
                <TableRow key={profile.id} hover>
                  <TableCell>
                    <ProfileLink profileId={profile.id} name={profile.name} />
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
                      {jsonArray(profile.titles).slice(0, 3).map((title) => (
                        <Chip key={`${profile.id}-${title}`} size="small" variant="outlined" label={title} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
                      {(jsonArray(profile.remotePreferences).length > 0
                        ? jsonArray(profile.remotePreferences)
                        : [profile.remotePreference]
                      ).map((pref) => (
                        <Chip key={pref} size="small" color="primary" variant="outlined" label={formatStatus(pref)} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{jsonArray(profile.countries).join(", ") || "Any"}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color={jsonArray(profile.cities).length ? "text.primary" : "text.disabled"}>
                      {jsonArray(profile.cities).join(", ") || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{profile.salaryMin ? `${profile.salaryCurrency} ${profile.salaryMin.toLocaleString()}` : "Unknown OK"}</TableCell>
                  <TableCell align="right">
                    {performance
                      ? <HealthScoreTooltip score={performance.healthScore}><ScoreChip score={performance.healthScore} /></HealthScoreTooltip>
                      : <Typography variant="caption" color="text.secondary">Run optimizer</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    {performance ? (
                      <CallbackTooltip rate={performance.callbackRate} applied={performance.applicationsSubmitted}>
                        <Stack spacing={0.25} sx={{ alignItems: "flex-end" }}>
                          <Typography sx={{ fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>{performance.callbackRate}%</Typography>
                          <Typography variant="caption" color="text.secondary">{performance.applicationsSubmitted} applied</Typography>
                        </Stack>
                      </CallbackTooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">n/a</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <ThresholdTooltip score={profile.minimumMatchScore}>
                      <ScoreChip score={profile.minimumMatchScore} />
                    </ThresholdTooltip>
                  </TableCell>
                  <TableCell align="right">
                    <ProfileActions profile={{ id: profile.id, name: profile.name, enabled: profile.enabled }} />
                  </TableCell>
                </TableRow>
              );
            });
          }

          const tableHead = (
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Remote</TableCell>
                <TableCell>Countries</TableCell>
                <TableCell>Cities</TableCell>
                <TableCell>Salary</TableCell>
                <TableCell align="right">
                  <ColumnTooltip
                    label="Health"
                    title="Profile Health Score (0–100)"
                    body="A composite score the Profile Optimizer assigns after analysis. It factors in match volume, the share of jobs you approve, average fit quality, and your application outcomes. Run the Optimizer from the Agents page to generate or refresh scores."
                  />
                </TableCell>
                <TableCell align="right">
                  <ColumnTooltip
                    label="Callback"
                    title="Application Callback Rate"
                    body="Percentage of submitted applications that led to a phone screen or interview. Industry average for cold outreach is 3–5%; above 10% is excellent. Builds over time as you submit applications through the dashboard."
                  />
                </TableCell>
                <TableCell align="right">
                  <ColumnTooltip
                    label="Threshold"
                    title="Match Threshold (0–100)"
                    body="Minimum match score a job must hit to appear in your review queue. The default of 75 balances breadth and precision. Lower it (e.g. 65) to see more jobs; raise it (e.g. 85) if your queue is too noisy."
                  />
                </TableCell>
                <TableCell align="right" sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
          );

          return (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }} data-workflow-target="profile-list">
                <Stack spacing={0.25}>
                  <Typography variant="h3">Active profiles ({active.length})</Typography>
                  <Typography variant="body2" color="text.secondary">
                    These profiles run on your schedule and surface new matching jobs.
                  </Typography>
                </Stack>
                <WithTooltip tip={nextAction.detail}>
                  <ActionButton
                    href={nextAction.href}
                    postTo={nextAction.postTo}
                    size="small"
                    variant="outlined"
                    startIcon={nextAction.icon}
                  >
                    {nextAction.label}
                  </ActionButton>
                </WithTooltip>
              </Stack>
              <TableContainer component={Card}>
                <Table sx={{ minWidth: 920 }}>
                  {tableHead}
                  <TableBody>
                    {active.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                          No active profiles — enable one below or create a new one.
                        </TableCell>
                      </TableRow>
                    ) : renderRows(active)}
                  </TableBody>
                </Table>
              </TableContainer>

              {paused.length > 0 && (
                <CollapsibleSection
                  summary={
                    <Stack spacing={0.25}>
                      <Typography variant="h3" color="text.secondary">Paused profiles ({paused.length})</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Saved but won&apos;t run until re-enabled.
                      </Typography>
                    </Stack>
                  }
                >
                  <TableContainer component={Card} sx={{ opacity: 0.7 }}>
                    <Table sx={{ minWidth: 920 }}>
                      {tableHead}
                      <TableBody>{renderRows(paused)}</TableBody>
                    </Table>
                  </TableContainer>
                </CollapsibleSection>
              )}

              <ProfileToolsSection
                latestOptimizer={isRecord(latestOptimizerRun?.outputJson) ? latestOptimizerRun.outputJson as OptimizerOutput : null}
                latestExpansion={isRecord(latestExpansionRun?.outputJson) ? latestExpansionRun.outputJson as SearchExpansionPanelOutput : null}
                latestMarket={isRecord(latestMarketRun?.outputJson) ? latestMarketRun.outputJson as MarketIntelligenceOutput : null}
              />
            </>
          );
        })()}
      </Stack>
    </AppShell>
  );
}

function profileNextAction({
  profileCount,
  enabledCount,
  optimizerRunAt,
  expansionRunAt,
}: {
  profileCount: number;
  enabledCount: number;
  optimizerRunAt: Date | null;
  expansionRunAt: Date | null;
}) {
  if (profileCount === 0) {
    return {
      title: "Create your first search profile",
      detail: "A search profile tells the system what kinds of jobs to look for — target titles, location, remote preference, and minimum salary. Create one to get started.",
      label: "Create profile",
      href: "/profiles",
      icon: <RocketLaunchOutlinedIcon />,
    };
  }
  if (enabledCount === 0) {
    return {
      title: "Enable a search profile",
      detail: "All your profiles are currently paused, so no job searches will run. Enable at least one using the ⋮ menu in the table below.",
      label: "Review profiles",
      href: "/profiles",
      icon: <RocketLaunchOutlinedIcon />,
      count: profileCount,
    };
  }
  if (isOlderThanDays(optimizerRunAt, 7)) {
    return {
      title: "Check your profile quality",
      detail: "Runs a quick AI review of all your search profiles — scores each one, flags any that are too vague or overlap heavily with another, and suggests improvements.",
      label: "Analyze profiles",
      postTo: "/api/profiles/optimize",
      icon: <AutoFixHighOutlinedIcon />,
      count: enabledCount,
    };
  }
  if (isOlderThanDays(expansionRunAt, 14)) {
    return {
      title: "Look for companies you might be missing",
      detail: "Looks at a curated list of top tech companies and checks whether your active searches would actually find jobs there. If a strong employer would be missed entirely, it suggests adding a search profile for them.",
      label: "Find gaps",
      postTo: "/api/profiles/expand",
      icon: <ExploreOutlinedIcon />,
      count: enabledCount,
    };
  }
  return {
    title: "Ready to search for jobs",
    detail: "Your profiles are set up and recently reviewed. Head to Runs to fetch new job listings and see what matches.",
    label: "Go to runs",
    href: "/runs",
    icon: <RocketLaunchOutlinedIcon />,
    count: enabledCount,
  };
}

function isOlderThanDays(date: Date | null, days: number) {
  if (!date) return true;
  return Date.now() - date.getTime() > days * 86_400_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
