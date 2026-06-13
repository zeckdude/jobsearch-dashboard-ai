"use client";

import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/app/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import type { ParsedResume } from "@/lib/resumes/schemas";
import {
  clearResumeUploadPreview,
  readResumeUploadPreview,
  writeResumeUploadPreview,
} from "@/lib/resumes/upload-preview-storage";

type PreviewState = {
  fileName: string;
  fileType: string;
  extractedText: string;
  parsedJson: ParsedResume;
};

export function ResumeUploadClient() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "extracting" | "preview" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const saved = readResumeUploadPreview();
    if (!saved) return;
    setPreview(saved);
    setStatus("preview");
    setMessage("Restored your last extraction preview. Send it to review or extract again.");
  }, []);

  async function onExtract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setStatus("error");
      setMessage("Choose a resume file first.");
      return;
    }

    setStatus("extracting");
    setMessage("");
    const response = await fetch("/api/resumes/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        base64: await fileToBase64(file),
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error ?? "Extraction failed.");
      return;
    }

    const nextPreview: PreviewState = {
      fileName: payload.fileName,
      fileType: payload.fileType,
      extractedText: payload.extractedText,
      parsedJson: payload.parsedJson,
    };

    setPreview(nextPreview);
    writeResumeUploadPreview(nextPreview);
    setStatus("preview");
    setMessage("Preview ready. Nothing is saved until you send it to review.");
  }

  async function sendToReview() {
    if (!preview) return;

    setStatus("sending");
    setMessage("");
    const response = await fetch("/api/resumes/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: preview.fileName,
        fileType: preview.fileType,
        extractedText: preview.extractedText,
        parsedJson: preview.parsedJson,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus("preview");
      setMessage(payload.error ?? "Unable to send resume to review.");
      return;
    }

    clearResumeUploadPreview();
    router.push("/resumes/review");
  }

  function discardPreview() {
    clearResumeUploadPreview();
    setPreview(null);
    setFile(null);
    setStatus("idle");
    setMessage("Preview discarded. Nothing was saved.");
  }

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1100 }}>
        <PageHeader
          eyebrow="Resume upload"
          title="Upload Existing Resume"
          description="Extract and preview first. Your resume is only saved when you send it to review."
        />
        <Card>
          <CardContent>
            <Stack component="form" spacing={2} onSubmit={onExtract}>
              <Button variant="outlined" component="label" startIcon={<FileUploadOutlinedIcon />} sx={{ alignSelf: "flex-start" }}>
                Choose resume file
                <input
                  hidden
                  name="file"
                  type="file"
                  accept=".pdf,.docx,.md,.txt,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Button>
              {file ? <Alert severity="info">Selected: {file.name}</Alert> : null}
              {preview && !file ? <Alert severity="info">Preview loaded for: {preview.fileName}</Alert> : null}
              <Button
                type="submit"
                variant="contained"
                disabled={status === "extracting" || status === "sending" || !file}
                sx={{ alignSelf: "flex-start" }}
              >
                Extract and parse
              </Button>
              {status === "extracting" || status === "sending" ? <LinearProgress /> : null}
              {message ? <Alert severity={status === "error" ? "error" : "info"}>{message}</Alert> : null}
              {preview ? (
                <Alert severity="success">
                  Parsed {preview.parsedJson.workExperience.length} roles and {preview.parsedJson.experienceBullets.length}{" "}
                  experience bullets. Review the text below, then send to review when it looks right.
                </Alert>
              ) : null}
              {preview ? (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  <Button variant="contained" color="success" disabled={status === "sending"} onClick={() => void sendToReview()}>
                    Send to review
                  </Button>
                  <Button variant="outlined" color="inherit" disabled={status === "sending"} onClick={discardPreview}>
                    Discard preview
                  </Button>
                </Stack>
              ) : null}
              <TextField
                label="Extracted text preview"
                value={preview?.extractedText ?? ""}
                multiline
                minRows={14}
                fullWidth
                disabled
                placeholder="Extract a resume to preview the readable text here."
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
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
