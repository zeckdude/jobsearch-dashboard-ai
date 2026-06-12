"use client";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import {
  effectiveSourceItemKeys,
  isSourceItemSelected,
  sourceItemKey,
  toggleSourceItemSelection,
  type SourceItemSelections,
} from "@/lib/job-search/source-item-selection";
import type { SourceRunBreakdown } from "@/lib/job-search/source-run-breakdown";

const previewLimit = 5;

export function SourceConnectorBreakdown({
  sourceId,
  breakdown,
  connectorEnabled,
  selections,
  onSelectionsChange,
}: {
  sourceId: string;
  breakdown: SourceRunBreakdown;
  connectorEnabled: boolean;
  selections: SourceItemSelections;
  onSelectionsChange: (next: SourceItemSelections) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedKeys = useMemo(
    () => effectiveSourceItemKeys(sourceId, breakdown, selections),
    [breakdown, selections, sourceId],
  );
  const preview = selectedKeys.slice(0, previewLimit);
  const customized = selections[sourceId] !== undefined;

  if (!breakdown.items.length) return null;

  function toggleItem(itemKey: string) {
    onSelectionsChange(toggleSourceItemSelection(sourceId, itemKey, breakdown, selections));
  }

  function selectAllDefaults() {
    const next = { ...selections };
    delete next[sourceId];
    onSelectionsChange(next);
  }

  function selectAll() {
    onSelectionsChange({
      ...selections,
      [sourceId]: breakdown.items.map((item) => sourceItemKey(item.label)),
    });
  }

  function clearAll() {
    onSelectionsChange({ ...selections, [sourceId]: [] });
  }

  return (
    <Box sx={{ ml: 4.5, mt: 0.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}>
        <Button
          size="small"
          variant="text"
          sx={{ px: 0, minWidth: 0, textTransform: "none" }}
          endIcon={expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          onClick={() => setExpanded((current) => !current)}
        >
          {connectorEnabled
            ? `${selectedKeys.length} selected for this run${customized ? " (customized)" : ""}`
            : `Connector off · ${breakdown.totalConfigured} configured`}
        </Button>
        {expanded && connectorEnabled ? (
          <>
            <Button size="small" variant="text" onClick={selectAllDefaults}>Reset to defaults</Button>
            <Button size="small" variant="text" onClick={selectAll}>Select all</Button>
            <Button size="small" variant="text" onClick={clearAll}>Clear all</Button>
          </>
        ) : null}
      </Stack>

      {!expanded && connectorEnabled && preview.length ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, lineHeight: 1.5 }}>
          {preview.join(" · ")}
          {selectedKeys.length > previewLimit ? ` · +${selectedKeys.length - previewLimit} more` : ""}
        </Typography>
      ) : null}

      <Collapse in={expanded}>
        <Stack
          spacing={0.5}
          sx={{
            mt: 1,
            maxHeight: 280,
            overflowY: "auto",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: 1,
            bgcolor: "background.default",
          }}
        >
          {breakdown.items.map((item) => {
            const itemKey = sourceItemKey(item.label);
            const checked = connectorEnabled && isSourceItemSelected(sourceId, itemKey, breakdown, selections);
            return (
              <FormControlLabel
                key={itemKey}
                sx={{ alignItems: "flex-start", ml: 0, mr: 0, width: "100%" }}
                control={
                  <Checkbox
                    size="small"
                    sx={{ pt: 0.35 }}
                    checked={checked}
                    disabled={!connectorEnabled}
                    onChange={() => toggleItem(itemKey)}
                  />
                }
                label={
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontWeight: checked ? 600 : 400,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.label}
                    </Typography>
                    {item.meta || item.defaultNote ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {[item.meta, !customized && item.defaultNote ? item.defaultNote : ""].filter(Boolean).join(" · ")}
                      </Typography>
                    ) : null}
                  </Box>
                }
              />
            );
          })}
        </Stack>
        {breakdown.footer ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            {customized
              ? "Your selections below override the default run plan for this connector only."
              : breakdown.footer}
          </Typography>
        ) : null}
      </Collapse>
    </Box>
  );
}
