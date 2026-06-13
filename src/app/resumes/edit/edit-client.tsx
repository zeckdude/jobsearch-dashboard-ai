"use client";

import AddIcon from "@mui/icons-material/Add";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResumePdfViewer } from "@/components/resumes/resume-pdf-viewer";
import { ResumeScrollActionBar } from "@/components/resumes/resume-scroll-action-bar";
import {
  AdditionalSectionsEditor,
  draftToProjects,
  LineListSectionEditor,
  projectsToDraft,
  ProjectsSectionEditor,
  type DraftAdditionalSection,
  type DraftProject,
} from "@/components/resumes/resume-supplemental-editors";
import { useScrollPastAnchor } from "@/components/resumes/use-scroll-past-anchor";
import { ResumeThemePicker } from "@/components/resumes/resume-theme-picker";
import { WorkHistoryTreeEditor } from "@/components/resumes/work-history-tree-editor";
import { useLiveResumePreview } from "@/components/resumes/use-live-resume-preview";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/action-button";
import { jsonArray } from "@/lib/json";
import { canPreviewResumeProfile } from "@/lib/resumes/preview-schema";
import { editDataToTree, treeToDraftBullets, treeToWorkExperienceDrafts } from "@/lib/resumes/work-history-adapters";
import { isTempNodeId } from "@/lib/resumes/work-history-tree";
import type { WorkHistoryTree } from "@/lib/resumes/work-history-tree";

type Bullet = {
  id: string;
  company: string;
  role: string;
  category: string;
  text: string;
  keywords: string[];
  sourceText: string | null;
  truthLevel: string;
};

type ResumeEditClientProps = {
  profile: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    portfolioUrl: string | null;
    professionalSummary: string | null;
    masterSummary: string;
    coreSkills: unknown;
    technicalSkills: unknown;
    resumePdfPreset: PdfPreset;
  };
  bullets: Bullet[];
  workExperiences: {
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean;
    summary: string | null;
    skills: unknown;
    achievements: unknown;
    createdAt: string;
  }[];
  projects: { name: string; description: string | null; technologies: unknown }[];
  education: string[];
  certifications: string[];
  additionalSections: DraftAdditionalSection[];
};

const categories = [
  "frontend",
  "fullstack",
  "testing",
  "security",
  "ai",
  "leadership",
  "visualization",
  "saas",
  "design_systems",
  "devtools",
];

