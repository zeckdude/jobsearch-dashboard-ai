"use client";

import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RescorePreview = {
  total: number;
  toDelete: number;
  toUpdate: number;
  skippedFavorites: number;
  fullCount: number;
  partialCount: number;
  sampleDeletes: Array<{ job: string; reason: string }>;
  sampleUpdates: Array<{ job: string; tier: string; pendingRequirements: string[] }>;
  message: string;
};

export function ListingMaintenancePanel() {
  const { refresh } = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RescorePreview | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function runDryRescore() {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/jobs/rescore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: false }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to preview rescore.");
      setPreview(payload as RescorePreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview rescore.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmRescore() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/jobs/rescore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to rescore queue.");
      setPreview(null);
      setNotice(payload.message ?? "Queue rescored.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to rescore queue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card data-workflow-target="listing-maintenance-section">
        <CardContent>
          <Stack spacing={1.5}>
            <Box>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", mb: 1 }}>
                <Chip size="small" color="primary" variant="outlined" label="Listing maintenance" />
              </Stack>
              <Typography variant="h3">Update your queue</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Re-check saved matches against your current profile rules and remove listings that no longer pass. Favorited jobs are updated but never removed.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<AutorenewOutlinedIcon />}
                disabled={loading}
                onClick={() => void runDryRescore()}
              >
                {loading && !preview ? "Checking..." : "Rescore queue"}
              </Button>
            </Stack>
            {notice ? <Alert severity="success">{notice}</Alert> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} fullWidth maxWidth="sm">
        <DialogTitle>Rescore preview</DialogTitle>
        <DialogContent>
          {preview ? (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">{preview.message}</Typography>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Chip size="small" label={`${preview.total} reviewed`} />
                <Chip size="small" color="error" variant="outlined" label={`${preview.toDelete} to remove`} />
                <Chip size="small" color="success" variant="outlined" label={`${preview.toUpdate} to update`} />
                {preview.skippedFavorites > 0 ? (
                  <Chip size="small" color="warning" variant="outlined" label={`${preview.skippedFavorites} favorites protected`} />
                ) : null}
              </Stack>
              {preview.sampleDeletes.length ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
                    Sample removals
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                    {preview.sampleDeletes.slice(0, 5).map((item) => (
                      <Typography key={`${item.job}-${item.reason}`} variant="body2" color="text.secondary">
                        {item.job} — {item.reason}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)} disabled={loading}>Cancel</Button>
          <Button variant="contained" disabled={loading || !preview?.toDelete && !preview?.toUpdate} onClick={() => void confirmRescore()}>
            {loading ? "Rescoring..." : "Confirm rescore"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
