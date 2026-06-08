"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckIcon from "@mui/icons-material/Check";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BarChartIcon from "@mui/icons-material/BarChart";
import { useWorkflowCoach, useDailyProgress } from "./WorkflowCoachContext";
import { DAILY_STEPS, SETUP_STEPS, weeklyStepVisibility } from "@/lib/workflow-coach/steps";
import type { WorkflowStep } from "@/lib/workflow-coach/steps";

const SECTION_LABELS: Record<string, string> = {
  morning: "Morning · 10–15 min",
  midday: "Midday · 5–10 min",
  evening: "Evening · 2–5 min",
  weekly: "Weekly · 10–15 min",
};

const TIMING_ORDER = ["morning", "midday", "evening", "weekly"] as const;
type Timing = typeof TIMING_ORDER[number];

const NUDGE_LS_KEYS: Record<Timing, string> = {
  morning: "wc-nudge-morning",
  midday: "wc-nudge-midday",
  evening: "wc-nudge-evening",
  weekly: "wc-nudge-weekly",
};

const SETTINGS_HREF = "/settings?highlight=workflow-reminders#settings-workflow-reminders";

/** Fetches which timing reminders are enabled and manages per-timing dismissal state. */
function useReminderNudges() {
  const [enabled, setEnabled] = useState<Record<Timing, boolean>>({
    morning: false, midday: false, evening: false, weekly: false,
  });
  const [dismissed, setDismissed] = useState<Set<Timing>>(new Set());

  useEffect(() => {
    // Hydrate dismissed state from localStorage
    const initial = new Set<Timing>();
    for (const timing of TIMING_ORDER) {
      if (localStorage.getItem(NUDGE_LS_KEYS[timing]) === "1") initial.add(timing);
    }
    setDismissed(initial);

    // Fetch reminder settings
    fetch("/api/settings/workflow-reminders")
      .then((r) => r.ok ? r.json() : null)
      .then((data: Record<string, unknown> | null) => {
        if (!data) return;
        setEnabled({
          morning: Boolean(data.workflowMorningReminderEnabled),
          midday: Boolean(data.workflowMiddayReminderEnabled),
          evening: Boolean(data.workflowEveningReminderEnabled),
          weekly: Boolean(data.workflowWeeklyReminderEnabled),
        });
      })
      .catch(() => undefined);
  }, []);

  const dismiss = useCallback((timing: Timing) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(timing);
      return next;
    });
    localStorage.setItem(NUDGE_LS_KEYS[timing], "1");
  }, []);

  const shouldShowNudge = useCallback((timing: Timing) => {
    return !enabled[timing] && !dismissed.has(timing);
  }, [enabled, dismissed]);

  return { shouldShowNudge, dismiss };
}

function StepRow({
  step,
  done,
  urgent,
  onMarkDone,
  onNavigate,
}: {
  step: WorkflowStep;
  done: boolean;
  urgent?: boolean;
  onMarkDone: () => void;
  onNavigate: () => void;
}) {
  return (
    <Box
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: done ? "action.selected" : urgent ? "warning.light" : "transparent",
        opacity: done ? 0.82 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Navigable row — clicking anywhere here goes to the page and closes drawer */}
      <Box
        component={Link}
        href={step.route}
        onClick={onNavigate}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          px: 1.5,
          pt: 1,
          pb: 0.5,
          textDecoration: "none",
          color: "inherit",
          borderRadius: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {done ? (
          <CheckCircleIcon sx={{ color: "success.main", flexShrink: 0, mt: 0.15 }} fontSize="small" />
        ) : (
          <RadioButtonUncheckedIcon sx={{ color: "text.disabled", flexShrink: 0, mt: 0.15 }} fontSize="small" />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ fontWeight: done ? 400 : 600, lineHeight: 1.4 }}>
              {step.label}
            </Typography>
            {urgent && !done && (
              <Chip label="due this week" size="small" color="warning" sx={{ fontSize: "0.6rem", height: 16 }} />
            )}
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.4,
            }}
          >
            {step.description}
          </Typography>
        </Box>
        <ChevronRightIcon fontSize="small" sx={{ color: "action.active", flexShrink: 0, mt: 0.15 }} />
      </Box>

      {/* Mark done — clearly below the nav row, requires deliberate click */}
      {!done && (
        <Box sx={{ px: 1.5, pb: 0.75 }}>
          <Button
            size="small"
            startIcon={<CheckIcon sx={{ fontSize: "0.75rem !important" }} />}
            onClick={(e) => {
              e.stopPropagation();
              onMarkDone();
            }}
            sx={{
              fontSize: "0.7rem",
              color: "text.disabled",
              p: 0,
              pl: 4,
              minHeight: 0,
              lineHeight: 1.5,
              fontWeight: 400,
              "&:hover": { color: "success.main", bgcolor: "transparent" },
            }}
          >
            Mark done
          </Button>
        </Box>
      )}
    </Box>
  );
}

