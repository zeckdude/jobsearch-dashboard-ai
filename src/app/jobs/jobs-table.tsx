"use client";

import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter, useSearchParams } from "next/navigation";
import { PointerEvent, useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { JobFavoriteButton } from "@/components/job-favorite-button";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { postingLinkTooltip } from "@/lib/jobs/discovery-channel";
import { JobRejectButton, RejectionReasonDialog, type RejectionReasonCode } from "@/components/job-reject-button";
import { ProfileLink } from "@/components/profile-link";
import { RunItemSourceLabel } from "@/components/run-item-source-label";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreChip } from "@/components/ui/score-chip";
import { StatusChip } from "@/components/ui/status-chip";

export type JobsTableMatch = {
  action: string | null;
  confidenceScore: number | null;
  id: string;
  jobId: string;
  opportunityScore: number | null;
  duplicateGroupId: string | null;
  score: number;
  matchTier: string;
  staleScore: number;
  title: string;
  company: string;
  location: string;
  status: string;
  applicationUrl: string | null;
  applicationState: {
    id: string;
    status: string;
    appliedAt: string | null;
  } | null;
  profileId?: string;
  profileName: string;
  sourceName: string;
  strongestMatches: string[];
  failedRequirements: Array<{ code: string; label: string; severity: string }>;
  passedRequirements: Array<{ code: string; label: string }>;
  failsCurrentRules?: boolean;
};

type StatusView = "active" | "rejected" | "archived" | "all";
type MatchView = "full" | "partial";
type JobsTableMode = "review" | "favorites";

