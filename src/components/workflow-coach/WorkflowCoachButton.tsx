"use client";

import Badge from "@mui/material/Badge";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import ChecklistRtlIcon from "@mui/icons-material/ChecklistRtl";
import { useWorkflowCoach, useDailyProgress } from "./WorkflowCoachContext";

export function WorkflowCoachButton() {
  const { openDrawer, loading } = useWorkflowCoach();
  const { done, total } = useDailyProgress();

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
          bottom: 96, // above Jolene button (which is at ~24px bottom)
          right: 24,
          zIndex: 1300,
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
