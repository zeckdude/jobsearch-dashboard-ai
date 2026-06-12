"use client";

import { useRouter } from "next/navigation";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { buildSearchRunRequestBody, SearchRunOptionsFields } from "@/components/search-run-options-fields";
import { SearchRunStat } from "@/components/search-run-stat";
import { StatusChip } from "@/components/ui/status-chip";
import { useSearchRunOptions } from "@/components/use-search-run-options";

type ProgressEvent = {
  at: string;
  message: string;
  stats?: {
    jobsFetched: number;
    jobsAfterDedupe: number;
    jobsAfterFilters: number;
    jobsSaved: number;
  };
};

type Run = {
  id: string;
  status: string;
  jobsFetched: number;
  jobsAfterDedupe: number;
  jobsAfterFilters: number;
  jobsSaved: number;
  progress: ProgressEvent[];
};

export function RunSearchControl({ compact = false }: { compact?: boolean }) {
  const { refresh } = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState("");
  const running = run?.status === "running";
  const { sources, profiles, companySourceCatalog, options, setOptions, loading: optionsLoading, reload: reloadOptions } = useSearchRunOptions();

  async function startRun() {
    setError("");
    const response = await fetch("/api/jobs/search/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildSearchRunRequestBody(options, sources, profiles)),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Unable to start search.");
      return;
    }
    setRun(body.run);
  }

  useEffect(() => {
    if (!run?.id || !running) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/jobs/search/run/status?id=${run.id}`);
      const body = await response.json();
      if (response.ok) {
        setRun(body.run);
        if (body.run?.status && body.run.status !== "running") {
          refresh();
        }
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [refresh, run?.id, running]);

  const latest = run?.progress?.slice(-6).reverse() ?? [];

  return (
    <Stack spacing={1.5}>
      {!compact && !optionsLoading && sources.length ? (
        <SearchRunOptionsFields
          sources={sources}
          profiles={profiles}
          companySourceCatalog={companySourceCatalog}
          value={options}
          onChange={setOptions}
          collapsed
          onSourcesChanged={() => void reloadOptions()}
        />
      ) : null}
      <Button variant="contained" startIcon={<PlayArrowIcon />} disabled={running} onClick={startRun}>
        {running ? "Search running..." : "Run search"}
      </Button>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {run && !compact ? (
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="h3">Current run</Typography>
                <StatusChip status={run.status} />
              </Stack>
              {running ? <LinearProgress /> : null}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 1 }}>
                <SearchRunStat runId={run.id} label="Fetched" value={run.jobsFetched} compact />
                <SearchRunStat runId={run.id} label="New" value={run.jobsAfterDedupe} compact />
                <SearchRunStat runId={run.id} label="Matched" value={run.jobsAfterFilters} compact />
                <SearchRunStat runId={run.id} label="Saved" value={run.jobsSaved} compact />
              </Box>
              <Stack spacing={0.75}>
                {latest.map((event) => (
                  <Typography key={`${event.at}-${event.message}`} variant="body2" color="text.secondary">
                    {formatTime(event.at)} - {event.message}
                  </Typography>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
      {run && compact ? (
        <Typography variant="body2" color="text.secondary">
          {run.status}: {run.progress?.[run.progress.length - 1]?.message ?? "Search started."}
        </Typography>
      ) : null}
    </Stack>
  );
}

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString();
}
