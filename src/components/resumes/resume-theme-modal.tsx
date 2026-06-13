"use client";

import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { ResumePdfViewerShell } from "@/components/resumes/resume-pdf-viewer-shell";
import { ResumeThemePicker } from "@/components/resumes/resume-theme-picker";
import { getThemeAtsTier, RESUME_THEME_OPTIONS, type PdfPreset } from "@/lib/pdf/simple-resume-pdf";
import type { AtsReadabilityReport } from "@/lib/resumes/schemas";

type ResumeThemeModalProps = {
  open: boolean;
  onClose: () => void;
  preset: PdfPreset;
  onPresetChange: (preset: PdfPreset) => void;
  blobUrl?: string | null;
  loading?: boolean;
  atsScore?: number | null;
  atsReport?: Partial<AtsReadabilityReport> | null;
};

function tierTooltip(tier: number): string {
  if (tier >= 100) return "Ultra-safe layout optimized for all major ATS parsers.";
  if (tier >= 88) return "Strong ATS readability — optimized for most employers.";
  return "Acceptable ATS readability — verify before portal submissions.";
}

export function ResumeThemeModal({
  open,
  onClose,
  preset,
  onPresetChange,
  blobUrl,
  loading,
  atsScore,
  atsReport,
}: ResumeThemeModalProps) {
  const activeTheme = RESUME_THEME_OPTIONS.find((theme) => theme.id === preset);
  const themeTier = getThemeAtsTier(preset);
  const displayScore = atsScore ?? themeTier;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: "calc(100vw - 48px)" },
            maxWidth: "none",
            height: { xs: "100%", sm: "min(920px, calc(100vh - 48px))" },
            m: { xs: 0, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h3" component="span">Change resume theme</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Active: <strong>{activeTheme?.name ?? preset}</strong>. Ten ATS-tested layouts — select on the left, preview on the right.
            </Typography>
          </Box>
          <IconButton aria-label="Close theme picker" onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", minHeight: 0, pt: 0 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 320px) minmax(0, 1fr)" },
            gap: 3,
            flex: 1,
            minHeight: 0,
            height: { md: "calc(min(920px, 100vh - 48px) - 120px)" },
          }}
        >
          <Box
            sx={{
              minHeight: 0,
              overflowY: "auto",
              pr: { md: 0.5 },
              borderRight: { md: 1 },
              borderColor: { md: "divider" },
              pb: { xs: 1, md: 0 },
            }}
          >
            <ResumeThemePicker
              value={preset}
              onChange={onPresetChange}
              variant="list"
              showHeader={false}
            />
          </Box>

          <Box sx={{ minHeight: 0, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 0.5 }}>
              <Tooltip title={tierTooltip(themeTier)}>
                <Typography variant="caption" color="text.secondary">
                  Theme ATS tier: {themeTier}
                  {themeTier < 100 ? "+" : ""}
                </Typography>
              </Tooltip>
            </Stack>
            <ResumePdfViewerShell
              blobUrl={blobUrl}
              loading={loading}
              title="Theme preview"
              subtitle="Updates immediately when you switch themes."
              atsScore={displayScore}
              atsReport={atsReport}
              maxWidth={9999}
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