export function ResumeEditClient({
  profile,
  bullets: initialBullets,
  workExperiences,
  projects: initialProjects,
  education: initialEducation,
  certifications: initialCertifications,
  additionalSections: initialAdditionalSections,
}: ResumeEditClientProps) {
  const { refresh } = useRouter();
  const [open, setOpen] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [digestLoading, setDigestLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [preset, setPreset] = useState<PdfPreset>(profile.resumePdfPreset);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [summary, setSummary] = useState(profile.professionalSummary ?? profile.masterSummary ?? "");
  const [coreSkillsText, setCoreSkillsText] = useState(jsonArray(profile.coreSkills).join(", "));
  const [tree, setTree] = useState<WorkHistoryTree>(() => editDataToTree(workExperiences, initialBullets));
  const [educationLines, setEducationLines] = useState<string[]>(initialEducation);
  const [certificationLines, setCertificationLines] = useState<string[]>(initialCertifications);
  const [additionalSections, setAdditionalSections] = useState<DraftAdditionalSection[]>(initialAdditionalSections);
  const [draftProjects, setDraftProjects] = useState<DraftProject[]>(() =>
    projectsToDraft(
      initialProjects.map((project) => ({
        name: project.name,
        description: project.description ?? undefined,
        url: undefined,
        repoUrl: undefined,
        technologies: Array.isArray(project.technologies)
          ? project.technologies.filter((item): item is string => typeof item === "string")
          : [],
        highlights: [],
      })),
    ),
  );
  const actionAnchorRef = useRef<HTMLDivElement>(null);
  const showFloatingBar = useScrollPastAnchor(actionAnchorRef);

  useEffect(() => {
    if (!editing) {
      setTree(editDataToTree(workExperiences, initialBullets));
    }
  }, [initialBullets, workExperiences, editing]);

  const draftBullets = useMemo(() => treeToDraftBullets(tree, initialBullets), [tree, initialBullets]);
  const verifiedCount = draftBullets.filter((bullet) => bullet.truthLevel === "verified").length;
  const proposedCount = draftBullets.filter((bullet) => bullet.truthLevel === "needs_review").length;
  const bulletMeta = useMemo(() => new Map(draftBullets.map((bullet) => [bullet.id, bullet])), [draftBullets]);

  const previewProfile = useMemo(
    () => ({
      fullName,
      email: profile.email,
      phone: phone || null,
      location: location || null,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      professionalSummary: summary,
      masterSummary: profile.masterSummary,
      coreSkills: coreSkillsText.split(",").flatMap((skill) => {
        const next = skill.trim();
        return next ? [next] : [];
      }),
      technicalSkills: profile.technicalSkills,
    }),
    [profile, fullName, phone, location, summary, coreSkillsText],
  );

  const previewProjects = useMemo(
    () =>
      draftToProjects(draftProjects).map((project) => ({
        name: project.name,
        description: project.description ?? null,
        technologies: project.technologies,
      })),
    [draftProjects],
  );

  const previewEnabled = useMemo(
    () => canPreviewResumeProfile({ fullName, email: profile.email }),
    [fullName, profile.email],
  );

  const { blobUrl, loading: previewLoading, atsScore, atsReport, error: previewError } = useLiveResumePreview({
    preset,
    profile: previewProfile,
    bullets: draftBullets,
    workExperiences,
    projects: previewProjects,
    education: educationLines,
    certifications: certificationLines,
    additionalSections,
    enabled: previewEnabled,
  });

  async function saveTheme(nextPreset: PdfPreset) {
    setPreset(nextPreset);
    const response = await fetch("/api/resumes/theme", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preset: nextPreset }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Unable to save theme.");
    }
  }

  async function saveEdits() {
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const coreSkills = coreSkillsText.split(",").flatMap((skill) => {
        const next = skill.trim();
        return next ? [next] : [];
      });

      const profileResponse = await fetch("/api/resumes/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: phone || null,
          location: location || null,
          professionalSummary: summary,
          coreSkills,
        }),
      });
      const profileBody = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok) throw new Error(profileBody.error ?? "Unable to save profile fields.");

      const currentBullets = treeToDraftBullets(tree, initialBullets);
      const currentIds = new Set(currentBullets.map((bullet) => bullet.id));

      for (const original of initialBullets) {
        if (currentIds.has(original.id)) continue;
        const response = await fetch(`/api/resumes/bullets/${original.id}`, { method: "DELETE" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Unable to remove bullet.");
      }

      for (const bullet of currentBullets) {
        const text = bullet.text.trim();
        if (isTempNodeId(bullet.id)) {
          if (!text) continue;
          const response = await fetch("/api/resumes/bullets", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              userProfileId: profile.id,
              company: bullet.company,
              role: bullet.role,
              category: bullet.category,
              text: bullet.text,
              keywords: bullet.keywords.join(", "),
              sourceText: bullet.sourceText ?? bullet.text,
              truthLevel: bullet.truthLevel,
            }),
          });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error ?? "Unable to add bullet.");
          continue;
        }

        const original = initialBullets.find((entry) => entry.id === bullet.id);
        if (!original) continue;
        if (original.text === bullet.text && original.company === bullet.company && original.role === bullet.role) continue;

        const response = await fetch(`/api/resumes/bullets/${bullet.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            company: bullet.company,
            role: bullet.role,
            text: bullet.text,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? "Unable to save bullet edits.");
      }

      const workExperienceResponse = await fetch("/api/resumes/work-experiences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workExperiences: treeToWorkExperienceDrafts(tree) }),
      });
      const workBody = await workExperienceResponse.json().catch(() => ({}));
      if (!workExperienceResponse.ok) throw new Error(workBody.error ?? "Unable to save work history.");

      const projectsResponse = await fetch("/api/resumes/projects", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projects: draftToProjects(draftProjects) }),
      });
      const projectsBody = await projectsResponse.json().catch(() => ({}));
      if (!projectsResponse.ok) throw new Error(projectsBody.error ?? "Unable to save projects.");

      const supplementalResponse = await fetch("/api/resumes/supplemental", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          education: educationLines.filter((line) => line.trim()),
          certifications: certificationLines.filter((line) => line.trim()),
          additionalSections: additionalSections.filter((section) => section.title.trim() || section.content.trim()),
        }),
      });
      const supplementalBody = await supplementalResponse.json().catch(() => ({}));
      if (!supplementalResponse.ok) throw new Error(supplementalBody.error ?? "Unable to save supplemental sections.");

      setEditing(false);
      setNotice("Resume content saved.");
      refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save edits.");
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setNotice("");
    setError("");

    const formData = new FormData(form);
    const response = await fetch("/api/resumes/bullets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userProfileId: profile.id,
        company: formData.get("company"),
        role: formData.get("role"),
        category: formData.get("category"),
        text: formData.get("text"),
        keywords: formData.get("keywords"),
        sourceText: formData.get("sourceText"),
        truthLevel: formData.get("truthLevel"),
      }),
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(body.error ?? "Unable to add bullet.");
      return;
    }

    setNotice("Bullet saved to your resume.");
    setOpen(false);
    form.reset();
    refresh();
  }

  async function digestRoleDescription(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setDigestLoading(true);
    setNotice("");
    setError("");

    const formData = new FormData(form);
    const response = await fetch("/api/resumes/bullets/digest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userProfileId: profile.id,
        company: formData.get("digestCompany") || undefined,
        role: formData.get("digestRole") || undefined,
        category: formData.get("digestCategory"),
        focusAreas: formData.get("focusAreas"),
        description: formData.get("description"),
      }),
    });
    const body = await response.json();
    setDigestLoading(false);

    if (!response.ok) {
      setError(body.error ?? "Unable to digest role description.");
      return;
    }

    const warningText = Array.isArray(body.warnings) && body.warnings.length ? ` ${body.warnings.join(" ")}` : "";
    setNotice(`${body.message ?? "Proposed bullets created."}${warningText}`);
    setDigestOpen(false);
    form.reset();
    refresh();
  }

  async function approveBullet(id: string) {
    setActionId(id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/resumes/bullets/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ truthLevel: "verified" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Unable to approve bullet.");
      setNotice("Bullet approved for resume generation.");
      refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to approve bullet.");
    } finally {
      setActionId(null);
    }
  }

  async function rejectBullet(id: string) {
    setActionId(id);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/resumes/bullets/${id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Unable to reject bullet.");
      setNotice("Proposed bullet removed.");
      refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to reject bullet.");
    } finally {
      setActionId(null);
    }
  }

  function cancelEditing() {
    setFullName(profile.fullName);
    setPhone(profile.phone ?? "");
    setLocation(profile.location ?? "");
    setSummary(profile.professionalSummary ?? profile.masterSummary ?? "");
    setCoreSkillsText(jsonArray(profile.coreSkills).join(", "));
    setTree(editDataToTree(workExperiences, initialBullets));
    setEducationLines(initialEducation);
    setCertificationLines(initialCertifications);
    setAdditionalSections(initialAdditionalSections);
    setDraftProjects(
      projectsToDraft(
        initialProjects.map((project) => ({
          name: project.name,
          description: project.description ?? undefined,
          url: undefined,
          repoUrl: undefined,
          technologies: Array.isArray(project.technologies)
            ? project.technologies.filter((item): item is string => typeof item === "string")
            : [],
          highlights: [],
        })),
      ),
    );
    setEditing(false);
    setError("");
  }

  const floatingBarLabel = editing
    ? "Editing resume"
    : `${tree.length} jobs · ${draftBullets.length} bullets`;

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Resume content"
        title="Edit Resume"
        description="Update your approved profile content. Layout matches parsed-data review so work history stays easy to scan."
        actions={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <ActionButton href="/resume" variant="text">Back to resume</ActionButton>
            <Button variant="outlined" startIcon={<AutoFixHighOutlinedIcon />} onClick={() => setDigestOpen((value) => !value)}>
              {digestOpen ? "Close digest" : "Digest role description"}
            </Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen((value) => !value)}>
              {open ? "Close form" : "Add bullet"}
            </Button>
          </Stack>
        )}
      />

      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {previewError && previewEnabled ? <Alert severity="warning">{previewError}</Alert> : null}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 420px" }, gap: 3, alignItems: "start" }}>
        <Stack spacing={3}>
          <Collapse in={digestOpen}>
            <Card>
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={digestRoleDescription}>
                  <Typography variant="h3">Digest role description</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Paste a LinkedIn-style role block. The app will propose resume bullets for your review.
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
                    <TextField name="digestCompany" label="Company override" helperText="Optional when pasted text includes company" />
                    <TextField name="digestRole" label="Role override" helperText="Optional when pasted text includes title" />
                    <TextField select name="digestCategory" label="Category override" defaultValue="">
                      <MenuItem value="">Infer category</MenuItem>
                      {categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                    </TextField>
                  </Box>
                  <TextField name="focusAreas" label="Focus areas" helperText="Optional comma-separated themes, tools, or outcomes" />
                  <TextField required multiline minRows={7} name="description" label="Pasted role block" />
                  <Button type="submit" variant="contained" disabled={digestLoading} sx={{ alignSelf: "flex-start" }}>
                    {digestLoading ? "Digesting..." : "Create proposed bullets"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Collapse>

          <Collapse in={open}>
            <Card>
              <CardContent>
                <Stack component="form" spacing={2} onSubmit={submit}>
                  <Typography variant="h3">Add experience bullet</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                    <TextField required name="company" label="Company" />
                    <TextField required name="role" label="Role" />
                    <TextField select required name="category" label="Category" defaultValue="frontend">
                      {categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}
                    </TextField>
                    <TextField select required name="truthLevel" label="Truth level" defaultValue="verified">
                      <MenuItem value="verified">verified</MenuItem>
                      <MenuItem value="estimated">estimated</MenuItem>
                      <MenuItem value="needs_review">needs_review</MenuItem>
                    </TextField>
                  </Box>
                  <TextField required multiline minRows={3} name="text" label="Bullet text" />
                  <TextField name="keywords" label="Keywords" helperText="Comma-separated" />
                  <TextField multiline minRows={2} name="sourceText" label="Source text / evidence" />
                  <Button type="submit" variant="contained" disabled={loading} sx={{ alignSelf: "flex-start" }}>
                    {loading ? "Saving..." : "Save bullet"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Collapse>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack ref={actionAnchorRef} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                    <Chip color="success" label={`${verifiedCount} verified bullets`} />
                    {proposedCount > 0 ? <Chip color="warning" variant="outlined" label={`${proposedCount} proposed`} /> : null}
                    <Chip variant="outlined" label={profile.email} />
                  </Stack>
                  {editing ? (
                    <Button variant="contained" startIcon={<EditOutlinedIcon />} disabled={saving} onClick={() => void saveEdits()} sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>
                      {saving ? "Saving..." : "Save edits"}
                    </Button>
                  ) : (
                    <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)} sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>
                      Edit
                    </Button>
                  )}
                </Stack>
                <Divider />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                  <TextField
                    label="Full name"
                    value={fullName}
                    disabled={!editing}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                  <TextField label="Email" value={profile.email} disabled />
                  <TextField
                    label="Phone"
                    value={phone}
                    disabled={!editing}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                  <TextField
                    label="Location"
                    value={location}
                    disabled={!editing}
                    onChange={(event) => setLocation(event.target.value)}
                  />
                </Box>
                <TextField
                  label="Professional summary"
                  value={summary}
                  multiline
                  minRows={3}
                  disabled={!editing}
                  onChange={(event) => setSummary(event.target.value)}
                />
                <TextField
                  label="Core skills"
                  value={coreSkillsText}
                  disabled={!editing}
                  helperText="Comma-separated"
                  onChange={(event) => setCoreSkillsText(event.target.value)}
                />
                <WorkHistoryTreeEditor
                  tree={tree}
                  editing={editing}
                  onChange={setTree}
                  summary={`${tree.length} jobs · ${draftBullets.length} bullets. Click Edit, then hover a row for drag/actions, or use keyboard shortcuts — open the guide above.`}
                  renderBulletActions={(bulletId) => {
                    const bullet = bulletMeta.get(bulletId);
                    if (bullet?.truthLevel !== "needs_review") return null;
                    return (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip size="small" color="warning" label="Proposed" />
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={actionId === bulletId}
                          onClick={() => void approveBullet(bulletId)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          disabled={actionId === bulletId}
                          onClick={() => void rejectBullet(bulletId)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    );
                  }}
                />
                <Divider />
                <LineListSectionEditor
                  title="Education"
                  summary="Schools, degrees, and training credentials."
                  lines={educationLines}
                  editing={editing}
                  onChange={setEducationLines}
                  placeholder="Art Institute — B.S. Web Design"
                />
                <Divider />
                <AdditionalSectionsEditor
                  sections={additionalSections}
                  editing={editing}
                  onChange={setAdditionalSections}
                />
                <Divider />
                <ProjectsSectionEditor
                  projects={draftProjects}
                  editing={editing}
                  onChange={setDraftProjects}
                />
                <Divider />
                <LineListSectionEditor
                  title="Certifications"
                  summary="Professional certifications and licenses."
                  lines={certificationLines}
                  editing={editing}
                  onChange={setCertificationLines}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Stack spacing={3} sx={{ position: { xl: "sticky" }, top: 24 }}>
          <Card>
            <CardContent>
              <ResumeThemePicker value={preset} onChange={(next) => void saveTheme(next)} />
            </CardContent>
          </Card>
          <ResumePdfViewer
            blobUrl={blobUrl}
            loading={previewLoading}
            title="Live preview"
            subtitle="Updates as you edit content or change themes."
            atsScore={atsScore}
            atsReport={atsReport}
            caption="Source preview — job-tailored resumes regenerate from this content when you prepare applications."
          />
        </Stack>
      </Box>
      <ResumeScrollActionBar
        visible={showFloatingBar}
        editing={editing}
        onEdit={() => setEditing(true)}
        onSave={() => void saveEdits()}
        onCancel={cancelEditing}
        saving={saving}
        label={floatingBarLabel}
      />
    </Stack>
  );
}
