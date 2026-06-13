"use client";

import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { markAdminNavVisible } from "@/components/use-admin-nav-visible";

type AdminAccessDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AdminAccessDialog({ open, onClose }: AdminAccessDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Invalid password.");
      markAdminNavVisible();
      setPassword("");
      onClose();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Invalid password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} fullWidth maxWidth="xs">
      <DialogTitle>Admin access</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={loading || !password}>
          {loading ? "Checking..." : "Unlock"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminAccessButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="text" startIcon={<AdminPanelSettingsOutlinedIcon />} onClick={() => setOpen(true)}>
        Admin access
      </Button>
      <AdminAccessDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
