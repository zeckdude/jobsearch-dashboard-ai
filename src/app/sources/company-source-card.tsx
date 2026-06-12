"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompanySource } from "@/lib/job-search/company-sources";
import { isCompanySourceEnabled } from "@/lib/job-search/company-sources";

export function CompanySourceCard({ company }: { company: CompanySource }) {
  const { refresh } = useRouter();
  const [enabled, setEnabled] = useState(isCompanySourceEnabled(company));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patchCompany(payload: { companyName?: string; companyEnabled?: boolean; removeCompany?: string }) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/settings/company-source", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Unable to update company source.");
      refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update company source.");
      setEnabled(isCompanySourceEnabled(company));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(next: boolean) {
    setEnabled(next);
    await patchCompany({ companyName: company.name, companyEnabled: next });
  }

  async function removeCompany() {
    if (!window.confirm(`Remove ${company.name} from the company source list?`)) return;
    await patchCompany({ removeCompany: company.name });
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: enabled ? "divider" : "warning.light",
        borderRadius: 2,
        p: 1.5,
        bgcolor: enabled ? "background.paper" : "rgba(245, 158, 11, 0.06)",
        opacity: busy ? 0.7 : 1,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900 }}>{company.name}</Typography>
            <Typography variant="caption" color="text.secondary">{company.careersQuery}</Typography>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
            <Chip size="small" color={company.priority === 1 ? "success" : company.priority === 2 ? "primary" : "default"} label={`P${company.priority}`} />
            {!enabled ? <Chip size="small" color="warning" variant="outlined" label="Paused" /> : null}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <FormControlLabel
            sx={{ ml: 0, mr: 0 }}
            control={
              <Switch
                size="small"
                checked={enabled}
                disabled={busy}
                onChange={(event) => void toggleEnabled(event.target.checked)}
              />
            }
            label={<Typography variant="caption">{enabled ? "Active" : "Paused"}</Typography>}
          />
          <Tooltip title="Remove from list">
            <span>
              <IconButton size="small" color="error" disabled={busy} onClick={() => void removeCompany()}>
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
          {company.categories.slice(0, 6).map((item) => <Chip key={`${company.name}-${item}`} size="small" variant="outlined" label={item} />)}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {company.searchTerms.slice(0, 5).join(", ")}
        </Typography>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Box>
  );
}
