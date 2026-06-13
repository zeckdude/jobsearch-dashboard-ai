"use client";

import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFloatingChromeOffset } from "@/components/floating-chrome-offset-context";
import { ResumeImportModal, type ResumeImportPreview } from "@/components/resumes/resume-import-modal";
import { ResumeEditorSkeleton } from "@/components/resumes/resume-editor-skeleton";
import { ResumeMergeWorkspace } from "@/components/resumes/resume-merge-workspace";
import { ResumePdfViewerShell } from "@/components/resumes/resume-pdf-viewer-shell";
import { ResumeScrollActionBar } from "@/components/resumes/resume-scroll-action-bar";
import { ResumeThemeModal } from "@/components/resumes/resume-theme-modal";
import type { ImportPatches } from "@/lib/resumes/import-commit";
import type { ProfileContentSnapshot } from "@/lib/resumes/profile-content";
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
import { WorkHistoryTreeEditor } from "@/components/resumes/work-history-tree-editor";
import { useLiveResumePreview } from "@/components/resumes/use-live-resume-preview";
import { PageHeader } from "@/components/ui/page-header";
import { jsonArray } from "@/lib/json";
import { RESUME_THEME_OPTIONS, type PdfPreset } from "@/lib/pdf/simple-resume-pdf";
import { editDataToTree, parsedWorkToTree, treeToDraftBullets, treeToWorkExperienceDrafts } from "@/lib/resumes/work-history-adapters";
import { isTempNodeId } from "@/lib/resumes/work-history-tree";
import type { WorkHistoryTree } from "@/lib/resumes/work-history-tree";
import type { ParsedResume } from "@/lib/resumes/schemas";
import { canPreviewResumeProfile } from "@/lib/resumes/preview-schema";
import { FAB_BREATHING_ROOM } from "@/lib/ui/fab-stack";
import { RESUME_ACTION_BAR_HEIGHT } from "@/components/resumes/resume-scroll-action-bar";

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

