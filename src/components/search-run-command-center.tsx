"use client";

import { useRouter } from "next/navigation";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { StatusChip } from "@/components/ui/status-chip";

type ProgressEvent = {
  at: string;
  message: string;
  stats?: {
    jobsFetched?: number;
    jobsAfterDedupe?: number;
    jobsAfterFilters?: number;
    jobsSaved?: number;
  };
};

type SearchRun = {
  id: string;
  status: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
  jobsFetched: number;
  jobsAfterDedupe: number;
  jobsAfterFilters: number;
  jobsSaved: number;
  progress: ProgressEvent[];
};

export function SearchRunCommandCenter({ initialRun }: { initialRun: SearchRun | null }) {
  const router = useRouter();
  const [run, setRun] = useState<SearchRun | null>(initialRun);
  const [error, setError] = useState("");
  const running = run?.status === "running";
  const latest = run?.progress?.[run.progress.length - 1] ?? null;
  const timeline = useMemo(() => run?.progress?.slice(-10).reverse() ?? [], [run?.progress]);

  async function refreshLatest() {
    const response = await fetch("/api/jobs/search/run/status");
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setRun(body.run);
      return body.run as SearchRun | null;
    }
    return null;
  }

  async function startRun() {
    setError("");
    const response = await fetch("/api/jobs/search/run", { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Unable to start search.");
      return;
    }
    setRun(normalizeRun(body.run));
  }

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const nextRun = await refreshLatest();
      if (run?.status === "running" && nextRun?.status && nextRun.status !== "running") {
        router.refresh();
      }
    }, running ? 1200 : 5000);

    return () => window.clearInterval(timer);
  }, [router, run?.status, running]);

  return (
    <Card sx={{ borderColor: running ? "primary.main" : "divider", bgcolor: running ? "rgba(37, 99, 235, 0.06)" : "background.paper" }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
            <Box>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
                <Chip size="small" color={running ? "primary" : "default"} label="Live search" />
                {run ? <StatusChip status={run.status} /> : null}
                {run?.triggeredBy ? <Chip size="small" variant="outlined" label={run.triggeredBy} /> : null}
              </Stack>
              <Typography variant="h3">{running ? "Search is running" : run ? "Latest search run" : "No search run yet"}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {latest?.message ?? "Start discovery to fetch, dedupe, score, and save jobs into the review queue."}
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<PlayArrowIcon />} disabled={running} onClick={startRun}>
              {running ? "Running..." : "Run search"}
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {running ? <LinearProgress /> : null}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 1 }}>
            <RunStat label="Fetched" value={run?.jobsFetched ?? 0} helper="From sources" />
            <RunStat label="New" value={run?.jobsAfterDedupe ?? 0} helper="After dedupe" />
            <RunStat label="Matched" value={run?.jobsAfterFilters ?? 0} helper="Passed filters" />
            <RunStat label="Saved" value={run?.jobsSaved ?? 0} helper="Needs review" />
          </Box>

          {timeline.length ? (
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 850, textTransform: "uppercase" }}>
                Live event stream
              </Typography>
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                {timeline.map((event, index) => (
                  <Box
                    key={`${event.at}-${event.message}-${index}`}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "92px 1fr" },
                      gap: 1,
                      px: 1.25,
                      py: 0.9,
                      borderTop: index === 0 ? 0 : 1,
                      borderColor: "divider",
                      bgcolor: index === 0 && running ? "rgba(37, 99, 235, 0.08)" : "background.paper",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {new Date(event.at).toLocaleTimeString()}
                    </Typography>
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                      {event.message}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

function RunStat({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.25, bgcolor: "background.paper" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{helper}</Typography>
    </Box>
  );
}

function normalizeRun(value: unknown): SearchRun | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const run = value as Record<string, unknown>;
  return {
    id: String(run.id ?? ""),
    status: String(run.status ?? "running"),
    triggeredBy: String(run.triggeredBy ?? "manual"),
    startedAt: String(run.startedAt ?? new Date().toISOString()),
    finishedAt: typeof run.finishedAt === "string" ? run.finishedAt : null,
    jobsFetched: Number(run.jobsFetched ?? 0),
    jobsAfterDedupe: Number(run.jobsAfterDedupe ?? 0),
    jobsAfterFilters: Number(run.jobsAfterFilters ?? 0),
    jobsSaved: Number(run.jobsSaved ?? 0),
    progress: Array.isArray(run.progress) ? run.progress as ProgressEvent[] : [],
  };
}