export function JobsTable({
  matches,
  statusView,
  matchView = "full",
  partialCount = 0,
  searchQuery = "",
  initialSelectedJobId,
  favoritedJobIds = [],
  pagePath = "/jobs",
  mode = "review",
}: {
  matches: JobsTableMatch[];
  statusView: StatusView;
  matchView?: MatchView;
  partialCount?: number;
  searchQuery?: string;
  initialSelectedJobId?: string;
  favoritedJobIds?: string[];
  pagePath?: string;
  mode?: JobsTableMode;
}) {
  const { push, refresh } = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [severity, setSeverity] = useState<"success" | "error" | "info">("info");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [pendingRejectionFeedback, setPendingRejectionFeedback] = useState<Array<Pick<JobsTableMatch, "id" | "jobId" | "title" | "company">>>([]);
  const [panelJobId, setPanelJobId] = useState<string | null>(initialSelectedJobId ?? null);
  const filteredMatches = useMemo(() => {
    const dismissed = new Set(dismissedIds);
    return filterByQuery(matches, searchQuery).filter((match) => !dismissed.has(match.id));
  }, [dismissedIds, matches, searchQuery]);
  const allJobIds = useMemo(() => filteredMatches.map((m) => m.jobId), [filteredMatches]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const favoritedSet = useMemo(() => new Set(favoritedJobIds), [favoritedJobIds]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (panelJobId) {
      params.set("job", panelJobId);
    } else {
      params.delete("job");
    }
    const next = params.toString() ? `${pagePath}?${params.toString()}` : pagePath;
    window.history.replaceState(null, "", next);
  }, [panelJobId, pagePath, searchParams]);
  const filteredSelectedCount = filteredMatches.filter((match) => selectedSet.has(match.id)).length;
  const allSelected = filteredMatches.length > 0 && filteredSelectedCount === filteredMatches.length;
  const partiallySelected = filteredSelectedCount > 0 && filteredSelectedCount < filteredMatches.length;

  function toggleAll(checked: boolean) {
    const filteredIds = new Set(filteredMatches.map((match) => match.id));
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...filteredIds]));
      return current.filter((id) => !filteredIds.has(id));
    });
  }

  function toggleOne(matchId: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, matchId] : current.filter((id) => id !== matchId));
  }

  function changeStatusView(nextView: StatusView | null) {
    if (!nextView || nextView === statusView) return;
    setSelectedIds([]);
    setPanelJobId(null);
    const params = new URLSearchParams();
    if (nextView !== "active") params.set("statusView", nextView);
    if (matchView !== "full") params.set("matchView", matchView);
    if (searchQuery) params.set("q", searchQuery);
    const query = params.toString();
    push(query ? `/jobs?${query}` : "/jobs");
  }

  function changeMatchView(nextView: MatchView | null) {
    if (!nextView || nextView === matchView) return;
    setSelectedIds([]);
    setPanelJobId(null);
    const params = new URLSearchParams();
    if (statusView !== "active") params.set("statusView", statusView);
    if (nextView !== "full") params.set("matchView", nextView);
    if (searchQuery) params.set("q", searchQuery);
    const query = params.toString();
    push(query ? `/jobs?${query}` : "/jobs");
  }

  async function updateSelected(status: "needs_review" | "approved" | "rejected" | "archived") {
    if (selectedIds.length === 0) {
      setSeverity("info");
      setNotice("Select at least one job first.");
      return;
    }

    setLoading(true);
    try {
      const rejectedMatches = status === "rejected"
        ? matches.flatMap((match) => selectedIds.includes(match.id) ? [{ id: match.id, jobId: match.jobId, title: match.title, company: match.company }] : [])
        : [];
      const response = await fetch("/api/jobs/bulk/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchIds: selectedIds, status, source: "jobs_bulk_status" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Batch update failed.");
      setSeverity("success");
      setNotice(payload.message ?? "Batch update complete.");
      if (status === "rejected" && rejectedMatches.length) setPendingRejectionFeedback(rejectedMatches);
      setSelectedIds([]);
      refresh();
    } catch (error) {
      setSeverity("error");
      setNotice(error instanceof Error ? error.message : "Batch update failed.");
    } finally {
      setLoading(false);
    }
  }

  async function swipeUpdate(match: JobsTableMatch, status: "approved" | "rejected") {
    setDismissedIds((current) => [...current, match.id]);
    setSelectedIds((current) => current.filter((id) => id !== match.id));
    setSeverity("success");
    setNotice(status === "approved" ? `Approved ${match.title}.` : `Rejected ${match.title}.`);

    const endpoint = status === "approved" ? `/api/jobs/${match.jobId}/approve` : `/api/jobs/${match.jobId}/reject`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to update job.");
      if (status === "rejected") setPendingRejectionFeedback([{ id: match.id, jobId: match.jobId, title: match.title, company: match.company }]);
      refresh();
    } catch (error) {
      setDismissedIds((current) => current.filter((id) => id !== match.id));
      setSeverity("error");
      setNotice(error instanceof Error ? error.message : "Unable to update job.");
    }
  }

  async function submitPendingRejectionFeedback(reasons: RejectionReasonCode[], note: string) {
    await Promise.all(pendingRejectionFeedback.map((match) => fetch("/api/jobs/rejection-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        matchId: match.id,
        jobPostingId: match.jobId,
        reasons,
        note,
        source: pendingRejectionFeedback.length > 1 ? "bulk_rejection_reason_prompt" : "swipe_rejection_reason_prompt",
      }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to save rejection feedback.");
      return payload;
    })));
    setPendingRejectionFeedback([]);
    setSeverity("success");
    setNotice("Rejection feedback saved for agent learning.");
  }

  const tableCard = (
    <Card sx={{ minWidth: 0 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ p: 1.5, alignItems: { md: "center" }, justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Checkbox
              checked={allSelected}
              indeterminate={partiallySelected}
              onChange={(event) => toggleAll(event.target.checked)}
              slotProps={{ input: { "aria-label": "Select all visible jobs" } }}
            />
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {selectedIds.length ? `${selectedIds.length} selected` : `${filteredMatches.length} visible jobs`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {searchQuery
                ? `Filtered from ${matches.length} jobs.`
                : mode === "favorites"
                  ? "Saved listings stay here even when they leave the review queue."
                  : "Click a row to preview details. Globe icon opens the original posting."}
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1} sx={{ alignItems: { lg: "center" } }}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {mode === "review" && statusView === "active" ? (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={matchView}
                  onChange={(_, value) => changeMatchView(value)}
                  aria-label="Match quality view"
                >
                  <ToggleButton value="full">Full matches</ToggleButton>
                  <ToggleButton value="partial">
                    Partial{partialCount > 0 ? ` (${partialCount})` : ""}
                  </ToggleButton>
                </ToggleButtonGroup>
              ) : null}
              {mode === "review" ? (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={statusView}
                  onChange={(_, value) => changeStatusView(value)}
                  aria-label="Job status view"
                >
                  <ToggleButton value="active">Active</ToggleButton>
                  <ToggleButton value="rejected">Rejected</ToggleButton>
                  <ToggleButton value="archived">Archived</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="success" disabled={loading || selectedIds.length === 0} onClick={() => void updateSelected("approved")}>
                Approve selected
              </Button>
              {statusView === "archived" ? (
                <Button variant="outlined" disabled={loading || selectedIds.length === 0} onClick={() => void updateSelected("needs_review")}>
                  Move to review
                </Button>
              ) : (
                <Button variant="outlined" disabled={loading || selectedIds.length === 0} onClick={() => void updateSelected("archived")}>
                  Archive selected
                </Button>
              )}
              <Button variant="outlined" color="error" disabled={loading || selectedIds.length === 0} onClick={() => void updateSelected("rejected")}>
                Reject selected
              </Button>
              <Button variant="text" disabled={loading || selectedIds.length === 0} onClick={() => setSelectedIds([])}>
                Deselect all
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
          {filteredMatches.length === 0 ? (
            <EmptyState
              title={searchQuery ? "No jobs match that search" : emptyStateForMode(mode, statusView).title}
              body={searchQuery ? "Try another company, title, location, profile, source, or signal." : emptyStateForMode(mode, statusView).body}
            />
          ) : (
            filteredMatches.map((match) => (
              <SwipeJobCard
                key={match.id}
                match={match}
                initialFavorited={favoritedSet.has(match.jobId)}
                onAction={swipeUpdate}
              />
            ))
          )}
        </Stack>

        <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
          <Table sx={{ tableLayout: "fixed", width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 72, pl: 1.5 }} />
                <TableCell>Role</TableCell>
                <TableCell sx={{ width: 96 }}>Fit</TableCell>
                <TableCell align="right" sx={{ width: 112, pr: 1.5 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <EmptyState
                      title={searchQuery ? "No jobs match that search" : emptyStateForMode(mode, statusView).title}
                      body={searchQuery ? "Try another company, title, location, profile, source, or signal." : emptyStateForMode(mode, statusView).body}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredMatches.map((match) => {
                  const selected = selectedSet.has(match.id);
                  const showQueueStatus = statusView !== "active" || match.status !== "needs_review";
                  return (
                    <TableRow
                      key={match.id}
                      selected={selected || panelJobId === match.jobId}
                      hover
                      onClick={() => setPanelJobId(match.jobId)}
                      sx={{
                        cursor: "pointer",
                        "& > td": { verticalAlign: "top", py: 1.75 },
                        "&:hover .job-title": { color: "primary.main" },
                        ...(panelJobId === match.jobId ? { bgcolor: "rgba(37, 99, 235, 0.06)" } : {}),
                      }}
                    >
                      <TableCell sx={{ pl: 1.5 }} onClick={(e) => e.stopPropagation()}>
                        <Stack spacing={0.25} sx={{ alignItems: "center", width: 40 }}>
                          <Checkbox
                            checked={selected}
                            onChange={(event) => toggleOne(match.id, event.target.checked)}
                            slotProps={{ input: { "aria-label": `Select ${match.company} ${match.title}` } }}
                            sx={{ p: 0.5 }}
                          />
                          <JobFavoriteButton
                            key={match.jobId}
                            jobId={match.jobId}
                            initialFavorited={favoritedSet.has(match.jobId)}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography className="job-title" sx={{ fontWeight: 850, lineHeight: 1.35, mb: 0.25 }}>
                          {match.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                          {match.company} · {match.location}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 0.25, minWidth: 0 }}>
                          <ProfileLink profileId={match.profileId} name={match.profileName} fontWeight={600} />
                          <Typography variant="caption" color="text.secondary">·</Typography>
                          <RunItemSourceLabel label={match.sourceName} />
                        </Box>
                        {match.strongestMatches.length > 0 ? (
                          <Tooltip title={match.strongestMatches.join(" · ")} placement="top-start">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                mt: 0.5,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "100%",
                              }}
                            >
                              {formatSignalPreview(match.strongestMatches)}
                            </Typography>
                          </Tooltip>
                        ) : null}
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", mt: 0.75 }}>
                          {showQueueStatus ? <StatusChip status={match.status} /> : null}
                          {match.applicationState ? <StatusChip status={match.applicationState.status} /> : null}
                          {match.duplicateGroupId ? <Chip size="small" color="warning" variant="outlined" label="Duplicate" /> : null}
                          {match.staleScore >= 45 ? <Chip size="small" color="warning" variant="outlined" label={`Stale ${match.staleScore}`} /> : null}
                          {match.failsCurrentRules ? <Chip size="small" color="error" variant="outlined" label="Fails rules" /> : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                          <ScoreChip score={match.score} />
                          <Chip
                            size="small"
                            variant="outlined"
                            color={match.matchTier === "partial" ? "warning" : "success"}
                            label={match.matchTier === "partial" ? "Partial" : "Full"}
                          />
                          {matchView === "partial" && match.opportunityScore !== null ? (
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                              Opp {match.opportunityScore}
                              {match.confidenceScore !== null ? ` · Conf ${match.confidenceScore}` : ""}
                            </Typography>
                          ) : match.failedRequirements.length > 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                              {match.failedRequirements.length} pending
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ pr: 1.5, overflow: "hidden", width: 112, maxWidth: 112 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <JobRowActions match={match} onActionComplete={() => refresh()} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
  );

  return (
    <>
      {tableCard}
      {panelJobId ? (
        <JobDetailPanel
          jobId={panelJobId}
          allJobIds={allJobIds}
          initialFavorited={favoritedSet.has(panelJobId)}
          onClose={() => setPanelJobId(null)}
          onNavigate={(id) => setPanelJobId(id)}
          onActionComplete={() => refresh()}
        />
      ) : null}
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice("")}>
        <Alert severity={severity} variant="filled" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      </Snackbar>
      <RejectionReasonDialog
        open={pendingRejectionFeedback.length > 0}
        title={pendingRejectionFeedback.length === 1
          ? `Why reject ${pendingRejectionFeedback[0].company} - ${pendingRejectionFeedback[0].title}?`
          : `Why reject ${pendingRejectionFeedback.length} selected jobs?`}
        onClose={() => setPendingRejectionFeedback([])}
        onSubmit={submitPendingRejectionFeedback}
      />
    </>
  );
}

function formatSignalPreview(signals: string[]) {
  if (signals.length === 0) return "";
  const preview = signals.slice(0, 2).join(" · ");
  return signals.length > 2 ? `${preview} +${signals.length - 2}` : preview;
}

function JobRowActions({
  match,
  onActionComplete,
}: {
  match: JobsTableMatch;
  onActionComplete?: () => void;
}) {
  const [approving, setApproving] = useState(false);

  async function approve() {
    setApproving(true);
    try {
      const response = await fetch(`/api/jobs/${match.jobId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to approve job.");
      onActionComplete?.();
    } finally {
      setApproving(false);
    }
  }

  const postingTooltip = postingLinkTooltip(match.applicationUrl);

  return (
    <Stack direction="row" spacing={0.25} sx={{ justifyContent: "flex-end", alignItems: "center", flexWrap: "nowrap" }}>
      {match.applicationUrl ? (
        <Tooltip title={postingTooltip}>
          <IconButton
            component="a"
            href={match.applicationUrl}
            target="_blank"
            rel="noreferrer"
            size="small"
            aria-label={postingTooltip}
          >
            <PublicOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {match.applicationState ? (
        <Tooltip title="View application packet">
          <IconButton
            size="small"
            color="success"
            href={`/applications/${match.applicationState.id}`}
            component="a"
            aria-label="View application packet"
          >
            <AssignmentTurnedInOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <>
          <Tooltip title={approving ? "Approving..." : "Approve"}>
            <span>
              <IconButton size="small" color="success" disabled={approving} onClick={() => void approve()} aria-label="Approve job">
                <CheckCircleOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <JobRejectButton
            jobId={match.jobId}
            matchId={match.id}
            label={`${match.company} - ${match.title}`}
            compact
            onSuccess={onActionComplete}
          />
        </>
      )}
    </Stack>
  );
}

function SwipeJobCard({
  match,
  initialFavorited = false,
  onAction,
}: {
  match: JobsTableMatch;
  initialFavorited?: boolean;
  onAction: (match: JobsTableMatch, status: "approved" | "rejected") => void;
}) {
  const [startX, setStartX] = useState<number | null>(null);
  const [deltaX, setDeltaX] = useState(0);
  const threshold = 88;
  const action = deltaX > 36 ? "Approve" : deltaX < -36 ? "Reject" : "";
  const actionColor = deltaX > 36 ? "success.main" : deltaX < -36 ? "error.main" : "transparent";

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (match.applicationState) return;
    setStartX(event.clientX);
    setDeltaX(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (startX === null) return;
    setDeltaX(Math.max(-140, Math.min(140, event.clientX - startX)));
  }

  function pointerUp() {
    if (deltaX >= threshold) {
      onAction(match, "approved");
    } else if (deltaX <= -threshold) {
      onAction(match, "rejected");
    }
    setStartX(null);
    setDeltaX(0);
  }

  return (
    <Box sx={{ position: "relative", overflow: "hidden", borderRadius: 2 }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: deltaX >= 0 ? "flex-start" : "flex-end",
          px: 2,
          bgcolor: actionColor,
          color: "#fff",
          fontWeight: 900,
          transition: startX === null ? "background-color 160ms ease" : "none",
        }}
      >
        {action}
      </Box>
      <Card
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        sx={{
          touchAction: "pan-y",
          transform: `translateX(${deltaX}px) rotate(${deltaX / 28}deg)`,
          transition: startX === null ? "transform 160ms ease" : "none",
          position: "relative",
          zIndex: 1,
        }}
      >
        <CardContent>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="h3" sx={{ overflowWrap: "anywhere", lineHeight: 1.3 }}>{match.title}</Typography>
                <Typography variant="body2" color="text.secondary">{match.company} · {match.location}</Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 0.25, minWidth: 0 }}>
                  <ProfileLink profileId={match.profileId} name={match.profileName} fontWeight={600} />
                  <Typography variant="caption" color="text.secondary">·</Typography>
                  <RunItemSourceLabel label={match.sourceName} />
                </Box>
              </Box>
              <Stack spacing={0.5} sx={{ alignItems: "flex-end", flexShrink: 0 }}>
                <JobFavoriteButton jobId={match.jobId} initialFavorited={initialFavorited} />
                <ScoreChip score={match.score} />
                <Chip
                  size="small"
                  variant="outlined"
                  color={match.matchTier === "partial" ? "warning" : "success"}
                  label={match.matchTier === "partial" ? "Partial" : "Full"}
                />
              </Stack>
            </Stack>

            {match.strongestMatches.length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                {formatSignalPreview(match.strongestMatches)}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
              {match.status !== "needs_review" ? <StatusChip status={match.status} /> : null}
              {match.failsCurrentRules ? <Chip size="small" color="error" variant="outlined" label="Fails rules" /> : null}
              {match.applicationState ? <StatusChip status={match.applicationState.status} /> : null}
              {match.opportunityScore === null ? null : <Chip size="small" variant="outlined" label={`Opp ${match.opportunityScore}`} />}
              {match.duplicateGroupId ? <Chip size="small" color="warning" variant="outlined" label="Duplicate" /> : null}
              {match.staleScore >= 45 ? <Chip size="small" color="warning" variant="outlined" label={`Stale ${match.staleScore}`} /> : null}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary">
                {match.applicationState ? `Tracked as ${formatStatus(match.applicationState.status)}.` : "Swipe right to approve. Swipe left to reject."}
              </Typography>
              <Stack direction="row" spacing={0.75}>
                {match.applicationUrl ? (
                  <ActionButton href={match.applicationUrl} target="_blank" size="small" variant="outlined" startIcon={<PublicOutlinedIcon />}>
                    Posting
                  </ActionButton>
                ) : null}
                <ActionButton href={`/jobs/${match.jobId}`} size="small">Details</ActionButton>
                {match.applicationState ? (
                  <ActionButton href={`/applications/${match.applicationState.id}`} size="small" color="success">Application</ActionButton>
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function emptyStateForMode(mode: JobsTableMode, statusView: StatusView) {
  if (mode === "favorites") {
    return {
      title: "No favorites match that search",
      body: "Star jobs from Review Matches or Command Center to save them here.",
    };
  }
  return emptyStateCopy[statusView];
}

const emptyStateCopy: Record<StatusView, { title: string; body: string }> = {
  active: {
    title: "No matches in this view",
    body: "Run search from the Dashboard to fetch new jobs, or switch to Partial matches to review borderline listings.",
  },
  rejected: {
    title: "No rejected jobs",
    body: "Rejected jobs will appear here after you filter out poor matches.",
  },
  archived: {
    title: "No archived jobs",
    body: "Archived jobs will appear here when you remove older or inactive matches from the active queue.",
  },
  all: {
    title: "No matched jobs yet",
    body: "Run search from the Dashboard or add a manual job to start matching.",
  },
};

function filterByQuery(matches: JobsTableMatch[], query: string) {
  const terms = query
    .toLowerCase()
    .split(/[\s,]+/)
    .flatMap((term) => {
      const next = term.trim();
      return next ? [next] : [];
    });
  if (terms.length === 0) return matches;

  return matches.filter((match) => {
    const searchableText = [
      match.company,
      match.title,
      match.location,
      match.profileName,
      match.sourceName,
      match.status,
      match.action ?? "",
      ...match.strongestMatches,
    ].join(" ").toLowerCase();
    return terms.every((term) => searchableText.includes(term));
  });
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