type ResumePageClientProps = {
  hasContent: boolean;
  showDuplicateBanner: boolean;
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

export function ResumePageClient({
  hasContent,
  showDuplicateBanner,
  profile,
  bullets: initialBullets,
  workExperiences,
  projects: initialProjects,
  education: initialEducation,
  certifications: initialCertifications,
  additionalSections: initialAdditionalSections,
}: ResumePageClientProps) {
  const { refresh } = useRouter();
  const searchParams = useSearchParams();
  const { setBottomOffset } = useFloatingChromeOffset();
  const [importOpen, setImportOpen] = useState(searchParams.get("import") === "1");
  const [pendingImport, setPendingImport] = useState<ResumeImportPreview | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const [importHydrating, setImportHydrating] = useState(false);
  const [hasResumeContent, setHasResumeContent] = useState(hasContent);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editing, setEditing] = useState(!hasContent);
  const [editPending, startEditTransition] = useTransition();
  const [preset, setPreset] = useState<PdfPreset>(profile.resumePdfPreset);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [nukeOpen, setNukeOpen] = useState(false);
  const [nukeLoading, setNukeLoading] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
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

  function clearLocalFormState() {
    setFullName("");
    setEmail("");
    setPhone("");
    setLocation("");
    setSummary("");
    setCoreSkillsText("");
    setTree([]);
    setEducationLines([]);
    setCertificationLines([]);
    setAdditionalSections([]);
    setDraftProjects([]);
    setHasResumeContent(false);
  }

  function applyParsedResumeToForm(parsed: ParsedResume) {
    setFullName(parsed.contactInfo.fullName ?? "");
    setEmail(parsed.contactInfo.email ?? "");
    setPhone(parsed.contactInfo.phone ?? "");
    setLocation(parsed.contactInfo.location ?? "");
    setSummary(parsed.professionalSummary ?? "");
    setCoreSkillsText(parsed.skills.coreSkills.join(", "));
    setTree(parsedWorkToTree(parsed.workExperience));
    setEducationLines(parsed.education);
    setCertificationLines(parsed.certifications);
    setAdditionalSections(parsed.additionalSections);
    setDraftProjects(
      projectsToDraft(
        parsed.projects.map((project) => ({
          name: project.name,
          description: project.description ?? undefined,
          url: project.url,
          repoUrl: project.repoUrl,
          technologies: project.technologies,
          highlights: project.highlights,
        })),
      ),
    );
    setHasResumeContent(true);
  }

  useEffect(() => {
    setHasResumeContent(hasContent);
  }, [hasContent]);

  useEffect(() => {
    if (!editing) {
      setTree(editDataToTree(workExperiences, initialBullets));
    }
  }, [initialBullets, workExperiences, editing]);

  useEffect(() => {
    setBottomOffset(showFloatingBar ? RESUME_ACTION_BAR_HEIGHT + FAB_BREATHING_ROOM : 0);
    return () => setBottomOffset(0);
  }, [showFloatingBar, setBottomOffset]);

  const draftBullets = useMemo(() => treeToDraftBullets(tree, initialBullets), [tree, initialBullets]);
  const proposedCount = draftBullets.filter((bullet) => bullet.truthLevel === "needs_review").length;
  const bulletMeta = useMemo(() => new Map(draftBullets.map((bullet) => [bullet.id, bullet])), [draftBullets]);
  const activeThemeName = RESUME_THEME_OPTIONS.find((theme) => theme.id === preset)?.name ?? preset;

  const previewProfile = useMemo(
    () => ({
      fullName,
      email,
      phone: phone || null,
      location: location || null,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      professionalSummary: summary,
      masterSummary: summary,
      coreSkills: coreSkillsText.split(",").flatMap((skill) => {
        const next = skill.trim();
        return next ? [next] : [];
      }),
      technicalSkills: coreSkillsText.split(",").flatMap((skill) => {
        const next = skill.trim();
        return next ? [next] : [];
      }),
    }),
    [profile, fullName, email, phone, location, summary, coreSkillsText],
  );

  const previewWorkExperiences = useMemo(
    () =>
      treeToWorkExperienceDrafts(tree).map((work) => ({
        company: work.company,
        title: work.title,
        startDate: work.startDate,
        endDate: work.endDate,
        isCurrent: false,
        summary: null,
        skills: [],
        achievements: [],
      })),
    [tree],
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
    () => canPreviewResumeProfile({ fullName, email }),
    [fullName, email],
  );

  const { blobUrl, loading: previewLoading, atsScore, atsReport, error: previewError } = useLiveResumePreview({
    preset,
    profile: previewProfile,
    bullets: draftBullets,
    workExperiences: previewWorkExperiences,
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

  function beginEditing() {
    startEditTransition(() => setEditing(true));
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
    setEmail(profile.email);
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

  async function nukeResume() {
    setNukeLoading(true);
    setError("");
    try {
      const response = await fetch("/api/resumes/reset", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Unable to reset resume.");
      setNukeOpen(false);
      clearLocalFormState();
      setEditing(true);
      setNotice("Resume cleared. Import or start entering content.");
      setImportOpen(true);
      refresh();
    } catch (nukeError) {
      setError(nukeError instanceof Error ? nukeError.message : "Unable to reset resume.");
    } finally {
      setNukeLoading(false);
    }
  }

  const floatingBarLabel = useMemo(() => {
    if (editing) return "Editing resume";
    const parts = [`${tree.length} jobs`];
    if (draftProjects.length > 0) parts.push(`${draftProjects.length} projects`);
    if (certificationLines.filter((line) => line.trim()).length > 0) {
      parts.push(`${certificationLines.filter((line) => line.trim()).length} certifications`);
    }
    return parts.join(" · ");
  }, [editing, tree.length, draftProjects.length, certificationLines]);

  const currentSnapshot = useMemo<ProfileContentSnapshot>(
    () => ({
      fullName,
      email,
      phone: phone || null,
      location: location || null,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      professionalSummary: summary || null,
      coreSkills: coreSkillsText.split(",").flatMap((skill) => {
        const next = skill.trim();
        return next ? [next] : [];
      }),
      bullets: draftBullets.map((bullet) => ({
        id: bullet.id,
        company: bullet.company,
        role: bullet.role,
        text: bullet.text,
        category: bullet.category,
      })),
      workExperiences: previewWorkExperiences.map((work, index) => ({
        id: `work-${index}`,
        company: work.company,
        title: work.title,
        startDate: work.startDate ?? null,
        endDate: work.endDate ?? null,
      })),
      projects: draftToProjects(draftProjects).map((project, index) => ({
        id: `project-${index}`,
        name: project.name,
        description: project.description ?? null,
      })),
      education: educationLines,
      certifications: certificationLines,
      additionalSections,
    }),
    [
      fullName,
      email,
      phone,
      location,
      summary,
      coreSkillsText,
      draftBullets,
      previewWorkExperiences,
      draftProjects,
      educationLines,
      certificationLines,
      additionalSections,
    ],
  );

  async function commitImport(mode: "replace" | "merge", patches?: ImportPatches, preview = pendingImport) {
    if (!preview) return;
    setImportCommitting(true);
    setImportHydrating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/resumes/import/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          patches,
          fileName: preview.fileName,
          fileType: preview.fileType,
          extractedText: preview.extractedText,
          parsedJson: preview.parsedJson,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Unable to apply resume import.");

      if (mode === "replace") {
        applyParsedResumeToForm(preview.parsedJson);
      }

      setPendingImport(null);
      setMergeMode(false);
      setEditing(true);
      setNotice(mode === "replace" ? "Resume replaced with imported content." : "Selected import items applied.");
      refresh();
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Unable to apply resume import.";
      setError(message);
      setImportHydrating(false);
      throw importError instanceof Error ? importError : new Error(message);
    } finally {
      setImportCommitting(false);
      if (mode === "replace") {
        window.requestAnimationFrame(() => setImportHydrating(false));
      } else {
        setImportHydrating(false);
      }
    }
  }

  async function handleImportExtracted(preview: ResumeImportPreview) {
    setPendingImport(preview);
    if (!hasResumeContent) {
      await commitImport("replace", undefined, preview);
      return;
    }
    setMergeMode(true);
  }

  const showImportSkeleton = importHydrating && !mergeMode && !importOpen;

  const editActions = editing ? (
    <Stack direction="row" spacing={1}>
      <Button variant="text" color="inherit" onClick={cancelEditing} disabled={saving}>
        Cancel
      </Button>
      <Button variant="contained" startIcon={<EditOutlinedIcon />} disabled={saving} onClick={() => void saveEdits()}>
        {saving ? "Saving..." : "Save edits"}
      </Button>
    </Stack>
  ) : (
    <Button
      variant="outlined"
      startIcon={editPending ? <CircularProgress size={16} color="inherit" /> : <EditOutlinedIcon />}
      disabled={editPending}
      onClick={beginEditing}
    >
      {editPending ? "Preparing..." : "Edit"}
    </Button>
  );

  if (mergeMode && pendingImport) {
    return (
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Import resume"
          title="Merge imported resume"
          description="Choose what to bring in from your import. Your current resume stays unchanged until you apply."
        />
        {error ? <Alert severity="error" variant="filled">{error}</Alert> : null}
        <ResumeMergeWorkspace
          current={currentSnapshot}
          preview={pendingImport}
          committing={importCommitting}
          onDiscard={() => {
            setPendingImport(null);
            setMergeMode(false);
          }}
          onReplaceAll={() => void commitImport("replace")}
          onImportAllNew={(patches) => void commitImport("merge", patches)}
          onCommitPatches={(patches) => void commitImport("merge", patches)}
        />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Resume"
        title={hasResumeContent ? "Your resume" : "Create your resume"}
        description={
          hasResumeContent
            ? "Single source of truth for your profile. Edit manually or import when you have an updated file."
            : "Start from scratch or import to populate your work history, skills, and supplemental sections."
        }
        actions={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button variant="outlined" startIcon={<FileUploadOutlinedIcon />} data-workflow-target="resume-import-btn" onClick={() => setImportOpen(true)}>
              Import
            </Button>
            {hasResumeContent ? (
              <Button variant="outlined" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setNukeOpen(true)}>
                Start over
              </Button>
            ) : null}
          </Stack>
        )}
      />

      {showDuplicateBanner ? (
        <Alert severity="warning">
          We simplified resume storage to a single source of truth. Review your work history for any duplicate jobs from older uploads.
        </Alert>
      ) : null}

      {!hasResumeContent ? (
        <Alert severity="info">
          No resume content yet. Enter details below or use Import to populate your profile automatically.
        </Alert>
      ) : null}

      {notice ? (
        <Alert severity="success" variant="filled" sx={{ bgcolor: "success.dark", color: "success.contrastText" }}>
          {notice}
        </Alert>
      ) : null}
      {error ? <Alert severity="error" variant="filled">{error}</Alert> : null}
      {previewError && previewEnabled ? <Alert severity="warning">{previewError}</Alert> : null}

      <ResumeImportModal
        open={importOpen}
        hasExistingContent={hasResumeContent}
        onClose={() => setImportOpen(false)}
        onExtracted={handleImportExtracted}
      />

      {showImportSkeleton ? (
        <ResumeEditorSkeleton />
      ) : (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 420px" },
          gap: 3,
          alignItems: "start",
          pb: showFloatingBar ? `${RESUME_ACTION_BAR_HEIGHT + 24}px` : 0,
        }}
      >
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack ref={actionAnchorRef} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  {proposedCount > 0 ? <Chip color="warning" variant="outlined" label={`${proposedCount} proposed`} /> : null}
                </Stack>
                {editActions}
              </Stack>
              <Divider />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                <TextField label="Full name" value={fullName} disabled={!editing} onChange={(event) => setFullName(event.target.value)} />
                <TextField label="Email" value={email} disabled />
                <TextField label="Phone" value={phone} disabled={!editing} onChange={(event) => setPhone(event.target.value)} />
                <TextField label="Location" value={location} disabled={!editing} onChange={(event) => setLocation(event.target.value)} />
              </Box>
              <TextField label="Professional summary" value={summary} multiline minRows={3} disabled={!editing} onChange={(event) => setSummary(event.target.value)} />
              <TextField label="Core skills" value={coreSkillsText} disabled={!editing} helperText="Comma-separated" onChange={(event) => setCoreSkillsText(event.target.value)} />
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
                      <Button size="small" variant="contained" color="success" disabled={actionId === bulletId} onClick={() => void approveBullet(bulletId)}>
                        Approve
                      </Button>
                      <Button size="small" variant="outlined" color="error" disabled={actionId === bulletId} onClick={() => void rejectBullet(bulletId)}>
                        Reject
                      </Button>
                    </Stack>
                  );
                }}
              />
              <Divider />
              <LineListSectionEditor title="Education" summary="Schools, degrees, and training credentials." lines={educationLines} editing={editing} onChange={setEducationLines} placeholder="Art Institute — B.S. Web Design" />
              <Divider />
              <AdditionalSectionsEditor sections={additionalSections} editing={editing} onChange={setAdditionalSections} />
              <Divider />
              <ProjectsSectionEditor projects={draftProjects} editing={editing} onChange={setDraftProjects} />
              <Divider />
              <LineListSectionEditor title="Certifications" summary="Professional certifications and licenses." lines={certificationLines} editing={editing} onChange={setCertificationLines} />
            </Stack>
          </CardContent>
        </Card>

        <Stack
          spacing={3}
          sx={{
            position: { xl: "sticky" },
            top: 24,
            maxHeight: { xl: "calc(100vh - 24px)" },
            overflowY: { xl: "auto" },
            overscrollBehavior: { xl: "contain" },
          }}
        >
          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h3">Resume theme</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active theme: <strong>{activeThemeName}</strong>
                </Typography>
                <Button variant="outlined" startIcon={<PaletteOutlinedIcon />} onClick={() => setThemeModalOpen(true)}>
                  Change theme
                </Button>
              </Stack>
            </CardContent>
          </Card>
          <ResumePdfViewerShell
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
      )}

      <ResumeScrollActionBar
        visible={showFloatingBar}
        editing={editing}
        onEdit={beginEditing}
        onSave={() => void saveEdits()}
        onCancel={cancelEditing}
        saving={saving || editPending}
        label={floatingBarLabel}
      />

      <ResumeThemeModal
        open={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        preset={preset}
        onPresetChange={(next) => void saveTheme(next)}
        blobUrl={blobUrl}
        loading={previewLoading}
        atsScore={atsScore}
        atsReport={atsReport}
      />

      <Dialog open={nukeOpen} onClose={() => !nukeLoading && setNukeOpen(false)}>
        <DialogTitle>Start over with a fresh resume?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This clears contact info, work history, bullets, projects, education, certifications, and supplemental sections. Your resume theme and account settings stay intact.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNukeOpen(false)} disabled={nukeLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void nukeResume()} disabled={nukeLoading}>
            {nukeLoading ? "Clearing..." : "Clear resume"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
