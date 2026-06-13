"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import type { ImportPatches } from "@/lib/resumes/import-commit";
import { buildImportAllNewPatches } from "@/lib/resumes/import-commit";
import { normalizeJobKey, type ProfileContentSnapshot } from "@/lib/resumes/profile-content";
import { parsedWorkToTree } from "@/lib/resumes/work-history-adapters";
import type { ParsedResume } from "@/lib/resumes/schemas";
import type { ResumeImportPreview } from "@/components/resumes/resume-import-modal";

type ResumeMergeWorkspaceProps = {
  current: ProfileContentSnapshot;
  preview: ResumeImportPreview;
  committing: boolean;
  onDiscard: () => void;
  onReplaceAll: () => void;
  onImportAllNew: (patches: ImportPatches) => void;
  onCommitPatches: (patches: ImportPatches) => void;
};

export function ResumeMergeWorkspace({
  current,
  preview,
  committing,
  onDiscard,
  onReplaceAll,
  onImportAllNew,
  onCommitPatches,
}: ResumeMergeWorkspaceProps) {
  const imported = preview.parsedJson;
  const [patches, setPatches] = useState<ImportPatches>({});

  const importAllNewPatches = useMemo(() => {
    return buildImportAllNewPatches(imported, {
      profile: {
        fullName: current.fullName,
        email: current.email,
        phone: current.phone,
        location: current.location,
        linkedinUrl: current.linkedinUrl,
        githubUrl: current.githubUrl,
        portfolioUrl: current.portfolioUrl,
        professionalSummary: current.professionalSummary,
        masterSummary: current.professionalSummary ?? "",
        coreSkills: current.coreSkills,
        technicalSkills: current.coreSkills,
        domainExpertise: [],
      },
      workExperience: current.workExperiences.map((work) => ({
        company: work.company,
        title: work.title,
        startDate: work.startDate ?? undefined,
        endDate: work.endDate ?? undefined,
        isCurrent: false,
        skills: [],
        achievements: current.bullets
          .filter((bullet) => normalizeJobKey(bullet.company, bullet.role) === normalizeJobKey(work.company, work.title))
          .map((bullet) => bullet.text),
      })),
      experienceBullets: current.bullets.map((bullet) => ({
        company: bullet.company,
        role: bullet.role,
        text: bullet.text,
        category: bullet.category,
        metrics: {},
        keywords: [],
        sourceText: bullet.text,
        truthLevel: "verified" as const,
      })),
      projects: current.projects.map((project) => ({
        name: project.name,
        description: project.description ?? undefined,
        technologies: [],
        highlights: [],
      })),
      education: current.education,
      certifications: current.certifications,
      additionalSections: current.additionalSections,
    });
  }, [current, imported]);

  const importedTree = useMemo(() => parsedWorkToTree(imported.workExperience), [imported.workExperience]);

  function toggleJob(importJobIndex: number, targetJobKey?: string, bulletIndices?: number[]) {
    setPatches((previous) => {
      const jobs = [...(previous.jobs ?? [])];
      const existingIndex = jobs.findIndex((job) => job.importJobIndex === importJobIndex);
      if (existingIndex >= 0) {
        jobs.splice(existingIndex, 1);
        return { ...previous, jobs };
      }
      jobs.push({ importJobIndex, targetJobKey, bulletIndices });
      return { ...previous, jobs };
    });
  }

  function toggleIndex(field: "education" | "certifications" | "projects" | "additionalSections", index: number) {
    setPatches((previous) => {
      const values = [...(previous[field] ?? [])];
      const existingIndex = values.indexOf(index);
      if (existingIndex >= 0) values.splice(existingIndex, 1);
      else values.push(index);
      return { ...previous, [field]: values };
    });
  }

  const selectedCount =
    (patches.contact ? 1 : 0) +
    (patches.summary ? 1 : 0) +
    (patches.coreSkills ? 1 : 0) +
    (patches.jobs?.length ?? 0) +
    (patches.education?.length ?? 0) +
    (patches.projects?.length ?? 0) +
    (patches.certifications?.length ?? 0) +
    (patches.additionalSections?.length ?? 0);

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Compare your current resume with the imported PDF. Import specific sections, jobs, or bullets — or replace everything.
      </Alert>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <Button variant="outlined" color="inherit" disabled={committing} onClick={onDiscard}>Discard import</Button>
        <Button variant="outlined" disabled={committing} onClick={() => onImportAllNew(importAllNewPatches)}>Import all new</Button>
        <Button variant="contained" color="warning" disabled={committing} onClick={onReplaceAll}>Replace entire resume</Button>
        <Button variant="contained" disabled={committing || selectedCount === 0} onClick={() => onCommitPatches(patches)}>
          {committing ? "Applying..." : `Apply selected (${selectedCount})`}
        </Button>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
        <Card>
          <CardContent>
            <Typography variant="h3" sx={{ mb: 1.5 }}>Current resume</Typography>
            <SectionBlock title="Contact" body={`${current.fullName}\n${current.email}`} />
            <SectionBlock title="Summary" body={current.professionalSummary ?? "—"} />
            <SectionBlock title="Skills" body={current.coreSkills.join(", ") || "—"} />
            {current.workExperiences.map((work) => (
              <SectionBlock
                key={work.id}
                title={`${work.company} · ${work.title}`}
                body={current.bullets
                  .filter((bullet) => normalizeJobKey(bullet.company, bullet.role) === normalizeJobKey(work.company, work.title))
                  .map((bullet) => `• ${bullet.text}`)
                  .join("\n") || "—"}
              />
            ))}
            <SectionBlock title="Education" body={current.education.join("\n") || "—"} />
            <SectionBlock title="Projects" body={current.projects.map((project) => project.name).join("\n") || "—"} />
            <SectionBlock title="Certifications" body={current.certifications.join("\n") || "—"} />
            {current.additionalSections.map((section) => (
              <SectionBlock key={section.title} title={section.title} body={section.content} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h3" sx={{ mb: 1.5 }}>Imported from {preview.fileName}</Typography>

            <ImportRow
              title="Contact"
              body={`${imported.contactInfo.fullName ?? ""}\n${imported.contactInfo.email ?? ""}`}
              actionLabel={patches.contact ? "Selected" : "Import contact"}
              onAction={() => setPatches((previous) => ({ ...previous, contact: !previous.contact }))}
              selected={Boolean(patches.contact)}
            />
            <ImportRow
              title="Summary"
              body={imported.professionalSummary ?? "—"}
              actionLabel={patches.summary ? "Selected" : "Import summary"}
              onAction={() => setPatches((previous) => ({ ...previous, summary: !previous.summary }))}
              selected={Boolean(patches.summary)}
            />
            <ImportRow
              title="Skills"
              body={imported.skills.coreSkills.join(", ") || "—"}
              actionLabel={patches.coreSkills ? `Skills: ${patches.coreSkills}` : "Import skills (replace)"}
              onAction={() =>
                setPatches((previous) => ({
                  ...previous,
                  coreSkills: previous.coreSkills === "replace" ? "append" : previous.coreSkills === "append" ? undefined : "replace",
                }))
              }
              selected={Boolean(patches.coreSkills)}
            />

            {importedTree.map((role, jobIndex) => {
              const jobKey = normalizeJobKey(role.company, role.title);
              const selected = patches.jobs?.some((job) => job.importJobIndex === jobIndex);
              return (
                <Box key={`${role.company}-${role.title}-${jobIndex}`} sx={{ mb: 1.5 }}>
                  <ImportRow
                    title={`${role.company} · ${role.title}`}
                    body={role.children.map((bullet) => `• ${bullet.text}`).join("\n") || "—"}
                    actionLabel={selected ? "Selected" : "Import job"}
                    onAction={() => toggleJob(jobIndex, jobKey)}
                    selected={Boolean(selected)}
                  />
                  {role.children.map((bullet, bulletIndex) => {
                    const bulletSelected = patches.jobs?.some(
                      (job) => job.importJobIndex === jobIndex && job.bulletIndices?.includes(bulletIndex),
                    );
                    return (
                      <Stack key={`${role.id}-${bulletIndex}`} direction="row" spacing={1} sx={{ pl: 2, mt: 0.5, alignItems: "center" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>• {bullet.text}</Typography>
                        <Button
                          size="small"
                          variant={bulletSelected ? "contained" : "outlined"}
                          onClick={() => toggleJob(jobIndex, jobKey, [bulletIndex])}
                        >
                          {bulletSelected ? "Selected" : "Import bullet"}
                        </Button>
                      </Stack>
                    );
                  })}
                </Box>
              );
            })}

            {imported.education.map((line, index) => (
              <ImportRow
                key={`edu-${index}`}
                title="Education line"
                body={line}
                actionLabel={patches.education?.includes(index) ? "Selected" : "Import"}
                onAction={() => toggleIndex("education", index)}
                selected={Boolean(patches.education?.includes(index))}
              />
            ))}

            {imported.projects.map((project, index) => (
              <ImportRow
                key={`project-${index}`}
                title={`Project: ${project.name}`}
                body={project.description ?? "—"}
                actionLabel={patches.projects?.includes(index) ? "Selected" : "Import"}
                onAction={() => toggleIndex("projects", index)}
                selected={Boolean(patches.projects?.includes(index))}
              />
            ))}

            {imported.certifications.map((line, index) => (
              <ImportRow
                key={`cert-${index}`}
                title="Certification"
                body={line}
                actionLabel={patches.certifications?.includes(index) ? "Selected" : "Import"}
                onAction={() => toggleIndex("certifications", index)}
                selected={Boolean(patches.certifications?.includes(index))}
              />
            ))}

            {imported.additionalSections.map((section, index) => (
              <ImportRow
                key={`section-${index}`}
                title={section.title}
                body={section.content}
                actionLabel={patches.additionalSections?.includes(index) ? "Selected" : "Import"}
                onAction={() => toggleIndex("additionalSections", index)}
                selected={Boolean(patches.additionalSections?.includes(index))}
              />
            ))}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

function SectionBlock({ title, body }: { title: string; body: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="subtitle2">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{body}</Typography>
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}

function ImportRow({
  title,
  body,
  actionLabel,
  onAction,
  selected,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  selected: boolean;
}) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mb: 0.25 }}>
            <Typography variant="subtitle2">{title}</Typography>
            {selected ? <Chip size="small" color="primary" label="Selected" /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>{body}</Typography>
        </Box>
        <Button size="small" variant={selected ? "contained" : "outlined"} endIcon={<ArrowForwardIcon />} onClick={onAction}>
          {actionLabel}
        </Button>
      </Stack>
      <Divider sx={{ mt: 1 }} />
    </Box>
  );
}
