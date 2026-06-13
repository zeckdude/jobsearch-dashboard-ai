"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { ATS_LEARN_MORE_PATH, atsScoreLabel, normalizeAtsReport } from "@/lib/resumes/ats";
import type { AtsReadabilityReport } from "@/lib/resumes/schemas";

type AtsScoreHelpProps = {
  score: number | null | undefined;
  report?: Partial<AtsReadabilityReport> | null;
};

export function AtsScoreHelp({ score, report }: AtsScoreHelpProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const normalized = useMemo(() => {
    if (report) return normalizeAtsReport(report);
    if (score == null) return null;
    return normalizeAtsReport({ score, sectionsDetected: [], missingSections: [], warnings: [], textExtractable: true, contactInfoDetected: true, extractedTextLength: 0 });
  }, [report, score]);

  if (score == null || !normalized) return null;

  const label = atsScoreLabel(score, normalized.acceptableScore, normalized.strongScore);
  const color = score >= normalized.strongScore ? "success" : score >= normalized.acceptableScore ? "warning" : "error";
  const passing = normalized.factors.filter((factor) => factor.status === "pass");
  const failing = normalized.factors.filter((factor) => factor.status === "fail");
  const optional = normalized.factors.filter((factor) => factor.status === "warn");
  const stepsTo100 = failing.map((factor) => factor.recommendation);

  return (
    <>
      <Tooltip title={`ATS readability ${score}/100 — click for breakdown`} arrow>
        <Chip
          size="small"
          color={color}
          label={`ATS ${score}`}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ cursor: "pointer" }}
        />
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: { xs: "min(92vw, 420px)" }, p: 2 } } }}
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="h3" sx={{ mb: 0.5 }}>ATS readability score</Typography>
            <Typography variant="body2" color="text.secondary">
              Applicant Tracking Systems (ATS) parse resume PDFs into plain text before recruiters see them.
              This score checks whether your generated PDF is machine-readable and includes expected section headings — not keyword match to a specific job.
            </Typography>
            <Link href={ATS_LEARN_MORE_PATH} target="_blank" rel="noopener" sx={{ display: "inline-block", mt: 1, fontSize: "0.875rem" }}>
              Learn more about ATS readability
            </Link>
          </Box>

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Chip color={color} label={`${score} / 100`} />
            <Typography variant="subtitle2">{label}</Typography>
            <Typography variant="caption" color="text.secondary">
              Acceptable: {normalized.acceptableScore}+ · Strong: {normalized.strongScore}+
            </Typography>
          </Stack>

          {passing.length ? (
            <Box>
              <Typography variant="overline" color="success.main" sx={{ fontWeight: 800 }}>Passing</Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {passing.map((factor) => (
                  <Stack key={factor.id} direction="row" spacing={0.75} sx={{ alignItems: "flex-start" }}>
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18, mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{factor.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{factor.detail}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : null}

          {failing.length ? (
            <Box>
              <Typography variant="overline" color="error.main" sx={{ fontWeight: 800 }}>Lowering your score</Typography>
              <Stack spacing={1} sx={{ mt: 0.5 }}>
                {failing.map((factor) => (
                  <Box key={factor.id} sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.25 }}>
                      <ErrorOutlineIcon color="error" sx={{ fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{factor.label}</Typography>
                      <Chip size="small" label={`-${factor.pointsLost}`} color="error" variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{factor.detail}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{factor.recommendation}</Typography>
                    {factor.keepGuidance ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>{factor.keepGuidance}</Typography>
                    ) : null}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={factor.autoFixable ? "App can help" : "You edit"}
                      sx={{ mt: 0.75 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}

          {optional.length ? (
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 800 }}>Optional (no score penalty)</Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {optional.map((factor) => (
                  <Stack key={factor.id} direction="row" spacing={0.75}>
                    <InfoOutlinedIcon color="info" sx={{ fontSize: 18, mt: 0.2 }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{factor.label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{factor.detail}</Typography>
                      {factor.keepGuidance ? <Typography variant="caption" color="text.secondary">{factor.keepGuidance}</Typography> : null}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : null}

          {score < 100 && stepsTo100.length ? (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>To reach 100</Typography>
                <Box component="ol" sx={{ m: 0, pl: 2.25 }}>
                  {stepsTo100.map((step) => (
                    <Typography key={step} component="li" variant="body2" sx={{ mb: 0.5 }}>{step}</Typography>
                  ))}
                </Box>
              </Box>
            </>
          ) : null}
        </Stack>
      </Popover>
    </>
  );
}
