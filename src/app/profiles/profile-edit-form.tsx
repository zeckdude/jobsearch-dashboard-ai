"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action-button";

const FORM_FIELD_SIZE = "small" as const;

const formFieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 44,
  },
  "& .MuiOutlinedInput-input": {
    py: 1.125,
    boxSizing: "border-box",
  },
  "& .MuiSelect-select": {
    py: 1.125,
    minHeight: "unset",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
  },
  "& .MuiSelect-icon": {
    top: "calc(50% - 0.55em)",
  },
} as const;

const REMOTE_OPTIONS = [
  { value: "remote_us_only", label: "Remote US only" },
  { value: "remote_global", label: "Remote global" },
  { value: "remote_europe", label: "Remote Europe" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite_relocation", label: "Onsite / relocation" },
  { value: "any", label: "Any" },
] as const;

export type ProfileEditData = {
  id: string;
  name: string;
  remotePreference: string;
  remotePreferences: string[];
  salaryCurrency: string | null;
  salaryMin: number | null;
  minimumMatchScore: number;
  maxResultsPerRun: number;
  titles: string[];
  countries: string[];
  cities: string[];
  keywordsPreferred: string[];
  keywordsExcluded: string[];
  excludedCompanies: string[];
};

type EditableProfile = Omit<ProfileEditData, "titles" | "countries" | "cities" | "keywordsPreferred" | "keywordsExcluded" | "excludedCompanies"> & {
  titles: string;
  countries: string;
  cities: string;
  keywordsPreferred: string;
  keywordsExcluded: string;
  excludedCompanies: string;
};

export function ProfileEditForm({ profile, cancelHref }: { profile: ProfileEditData; cancelHref: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<EditableProfile>(() => toDraft(profile));

  async function save() {
    const remotePreferences = draft.remotePreferences as string[];
    setSaving(true);
    setError("");
    const response = await fetch(`/api/profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        remotePreference: remotePreferences.length === 1 ? remotePreferences[0] : "any",
        remotePreferences,
        salaryCurrency: draft.salaryCurrency ?? "USD",
        salaryMin: draft.salaryMin,
        minimumMatchScore: clampNumber(draft.minimumMatchScore, 0, 100, 75),
        maxResultsPerRun: clampNumber(draft.maxResultsPerRun, 1, 250, 50),
        titles: splitList(draft.titles),
        countries: splitList(draft.countries),
        cities: splitList(draft.cities),
        keywordsPreferred: splitList(draft.keywordsPreferred),
        keywordsExcluded: splitList(draft.keywordsExcluded),
        excludedCompanies: splitList(draft.excludedCompanies),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to update profile.");
      return;
    }
    setNotice("Profile updated.");
    router.push(`/profiles/${profile.id}`);
    router.refresh();
  }

  const selectedRemote = draft.remotePreferences as string[];

  return (
    <>
      <Stack spacing={3}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <FormSection
          title="Basics"
          description="Give this search a name and the job titles you want to find."
        >
          <TextField
            size={FORM_FIELD_SIZE}
            sx={formFieldSx}
            label="Profile name"
            helperText="A label you'll recognize — e.g. Remote React roles"
            value={draft.name}
            onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
          />
          <TextField
            size={FORM_FIELD_SIZE}
            sx={formFieldSx}
            label="Job titles to search for"
            helperText="Separate multiple titles with commas"
            placeholder="Senior Frontend Engineer, Staff Engineer"
            value={draft.titles}
            onChange={(event) => setDraft((previous) => ({ ...previous, titles: event.target.value }))}
          />
        </FormSection>

        <Divider />

        <FormSection
          title="Where & how you want to work"
          description="Location and work-style filters. Leave countries blank to search anywhere."
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              fullWidth
              size={FORM_FIELD_SIZE}
              sx={formFieldSx}
              label="Countries"
              helperText="Separate multiple countries with commas. Blank = any country"
              placeholder="United States"
              value={draft.countries}
              onChange={(event) => setDraft((previous) => ({ ...previous, countries: event.target.value }))}
            />
            <TextField
              fullWidth
              size={FORM_FIELD_SIZE}
              sx={formFieldSx}
              label="Cities"
              helperText="Separate multiple cities with commas. Optional — helps narrow hybrid or onsite roles"
              placeholder="Las Vegas, Austin"
              value={draft.cities}
              onChange={(event) => setDraft((previous) => ({ ...previous, cities: event.target.value }))}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth size={FORM_FIELD_SIZE} sx={formFieldSx}>
              <InputLabel id="remote-prefs-label">Work mode</InputLabel>
              <Select
                labelId="remote-prefs-label"
                label="Work mode"
                IconComponent={ExpandMoreIcon}
                multiple
                value={selectedRemote}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((previous) => ({
                    ...previous,
                    remotePreferences: typeof value === "string" ? [value] : value,
                  }));
                }}
                renderValue={(selected) =>
                  (selected as string[])
                    .map((v) => REMOTE_OPTIONS.find((o) => o.value === v)?.label ?? v)
                    .join(", ")
                }
              >
                {REMOTE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={selectedRemote.includes(option.value)} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Pick every arrangement you'd accept</FormHelperText>
            </FormControl>
            <FormControl fullWidth size={FORM_FIELD_SIZE} sx={formFieldSx}>
              <InputLabel id="salary-currency-label">Salary currency</InputLabel>
              <Select
                labelId="salary-currency-label"
                label="Salary currency"
                IconComponent={ExpandMoreIcon}
                value={draft.salaryCurrency ?? "USD"}
                onChange={(event) => setDraft((previous) => ({ ...previous, salaryCurrency: event.target.value }))}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
                <MenuItem value="SEK">SEK</MenuItem>
              </Select>
              <FormHelperText>Used with your minimum salary below</FormHelperText>
            </FormControl>
          </Stack>
        </FormSection>

        <Divider />

        <FormSection
          title="Pay"
          description="Optional floor for annual salary. Leave blank if pay is not a filter."
        >
          <TextField
            size={FORM_FIELD_SIZE}
            sx={{ ...formFieldSx, maxWidth: 320 }}
            label="Minimum salary"
            type="number"
            helperText="Jobs below this amount are less likely to match"
            value={draft.salaryMin ?? ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, salaryMin: event.target.value ? Number(event.target.value) : null }))}
          />
        </FormSection>

        <Divider />

        <FormSection
          title="Search limits"
          description="These control what lands in your queue after each search — not how hard the app looks."
        >
          <SearchLimitSlidersPair
            left={{
              label: "Minimum match score",
              hint: "Jobs scoring below this never appear in your queue.",
              value: draft.minimumMatchScore,
              min: 0,
              max: 100,
              step: 1,
              valueSuffix: "/ 100",
              effectText: matchScoreEffect(draft.minimumMatchScore),
              onChange: (value) => setDraft((previous) => ({ ...previous, minimumMatchScore: value })),
            }}
            right={{
              label: "Top matches to keep per search",
              hint: "Saves the top-ranked matches from each search — not every job found.",
              value: draft.maxResultsPerRun,
              min: 1,
              max: 250,
              step: 1,
              effectText: maxJobsEffect(draft.maxResultsPerRun),
              onChange: (value) => setDraft((previous) => ({ ...previous, maxResultsPerRun: value })),
            }}
          />
        </FormSection>

        <Divider />

        <FormSection
          title="Keywords"
          description="Optional. Boost jobs that mention certain skills, or block ones you don't want."
        >
          <TextField
            size={FORM_FIELD_SIZE}
            sx={formFieldSx}
            label="Preferred keywords"
            helperText="Skills or terms you'd like to see. Separate with commas"
            placeholder="React, TypeScript"
            value={draft.keywordsPreferred}
            onChange={(event) => setDraft((previous) => ({ ...previous, keywordsPreferred: event.target.value }))}
          />
          <TextField
            size={FORM_FIELD_SIZE}
            sx={formFieldSx}
            label="Keywords to avoid"
            helperText="Terms that should count against a job. Separate with commas"
            placeholder="PHP, WordPress"
            value={draft.keywordsExcluded}
            onChange={(event) => setDraft((previous) => ({ ...previous, keywordsExcluded: event.target.value }))}
          />
        </FormSection>

        <Divider />

        <FormSection
          title="Companies to skip"
          description="Optional. Employers you never want to see in this search."
        >
          <TextField
            size={FORM_FIELD_SIZE}
            sx={formFieldSx}
            label="Excluded companies"
            helperText="Separate with commas"
            placeholder="Acme Corp, Example Inc"
            value={draft.excludedCompanies}
            onChange={(event) => setDraft((previous) => ({ ...previous, excludedCompanies: event.target.value }))}
          />
        </FormSection>

        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", pt: 1 }}>
          <ActionButton href={cancelHref}>Cancel</ActionButton>
          <Button variant="contained" disabled={saving} onClick={() => void save()}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </Stack>
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice("")}>
        <Alert severity="success" variant="filled" onClose={() => setNotice("")}>{notice}</Alert>
      </Snackbar>
    </>
  );
}

type SearchLimitSliderConfig = {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueSuffix?: string;
  effectText: string;
  onChange: (value: number) => void;
};

function SearchLimitSlidersPair({
  left,
  right,
}: {
  left: SearchLimitSliderConfig;
  right: SearchLimitSliderConfig;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gridTemplateAreas: {
          xs: `
            "left-label"
            "left-hint"
            "left-slider"
            "left-effect"
            "right-label"
            "right-hint"
            "right-slider"
            "right-effect"
          `,
          md: `
            "left-label right-label"
            "left-hint right-hint"
            "left-slider right-slider"
            "left-effect right-effect"
          `,
        },
        columnGap: 3,
        rowGap: 0.75,
        px: 0.5,
      }}
    >
      <Box sx={{ gridArea: "left-label" }}>
        <SearchLimitLabelRow config={left} />
      </Box>
      <Box sx={{ gridArea: "right-label" }}>
        <SearchLimitLabelRow config={right} />
      </Box>
      <Box sx={{ gridArea: "left-hint" }}>
        <SearchLimitHint hint={left.hint} />
      </Box>
      <Box sx={{ gridArea: "right-hint" }}>
        <SearchLimitHint hint={right.hint} />
      </Box>
      <Box sx={{ gridArea: "left-slider" }}>
        <SearchLimitSliderControl config={left} />
      </Box>
      <Box sx={{ gridArea: "right-slider" }}>
        <SearchLimitSliderControl config={right} />
      </Box>
      <Box sx={{ gridArea: "left-effect" }}>
        <SearchLimitEffect text={left.effectText} />
      </Box>
      <Box sx={{ gridArea: "right-effect" }}>
        <SearchLimitEffect text={right.effectText} />
      </Box>
    </Box>
  );
}

function SearchLimitLabelRow({ config }: { config: SearchLimitSliderConfig }) {
  const { label, value, valueSuffix = "" } = config;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", justifyContent: "space-between" }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "primary.main", flexShrink: 0 }}>
        {value}{valueSuffix}
      </Typography>
    </Stack>
  );
}

function SearchLimitHint({ hint }: { hint?: string }) {
  if (!hint) {
    return <Box />;
  }
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.4 }}>
      {hint}
    </Typography>
  );
}

function SearchLimitSliderControl({ config }: { config: SearchLimitSliderConfig }) {
  const { label, value, min, max, step, onChange } = config;
  return (
    <Slider
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(_, next) => onChange(Array.isArray(next) ? next[0] : next)}
      valueLabelDisplay="auto"
      aria-label={label}
      sx={{ mt: 0, mb: 0, mx: 0.75 }}
    />
  );
}

function SearchLimitEffect({ text }: { text: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
      {text}
    </Typography>
  );
}

function matchScoreEffect(score: number) {
  if (score >= 85) {
    return "Only your strongest matches will show up. Lower this if your queue feels empty.";
  }
  if (score >= 75) {
    return "Balanced — you'll see good matches without too much noise.";
  }
  if (score >= 65) {
    return "More jobs will show up, including some weaker fits.";
  }
  if (score >= 50) {
    return "A wider net — expect more jobs, and more you'll need to skip.";
  }
  return "Very wide open — many jobs may appear, including poor fits.";
}

function maxJobsEffect(count: number) {
  if (count <= 40) {
    return "Keeps only the strongest matches from each search — a short list, all high quality.";
  }
  if (count <= 80) {
    return "Keeps the top 80 matches from each search. Good default — you're not missing the best ones.";
  }
  if (count <= 150) {
    return "Also keeps matches ranked further down the list — more to review, but weaker fits than the top 50.";
  }
  return "Keeps weaker matches too. The top ~50 are already saved first — raising this mostly adds lower-ranked jobs.";
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h3" sx={{ fontSize: "1.05rem" }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.45 }}>
          {description}
        </Typography>
      </Box>
      <Stack spacing={2}>{children}</Stack>
    </Stack>
  );
}

function toDraft(profile: ProfileEditData): EditableProfile {
  const remotePreferences =
    profile.remotePreferences.length > 0
      ? profile.remotePreferences
      : profile.remotePreference !== "any"
      ? [profile.remotePreference]
      : [];
  return {
    ...profile,
    remotePreferences,
    titles: profile.titles.join(", "),
    countries: profile.countries.join(", "),
    cities: profile.cities.join(", "),
    keywordsPreferred: profile.keywordsPreferred.join(", "),
    keywordsExcluded: profile.keywordsExcluded.join(", "),
    excludedCompanies: profile.excludedCompanies.join(", "),
  };
}

function splitList(value: string) {
  return value.split(",").flatMap((item) => {
    const next = item.trim();
    return next ? [next] : [];
  });
}

function numberOrFallback(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
