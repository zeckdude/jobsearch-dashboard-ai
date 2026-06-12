"use client";

import { useCallback, useEffect, useState } from "react";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HighlightOffIcon from "@mui/icons-material/HighlightOffOutlined";
import LaunchIcon from "@mui/icons-material/Launch";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PlayCircleOutlineOutlinedIcon from "@mui/icons-material/PlayCircleOutlineOutlined";
import PreviewOutlinedIcon from "@mui/icons-material/PreviewOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RuleOutlinedIcon from "@mui/icons-material/RuleOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { ActionButton } from "@/components/action-button";
import { JobDescription } from "@/components/job-description";
import { JobDiscoveryChannel } from "@/components/job-discovery-channel";
import { ProfileLink } from "@/components/profile-link";
import { JobFavoriteButton } from "@/components/job-favorite-button";
import { JobRejectButton } from "@/components/job-reject-button";
import { postingLinkLabel } from "@/lib/jobs/discovery-channel";
import { ScoreChip } from "@/components/ui/score-chip";
import { jsonArray, jsonRecordArray } from "@/lib/json";
import { parseDiscoveryMetadata } from "@/lib/jobs/discovery-channel";

type RequirementItem = { code: string; label: string; severity?: string };

type JobData = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: string;
  applicationUrl: string | null;
  duplicateGroupId: string | null;
  staleScore: number;
  description: string;
  source: { name: string; type: string } | null;
  matches: Array<{
    id: string;
    matchTier: string;
    overallScore: number;
    aiExplanation: string | null;
    strongestMatches: unknown;
    concerns: unknown;
    missingKeywords: unknown;
    failedRequirements: unknown;
    passedRequirements: unknown;
    status: string;
    discoveredByProfile: { id: string; name: string } | null;
    jobSearchProfile: { id: string; name: string };
    discoveryMetadata: unknown;
  }>;
  evaluations: Array<{
    id: string;
    fitScore: number;
    opportunityScore: number;
    confidenceScore: number;
    recommendedAction: string;
    recommendedResumeProfile: string | null;
    explanation: string | null;
    strengths: unknown;
    risks: unknown;
    missingKeywords: unknown;
    jobSearchProfile: { id: string; name: string };
  }>;
  coverLetters: Array<{ id: string; version: number; body: string; createdAt: string }>;
  resumes: Array<{ id: string; version: number; createdAt: string }>;
  applications: Array<{
    id: string;
    coverLetter: { id: string } | null;
    resume: { id: string } | null;
  }>;
};

type Props = {
  jobId: string;
  allJobIds: string[];
  initialFavorited?: boolean;
  onClose: () => void;
  onNavigate: (jobId: string) => void;
  onActionComplete?: () => void;
};