function SetupCheckList() {
  const { setupStatus, closeDrawer } = useWorkflowCoach();
  if (!setupStatus) return null;

  const incompleteChecks = setupStatus.checks.filter((c) => !c.passed);
  const matchingStep = (key: string) => SETUP_STEPS.find((s) => s.key === key);

  return (
    <Stack spacing={1}>
      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Complete setup before your daily workflow
        </Typography>
        <Typography variant="caption">
          A few things need to be configured for the system to work properly.
        </Typography>
      </Alert>
      {incompleteChecks.map((check) => {
        const step = matchingStep(check.key);
        return (
          <Stack key={check.key} direction="row" spacing={1.5} sx={{ alignItems: "flex-start", px: 1 }}>
            <ErrorOutlineIcon sx={{ color: "warning.main", mt: 0.25, flexShrink: 0 }} fontSize="small" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{check.label}</Typography>
              <Typography variant="caption" color="text.secondary">{check.message}</Typography>
            </Box>
            {step && (
              <IconButton
                size="small"
                component={Link}
                href={step.route}
                onClick={closeDrawer}
                aria-label={`Go to ${step.label}`}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

export function WorkflowCoachDrawer() {
  const {
    drawerOpen,
    closeDrawer,
    session,
    setupStatus,
    completedKeys,
    markStepDone,
    loading,
    guidanceMode,
    setGuidanceMode,
  } = useWorkflowCoach();
  const { done, total } = useDailyProgress();
  const { shouldShowNudge, dismiss } = useReminderNudges();

  const todayDow = new Date().getDay();

  const setupAllPassed = setupStatus?.allPassed ?? true;

  const stepsByTiming = useMemo(() => {
    const grouped: Record<string, WorkflowStep[]> = {};
    for (const timing of TIMING_ORDER) {
      grouped[timing] = DAILY_STEPS.filter((s) => s.timing === timing);
    }
    return grouped;
  }, []);

  const weeklyVisibility = weeklyStepVisibility(todayDow);

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={closeDrawer}
      slotProps={{
        paper: { sx: { width: { xs: "100vw", sm: 380 }, p: 0, display: "flex", flexDirection: "column" } },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}
      >
        <Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Daily Workflow
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {loading ? "Loading…" : setupAllPassed ? `${done} of ${total} steps done today` : "Setup required"}
          </Typography>
        </Stack>
        <IconButton onClick={closeDrawer} size="small" aria-label="Close workflow coach">
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Progress bar */}
      {setupAllPassed && !loading && (
        <LinearProgress
          variant="determinate"
          value={session?.completionPct ?? 0}
          sx={{ height: 3, flexShrink: 0 }}
          color={done === total ? "success" : "primary"}
        />
      )}

      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", p: 2 }}>
        {loading ? (
          <Stack sx={{ alignItems: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : !setupAllPassed ? (
          <SetupCheckList />
        ) : (
          <Stack spacing={2.5}>
            {/* Step sections */}
            {TIMING_ORDER.map((timing) => {
              const steps = stepsByTiming[timing];
              if (!steps?.length) return null;
              if (timing === "weekly" && weeklyVisibility === "hidden") return null;

              const showNudge = shouldShowNudge(timing);

              return (
                <Box key={timing}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center", justifyContent: "space-between", mb: 0.5, flexWrap: "wrap", gap: 0.5 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        fontSize: "0.65rem",
                        color: timing === "weekly" && weeklyVisibility === "urgent" ? "warning.main" : "text.secondary",
                      }}
                    >
                      {SECTION_LABELS[timing]}
                      {timing === "weekly" && weeklyVisibility === "urgent" && " ⚠️"}
                    </Typography>

                    {showNudge && (
                      <Chip
                        icon={<NotificationsNoneOutlinedIcon style={{ fontSize: 12 }} />}
                        label="Set reminder"
                        size="small"
                        component={Link}
                        href={SETTINGS_HREF}
                        onClick={closeDrawer}
                        onDelete={() => dismiss(timing)}
                        deleteIcon={<CloseIcon style={{ fontSize: 11 }} />}
                        sx={{
                          height: 20,
                          fontSize: "0.6rem",
                          bgcolor: "action.hover",
                          border: "1px solid",
                          borderColor: "divider",
                          color: "text.secondary",
                          cursor: "pointer",
                          "& .MuiChip-icon": { ml: 0.5, mr: -0.25, color: "text.disabled" },
                          "& .MuiChip-label": { px: 0.75 },
                          "& .MuiChip-deleteIcon": { mr: 0.5, color: "text.disabled", "&:hover": { color: "text.secondary" } },
                          "&:hover": { bgcolor: "action.selected", borderColor: "text.disabled" },
                        }}
                      />
                    )}
                  </Stack>

                  <Stack spacing={0.75}>
                    {steps.map((step) => {
                      const stepDone = completedKeys.has(step.key);
                      return (
                        <StepRow
                          key={step.key}
                          step={step}
                          done={stepDone}
                          urgent={timing === "weekly" && weeklyVisibility === "urgent"}
                          onMarkDone={() => void markStepDone(step.key)}
                          onNavigate={closeDrawer}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Footer */}
      <Divider sx={{ flexShrink: 0 }} />
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.25, flexShrink: 0 }}
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={guidanceMode === "spotlight"}
              onChange={(e) => setGuidanceMode(e.target.checked ? "spotlight" : "panel")}
            />
          }
          label={
            <Typography variant="caption">Spotlight mode</Typography>
          }
        />
        <Button
          size="small"
          startIcon={<BarChartIcon />}
          component={Link}
          href="/daily-workflow"
          onClick={closeDrawer}
          variant="text"
        >
          View history
        </Button>
      </Stack>
    </Drawer>
  );
}
