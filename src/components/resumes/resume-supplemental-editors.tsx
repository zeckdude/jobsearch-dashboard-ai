"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { ResumeSectionEmptyAlert } from "@/components/resumes/resume-section-empty-alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ParsedResume } from "@/lib/resumes/schemas";

export type DraftProject = {
  name: string;
  description: string;
  url: string;
  technologiesText: string;
};

export type DraftAdditionalSection = {
  title: string;
  content: string;
};

export function linesToText(lines: string[]) {
  return lines.join("\n");
}

export function textToLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

export function projectsToDraft(projects: ParsedResume["projects"]): DraftProject[] {
  return projects.map((project) => ({
    name: project.name,
    description: project.description ?? "",
    url: project.url ?? project.repoUrl ?? "",
    technologiesText: Array.isArray(project.technologies) ? project.technologies.filter((t): t is string => typeof t === "string").join(", ") : "",
  }));
}

export function draftToProjects(drafts: DraftProject[]): ParsedResume["projects"] {
  return drafts
    .filter((draft) => draft.name.trim())
    .map((draft) => ({
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      url: draft.url.trim() || undefined,
      repoUrl: draft.url.trim() || undefined,
      technologies: draft.technologiesText.split(",").flatMap((item) => {
        const next = item.trim();
        return next ? [next] : [];
      }),
      highlights: [],
    }));
}

type LineListEditorProps = {
  title: string;
  summary: string;
  lines: string[];
  editing: boolean;
  onChange: (lines: string[]) => void;
  placeholder?: string;
};

export function LineListSectionEditor({ title, summary, lines, editing, onChange, placeholder }: LineListEditorProps) {
  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>{summary}</Typography>
      <Stack spacing={1}>
        {lines.map((line, index) => (
          <Stack key={`${title}-${index}`} direction="row" spacing={0.5} sx={{ alignItems: "flex-start" }}>
            {editing ? (
              <>
                <TextField
                  value={line}
                  fullWidth
                  multiline
                  minRows={1}
                  placeholder={placeholder}
                  onChange={(event) => onChange(lines.map((value, i) => (i === index ? event.target.value : value)))}
                  sx={{ "& .MuiInputBase-root": { fontSize: "0.875rem" } }}
                />
                <IconButton size="small" aria-label={`Remove ${title} line`} onClick={() => onChange(lines.filter((_, i) => i !== index))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <Typography variant="body2" sx={{ m: 0 }}>• {line}</Typography>
            )}
          </Stack>
        ))}
        {!lines.length ? (
          <ResumeSectionEmptyAlert>No {title.toLowerCase()} yet.</ResumeSectionEmptyAlert>
        ) : null}
        {editing ? (
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => onChange([...lines, ""])} sx={{ alignSelf: "flex-start" }}>
            Add line
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

type ProjectsSectionEditorProps = {
  projects: DraftProject[];
  editing: boolean;
  onChange: (projects: DraftProject[]) => void;
};

export function ProjectsSectionEditor({ projects, editing, onChange }: ProjectsSectionEditorProps) {
  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>Projects</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Portfolio projects appear on your master resume and in live preview.
      </Typography>
      <Stack spacing={1.5}>
        {projects.map((project, index) => (
          <Box key={`project-${index}`} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
            {editing ? (
              <Stack spacing={1}>
                <TextField label="Name" value={project.name} onChange={(e) => onChange(projects.map((p, i) => (i === index ? { ...p, name: e.target.value } : p)))} />
                <TextField label="URL" value={project.url} onChange={(e) => onChange(projects.map((p, i) => (i === index ? { ...p, url: e.target.value } : p)))} />
                <TextField label="Description" value={project.description} multiline minRows={2} onChange={(e) => onChange(projects.map((p, i) => (i === index ? { ...p, description: e.target.value } : p)))} />
                <TextField label="Technologies" value={project.technologiesText} helperText="Comma-separated" onChange={(e) => onChange(projects.map((p, i) => (i === index ? { ...p, technologiesText: e.target.value } : p)))} />
                <Button size="small" color="error" variant="text" startIcon={<DeleteOutlineIcon />} onClick={() => onChange(projects.filter((_, i) => i !== index))}>
                  Remove project
                </Button>
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">{project.name}</Typography>
                {project.url ? <Typography variant="caption" color="text.secondary">{project.url}</Typography> : null}
                {project.description ? <Typography variant="body2">{project.description}</Typography> : null}
              </Stack>
            )}
          </Box>
        ))}
        {!projects.length ? <ResumeSectionEmptyAlert>No projects yet.</ResumeSectionEmptyAlert> : null}
        {editing ? (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => onChange([...projects, { name: "", description: "", url: "", technologiesText: "" }])} sx={{ alignSelf: "flex-start" }}>
            Add project
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}

type AdditionalSectionsEditorProps = {
  sections: DraftAdditionalSection[];
  editing: boolean;
  onChange: (sections: DraftAdditionalSection[]) => void;
};

export function AdditionalSectionsEditor({ sections, editing, onChange }: AdditionalSectionsEditorProps) {
  return (
    <Box>
      <Typography variant="h3" sx={{ mb: 0.5 }}>Additional sections</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Custom resume sections such as training, leadership principles, or specialized skills blocks.
      </Typography>
      <Stack spacing={1.5}>
        {sections.map((section, index) => (
          <Box key={`section-${index}`} sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
            {editing ? (
              <Stack spacing={1}>
                <TextField label="Section title" value={section.title} onChange={(e) => onChange(sections.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))} />
                <TextField label="Content" value={section.content} multiline minRows={4} onChange={(e) => onChange(sections.map((s, i) => (i === index ? { ...s, content: e.target.value } : s)))} />
                <Button size="small" color="error" variant="text" startIcon={<DeleteOutlineIcon />} onClick={() => onChange(sections.filter((_, i) => i !== index))}>
                  Remove section
                </Button>
              </Stack>
            ) : (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2">{section.title}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{section.content}</Typography>
              </Stack>
            )}
          </Box>
        ))}
        {!sections.length ? <ResumeSectionEmptyAlert>No additional sections yet.</ResumeSectionEmptyAlert> : null}
        {editing ? (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => onChange([...sections, { title: "", content: "" }])} sx={{ alignSelf: "flex-start" }}>
            Add section
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
