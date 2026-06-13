"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState, type ReactNode } from "react";
import { AtsScoreHelp } from "@/components/resumes/ats-score-help";
import type { AtsReadabilityReport } from "@/lib/resumes/schemas";

type ResumePdfViewerProps = {
  src?: string | null;
  blobUrl?: string | null;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  caption?: string;
  atsScore?: number | null;
  atsReport?: Partial<AtsReadabilityReport> | null;
  emptyTitle?: string;
  emptyBody?: string;
  maxWidth?: number;
  /** Extra controls in the preview header row (e.g. expand). */
  headerTrailing?: ReactNode;
};

export function ResumePdfViewer({
  src,
  blobUrl,
  loading = false,
  title,
  subtitle,
  caption,
  atsScore,
  atsReport,
  emptyTitle = "No resume preview yet",
  emptyBody = "Upload and approve a resume, or generate materials from a job to see a PDF here.",
  maxWidth = 680,
  headerTrailing,
}: ResumePdfViewerProps) {
  const [frameLoading, setFrameLoading] = useState(Boolean(src || blobUrl));
  const viewerSrc = blobUrl ?? src ?? null;

  useEffect(() => {
    setFrameLoading(Boolean(viewerSrc));
  }, [viewerSrc]);

  const atsChip = atsScore != null ? <AtsScoreHelp score={atsScore} report={atsReport} /> : null;
  const showHeader = Boolean(title || subtitle || atsChip || headerTrailing);

  return (
    <Stack spacing={1.5} sx={{ width: "100%", maxWidth, mx: "auto" }}>
      {showHeader ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Box>
            {title ? <Typography variant="h3">{title}</Typography> : null}
            {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
          </Box>
          {headerTrailing || atsChip ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
              {headerTrailing}
              {atsChip}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "8.5 / 11",
          maxHeight: 920,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        {loading || (frameLoading && viewerSrc) ? (
          <Skeleton variant="rectangular" sx={{ position: "absolute", inset: 0, height: "100%" }} />
        ) : null}

        {!loading && !viewerSrc ? (
          <Stack spacing={1} sx={{ height: "100%", alignItems: "center", justifyContent: "center", px: 3, textAlign: "center" }}>
            <Typography variant="h3">{emptyTitle}</Typography>
            <Typography variant="body2" color="text.secondary">{emptyBody}</Typography>
          </Stack>
        ) : null}

        {viewerSrc ? (
          <Box
            component="iframe"
            src={viewerSrc}
            title={title ?? "Resume preview"}
            onLoad={() => setFrameLoading(false)}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
              bgcolor: "background.paper",
            }}
          />
        ) : null}
      </Box>

      {caption ? (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
          {caption}
        </Typography>
      ) : null}
    </Stack>
  );
}
