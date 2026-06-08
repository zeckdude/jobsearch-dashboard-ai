"use client";

import React from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { SpotlightHint } from "@/lib/workflow-coach/steps";

type Props = {
  hints: SpotlightHint[];
  stepLabel: string;
  onClose: () => void;
};

export function WorkflowSidePanel({ hints, stepLabel, onClose }: Props) {
  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100vw", sm: 360 }, p: 0, zIndex: 1400 } } }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            What to do
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {stepLabel}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close instructions">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ overflowY: "auto", p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
          Follow these steps on the page:
        </Typography>
        <Stack spacing={2} divider={<Divider flexItem />}>
          {hints.map((hint, i) => (
            <Stack key={hint.target} direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                {i + 1}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">{hint.instruction}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  [{hint.target}]
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" sx={{ alignItems: "center", mt: 3, color: "text.secondary" }} spacing={1}>
          <CheckCircleOutlineIcon fontSize="small" />
          <Typography variant="caption">
            The step will auto-complete after 30 seconds on this page, or click Mark Done in the banner.
          </Typography>
        </Stack>
      </Box>
    </Drawer>
  );
}
