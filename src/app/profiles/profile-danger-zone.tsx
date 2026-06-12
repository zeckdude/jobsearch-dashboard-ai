"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CollapsibleSection } from "./profile-actions";

export function ProfileDangerZone({ profileId, name }: { profileId: string; name: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Delete "${name}"? This removes profile-specific matches for this campaign.`)) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to delete profile.");
      return;
    }
    router.push("/profiles");
    router.refresh();
  }

  return (
    <>
      <CollapsibleSection
        summary={
          <Stack spacing={0.25}>
            <Typography variant="h3" color="error.main">Delete this profile</Typography>
            <Typography variant="body2" color="text.secondary">
              Permanent actions that cannot be undone. Enable/disable is available in the header above.
            </Typography>
          </Stack>
        }
      >
        <Card sx={{ borderColor: "error.light", borderWidth: 1, borderStyle: "solid" }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>Remove this search campaign</Typography>
                <Typography variant="body2" color="text.secondary">
                  Permanently deletes this profile and every job match tied only to it. Jobs shared with other profiles are kept.
                </Typography>
              </Box>
              <Button
                color="error"
                variant="outlined"
                disabled={saving}
                startIcon={<DeleteOutlineOutlinedIcon />}
                onClick={() => void remove()}
              >
                Delete profile
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </CollapsibleSection>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError("")}>
        <Alert severity="error" variant="filled" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}
