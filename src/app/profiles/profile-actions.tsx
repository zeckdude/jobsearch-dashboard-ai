"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PowerSettingsNewOutlinedIcon from "@mui/icons-material/PowerSettingsNewOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ProfileActionData = {
  id: string;
  name: string;
  enabled: boolean;
};

export function ProfileActions({ profile }: { profile: ProfileActionData }) {
  const router = useRouter();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function patch(payload: Record<string, unknown>, success: string) {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/profiles/${profile.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to update profile.");
      return false;
    }
    setNotice(success);
    router.refresh();
    return true;
  }

  async function remove() {
    setMenuOpen(false);
    if (!window.confirm(`Delete "${profile.name}"? This removes profile-specific matches for this campaign.`)) return;
    setSaving(true);
    setError("");
    const response = await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(body.error ?? "Unable to delete profile.");
      return;
    }
    setNotice("Profile deleted.");
    router.push("/profiles");
    router.refresh();
  }

  return (
    <>
      <IconButton
        ref={anchorRef}
        size="small"
        onClick={() => setMenuOpen(true)}
        disabled={saving}
        aria-label="Profile actions"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorRef.current}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={() => { setMenuOpen(false); router.push(`/profiles/${profile.id}/edit`); }}>
          <ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuOpen(false);
            void patch({ enabled: !profile.enabled }, profile.enabled ? "Profile disabled." : "Profile enabled.");
          }}
        >
          <ListItemIcon><PowerSettingsNewOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{profile.enabled ? "Disable" : "Enable"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={remove} sx={{ color: "error.main" }}>
          <ListItemIcon><DeleteOutlineOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice("")}>
        <Alert severity="success" variant="filled" onClose={() => setNotice("")}>{notice}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError("")}>
        <Alert severity="error" variant="filled" onClose={() => setError("")}>{error}</Alert>
      </Snackbar>
    </>
  );
}

// ─── Collapsible section wrapper ─────────────────────────────────────────────

export function CollapsibleSection({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
          borderRadius: 1,
          transition: "opacity 0.15s",
          "&:hover": { opacity: 0.75 },
        }}
        onClick={() => setOpen((prev) => !prev)}
        role="button"
        aria-expanded={open}
      >
        <Box sx={{ flexGrow: 1 }}>{summary}</Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: "action.hover",
            flexShrink: 0,
            ml: 1,
          }}
        >
          <KeyboardArrowDownIcon
            fontSize="small"
            sx={{
              color: "text.secondary",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </Box>
      </Stack>
      {open && children}
    </Stack>
  );
}

// ─── Generic tooltip wrapper ─────────────────────────────────────────────────

export function WithTooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <Tooltip
      arrow
      placement="bottom-end"
      title={
        <Typography variant="body2" sx={{ p: 0.5, maxWidth: 260, display: "block" }}>
          {tip}
        </Typography>
      }
    >
      <span>{children}</span>
    </Tooltip>
  );
}

// ─── Column header tooltips ───────────────────────────────────────────────────

