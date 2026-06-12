"use client";

import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import MenuItem from "@mui/material/MenuItem";
import { useMemo, useState } from "react";
import { SourceConnectorBreakdown } from "@/components/source-connector-breakdown";
import {
  companySourceRunSettingsEqual,
  type CompanySourceRunSettings,
} from "@/lib/job-search/company-source-run-settings";
import type { CompanySource } from "@/lib/job-search/company-sources";
import { sourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";
import { sourceRunHint } from "@/lib/job-search/source-run-hints";
import {
  formatPostedDateRangeLabel,
  postedDateFilterSummary,
  usesCustomPostedDateRange,
} from "@/lib/job-search/posted-date-filter";
import type { SourceItemSelections } from "@/lib/job-search/source-item-selection";
import { CANONICAL_SOURCE_NAMES, connectorDisplayName } from "@/lib/job-search/source-display";
import type { SourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";

export type SearchRunSourceOption = {
  id: string;
  name: string;
  displayName?: string;
  type: string;
  enabled: boolean;
  detail?: string | null;
  breakdown?: SourceRunBreakdown | null;
};

export type SearchRunProfileOption = {
  id: string;
  name: string;
};

export type CompanySourceRunCatalog = {
  sourceId: string;
  defaults: CompanySourceRunSettings;
  companies: CompanySource[];
};

export type SearchRunOptionsFormValue = {
  maxPostedAgeDays: number | null;
  postedAfter: string;
  postedBefore: string;
  includeUnknownPostedDates: boolean;
  sourceIds: string[];
  profileIds: string[];
  sourceItemSelections: SourceItemSelections;
  companySourceRun: CompanySourceRunSettings;
  companySourceRunDefaults: CompanySourceRunSettings;
};

export const defaultSearchRunOptionsFormValue: SearchRunOptionsFormValue = {
  maxPostedAgeDays: 14,
  postedAfter: "",
  postedBefore: "",
  includeUnknownPostedDates: true,
  sourceIds: [],
  profileIds: [],
  sourceItemSelections: {},
  companySourceRun: {
    priorityMax: 2,
    maxCompanies: 90,
    maxJobsPerCompany: 12,
    maxFetch: 900,
  },
  companySourceRunDefaults: {
    priorityMax: 2,
    maxCompanies: 90,
    maxJobsPerCompany: 12,
    maxFetch: 900,
  },
};

type Props = {
  sources: SearchRunSourceOption[];
  profiles: SearchRunProfileOption[];
  value: SearchRunOptionsFormValue;
  onChange: (value: SearchRunOptionsFormValue) => void;
  companySourceCatalog?: CompanySourceRunCatalog | null;
  showCompanySourceRun?: boolean;
  collapsed?: boolean;
  showAddSource?: boolean;
  onSourcesChanged?: () => void;
};

const freshnessPresets: Array<{ label: string; maxPostedAgeDays: number | null }> = [
  { label: "Last 7 days", maxPostedAgeDays: 7 },
  { label: "Last 14 days", maxPostedAgeDays: 14 },
  { label: "Last 30 days", maxPostedAgeDays: 30 },
  { label: "No limit", maxPostedAgeDays: null },
];

export function SearchRunOptionsFields({
  sources,
  profiles,
  value,
  onChange,
  companySourceCatalog,
  showCompanySourceRun = true,
  collapsed: initialCollapsed = false,
  showAddSource = true,
  onSourcesChanged,
}: Props) {
  const [expanded, setExpanded] = useState(!initialCollapsed);
  const [addBoardUrl, setAddBoardUrl] = useState("");
  const [addBoardName, setAddBoardName] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const [addNotice, setAddNotice] = useState("");
  const [addError, setAddError] = useState("");

  const selectedSourceIds = value.sourceIds.length
    ? value.sourceIds.filter((id) => sources.some((source) => source.id === id))
    : sources.filter((source) => source.enabled).map((source) => source.id);

  const selectedProfileIds = value.profileIds.length
    ? value.profileIds.filter((id) => profiles.some((profile) => profile.id === id))
    : profiles.map((profile) => profile.id);

  const postedAfterDate = parseDateField(value.postedAfter);
  const postedBeforeDate = parseDateField(value.postedBefore);
  const customRangeActive = usesCustomPostedDateRange({
    postedAfter: postedAfterDate,
    postedBefore: postedBeforeDate,
  });
  const postingSummary = postedDateFilterSummary({
    maxPostedAgeDays: value.maxPostedAgeDays,
    postedAfter: postedAfterDate,
    postedBefore: postedBeforeDate,
    includeUnknownPostedDates: value.includeUnknownPostedDates,
  });
  const companyRunCustomized = !companySourceRunSettingsEqual(
    value.companySourceRun,
    value.companySourceRunDefaults,
  );
  const companySitePreview = useMemo(() => {
    if (!companySourceCatalog) return null;
    const previewSource = {
      type: "company_site" as const,
      name: CANONICAL_SOURCE_NAMES.companySite,
      baseUrl: null,
      config: {
        companies: companySourceCatalog.companies,
        ...value.companySourceRun,
      },
    };
    const breakdown = sourceRunBreakdown(previewSource);
    return {
      detail: sourceRunHint(previewSource)?.detail ?? null,
      breakdown: breakdown
        ? {
            totalConfigured: breakdown.totalConfigured,
            includedThisRun: breakdown.includedThisRun,
            footer: breakdown.footer ?? null,
            items: breakdown.items,
          }
        : null,
    };
  }, [companySourceCatalog, value.companySourceRun]);
  const displaySources = useMemo(() => {
    if (!companySourceCatalog || !companySitePreview) return sources;
    return sources.map((source) => (
      source.id === companySourceCatalog.sourceId
        ? { ...source, detail: companySitePreview.detail, breakdown: companySitePreview.breakdown }
        : source
    ));
  }, [companySitePreview, companySourceCatalog, sources]);

  function patch(partial: Partial<SearchRunOptionsFormValue>) {
    onChange({ ...value, ...partial });
  }

  function updatePostedAfter(next: string) {
    const hasRange = Boolean(next || value.postedBefore);
    patch({
      postedAfter: next,
      maxPostedAgeDays: hasRange ? null : (value.maxPostedAgeDays ?? 14),
    });
  }

  function updatePostedBefore(next: string) {
    const hasRange = Boolean(value.postedAfter || next);
    patch({
      postedBefore: next,
      maxPostedAgeDays: hasRange ? null : (value.maxPostedAgeDays ?? 14),
    });
  }

  function toggleSource(id: string, checked: boolean) {
    const base = value.sourceIds.length
      ? [...value.sourceIds]
      : sources.filter((source) => source.enabled).map((source) => source.id);
    const next = checked
      ? Array.from(new Set([...base, id]))
      : base.filter((entry) => entry !== id);
    patch({ sourceIds: next });
  }

  function toggleProfile(id: string, checked: boolean) {
    const base = value.profileIds.length
      ? [...value.profileIds]
      : profiles.map((profile) => profile.id);
    const next = checked
      ? Array.from(new Set([...base, id]))
      : base.filter((entry) => entry !== id);
    patch({ profileIds: next });
  }

  async function addJobBoardSource() {
    setAddingSource(true);
    setAddNotice("");
    setAddError("");
    try {
      const response = await fetch("/api/settings/job-source", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          boardUrl: addBoardUrl,
          name: addBoardName || undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to add job source.");
      const newId = payload.source?.id as string | undefined;
      if (newId) {
        const base = value.sourceIds.length
          ? value.sourceIds
          : sources.filter((source) => source.enabled).map((source) => source.id);
        patch({ sourceIds: [...base, newId] });
      }
      setAddNotice(payload.message ?? "Job source added.");
      setAddBoardUrl("");
      setAddBoardName("");
      onSourcesChanged?.();
    } catch (caught) {
      setAddError(caught instanceof Error ? caught.message : "Unable to add job source.");
    } finally {
      setAddingSource(false);
    }
  }

  return (
    <Stack spacing={expanded ? 2 : 0}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>Search options</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {postingSummary} · {selectedSourceIds.length} connector(s) · {selectedProfileIds.length} profile(s)
            {!value.includeUnknownPostedDates ? " · excluding listings without dates" : ""}
          </Typography>
        </Box>
        <Button size="small" endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Hide" : "Show"}
        </Button>
      </Stack>

      <Collapse in={expanded}>
        <Stack spacing={3} sx={{ pt: 1, pb: 0.5 }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>Posting date</Typography>
            <Stack direction="row" spacing={1.25} useFlexGap sx={{ flexWrap: "wrap", mb: 2.5 }}>
              {freshnessPresets.map((preset) => {
                const selected = !customRangeActive && value.maxPostedAgeDays === preset.maxPostedAgeDays;
                return (
                  <Chip
                    key={preset.label}
                    clickable
                    sx={{ px: 0.5 }}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    label={preset.label}
                    onClick={() => patch({ maxPostedAgeDays: preset.maxPostedAgeDays, postedAfter: "", postedBefore: "" })}
                  />
                );
              })}
              {customRangeActive ? (
                <Chip color="primary" variant="filled" label="Custom range" />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {customRangeActive
                ? `Using custom range: ${formatPostedDateRangeLabel(postedAfterDate, postedBeforeDate)}. Quick presets are paused while dates are set.`
                : "Or pick a custom posted-on range below."}
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                size="small"
                type="date"
                label="Posted on or after"
                value={value.postedAfter}
                onChange={(event) => updatePostedAfter(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                type="date"
                label="Posted on or before"
                value={value.postedBefore}
                onChange={(event) => updatePostedBefore(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            {customRangeActive ? (
              <Button
                size="small"
                variant="text"
                sx={{ mt: 1, alignSelf: "flex-start" }}
                onClick={() => patch({ postedAfter: "", postedBefore: "", maxPostedAgeDays: 14 })}
              >
                Clear custom range
              </Button>
            ) : null}
            <FormControlLabel
              sx={{ mt: 2, ml: 0, alignItems: "flex-start" }}
              control={
                <Checkbox
                  sx={{ pt: 0.25 }}
                  checked={value.includeUnknownPostedDates}
                  onChange={(event) => patch({ includeUnknownPostedDates: event.target.checked })}
                />
              }
              label="Include listings without a posting date"
            />
          </Box>

          {showCompanySourceRun && companySourceCatalog ? (
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Company source limits</Typography>
                <Button component={Link} href="/sources#source-settings" size="small" variant="text">Edit defaults on Sources</Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Controls how aggressively the company career-page connector probes ATS feeds. Values start from your Sources defaults{companyRunCustomized ? " and are customized for this run" : ""}.
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(4, 1fr)" }, gap: 2 }}>
                <TextField
                  select
                  size="small"
                  label="Priority ceiling"
                  value={value.companySourceRun.priorityMax}
                  onChange={(event) => patch({
                    companySourceRun: { ...value.companySourceRun, priorityMax: Number(event.target.value) },
                  })}
                >
                  <MenuItem value={1}>1 only</MenuItem>
                  <MenuItem value={2}>1 and 2</MenuItem>
                  <MenuItem value={3}>All priorities</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Companies per run"
                  value={value.companySourceRun.maxCompanies}
                  onChange={(event) => patch({
                    companySourceRun: { ...value.companySourceRun, maxCompanies: Number(event.target.value) },
                  })}
                  slotProps={{ htmlInput: { min: 1, max: 500 } }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Jobs per company"
                  value={value.companySourceRun.maxJobsPerCompany}
                  onChange={(event) => patch({
                    companySourceRun: { ...value.companySourceRun, maxJobsPerCompany: Number(event.target.value) },
                  })}
                  slotProps={{ htmlInput: { min: 1, max: 50 } }}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Max fetched roles"
                  value={value.companySourceRun.maxFetch}
                  onChange={(event) => patch({
                    companySourceRun: { ...value.companySourceRun, maxFetch: Number(event.target.value) },
                  })}
                  slotProps={{ htmlInput: { min: 10, max: 3000 } }}
                />
              </Box>
              {companyRunCustomized ? (
                <Button
                  size="small"
                  variant="text"
                  sx={{ mt: 1, px: 0, minWidth: 0, textTransform: "none" }}
                  onClick={() => patch({ companySourceRun: { ...value.companySourceRunDefaults } })}
                >
                  Reset to Sources defaults
                </Button>
              ) : null}
            </Box>
          ) : null}

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>What this run searches</Typography>
              <Button component={Link} href="/sources" size="small" variant="text">Edit on Sources</Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Expand any connector to include or exclude individual companies, boards, or queries. Connectors marked off by default can still be checked here for this run only.
            </Typography>
            <Stack spacing={1.5}>
              {displaySources.map((source) => {
                const connectorSelected = selectedSourceIds.includes(source.id);
                return (
                  <Box key={source.id}>
                    <FormControlLabel
                      sx={{ alignItems: "flex-start", ml: 0, mr: 0 }}
                      control={
                        <Checkbox
                          sx={{ pt: 0.25 }}
                          checked={connectorSelected}
                          onChange={(event) => toggleSource(source.id, event.target.checked)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {source.displayName ?? connectorDisplayName(source.name, source.type)}
                            {!source.enabled ? " (off by default)" : ""}
                          </Typography>
                          {source.detail ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                              {source.detail}
                            </Typography>
                          ) : null}
                        </Box>
                      }
                    />
                    {source.breakdown ? (
                      <SourceConnectorBreakdown
                        sourceId={source.id}
                        breakdown={source.breakdown}
                        connectorEnabled={connectorSelected && source.enabled}
                        selections={value.sourceItemSelections}
                        onSelectionsChange={(sourceItemSelections) => patch({ sourceItemSelections })}
                      />
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {profiles.length ? (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.25 }}>Profiles</Typography>
              <Stack spacing={0.5}>
                {profiles.map((profile) => (
                  <FormControlLabel
                    key={profile.id}
                    control={
                      <Checkbox
                        checked={selectedProfileIds.includes(profile.id)}
                        onChange={(event) => toggleProfile(profile.id, event.target.checked)}
                      />
                    }
                    label={profile.name}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}

          {showAddSource ? (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>Add job board</Typography>
              {addNotice ? <Alert severity="success" sx={{ mb: 1.5 }}>{addNotice}</Alert> : null}
              {addError ? <Alert severity="error" sx={{ mb: 1.5 }}>{addError}</Alert> : null}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" }, gap: 2, alignItems: "center" }}>
                <TextField
                  size="small"
                  label="Board URL"
                  value={addBoardUrl}
                  onChange={(event) => setAddBoardUrl(event.target.value)}
                  placeholder="https://jobs.example.com"
                />
                <TextField
                  size="small"
                  label="Name (optional)"
                  value={addBoardName}
                  onChange={(event) => setAddBoardName(event.target.value)}
                />
                <Button
                  variant="outlined"
                  startIcon={<AddCircleOutlineOutlinedIcon />}
                  disabled={addingSource || !addBoardUrl.trim()}
                  onClick={() => void addJobBoardSource()}
                >
                  Add
                </Button>
              </Box>
            </Box>
          ) : null}
        </Stack>
      </Collapse>
    </Stack>
  );
}

export function buildSearchRunRequestBody(
  value: SearchRunOptionsFormValue,
  sources: SearchRunSourceOption[],
  profiles: SearchRunProfileOption[],
) {
  const sourceIds = value.sourceIds.length
    ? value.sourceIds
    : sources.filter((source) => source.enabled).map((source) => source.id);
  const profileIds = value.profileIds.length
    ? value.profileIds
    : profiles.map((profile) => profile.id);

  const sourceItemSelections = Object.keys(value.sourceItemSelections).length
    ? value.sourceItemSelections
    : undefined;
  const companySourceRun = companySourceRunSettingsEqual(
    value.companySourceRun,
    value.companySourceRunDefaults,
  )
    ? undefined
    : value.companySourceRun;

  return {
    sourceIds,
    profileIds,
    postedDate: {
      maxPostedAgeDays: value.maxPostedAgeDays,
      postedAfter: value.postedAfter ? new Date(`${value.postedAfter}T00:00:00`).toISOString() : null,
      postedBefore: value.postedBefore ? new Date(`${value.postedBefore}T23:59:59`).toISOString() : null,
      includeUnknownPostedDates: value.includeUnknownPostedDates,
    },
    ...(sourceItemSelections ? { sourceItemSelections } : {}),
    ...(companySourceRun ? { companySourceRun } : {}),
  };
}

export function preferencesToFormValue(
  preferences: {
    maxPostedAgeDays: number | null;
    postedAfter: string | Date | null;
    postedBefore: string | Date | null;
    includeUnknownPostedDates: boolean;
    defaultSourceIds: string[];
    defaultProfileIds: string[];
  },
  companySourceRun?: CompanySourceRunSettings | null,
): SearchRunOptionsFormValue {
  const defaults = companySourceRun ?? defaultSearchRunOptionsFormValue.companySourceRunDefaults;
  return {
    maxPostedAgeDays: preferences.maxPostedAgeDays,
    postedAfter: formatDateInput(preferences.postedAfter),
    postedBefore: formatDateInput(preferences.postedBefore),
    includeUnknownPostedDates: preferences.includeUnknownPostedDates,
    sourceIds: preferences.defaultSourceIds,
    profileIds: preferences.defaultProfileIds,
    sourceItemSelections: {},
    companySourceRun: { ...defaults },
    companySourceRunDefaults: { ...defaults },
  };
}

export function formValueToPreferencesPayload(value: SearchRunOptionsFormValue) {
  return {
    maxPostedAgeDays: value.maxPostedAgeDays,
    postedAfter: value.postedAfter ? new Date(`${value.postedAfter}T00:00:00`).toISOString() : null,
    postedBefore: value.postedBefore ? new Date(`${value.postedBefore}T23:59:59`).toISOString() : null,
    includeUnknownPostedDates: value.includeUnknownPostedDates,
    defaultSourceIds: value.sourceIds,
    defaultProfileIds: value.profileIds,
  };
}

function formatDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseDateField(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
