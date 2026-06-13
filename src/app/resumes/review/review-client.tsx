"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResumeScrollActionBar } from "@/components/resumes/resume-scroll-action-bar";
import {
  AdditionalSectionsEditor,
  draftToProjects,
  LineListSectionEditor,
  projectsToDraft,
  ProjectsSectionEditor,
} from "@/components/resumes/resume-supplemental-editors";
import { useScrollPastAnchor } from "@/components/resumes/use-scroll-past-anchor";
import { WorkHistoryTreeEditor } from "@/components/resumes/work-history-tree-editor";
import { parsedWorkToTree, treeToParsedWork } from "@/lib/resumes/work-history-adapters";
import { buildExperienceBulletsFromWork } from "@/lib/resumes/parse";
import type { ParsedResume } from "@/lib/resumes/schemas";
import type { WorkHistoryTree } from "@/lib/resumes/work-history-tree";

type ReviewClientProps = {
  upload: {
    id: string;
    fileName: string;
    parsingStatus: string;
    extractedText: string;
    parsedJson: ParsedResume;
  };
};

export function ResumeReviewClient({ upload }: ReviewClientProps) {
  const { refresh } = useRouter();
  const [parsed, setParsed] = useState(upload.parsedJson);
  const [tree, setTree] = useState<WorkHistoryTree>(() => parsedWorkToTree(upload.parsedJson.workExperience));
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const actionAnchorRef = useRef<HTMLDivElement>(null);
  const showFloatingBar = useScrollPastAnchor(actionAnchorRef);
  const skillsText = useMemo(() => parsed.skills.coreSkills.join(", "), [parsed.skills.coreSkills]);
  const draftProjects = useMemo(() => projectsToDraft(parsed.projects), [parsed.projects]);

  useEffect(() => {
    if (!editing) {
      setTree(parsedWorkToTree(parsed.workExperience));
    }
  }, [parsed.workExperience, editing]);

  function withSyncedBullets(next: ParsedResume): ParsedResume {
    return {
      ...next,
      experienceBullets: buildExperienceBulletsFromWork(next.workExperience, next.skills.technicalSkills, next.experienceBullets),
    };
  }

  function handleTreeChange(nextTree: WorkHistoryTree) {
    setTree(nextTree);
    setParsed((previous) => withSyncedBullets({
      ...previous,
      workExperience: treeToParsedWork(nextTree, previous.workExperience),
    }));
  }

  async function saveEdits() {
    setError("");
    setNotice("");
    const synced = withSyncedBullets(parsed);
    setParsed(synced);
    const response = await fetch(`/api/resumes/uploads/${upload.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parsedJson: synced }),
    });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Unable to save edits.");
      return;
    }

    setEditing(false);
    setNotice("Parsed profile edits saved.");
    refresh();
  }

  async function approve() {
    setError("");
    setNotice("");
    const synced = withSyncedBullets(parsed);
    setParsed(synced);
    await fetch(`/api/resumes/uploads/${upload.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parsedJson: synced }),
    });
    const response = await fetch(`/api/resumes/uploads/${upload.id}/approve`, { method: "POST" });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Unable to approve resume upload.");
      return;
    }

    setNotice("Candidate profile approved and saved.");
    refresh();
  }

  async function remove() {
    setError("");
    setNotice("");
    const response = await fetch(`/api/resumes/uploads/${upload.id}`, { method: "DELETE" });
    const body = await response.json();

    if (!response.ok) {
      setError(body.error ?? "Unable to remove upload.");
      return;
    }

    setNotice("Resume upload removed from review.");
    refresh();
  }

  function cancelEditing() {
    setParsed(upload.parsedJson);
    setTree(parsedWorkToTree(upload.parsedJson.workExperience));
    setEditing(false);
    setError("");
  }

  return (
    <Stack spacing={3}>
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack ref={actionAnchorRef} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Chip color="warning" label={upload.parsingStatus} />
                <Chip variant="outlined" label={upload.fileName} />
                <Chip variant="outlined" label="No fabricated experience" />
              </Stack>
              {editing ? (
                <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={saveEdits} sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>
                  Save edits
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
                value={parsed.contactInfo.fullName ?? ""}
                disabled={!editing}
                onChange={(event) => setParsed((previous) => ({ ...previous, contactInfo: { ...previous.contactInfo, fullName: event.target.value } }))}
              />
              <TextField
                label="Email"
                value={parsed.contactInfo.email ?? ""}
                disabled={!editing}
                onChange={(event) => setParsed((previous) => ({ ...previous, contactInfo: { ...previous.contactInfo, email: event.target.value } }))}
              />
              <TextField
                label="Phone"
                value={parsed.contactInfo.phone ?? ""}
                disabled={!editing}
                onChange={(event) => setParsed((previous) => ({ ...previous, contactInfo: { ...previous.contactInfo, phone: event.target.value } }))}
              />
              <TextField
                label="Location"
                value={parsed.contactInfo.location ?? ""}
                disabled={!editing}
                onChange={(event) => setParsed((previous) => ({ ...previous, contactInfo: { ...previous.contactInfo, location: event.target.value } }))}
              />
            </Box>
            <TextField
              label="Professional summary"
              value={parsed.professionalSummary ?? ""}
              multiline
              minRows={3}
              disabled={!editing}
              onChange={(event) => setParsed((previous) => ({ ...previous, professionalSummary: event.target.value }))}
            />
            <TextField
              label="Core skills"
              value={skillsText}
              disabled={!editing}
              helperText="Comma-separated"
              onChange={(event) =>
                setParsed((previous) => ({
                  ...previous,
                  skills: {
                    ...previous.skills,
                    coreSkills: event.target.value.split(",").flatMap((skill) => {
                      const next = skill.trim();
                      return next ? [next] : [];
                    }),
                  },
                }))
              }
            />
            <WorkHistoryTreeEditor
              tree={tree}
              editing={editing}
              onChange={handleTreeChange}
              summary={`${tree.length} jobs · ${parsed.experienceBullets.length} bullets. Click Edit, then hover a row for drag/actions, or use keyboard shortcuts — open the guide above.`}
            />
            <Divider />
            <LineListSectionEditor
              title="Education"
              summary="Schools, degrees, and training credentials."
              lines={parsed.education}
              editing={editing}
              onChange={(lines) => setParsed((previous) => ({ ...previous, education: lines }))}
              placeholder="Art Institute — B.S. Web Design"
            />
            <Divider />
            <AdditionalSectionsEditor
              sections={parsed.additionalSections ?? []}
              editing={editing}
              onChange={(sections) => setParsed((previous) => ({ ...previous, additionalSections: sections }))}
            />
            <Divider />
            <ProjectsSectionEditor
              projects={draftProjects}
              editing={editing}
              onChange={(next) => setParsed((previous) => ({ ...previous, projects: draftToProjects(next) }))}
            />
            <Divider />
            <LineListSectionEditor
              title="Certifications"
              summary="Professional certifications and licenses."
              lines={parsed.certifications}
              editing={editing}
              onChange={(lines) => setParsed((previous) => ({ ...previous, certifications: lines }))}
            />
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Button variant="contained" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={approve}>Approve candidate profile</Button>
              <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={remove}>Remove upload</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <ResumeScrollActionBar
        visible={showFloatingBar}
        editing={editing}
        onEdit={() => setEditing(true)}
        onSave={() => void saveEdits()}
        onCancel={cancelEditing}
        label={upload.fileName}
        secondaryActions={
          <>
            <Button variant="contained" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={() => void approve()}>
              Approve candidate profile
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => void remove()}>
              Remove upload
            </Button>
          </>
        }
      />
      <Card>
        <CardContent>
          <Typography variant="h3">Extracted text preview</Typography>
          <Typography component="pre" sx={{ mt: 2, whiteSpace: "pre-wrap", fontFamily: "inherit", color: "text.secondary", maxHeight: 320, overflow: "auto" }}>
            {upload.extractedText}
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
