"use client";

import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { StatusChip } from "@/components/ui/status-chip";

type SettingsClientProps = {
  initialSettings: {
    emailEnabled: boolean;
    emailAddress: string;
    pushoverEnabled: boolean;
    pushoverUserKey: string;
    pushoverAppToken: string;
    minimumScoreForPush: number;
    digestMode: "every_run" | "daily_summary" | "strong_matches_only";
  };
  aiSettings: {
    configured: boolean;
    model: string;
  };
  profileSettings: {
    linkedinUrl: string;
    githubUrl: string;
    raceAnswer: string;
    genderAnswer: string;
    veteranStatusAnswer: string;
    disabilityAnswer: string;
    githubRepositoryCount: number;
    latestGithubSync: string | null;
  };
};

export function SettingsClient({ initialSettings, aiSettings, profileSettings }: SettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [profile, setProfile] = useState(profileSettings);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);

  async function save() {
    setSaving(true);
    setNotice("");
    setError("");
    const [profileResponse, response] = await Promise.all([
      fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          githubUrl: profile.githubUrl,
          linkedinUrl: profile.linkedinUrl,
          raceAnswer: profile.raceAnswer,
          genderAnswer: profile.genderAnswer,
          veteranStatusAnswer: profile.veteranStatusAnswer,
          disabilityAnswer: profile.disabilityAnswer,
        }),
      }),
      fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
      }),
    ]);
    const body = await response.json();
    const profileBody = await profileResponse.json();
    setSaving(false);

    if (!profileResponse.ok || !response.ok) {
      setError(profileBody.error ?? body.error ?? "Unable to save settings.");
      return;
    }

    setNotice("Settings saved.");
  }

  async function syncGithub() {
    setSyncingGithub(true);
    setNotice("");
    setError("");
    const profileResponse = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ githubUrl: profile.githubUrl, linkedinUrl: profile.linkedinUrl }),
    });
    const profileBody = await profileResponse.json();

    if (!profileResponse.ok) {
      setSyncingGithub(false);
      setError(profileBody.error ?? "Unable to save GitHub profile URL.");
      return;
    }

    const response = await fetch("/api/settings/github/sync", { method: "POST" });
    const body = await response.json();
    setSyncingGithub(false);

    if (!response.ok) {
      setError(body.error ?? "Unable to sync GitHub repositories.");
      return;
    }

    setProfile({
      ...profile,
      githubRepositoryCount: body.count,
      latestGithubSync: new Date().toLocaleString(),
    });
    setNotice(body.message);
  }

  async function sendTest() {
    setTesting(true);
    setNotice("");
    setError("");
    const saveResponse = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    const saveBody = await saveResponse.json();

    if (!saveResponse.ok) {
      setTesting(false);
      setError(saveBody.error ?? "Unable to save notification settings.");
      return;
    }

    const response = await fetch("/api/notifications/test", { method: "POST" });
    const body = await response.json();
    setTesting(false);

    if (!response.ok) {
      setError(body.error ?? "Unable to test notifications.");
      return;
    }

    setNotice(body.message);
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <AutoAwesomeOutlinedIcon color="primary" />
                <Typography variant="h3">AI provider</Typography>
              </Stack>
              <StatusChip status={aiSettings.configured ? "configured" : "provider_missing"} />
            </Stack>
            <Alert severity={aiSettings.configured ? "success" : "warning"}>
              {aiSettings.configured
                ? `OpenAI is configured. Resume parsing, scoring, tailored resumes, and cover letters use ${aiSettings.model}.`
                : "OpenAI is not configured yet. Add OPENAI_API_KEY to .env, keep OPENAI_MODEL set, then restart the dev server."}
            </Alert>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
              <TextField fullWidth label="Environment variable" value="OPENAI_API_KEY" disabled />
              <TextField fullWidth label="Model" value={aiSettings.model} disabled />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <LinkOutlinedIcon color="primary" />
                <Typography variant="h3">Repeated application answers</Typography>
              </Stack>
              <StatusChip status={profile.raceAnswer || profile.genderAnswer || profile.veteranStatusAnswer || profile.disabilityAnswer ? "configured" : "provider_missing"} />
            </Stack>
            <Alert severity="info">
              These are optional user-provided answers. The assistant uses them only to match visible application fields and logs what it filled.
            </Alert>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
              <TextField
                fullWidth
                label="Race / ethnicity answer"
                placeholder="Example: Prefer not to answer"
                value={profile.raceAnswer}
                onChange={(event) => setProfile({ ...profile, raceAnswer: event.target.value })}
              />
              <TextField
                fullWidth
                label="Gender answer"
                placeholder="Example: Prefer not to answer"
                value={profile.genderAnswer}
                onChange={(event) => setProfile({ ...profile, genderAnswer: event.target.value })}
              />
              <TextField
                fullWidth
                label="Veteran status answer"
                placeholder="Example: I am not a protected veteran"
                value={profile.veteranStatusAnswer}
                onChange={(event) => setProfile({ ...profile, veteranStatusAnswer: event.target.value })}
              />
              <TextField
                fullWidth
                label="Disability status answer"
                placeholder="Example: No, I do not have a disability"
                value={profile.disabilityAnswer}
                onChange={(event) => setProfile({ ...profile, disabilityAnswer: event.target.value })}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <LinkOutlinedIcon color="primary" />
                <Typography variant="h3">Application profile links</Typography>
              </Stack>
              <StatusChip status={profile.linkedinUrl ? "configured" : "provider_missing"} />
            </Stack>
            <Typography color="text.secondary">
              These URLs are used by the local application assistant when it fills employer forms.
            </Typography>
            <TextField
              fullWidth
              label="LinkedIn profile URL"
              placeholder="https://www.linkedin.com/in/your-profile"
              value={profile.linkedinUrl}
              onChange={(event) => setProfile({ ...profile, linkedinUrl: event.target.value })}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <GitHubIcon color="primary" />
                <Typography variant="h3">GitHub work context</Typography>
              </Stack>
              <StatusChip status={profile.githubRepositoryCount > 0 ? "configured" : "provider_missing"} />
            </Stack>
            <Typography color="text.secondary">
              Synced repositories become project context for role-specific resumes and cover letters when relevant.
            </Typography>
            <TextField
              fullWidth
              label="GitHub profile URL"
              value={profile.githubUrl}
              onChange={(event) => setProfile({ ...profile, githubUrl: event.target.value })}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
              <Button variant="outlined" disabled={saving || syncingGithub} onClick={syncGithub}>
                {syncingGithub ? "Syncing..." : "Sync GitHub context"}
              </Button>
              <Typography variant="body2" color="text.secondary">
                {profile.githubRepositoryCount} repositories synced{profile.latestGithubSync ? ` · latest sync ${profile.latestGithubSync}` : ""}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <NotificationsActiveOutlinedIcon color="primary" />
              <Typography variant="h3">Notifications</Typography>
            </Stack>
            {notice ? <Alert severity="success">{notice}</Alert> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailEnabled}
                      onChange={(event) => setSettings({ ...settings, emailEnabled: event.target.checked })}
                    />
                  }
                  label="Email digest enabled"
                />
              </Box>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushoverEnabled}
                      onChange={(event) => setSettings({ ...settings, pushoverEnabled: event.target.checked })}
                    />
                  }
                  label="Pushover enabled when configured"
                />
              </Box>
              <TextField
                fullWidth
                label="Email address"
                value={settings.emailAddress}
                onChange={(event) => setSettings({ ...settings, emailAddress: event.target.value })}
              />
              <TextField
                fullWidth
                label="Push score threshold"
                type="number"
                value={settings.minimumScoreForPush}
                onChange={(event) => setSettings({ ...settings, minimumScoreForPush: Number(event.target.value) })}
              />
              <TextField
                fullWidth
                label="Pushover user key"
                type="password"
                value={settings.pushoverUserKey}
                onChange={(event) => setSettings({ ...settings, pushoverUserKey: event.target.value })}
              />
              <TextField
                fullWidth
                label="Pushover app token"
                type="password"
                value={settings.pushoverAppToken}
                onChange={(event) => setSettings({ ...settings, pushoverAppToken: event.target.value })}
              />
              <TextField
                select
                fullWidth
                label="Digest mode"
                value={settings.digestMode}
                onChange={(event) => setSettings({ ...settings, digestMode: event.target.value as SettingsClientProps["initialSettings"]["digestMode"] })}
              >
                <MenuItem value="every_run">Every run</MenuItem>
                <MenuItem value="daily_summary">Daily summary</MenuItem>
                <MenuItem value="strong_matches_only">Strong matches only</MenuItem>
              </TextField>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={saving || testing} onClick={save}>
                {saving ? "Saving..." : "Save settings"}
              </Button>
              <Button variant="contained" disabled={saving || testing} onClick={sendTest}>
                {testing ? "Testing..." : "Send test notification"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
