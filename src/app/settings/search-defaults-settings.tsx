"use client";

import TravelExploreOutlinedIcon from "@mui/icons-material/TravelExploreOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import {
  formValueToPreferencesPayload,
  SearchRunOptionsFields,
} from "@/components/search-run-options-fields";
import { useSearchRunOptions } from "@/components/use-search-run-options";
import { StatusChip } from "@/components/ui/status-chip";

export function SearchDefaultsSettings() {
  const { sources, profiles, options, setOptions, loading, error, reload } = useSearchRunOptions();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");

  async function saveDefaults() {
    setSaving(true);
    setNotice("");
    setSaveError("");
    try {
      const response = await fetch("/api/settings/search-preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formValueToPreferencesPayload(options)),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to save search defaults.");
      setNotice(payload.message ?? "Search defaults saved.");
      await reload();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Unable to save search defaults.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="settings-search-defaults">
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <TravelExploreOutlinedIcon color="primary" />
              <Typography variant="h3">Search defaults</Typography>
            </Stack>
            <StatusChip status={loading ? "provider_missing" : "configured"} />
          </Stack>
          <Alert severity="info">
            These defaults apply to scheduled searches and pre-fill the dashboard Run search panel. Every setting here is used when a job search runs.
          </Alert>
          {error ? <Alert severity="warning">{error}</Alert> : null}
          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {saveError ? <Alert severity="error">{saveError}</Alert> : null}
          {!loading && sources.length ? (
            <SearchRunOptionsFields
              sources={sources}
              profiles={profiles}
              value={options}
              onChange={setOptions}
              showCompanySourceRun={false}
              showAddSource
              onSourcesChanged={() => void reload()}
            />
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
            <Button variant="contained" disabled={saving || loading} onClick={() => void saveDefaults()}>
              {saving ? "Saving…" : "Save search defaults"}
            </Button>
            <Button component={Link} href="/sources" variant="outlined">
              Manage company sources
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
