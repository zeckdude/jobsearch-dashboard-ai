"use client";

import PowerSettingsNewOutlinedIcon from "@mui/icons-material/PowerSettingsNewOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action-button";

export function ProfileDetailActions({
  profileId,
  enabled,
  name,
}: {
  profileId: string;
  enabled: boolean;
  name: string;
}) {
  const { refresh } = useRouter();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function toggleEnabled() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to update profile.");
      return;
    }
    setNotice(enabled ? `${name} paused.` : `${name} enabled.`);
    refresh();
  }

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <ActionButton href={`/profiles/${profileId}/edit`} variant="contained">
          Edit profile
        </ActionButton>
        <Button
          variant="outlined"
          disabled={saving}
          startIcon={<PowerSettingsNewOutlinedIcon />}
          onClick={() => void toggleEnabled()}
        >
          {enabled ? "Pause" : "Enable"}
        </Button>
        <ActionButton href="/profiles" variant="text">
          Back to profiles
        </ActionButton>
      </Stack>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice("")}>
        <Alert severity="success" variant="filled" onClose={() => setNotice("")}>{notice}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError("")}>
        <Alert severity="error" variant="filled" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}
