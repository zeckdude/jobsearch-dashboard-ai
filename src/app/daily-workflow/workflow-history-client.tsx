"use client";

import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

type StepBreakdown = {
  key: string;
  label: string;
  timing: string;
  completions: number;
  completionRate: number;
  lastDoneAt: string | null;
};

type HistorySession = {
  id: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  completionPct: number;
  stepCount: number;
  steps: { stepKey: string; completedAt: string }[];
};

type HistoryResponse = {
  sessions: HistorySession[];
  stats: {
    totalSessions: number;
    currentStreak: number;
    longestStreak: number;
    avgCompletionPct: number;
    weeklyStepsCompletedThisWeek: number;
  };
  stepBreakdown: StepBreakdown[];
};

const TIMING_COLOR: Record<string, "primary" | "success" | "warning" | "secondary"> = {
  morning: "primary",
  midday: "success",
  evening: "warning",
  weekly: "secondary",
};

function HeatmapCell({ date, completionPct }: { date: string; completionPct: number }) {
  const label = `${date}: ${completionPct}%`;
  const opacity = completionPct === 0 ? 1 : Math.max(0.2, completionPct / 100);

  return (
    <Tooltip title={label}>
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: "2px",
          bgcolor: completionPct === 0 ? "action.hover" : "primary.main",
          opacity,
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

function CalendarHeatmap({ sessions }: { sessions: HistorySession[] }) {
  const sessionMap = new Map(
    sessions.map((s) => [s.date.split("T")[0], s.completionPct])
  );

  const days: { date: string; completionPct: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, completionPct: sessionMap.get(dateStr) ?? 0 });
  }

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <Box>
      <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700 }}>
        Last 90 days
      </Typography>
      <Stack direction="row" sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
        {weeks.map((week, wi) => (
          <Stack key={wi} spacing={0.5}>
            {week.map((day) => (
              <HeatmapCell key={day.date} date={day.date} completionPct={day.completionPct} />
            ))}
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" sx={{ alignItems: "center", mt: 1 }} spacing={1}>
        <Typography variant="caption" color="text.secondary">Less</Typography>
        {[0, 25, 50, 75, 100].map((pct) => (
          <Box
            key={pct}
            sx={{
              width: 12,
              height: 12,
              borderRadius: "2px",
              bgcolor: pct === 0 ? "action.hover" : "primary.main",
              opacity: pct === 0 ? 1 : Math.max(0.2, pct / 100),
            }}
          />
        ))}
        <Typography variant="caption" color="text.secondary">More</Typography>
      </Stack>
    </Box>
  );
}

export function WorkflowHistoryClient() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/workflow-coach/history")
      .then((r) => r.json())
      .then((d) => setData(d as HistoryResponse))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Could not load workflow history.</Typography>
        </CardContent>
      </Card>
    );
  }

  const { sessions, stats, stepBreakdown } = data;

  return (
    <Stack spacing={3} sx={{ mt: 2 }}>
      {/* Stat cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <LocalFireDepartmentIcon color="warning" />
              <Typography variant="body2" color="text.secondary">Current streak</Typography>
            </Stack>
            <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {stats.currentStreak}
            </Typography>
            <Typography variant="caption" color="text.secondary">days</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
              <EmojiEventsIcon color="primary" />
              <Typography variant="body2" color="text.secondary">Longest streak</Typography>
            </Stack>
            <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {stats.longestStreak}
            </Typography>
            <Typography variant="caption" color="text.secondary">days</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>Total sessions</Typography>
            <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>{stats.totalSessions}</Typography>
            <Typography variant="caption" color="text.secondary">last 90 days</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>Avg completion</Typography>
            <Typography variant="h1" sx={{ fontVariantNumeric: "tabular-nums" }}>{stats.avgCompletionPct}%</Typography>
            <Typography variant="caption" color="text.secondary">per session</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Heatmap */}
      <Card>
        <CardContent>
          <CalendarHeatmap sessions={sessions} />
        </CardContent>
      </Card>

      {/* Step breakdown */}
      <Card>
        <CardContent>
          <Typography variant="h3" sx={{ mb: 2 }}>Step completion rates</Typography>
          <Stack spacing={1.5} divider={<Divider flexItem />}>
            {stepBreakdown.map((step) => (
              <Box key={step.key}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.label}</Typography>
                    <Chip
                      label={step.timing}
                      size="small"
                      color={TIMING_COLOR[step.timing] ?? "default"}
                      sx={{ fontSize: "0.65rem", height: 16 }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="caption" color="text.secondary">
                      {step.completions}× done
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {step.completionRate}%
                    </Typography>
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={step.completionRate}
                  color={step.completionRate >= 70 ? "success" : step.completionRate >= 40 ? "warning" : "error"}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                {step.lastDoneAt && (
                  <Typography variant="caption" color="text.secondary">
                    Last done {new Date(step.lastDoneAt).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Session log */}
      <Card>
        <CardContent>
          <Typography variant="h3" sx={{ mb: 2 }}>Session log</Typography>
        </CardContent>
        {sessions.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary">No sessions yet. Start your daily workflow to see history here.</Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Steps done</TableCell>
                  <TableCell>Completion</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Steps</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => {
                  const date = new Date(session.date);
                  const uniqueSteps = [...new Set(session.steps.map((s) => s.stepKey))];
                  return (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{uniqueSteps.length}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <LinearProgress
                            variant="determinate"
                            value={session.completionPct}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            color={session.completionPct === 100 ? "success" : "primary"}
                          />
                          <Typography variant="caption">{session.completionPct}%</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {session.completedAt ? (
                          <Chip label="Complete" size="small" color="success" />
                        ) : (
                          <Chip label="Partial" size="small" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {uniqueSteps.map((key) => (
                            <Chip
                              key={key}
                              label={key.replace(/-/g, " ")}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.6rem", height: 16 }}
                            />
                          ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  );
}
