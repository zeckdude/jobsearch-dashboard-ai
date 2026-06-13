"use client";

import KeyboardIcon from "@mui/icons-material/Keyboard";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

function Key({ children }: { children: ReactNode }) {
  return (
    <Box
      component="kbd"
      sx={{
        display: "inline-block",
        px: 0.75,
        py: 0.25,
        fontFamily: "monospace",
        fontSize: "0.8rem",
        fontWeight: 600,
        lineHeight: 1.4,
        border: 1,
        borderColor: "divider",
        borderRadius: 0.75,
        bgcolor: "action.hover",
        color: "text.primary",
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </Box>
  );
}

function ShortcutRow({ keys, description }: { keys: ReactNode; description: string }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 0.5, sm: 2 }}
      sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", py: 0.75 }}
    >
      <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
        {keys}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {description}
      </Typography>
    </Stack>
  );
}

function ShortcutSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 800, letterSpacing: 0.6 }}>
        {title}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

type WorkHistoryShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
  editing: boolean;
};

export function WorkHistoryShortcutsDialog({ open, onClose, editing }: WorkHistoryShortcutsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <KeyboardIcon color="primary" fontSize="small" />
          <span>Work history shortcuts</span>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2.5}>
          {!editing ? (
            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
              Turn on Edit first — shortcuts only work while editing.
            </Typography>
          ) : null}

          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover", border: 1, borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Before using shortcuts</Typography>
            <Typography variant="body2" color="text.secondary">
              Focus a job or bullet row: click its drag handle, or press Tab until the row is highlighted.
              Shortcuts do not fire while your cursor is inside a text field.
            </Typography>
          </Box>

          <ShortcutSection title="Reorder">
            <ShortcutRow
              keys={<><Key>Alt</Key><Typography variant="caption" color="text.secondary">+</Typography><Key>↑</Key></>}
              description="Move the focused job or bullet up among its siblings"
            />
            <ShortcutRow
              keys={<><Key>Alt</Key><Typography variant="caption" color="text.secondary">+</Typography><Key>↓</Key></>}
              description="Move the focused job or bullet down among its siblings"
            />
          </ShortcutSection>

          <Divider />

          <ShortcutSection title="Nest bullets">
            <ShortcutRow
              keys={<><Key>Alt</Key><Typography variant="caption" color="text.secondary">+</Typography><Key>→</Key></>}
              description="Nest this bullet as a sub-point under the bullet above"
            />
            <ShortcutRow
              keys={<><Key>Alt</Key><Typography variant="caption" color="text.secondary">+</Typography><Key>←</Key></>}
              description="Move a sub-bullet out one level to become a top-level bullet"
            />
          </ShortcutSection>

          <Divider />

          <ShortcutSection title="Jobs and bullets">
            <ShortcutRow
              keys={
                <>
                  <Key>Alt</Key>
                  <Typography variant="caption" color="text.secondary">+</Typography>
                  <Key>Shift</Key>
                  <Typography variant="caption" color="text.secondary">+</Typography>
                  <Key>↑</Key>
                </>
              }
              description="Promote a sub-bullet into its own job entry"
            />
            <ShortcutRow
              keys={
                <>
                  <Key>Alt</Key>
                  <Typography variant="caption" color="text.secondary">+</Typography>
                  <Key>Shift</Key>
                  <Typography variant="caption" color="text.secondary">+</Typography>
                  <Key>↓</Key>
                </>
              }
              description="Merge the focused job into a bullet under the job above"
            />
          </ShortcutSection>

          <Divider />

          <ShortcutSection title="Also available">
            <Typography variant="body2" color="text.secondary" component="ul" sx={{ m: 0, pl: 2.25 }}>
              <li>Hover a row to reveal drag and ⋮ controls (always visible on touch devices).</li>
              <li>Job controls sit together in the left rail of each job card.</li>
            </Typography>
          </ShortcutSection>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function WorkHistoryShortcutsButton({ onClick, editing }: { onClick: () => void; editing: boolean }) {
  return (
    <Button
      size="small"
      variant="text"
      startIcon={<KeyboardIcon fontSize="small" />}
      onClick={onClick}
      sx={{ flexShrink: 0, fontWeight: 600 }}
    >
      {editing ? "Keyboard shortcuts" : "View keyboard shortcuts"}
    </Button>
  );
}
