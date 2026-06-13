"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  RESUME_THEME_OPTIONS,
  THEME_VIBE_LABELS,
  type PdfPreset,
} from "@/lib/pdf/simple-resume-pdf";
import type { LayoutArchetype, ThemeVibe } from "@/lib/pdf/types";

type ResumeThemePickerProps = {
  value: PdfPreset;
  onChange: (preset: PdfPreset) => void;
  disabled?: boolean;
  variant?: "grid" | "list";
  showHeader?: boolean;
};

type ThemeOption = (typeof RESUME_THEME_OPTIONS)[number];

type LayoutPreviewSpec = {
  bg: string;
  accent: string;
  ink: string;
  archetype: LayoutArchetype;
};

const ARCHETYPE_BY_PRESET: Record<PdfPreset, LayoutArchetype> = {
  classic: "single-column",
  atelier: "single-column",
  metro: "split-header",
  banner: "header-band",
  "accent-rail": "accent-rail",
  sidebar: "sidebar",
  split: "split-block",
  bold: "single-column",
  "grid-skills": "grid-skills",
  compact: "single-column",
};

const PREVIEW_SPEC: Record<PdfPreset, LayoutPreviewSpec> = {
  classic: { bg: "#ffffff", accent: "#374151", ink: "#111827", archetype: "single-column" },
  atelier: { bg: "#fdf6ec", accent: "#8c6d3b", ink: "#2f2b28", archetype: "single-column" },
  metro: { bg: "#f8fafc", accent: "#007870", ink: "#0f172a", archetype: "split-header" },
  banner: { bg: "#ffffff", accent: "#5c389e", ink: "#ffffff", archetype: "header-band" },
  "accent-rail": { bg: "#fafafa", accent: "#7348b8", ink: "#1a1a1a", archetype: "accent-rail" },
  sidebar: { bg: "#ffffff", accent: "#1f4d7a", ink: "#1e293b", archetype: "sidebar" },
  split: { bg: "#ffffff", accent: "#147088", ink: "#ffffff", archetype: "split-block" },
  bold: { bg: "#ffffff", accent: "#000000", ink: "#000000", archetype: "single-column" },
  "grid-skills": { bg: "#ffffff", accent: "#2d5a93", ink: "#1e293b", archetype: "grid-skills" },
  compact: { bg: "#ffffff", accent: "#64748b", ink: "#222222", archetype: "single-column" },
};

