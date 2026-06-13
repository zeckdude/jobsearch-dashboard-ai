"use client";

import Badge from "@mui/material/Badge";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import ChecklistRtlIcon from "@mui/icons-material/ChecklistRtl";
import { useFloatingChromeOffset } from "@/components/floating-chrome-offset-context";
import {
  FAB_BASE_BOTTOM,
  FAB_GAP,
  FAB_RIGHT,
  FAB_SIZE,
} from "@/lib/ui/fab-stack";
import { useWorkflowCoach, useDailyProgress } from "./WorkflowCoachContext";

export function WorkflowCoachButton() {
  const { openDrawer, loading } = useWorkflowCoach();
  const { done, total } = useDailyProgress();
  const { bottomOffset } = useFloatingChromeOffset();

  const allDone = done === total;
  const badgeContent = loading ? null : `${done}/${total}`;

  return (
    <Tooltip title="Daily Workflow Coach" placement="left">
      <Fab
        onClick={openDrawer}
        size="medium"
        aria-label="Open daily workflow coach"
        sx={{
          position: "fixed",
          bottom: {
            xs: FAB_BASE_BOTTOM.xs + bottomOffset + FAB_SIZE + FAB_GAP,
            sm: FAB_BASE_BOTTOM.sm + bottomOffset + FAB_SIZE + FAB_GAP,
          },
          right: FAB_RIGHT,
          zIndex: 1300,
          transition: (theme) => theme.transitions.create("bottom"),
          bgcolor: allDone ? "success.main" : "primary.main",
          color: "primary.contrastText",
          "&:hover": {
            bgcolor: allDone ? "success.dark" : "primary.dark",
          },
          boxShadow: 4,
        }}
      >
        <Badge
          badgeContent={badgeContent}
          color={allDone ? "success" : "warning"}
          sx={{
            "& .MuiBadge-badge": {
              fontSize: "0.6rem",
              height: 18,
              minWidth: 28,
              fontWeight: 700,
            },
          }}
        >
          <ChecklistRtlIcon />
        </Badge>
      </Fab>
    </Tooltip>
  );
}