export function ColumnTooltip({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <Tooltip
      arrow
      title={
        <Box sx={{ maxWidth: 260, p: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
          <Typography variant="body2">{body}</Typography>
        </Box>
      }
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", cursor: "default", display: "inline-flex" }}>
        <span>{label}</span>
        <InfoOutlinedIcon sx={{ fontSize: 14, opacity: 0.5 }} />
      </Stack>
    </Tooltip>
  );
}

// ─── Value tooltips for scored cells ─────────────────────────────────────────

export function HealthScoreTooltip({ children, score }: { children: React.ReactNode; score: number }) {
  const { status, advice } = score >= 85
    ? {
        status: "Excellent — this profile is well-targeted and generating quality matches.",
        advice: null,
      }
    : score >= 72
    ? {
        status: "Good. Profile is healthy but has room to improve.",
        advice: [
          "Add more specific preferred keywords to sharpen targeting.",
          "Review rejected matches — patterns there can guide keyword exclusions.",
          "Run the Profile Optimizer (Agents page) for a full analysis.",
        ],
      }
    : score >= 60
    ? {
        status: "Fair. Profile may be too broad or missing strong signal.",
        advice: [
          "Narrow your target titles to 2–3 specific roles.",
          "Add required keywords for must-have skills.",
          "Exclude companies or keywords that keep producing irrelevant matches.",
          "Run the Profile Optimizer for personalized recommendations.",
        ],
      }
    : {
        status: "Low — this profile needs attention.",
        advice: [
          "Run the Profile Optimizer (Agents page) — it will identify the specific issues.",
          "Make sure your target titles are specific, not generic (e.g. \"Senior Frontend Engineer\" vs. \"Engineer\").",
          "Add required keywords to filter out mismatched roles.",
          "If very few matches appear, lower the Threshold slightly to let more jobs in.",
          "If too many poor matches appear, add excluded keywords or companies.",
        ],
      };

  return (
    <Tooltip arrow placement="left" title={
      <Box sx={{ maxWidth: 260, p: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>Health: {score}/100</Typography>
        <Typography variant="body2" sx={{ mb: advice ? 1 : 0 }}>{status}</Typography>
        {advice && (
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {advice.map((tip) => (
              <Typography key={tip} component="li" variant="body2" sx={{ mb: 0.25 }}>{tip}</Typography>
            ))}
          </Box>
        )}
      </Box>
    }>
      <span>{children}</span>
    </Tooltip>
  );
}

export function ThresholdTooltip({ children, score }: { children: React.ReactNode; score: number }) {
  const { status, advice } = score >= 85
    ? {
        status: "High — only very strong matches surface.",
        advice: [
          "If your queue feels empty, lower this to 70–75 in the Edit dialog to let more jobs through.",
        ],
      }
    : score >= 75
    ? {
        status: "Well-balanced. The default of 75 is a solid starting point.",
        advice: [
          "Raise to 80–85 if your queue is too noisy with poor matches.",
          "Lower to 65–70 if you want more volume and are comfortable reviewing more jobs.",
        ],
      }
    : score >= 65
    ? {
        status: "Moderate — you'll see a wider range of matches.",
        advice: [
          "Raise to 75 if irrelevant jobs keep appearing.",
          "Add excluded keywords or companies as an alternative to raising the threshold.",
        ],
      }
    : {
        status: "Low — expect a large, potentially noisy queue.",
        advice: [
          "Raise this to at least 65–75 in the Edit dialog to filter out weak matches.",
          "Alternatively, add excluded keywords to target the noise rather than raising the bar for everyone.",
        ],
      };

  return (
    <Tooltip arrow placement="left" title={
      <Box sx={{ maxWidth: 260, p: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>Match threshold: {score}/100</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>{status}</Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {advice.map((tip) => (
            <Typography key={tip} component="li" variant="body2" sx={{ mb: 0.25 }}>{tip}</Typography>
          ))}
        </Box>
      </Box>
    }>
      <span>{children}</span>
    </Tooltip>
  );
}

export function CallbackTooltip({ children, rate, applied }: { children: React.ReactNode; rate: number; applied: number }) {
  const { status, advice } = applied === 0
    ? {
        status: "No applications submitted yet.",
        advice: ["Review matches in your queue and submit applications to start building this number."],
      }
    : rate >= 15
    ? {
        status: "Outstanding — far above the 3–5% industry average.",
        advice: null,
      }
    : rate >= 8
    ? {
        status: "Strong — well above the 3–5% industry average.",
        advice: ["Keep submitting; your targeting is working well."],
      }
    : rate >= 3
    ? {
        status: "On par with the 3–5% industry average.",
        advice: [
          "Personalize cover letters — generic ones rarely convert.",
          "Prioritize companies where you have a warm connection or referral.",
          "Make sure your resume headline matches the specific role title.",
        ],
      }
    : {
        status: "Below average — most cold applications don't convert.",
        advice: [
          "Tighten your profile targeting so you only apply to strong matches.",
          "Strengthen your resume for the specific roles you're targeting.",
          "Focus on companies with open engineering blogs or recent funding — they're more likely to be actively hiring.",
          "Ask for referrals wherever possible; they multiply callback rates 5–10×.",
        ],
      };

  return (
    <Tooltip arrow placement="left" title={
      <Box sx={{ maxWidth: 260, p: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>Callback rate: {rate}%</Typography>
        <Typography variant="body2" sx={{ mb: advice ? 1 : 0 }}>{status}</Typography>
        {advice && (
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {advice.map((tip) => (
              <Typography key={tip} component="li" variant="body2" sx={{ mb: 0.25 }}>{tip}</Typography>
            ))}
          </Box>
        )}
      </Box>
    }>
      <span>{children}</span>
    </Tooltip>
  );
}
