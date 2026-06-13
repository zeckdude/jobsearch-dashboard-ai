"use client";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Slide from "@mui/material/Slide";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { RESUME_ACTION_BAR_HEIGHT } from "@/lib/ui/resume-action-bar";

export { RESUME_ACTION_BAR_HEIGHT };

const DRAWER_WIDTH = 264;

type ResumeScrollActionBarProps = {
  visible: boolean;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  label?: string;
  secondaryActions?: ReactNode;
};

export function ResumeScrollActionBar({
  visible,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving = false,
  label,
  secondaryActions,
}: ResumeScrollActionBarProps) {
  return (
    <Slide appear={false} direction="up" in={visible}>
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          bottom: 0,
          left: { xs: 0, lg: DRAWER_WIDTH },
          right: 0,
          zIndex: 1200,
          borderRadius: 0,
          borderTop: 1,
          borderColor: "divider",
          pb: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
          >
            {label ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: { xs: "100%", sm: 280 },
                }}
              >
                {label}
              </Typography>
            ) : (
              <Box />
            )}
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", justifyContent: { xs: "flex-start", sm: "flex-end" } }}>
              {editing && onCancel ? (
                <Button variant="text" color="inherit" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
              ) : null}
              {editing ? (
                <Button
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save edits"}
                </Button>
              ) : (
                <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
                  Edit
                </Button>
              )}
              {secondaryActions}
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Slide>
  );
}