export function JobDetailPanel({ jobId, allJobIds, initialFavorited = false, onClose, onNavigate, onActionComplete }: Props) {
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const currentIndex = allJobIds.indexOf(jobId);
  const prevId = currentIndex > 0 ? allJobIds[currentIndex - 1] : null;
  const nextId = currentIndex < allJobIds.length - 1 ? allJobIds[currentIndex + 1] : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError("");
    setJob(null);
    setIframeLoading(true);
    void fetch(`/api/jobs/${jobId}`)
      .then((res) => res.json() as Promise<{ job?: JobData; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.job) {
          setJob(data.job);
        } else {
          setFetchError(data.error ?? "Failed to load job details.");
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError("Failed to load job details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [jobId]);

  const handleApproveOrReject = useCallback(() => {
    onActionComplete?.();
    if (nextId) onNavigate(nextId);
  }, [nextId, onNavigate, onActionComplete]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "ArrowLeft" && prevId) onNavigate(prevId);
      if (event.key === "ArrowRight" && nextId) onNavigate(nextId);
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevId, nextId, onNavigate, onClose]);

  const topMatch = job?.matches[0] ?? null;
  const topEvaluation = job?.evaluations[0] ?? null;
  const readyApplication = job?.applications.find((a) => a.resume && a.coverLetter) ?? null;
  const passedRequirements = topMatch ? jsonRecordArray<RequirementItem>(topMatch.passedRequirements) : [];
  const failedRequirements = topMatch ? jsonRecordArray<RequirementItem>(topMatch.failedRequirements) : [];
  const profileId = topMatch?.discoveredByProfile?.id ?? topMatch?.jobSearchProfile.id ?? null;
  const profileLabel = topMatch?.discoveredByProfile?.name ?? topMatch?.jobSearchProfile.name ?? null;

  const applicationUrl = job?.applicationUrl ?? null;
  const drawerWidth = previewOpen ? { xs: "100%", md: "92vw" } : { xs: "100%", sm: 560, md: 680 };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { bgcolor: "rgba(0,0,0,0.25)" } },
        paper: { sx: { width: drawerWidth, display: "flex", flexDirection: "column", transition: "width 220ms ease" } },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          flexShrink: 0,
        }}
      >
        <Tooltip title="Previous job (←)">
          <span>
            <IconButton size="small" onClick={() => prevId && onNavigate(prevId)} disabled={!prevId}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Next job (→)">
          <span>
            <IconButton size="small" onClick={() => nextId && onNavigate(nextId)} disabled={!nextId}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, px: 0.5 }}>
          {currentIndex + 1} / {allJobIds.length}
        </Typography>
        <JobFavoriteButton key={jobId} jobId={jobId} initialFavorited={initialFavorited} />
        {applicationUrl ? (
          <Tooltip title={previewOpen ? "Hide listing preview" : "Preview listing site side-by-side"}>
            <IconButton
              size="small"
              onClick={() => setPreviewOpen((v) => !v)}
              color={previewOpen ? "primary" : "default"}
            >
              <PreviewOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Open full detail page">
          <IconButton size="small" onClick={() => window.open(`/jobs/${jobId}`, "_blank", "noreferrer")}>
            <LaunchIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close panel (Esc)">
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {previewOpen && applicationUrl ? (
          <Box sx={{ flex: "0 0 58%", borderRight: 1, borderColor: "divider", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Box sx={{ px: 1.5, py: 0.75, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {applicationUrl}
              </Typography>
              <Tooltip title="Open in new tab">
                <IconButton size="small" onClick={() => window.open(applicationUrl, "_blank", "noreferrer")}>
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ flex: 1, position: "relative" }}>
              {iframeLoading ? (
                <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", zIndex: 1 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : null}
              <Box
                key={applicationUrl}
                component="iframe"
                src={`/api/jobs/preview?url=${encodeURIComponent(applicationUrl)}`}
                title="Job listing preview"
                onLoad={() => setIframeLoading(false)}
                sx={{ border: "none", display: "block", width: "100%", height: "100%" }}
              />
            </Box>
          </Box>
        ) : null}

        <Box sx={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : fetchError ? (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{fetchError}</Alert>
            </Box>
          ) : job ? (
            <Stack spacing={0} divider={<Divider />}>
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="h3" sx={{ mb: 0.25 }}>{job.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {job.company} · {job.location ?? "Unknown location"} · {job.remoteType}
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
                  {topMatch ? <ScoreChip score={topMatch.overallScore} label={`${topMatch.overallScore} match`} /> : null}
                  {topMatch ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      color={topMatch.matchTier === "partial" ? "warning" : "success"}
                      label={topMatch.matchTier === "partial" ? "Partial match" : "Full match"}
                    />
                  ) : null}
                  {profileLabel ? <ProfileLink profileId={profileId} name={profileLabel} variant="chip" /> : null}
                  {topMatch?.matchTier === "partial" && topEvaluation ? <ScoreChip score={topEvaluation.opportunityScore} label={`${topEvaluation.opportunityScore} opp`} /> : null}
                  {topMatch?.matchTier === "partial" && topEvaluation ? <ScoreChip score={topEvaluation.confidenceScore} label={`${topEvaluation.confidenceScore} conf`} /> : null}
                  {job.duplicateGroupId ? <Chip size="small" color="warning" variant="outlined" label="Duplicate" /> : null}
                  {job.staleScore >= 45 ? <Chip size="small" color="warning" variant="outlined" label={`Stale ${job.staleScore}`} /> : null}
                </Stack>
              </Box>

              <Box sx={{ px: 2, py: 1.5 }}>
                <JobDiscoveryChannel
                  source={job.source}
                  applicationUrl={job.applicationUrl}
                  discoveryMetadata={parseDiscoveryMetadata(topMatch?.discoveryMetadata)}
                  profileId={topMatch?.jobSearchProfile.id}
                  profileName={topMatch?.jobSearchProfile.name}
                  allMatchingProfiles={job.matches.map((match) => ({
                    id: match.jobSearchProfile.id,
                    name: match.jobSearchProfile.name,
                    score: match.overallScore,
                    matchTier: match.matchTier,
                    status: match.status,
                  }))}
                  compact
                />
              </Box>

              {topMatch && (passedRequirements.length > 0 || failedRequirements.length > 0) ? (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", display: "block", mb: 1 }}>
                    Profile requirements
                  </Typography>
                  <Stack spacing={0.75}>
                    {passedRequirements.map((item) => (
                      <RequirementRow key={`pass-${item.code}`} passed label={item.label} />
                    ))}
                    {failedRequirements.map((item) => (
                      <RequirementRow key={`fail-${item.code}`} passed={false} label={item.label} severity={item.severity} />
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {topMatch ? (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", display: "block", mb: 1 }}>
                    Review decision
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <JobRejectButton
                      jobId={job.id}
                      matchId={topMatch.id}
                      label={`${job.company} - ${job.title}`}
                      variant="outlined"
                      color="error"
                      source="job_panel_reject"
                      onSuccess={handleApproveOrReject}
                    />
                    <ActionButton
                      postTo={`/api/jobs/${job.id}/approve`}
                      body={{ matchId: topMatch.id }}
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<AssignmentTurnedInOutlinedIcon />}
                      onSuccess={handleApproveOrReject}
                    >
                      Approve
                    </ActionButton>
                  </Stack>
                </Box>
              ) : null}

              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", display: "block", mb: 1 }}>
                  Application package
                </Typography>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                  <ActionButton postTo={`/api/jobs/${job.id}/prepare-application`} size="small" variant="contained" color="success" startIcon={<AssignmentTurnedInOutlinedIcon />} message="Package generation started." loadingLabel="Preparing..." runInBackground>
                    Prepare package
                  </ActionButton>
                  <ActionButton postTo={`/api/jobs/${job.id}/generate-resume`} size="small" variant="contained" startIcon={<ArticleOutlinedIcon />} message="Resume generation started." loadingLabel="Generating..." runInBackground>
                    Resume
                  </ActionButton>
                  <ActionButton postTo={`/api/jobs/${job.id}/generate-cover-letter`} size="small" variant="contained" color="secondary" startIcon={<ContactPageOutlinedIcon />} message="Cover letter started." loadingLabel="Generating..." runInBackground>
                    Cover letter
                  </ActionButton>
                  <ActionButton postTo={`/api/jobs/${job.id}/generate-resume`} size="small" variant="outlined" startIcon={<RestartAltOutlinedIcon />} message="Regeneration started." loadingLabel="Regenerating..." runInBackground>
                    Regenerate
                  </ActionButton>
                  <ActionButton href="/resumes/generated" size="small" variant="outlined" startIcon={<RuleOutlinedIcon />}>Rationale</ActionButton>
                  {readyApplication ? (
                    <ActionButton postTo={`/api/applications/${readyApplication.id}/launch-assistant`} size="small" message="Local assistant launched." variant="contained" color="success" startIcon={<PlayCircleOutlineOutlinedIcon />}>
                      Launch
                    </ActionButton>
                  ) : null}
                  <ActionButton href="/resumes/generated" size="small" variant="outlined" startIcon={<EditOutlinedIcon />}>Edit</ActionButton>
                </Stack>
              </Box>

              {topMatch ? (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", display: "block", mb: 1 }}>
                    Match explanation
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {topMatch.aiExplanation ?? topEvaluation?.explanation}
                  </Typography>
                  <SignalSection title="Matches" items={jsonArray(topMatch.strongestMatches)} color="success" />
                  <SignalSection title="Concerns" items={jsonArray(topMatch.concerns)} color="warning" />
                  <SignalSection title="Missing" items={jsonArray(topMatch.missingKeywords)} color="error" />
                </Box>
              ) : null}

              {job.coverLetters[0] ? (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
                      Cover letter v{job.coverLetters[0].version}
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      <ActionButton href={`/api/cover-letters/${job.coverLetters[0].id}/plain-text`} size="small" variant="outlined" startIcon={<ArticleOutlinedIcon />}>Text</ActionButton>
                      <ActionButton href={`/api/cover-letters/${job.coverLetters[0].id}/pdf`} size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />}>PDF</ActionButton>
                    </Stack>
                  </Stack>
                  <Typography component="pre" variant="caption" sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "text.secondary", display: "block" }}>
                    {job.coverLetters[0].body}
                  </Typography>
                </Box>
              ) : null}

              {job.resumes[0] ? (
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
                      Resume v{job.resumes[0].version}
                    </Typography>
                    <ActionButton href={`/api/resumes/generated/${job.resumes[0].id}/pdf`} size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />}>Download PDF</ActionButton>
                  </Stack>
                </Box>
              ) : null}

              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase", display: "block", mb: 1 }}>
                  Description
                </Typography>
                <JobDescription description={job.description} />
              </Box>
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Drawer>
  );
}

function RequirementRow({ passed, label, severity }: { passed: boolean; label: string; severity?: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
      {passed ? (
        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "success.main", mt: 0.15 }} />
      ) : (
        <HighlightOffIcon sx={{ fontSize: 18, color: severity === "hard" ? "error.main" : "warning.main", mt: 0.15 }} />
      )}
      <Typography variant="body2" color={passed ? "text.primary" : "text.secondary"}>
        {label}
      </Typography>
    </Stack>
  );
}

function SignalSection({ title, items, color }: { title: string; items: string[]; color: "success" | "warning" | "error" }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase" }}>{title}</Typography>
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", mt: 0.5 }}>
        {items.map((item) => <Chip key={`${title}-${item}`} size="small" color={color} variant="outlined" label={item} />)}
      </Stack>
    </Box>
  );
}
