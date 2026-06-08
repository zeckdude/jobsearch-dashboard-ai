"use client";

import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import { useWorkflowCoach } from "./WorkflowCoachContext";
import { getStepByKey } from "@/lib/workflow-coach/steps";
import { WorkflowSpotlight } from "./WorkflowSpotlight";
import { WorkflowSidePanel } from "./WorkflowSidePanel";

type Props = {
  stepKey: string;
};

export function WorkflowStepBanner({ stepKey }: Props) {
  const { completedKeys, markStepDone, unmarkStepDone, guidanceMode, loading } = useWorkflowCoach();
  const [dismissed, setDismissed] = React.useState(false);
  const [spotlightOpen, setSpotlightOpen] = React.useState(false);
  const [sidePanelOpen, setSidePanelOpen] = React.useState(false);

  const step = getStepByKey(stepKey);
  const isDone = completedKeys.has(stepKey);

  // No auto-complete timer — only the "Mark done" button should mark a step complete

  if (loading || !step || dismissed) return null;

  const timingLabel: Record<string, string> = {
    morning: "Morning step",
    midday: "Midday step",
    evening: "Evening step",
    weekly: "Weekly step",
  };

  const handleShowMe = () => {
    if (!step.hints?.length) return;
    if (guidanceMode === "spotlight") {
      setSpotlightOpen(true);
    } else {
      setSidePanelOpen(true);
    }
  };

  return (
    <>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          bgcolor: isDone ? "success.light" : "primary.light",
          borderBottom: 1,
          borderColor: isDone ? "success.main" : "primary.main",
          px: 2,
          py: 1,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
            {isDone ? (
              <CheckCircleIcon sx={{ color: "success.dark" }} fontSize="small" />
            ) : (
              <TipsAndUpdatesIcon sx={{ color: "primary.dark" }} fontSize="small" />
            )}
            <Box>
              <Stack direction="row" sx={{ alignItems: "center" }} spacing={1}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} color={isDone ? "success.dark" : "primary.dark"}>
                  {isDone ? "Step complete!" : step.label}
                </Typography>
                <Chip
                  label={timingLabel[step.timing] ?? step.timing}
                  size="small"
                  sx={{ fontSize: "0.65rem", height: 16 }}
                />
              </Stack>
              {!isDone && (
                <Typography variant="caption" color="primary.dark">
                  {step.description}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
            {step.hints?.length > 0 && (
              <Button
                size="small"
                variant={isDone ? "outlined" : "contained"}
                onClick={handleShowMe}
                sx={{ whiteSpace: "nowrap", fontWeight: isDone ? 400 : 700 }}
              >
                Show me what to do
              </Button>
            )}
            {isDone ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={() => void unmarkStepDone(stepKey)}
                sx={{ whiteSpace: "nowrap", opacity: 0.7 }}
              >
                Undo
              </Button>
            ) : (
              <Button
                size="small"
                variant="outlined"
                onClick={() => void markStepDone(stepKey)}
                sx={{ whiteSpace: "nowrap" }}
              >
                Mark done
              </Button>
            )}
            <IconButton
              size="small"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Guidance overlays */}
      {spotlightOpen && (
        <WorkflowSpotlight
          hints={step.hints}
          stepLabel={step.label}
          onClose={() => setSpotlightOpen(false)}
          onComplete={() => {
            setSpotlightOpen(false);
            if (!isDone) void markStepDone(stepKey);
          }}
        />
      )}
      {sidePanelOpen && (
        <WorkflowSidePanel
          hints={step.hints}
          stepLabel={step.label}
          onClose={() => setSidePanelOpen(false)}
        />
      )}
    </>
  );
}
