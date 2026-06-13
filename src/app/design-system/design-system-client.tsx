"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/ui/page-header";
import { ResumeScrollActionBar } from "@/components/resumes/resume-scroll-action-bar";
import { ResumeSectionEmptyAlert } from "@/components/resumes/resume-section-empty-alert";

const SECTIONS = [
  { id: "foundations", label: "Foundations" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Forms" },
  { id: "feedback", label: "Feedback" },
  { id: "surfaces", label: "Surfaces" },
  { id: "layout", label: "Layout" },
  { id: "overlays", label: "Overlays" },
] as const;

export function DesignSystemClient() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formError, setFormError] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [fieldError, setFieldError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [barEditing, setBarEditing] = useState(false);

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const sectionNav = useMemo(
    () => (
      <List dense sx={{ position: { md: "sticky" }, top: 24 }}>
        {SECTIONS.map((section) => (
          <ListItemButton
            key={section.id}
            selected={activeSection === section.id}
            onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <ListItemText primary={section.label} />
          </ListItemButton>
        ))}
      </List>
    ),
    [activeSection],
  );

  function submitDemoForm(event: React.FormEvent) {
    event.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError(true);
      setFormSuccess("");
      return;
    }
    setFormError(false);
    setFormSuccess("Form submitted successfully.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Design system showcase"
        description="Interactive reference for tokens and components. Play with states before shipping UI changes."
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 3 }}>
        {sectionNav}
        <Stack spacing={4}>
          <Section id="foundations" title="Foundations">
            <Typography variant="h3">Typography</Typography>
            <Typography variant="body1">Body text for explanations and form helper copy.</Typography>
            <Typography variant="body2" color="text.secondary">Secondary body for metadata and captions.</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Color swatches</Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              {["primary.main", "secondary.main", "success.main", "warning.main", "error.main", "info.main"].map((color) => (
                <Box key={color} sx={{ width: 88, height: 48, borderRadius: 1, bgcolor: color, border: 1, borderColor: "divider" }} />
              ))}
            </Stack>
          </Section>

          <Section id="buttons" title="Buttons and actions">
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Button variant="contained">Contained</Button>
              <Button variant="outlined">Outlined</Button>
              <Button variant="text">Text</Button>
              <Button variant="contained" disabled>Disabled</Button>
              <Button variant="contained" disabled startIcon={<CircularProgress size={16} color="inherit" />}>Loading</Button>
            </Stack>
          </Section>

          <Section id="forms" title="Forms and inputs">
            <Stack component="form" spacing={2} onSubmit={submitDemoForm} sx={{ maxWidth: 480 }}>
              <TextField label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} error={formError && !formName.trim()} helperText={formError && !formName.trim() ? "Required" : ""} />
              <TextField label="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} error={formError && !formEmail.trim()} helperText={formError && !formEmail.trim() ? "Required" : ""} />
              <TextField label="Disabled" disabled defaultValue="Read only" />
              <TextField
                label="Error state toggle"
                value="Invalid value"
                error={fieldError}
                helperText={fieldError ? "Example validation message" : "Use toggle below"}
              />
              <FormControlLabel control={<Switch checked={fieldError} onChange={(e) => setFieldError(e.target.checked)} />} label="Show error state" />
              <TextField select label="Select" defaultValue="one">
                <MenuItem value="one">Option one</MenuItem>
                <MenuItem value="two">Option two</MenuItem>
              </TextField>
              <FormControlLabel control={<Checkbox defaultChecked />} label="Checkbox" />
              <Button type="submit" variant="contained">Try submit</Button>
              {formSuccess ? <Alert severity="success" variant="filled" sx={{ bgcolor: "success.dark" }}>{formSuccess}</Alert> : null}
            </Stack>
          </Section>

          <Section id="feedback" title="Feedback">
            <Stack spacing={1}>
              {(["success", "error", "warning", "info"] as const).flatMap((severity) =>
                (["standard", "filled"] as const).map((variant) => (
                  <Alert key={`${severity}-${variant}`} severity={severity} variant={variant}>
                    {severity} alert ({variant})
                  </Alert>
                )),
              )}
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
              <Chip label="Default" />
              <Chip label="Outlined" variant="outlined" />
              <Chip label="Success" color="success" />
              <Chip label="Warning" color="warning" />
            </Stack>
            <Box sx={{ mt: 2, maxWidth: 480 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Resume section empty state (inline inside editors):
              </Typography>
              <ResumeSectionEmptyAlert>No work history yet.</ResumeSectionEmptyAlert>
            </Box>
          </Section>

          <Section id="surfaces" title="Surfaces">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h3">Card</Typography>
                <Typography variant="body2" color="text.secondary">Use cards to group related resume or settings content.</Typography>
              </CardContent>
            </Card>
          </Section>

          <Section id="layout" title="Layout">
            <PageHeader eyebrow="Example" title="Page header" description="Headers pair eyebrow, title, description, and optional actions." />
            <Box sx={{ position: "relative", height: 120, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <ResumeScrollActionBar
                visible
                editing={barEditing}
                onEdit={() => setBarEditing(true)}
                onSave={() => setBarEditing(false)}
                onCancel={() => setBarEditing(false)}
                label={barEditing ? "Editing resume" : "12 jobs · 3 projects"}
              />
            </Box>
            <Button size="small" onClick={() => setBarEditing((value) => !value)}>Toggle action bar edit mode</Button>
          </Section>

          <Section id="overlays" title="Overlays">
            <Button variant="outlined" onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogContent>
                <Alert severity="error" variant="filled" sx={{ mb: 2 }}>Example inline error inside a dialog.</Alert>
                <Typography variant="body2">Dialogs confirm destructive actions or host focused workflows like theme picking.</Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={() => setDialogOpen(false)}>Confirm</Button>
              </DialogActions>
            </Dialog>
          </Section>
        </Stack>
      </Box>
    </>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Box id={id} sx={{ scrollMarginTop: 24 }}>
      <Stack spacing={2}>
        <Typography variant="h2">{title}</Typography>
        {children}
      </Stack>
    </Box>
  );
}