function ThemeLayoutPreview({ themeId }: { themeId: PdfPreset }) {
  const spec = PREVIEW_SPEC[themeId];
  const archetype = ARCHETYPE_BY_PRESET[themeId];

  return (
    <Box
      sx={{
        width: 40,
        height: 48,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: spec.bg,
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {archetype === "header-band" ? (
        <Box sx={{ height: 14, bgcolor: spec.accent, width: "100%" }}>
          <Box sx={{ height: 3, width: "55%", bgcolor: spec.ink, opacity: 0.9, ml: 0.75, mt: 0.75, borderRadius: 0.25 }} />
          <Box sx={{ height: 2, width: "40%", bgcolor: spec.ink, opacity: 0.6, ml: 0.75, mt: 0.4, borderRadius: 0.25 }} />
        </Box>
      ) : null}

      {archetype === "split-block" ? (
        <Box sx={{ display: "flex", height: 14 }}>
          <Box sx={{ width: "42%", bgcolor: spec.accent, height: "100%" }}>
            <Box sx={{ height: 3, width: "70%", bgcolor: spec.ink, ml: 0.5, mt: 0.75, borderRadius: 0.25 }} />
          </Box>
          <Box sx={{ flex: 1, pt: 0.5, pl: 0.4 }}>
            <Box sx={{ height: 2, width: "80%", bgcolor: spec.ink, opacity: 0.35, borderRadius: 0.25 }} />
          </Box>
        </Box>
      ) : null}

      {archetype === "split-header" ? (
        <Box sx={{ px: 0.5, pt: 0.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ height: 4, width: "45%", bgcolor: spec.ink, borderRadius: 0.25 }} />
          <Box sx={{ height: 2, width: "35%", bgcolor: spec.accent, opacity: 0.7, borderRadius: 0.25, mt: 0.25 }} />
        </Box>
      ) : null}

      {archetype === "sidebar" ? (
        <Box sx={{ display: "flex", height: "100%" }}>
          <Box sx={{ width: "32%", bgcolor: spec.accent, opacity: 0.12, height: "100%", borderRight: 1, borderColor: "divider" }}>
            <Box sx={{ height: 2, width: "70%", bgcolor: spec.accent, ml: 0.4, mt: 0.6, borderRadius: 0.25 }} />
            <Box sx={{ height: 2, width: "60%", bgcolor: spec.accent, opacity: 0.5, ml: 0.4, mt: 0.4, borderRadius: 0.25 }} />
          </Box>
          <Box sx={{ flex: 1, p: 0.4 }}>
            <Box sx={{ height: 2, width: "80%", bgcolor: spec.ink, opacity: 0.5, borderRadius: 0.25 }} />
            <Box sx={{ height: 2, width: "90%", bgcolor: spec.ink, opacity: 0.25, mt: 0.4, borderRadius: 0.25 }} />
          </Box>
        </Box>
      ) : null}

      {archetype === "accent-rail" ? (
        <Box sx={{ px: 0.5, pt: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.4, mb: 0.4 }}>
            <Box sx={{ width: 3, height: 8, bgcolor: spec.accent, borderRadius: 0.25 }} />
            <Box sx={{ height: 2, flex: 1, bgcolor: spec.accent, opacity: 0.55, borderRadius: 0.25 }} />
          </Box>
          <Box sx={{ height: 2, width: "85%", bgcolor: spec.ink, opacity: 0.2, ml: 1, borderRadius: 0.25 }} />
        </Box>
      ) : null}

      {archetype === "grid-skills" ? (
        <Box sx={{ px: 0.5, pt: 0.5 }}>
          <Box sx={{ height: 2, width: "50%", bgcolor: spec.accent, mb: 0.5, borderRadius: 0.25 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.25 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ height: 2, bgcolor: spec.ink, opacity: 0.2, borderRadius: 0.25 }} />
            ))}
          </Box>
        </Box>
      ) : null}

      {archetype === "single-column" && themeId === "bold" ? (
        <Box sx={{ px: 0.5, pt: 0.5 }}>
          <Box sx={{ height: 5, width: "75%", bgcolor: spec.ink, borderRadius: 0.25 }} />
          <Box sx={{ height: 2, width: "90%", bgcolor: spec.ink, opacity: 0.15, mt: 0.6, borderRadius: 0.25 }} />
        </Box>
      ) : null}

      {archetype === "single-column" && themeId !== "bold" ? (
        <Box sx={{ px: 0.5, pt: 0.5 }}>
          <Box sx={{ height: themeId === "compact" ? 2.5 : 3, width: "60%", bgcolor: spec.ink, opacity: 0.85, borderRadius: 0.25 }} />
          <Box sx={{ height: 2, width: "45%", bgcolor: spec.accent, opacity: 0.45, mt: 0.4, borderRadius: 0.25 }} />
          <Box sx={{ height: 1.5, width: "80%", bgcolor: spec.ink, opacity: 0.15, mt: 0.5, borderRadius: 0.25 }} />
          {themeId === "compact" ? (
            <>
              <Box sx={{ height: 1.5, width: "75%", bgcolor: spec.ink, opacity: 0.12, mt: 0.25, borderRadius: 0.25 }} />
              <Box sx={{ height: 1.5, width: "70%", bgcolor: spec.ink, opacity: 0.12, mt: 0.25, borderRadius: 0.25 }} />
            </>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function AtsTierBadge({ tier }: { tier: number }) {
  const label = tier >= 100 ? `ATS ${tier}` : `ATS ${tier}+`;
  return (
    <Chip
      size="small"
      label={label}
      color={tier >= 88 ? "success" : "warning"}
      variant="outlined"
      sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
    />
  );
}

function groupThemesByVibe(themes: ThemeOption[]) {
  const order: ThemeVibe[] = ["professional", "modern", "creative", "compact"];
  return order
    .map((vibe) => ({
      vibe,
      label: THEME_VIBE_LABELS[vibe],
      themes: themes.filter((t) => t.vibe === vibe),
    }))
    .filter((group) => group.themes.length > 0);
}

function ThemeListItem({
  theme,
  selected,
  disabled,
  onChange,
}: {
  theme: ThemeOption;
  selected: boolean;
  disabled?: boolean;
  onChange: (preset: PdfPreset) => void;
}) {
  return (
    <ListItemButton
      selected={selected}
      disabled={disabled}
      onClick={() => onChange(theme.id)}
      sx={{
        borderRadius: 1.5,
        mb: 0.5,
        border: 1,
        borderColor: selected ? "primary.main" : "transparent",
        alignItems: "flex-start",
        py: 1,
      }}
    >
      <ListItemIcon sx={{ minWidth: 48, mt: 0.25 }}>
        <ThemeLayoutPreview themeId={theme.id} />
      </ListItemIcon>
      <ListItemText
        sx={{ my: 0 }}
        primary={
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
            <Typography component="span" variant="body2" fontWeight={selected ? 700 : 600}>
              {theme.name}
            </Typography>
            <AtsTierBadge tier={theme.atsTier} />
          </Stack>
        }
        secondary={theme.description}
        secondaryTypographyProps={{
          variant: "caption",
          sx: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
        }}
      />
    </ListItemButton>
  );
}

export function ResumeThemePicker({
  value,
  onChange,
  disabled,
  variant = "grid",
  showHeader = true,
}: ResumeThemePickerProps) {
  const groups = groupThemesByVibe(RESUME_THEME_OPTIONS);

  if (variant === "list") {
    return (
      <Stack spacing={1.5} sx={{ minHeight: 0 }}>
        {showHeader ? (
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Themes</Typography>
            <Typography variant="caption" color="text.secondary">
              10 ATS-tested layouts across professional, modern, and creative styles.
            </Typography>
          </Box>
        ) : null}
        <Box sx={{ overflowY: "auto", maxHeight: "100%" }}>
          {groups.map((group) => (
            <Box key={group.vibe} sx={{ mb: 1.5 }}>
              <Typography variant="overline" color="text.secondary" sx={{ px: 0.5, lineHeight: 2 }}>
                {group.label}
              </Typography>
              <List dense disablePadding>
                {group.themes.map((theme) => (
                  <ThemeListItem
                    key={theme.id}
                    theme={theme}
                    selected={value === theme.id}
                    disabled={disabled}
                    onChange={onChange}
                  />
                ))}
              </List>
            </Box>
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {showHeader ? (
        <>
          <Typography variant="h3">Resume theme</Typography>
          <Typography variant="body2" color="text.secondary">
            Ten distinct layout archetypes — from editorial classics to bold header bands. Applies to previews and exported PDFs.
          </Typography>
        </>
      ) : null}
      {groups.map((group) => (
        <Box key={group.vibe}>
          <Typography variant="overline" color="text.secondary">{group.label}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "1fr" }, gap: 1.5, mt: 0.5 }}>
            {group.themes.map((theme) => {
              const selected = value === theme.id;
              return (
                <Card
                  key={theme.id}
                  variant="outlined"
                  sx={{
                    borderColor: selected ? "primary.main" : "divider",
                    boxShadow: selected ? "0 0 0 1px rgba(37, 99, 235, 0.35)" : "none",
                  }}
                >
                  <CardActionArea disabled={disabled} onClick={() => onChange(theme.id)}>
                    <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <ThemeLayoutPreview themeId={theme.id} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="subtitle2">{theme.name}</Typography>
                            <AtsTierBadge tier={theme.atsTier} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{theme.description}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
