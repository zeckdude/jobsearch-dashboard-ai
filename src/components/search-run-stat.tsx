"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { JobSearchRunItemStage } from "@prisma/client";
import { searchRunStagePath } from "@/lib/job-search/run-items";

const stageByLabel: Record<string, JobSearchRunItemStage> = {
  Fetched: "fetched",
  New: "new",
  Matched: "matched",
  Saved: "saved",
};

export function SearchRunStat({
  runId,
  label,
  value,
  helper,
  compact = false,
}: {
  runId?: string;
  label: string;
  value: number;
  helper?: string;
  compact?: boolean;
}) {
  const stage = stageByLabel[label];
  const href = runId && stage && value > 0 ? searchRunStagePath(runId, stage) : undefined;
  const content = (
    <>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography
        sx={{
          fontSize: compact ? undefined : 24,
          fontWeight: compact ? 850 : 900,
          fontVariantNumeric: "tabular-nums",
          lineHeight: compact ? undefined : 1.15,
          color: href ? "primary.main" : "text.primary",
        }}
      >
        {value}
      </Typography>
      {helper ? <Typography variant="caption" color="text.secondary">{helper}</Typography> : null}
    </>
  );

  const boxSx = {
    border: 1,
    borderColor: "divider",
    borderRadius: 1,
    p: compact ? 1 : 1.25,
    bgcolor: "background.paper",
    display: "block",
    textDecoration: "none",
    color: "inherit",
    ...(href
      ? {
          cursor: "pointer",
          transition: "border-color 0.15s ease",
          "&:hover": { borderColor: "primary.main" },
        }
      : {}),
  };

  if (href) {
    return (
      <Box component={Link} href={href} sx={boxSx}>
        {content}
      </Box>
    );
  }

  return <Box sx={boxSx}>{content}</Box>;
}
