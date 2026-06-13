"use client";

import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { ParsedResume } from "@/lib/resumes/schemas";

export type ResumeImportPreview = {
  fileName: string;
  fileType: string;
  extractedText: string;
  parsedJson: ParsedResume;
};

type ImportTab = "resume" | "linkedin-pdf" | "linkedin-export";

type ResumeImportModalProps = {
  open: boolean;
  hasExistingContent?: boolean;
  onClose: () => void;
  onExtracted: (preview: ResumeImportPreview) => void | Promise<void>;
};

export function ResumeImportModal({ open, hasExistingContent = false, onClose, onExtracted }: ResumeImportModalProps) {
  const [tab, setTab] = useState<ImportTab>("resume");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "extracting" | "applying" | "error">("idle");
  const [message, setMessage] = useState("");

  const busy = status === "extracting" || status === "applying";

  async function onExtract() {
    if (!file) {
      setStatus("error");
      setMessage("Choose a file first.");
      return;
    }

    setStatus("extracting");
    setMessage("");

    try {
      const base64 = await fileToBase64(file);
      const isLinkedInZip = tab === "linkedin-export";
      const response = await fetch(isLinkedInZip ? "/api/resumes/import/linkedin" : "/api/resumes/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isLinkedInZip
            ? { fileName: file.name, base64 }
            : { fileName: file.name, fileType: file.type, base64 },
        ),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Extraction failed.");

      setStatus("applying");
      await onExtracted({
        fileName: payload.fileName,
        fileType: payload.fileType,
        extractedText: payload.extractedText,
        parsedJson: payload.parsedJson,
      });
      setFile(null);
      setStatus("idle");
      setMessage("");
      onClose();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  function handleClose() {
    if (busy) return;
    setFile(null);
    setStatus("idle");
    setMessage("");
    onClose();
  }

  function handleTabChange(_: unknown, next: ImportTab) {
    setTab(next);
    setFile(null);
    setMessage("");
    setStatus("idle");
  }

  const accept =
    tab === "linkedin-export"
      ? ".zip,application/zip"
      : ".pdf,.docx,.md,.txt,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Import resume</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Tabs value={tab} onChange={handleTabChange} variant="fullWidth">
            <Tab value="resume" label="Resume file" />
            <Tab value="linkedin-pdf" label="LinkedIn PDF" icon={<LinkedInIcon fontSize="small" />} iconPosition="start" />
            <Tab value="linkedin-export" label="LinkedIn export" icon={<LinkedInIcon fontSize="small" />} iconPosition="start" />
          </Tabs>

          {hasExistingContent ? (
            <Alert severity="info">
              Your current resume stays unchanged until you apply an import. On the next screen, compare side by side and choose
              exactly what to add — contact, summary, skills, jobs, bullets, education, projects, and more — or replace the entire resume.
            </Alert>
          ) : null}

          {tab === "resume" ? (
            <Typography variant="body2" color="text.secondary">
              {hasExistingContent
                ? "Upload a PDF, DOCX, Markdown, or text resume. Nothing is saved until you review and apply your selections on the next step."
                : "Upload a PDF, DOCX, Markdown, or text resume. Nothing is saved until you apply the import on the next step."}
            </Typography>
          ) : null}

          {tab === "linkedin-pdf" ? (
            <Alert severity="info">
              On LinkedIn, open your profile → <strong>More</strong> → <strong>Save to PDF</strong>. Upload that PDF here.
            </Alert>
          ) : null}

          {tab === "linkedin-export" ? (
            <Alert severity="info">
              In LinkedIn: <strong>Settings → Data privacy → Get a copy of your data</strong>. Download the ZIP export, then upload it here.
            </Alert>
          ) : null}

          <Button variant="outlined" component="label" startIcon={<FileUploadOutlinedIcon />} sx={{ alignSelf: "flex-start" }}>
            Choose file
            <input hidden type="file" accept={accept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </Button>
          {file ? <Alert severity="info">Selected: {file.name}</Alert> : null}
          {message ? <Alert severity="error">{message}</Alert> : null}
          {status === "extracting" ? (
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">Reading and parsing your file…</Typography>
              <LinearProgress />
            </Stack>
          ) : null}
          {status === "applying" ? (
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">Applying imported content to your resume…</Typography>
              <LinearProgress />
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={() => void onExtract()} disabled={!file || busy}>
          {status === "extracting" ? "Importing..." : status === "applying" ? "Applying..." : "Extract and continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(file);
  });
}
