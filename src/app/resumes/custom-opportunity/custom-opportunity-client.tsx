"use client";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Collapse from "@mui/material/Collapse";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/app/app-shell";
import { ResumePdfViewerShell } from "@/components/resumes/resume-pdf-viewer-shell";
import { useLivePlainTextPreview } from "@/components/resumes/use-live-plain-text-preview";
import { PageHeader } from "@/components/ui/page-header";
import type { PdfPreset } from "@/lib/pdf/simple-resume-pdf";

type OpportunityDetails = {
  company: string | null;
  title: string | null;
  location: string | null;
  remoteType: "remote" | "hybrid" | "onsite" | "unknown" | null;
  applicationUrl: string | null;
};

type GenerateResponse = {
  jobUrl: string;
  resumeId: string;
  pdfUrl: string;
  textUrl: string;
  resumePreview: string;
  warnings: string[];
  inferredDetails: OpportunityDetails;
  message?: string;
};

const emptyDetails: OpportunityDetails = {
  company: "",
  title: "",
  location: "",
  remoteType: "unknown",
  applicationUrl: "",
};

type CustomOpportunityState = {
  description: string;
  details: OpportunityDetails;
  result: GenerateResponse | null;
  notice: string;
  extractNotice: string;
  error: string;
  errorContext: "extract" | "generate" | "save" | null;
  inferring: boolean;
  generating: boolean;
  saving: boolean;
  editedResume: string;
};

export function CustomOpportunityClient({ preset }: { preset: PdfPreset }) {
  const [state, setState] = useState<CustomOpportunityState>({
    description: "",
    details: emptyDetails,
    result: null,
    notice: "",
    extractNotice: "",
    error: "",
    errorContext: null,
    inferring: false,
    generating: false,
    saving: false,
    editedResume: "",
  });
  const { description, details, result, notice, extractNotice, error, errorContext, inferring, generating, saving, editedResume } = state;
  const generateErrorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (error && errorContext === "generate") {
      generateErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error, errorContext]);

  const { blobUrl, loading: previewLoading, atsScore, atsReport, error: previewError } = useLivePlainTextPreview({
    plainText: editedResume,
    preset,
    enabled: Boolean(editedResume.trim()),
  });

  async function inferDetails() {
    setState((current) => ({ ...current, inferring: true, extractNotice: "", error: "", errorContext: null, result: null }));

    try {
      const response = await fetch("/api/resumes/custom-opportunity/infer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to extract details.");

      setState((current) => ({
        ...current,
        details: {
          company: payload.details.company ?? current.details.company ?? "",
          title: payload.details.title ?? current.details.title ?? "",
          location: payload.details.location ?? current.details.location ?? "",
          remoteType: payload.details.remoteType ?? current.details.remoteType ?? "unknown",
          applicationUrl: payload.details.applicationUrl ?? current.details.applicationUrl ?? "",
        },
        extractNotice: "Opportunity details extracted.",
      }));
    } catch (caught) {
      setState((current) => ({
        ...current,
        error: caught instanceof Error ? caught.message : "Unable to extract details.",
        errorContext: "extract",
      }));
    } finally {
      setState((current) => ({ ...current, inferring: false }));
    }
  }

  async function generateResume(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({ ...current, generating: true, notice: "", error: "", errorContext: null, result: null }));

    try {
      const response = await fetch("/api/resumes/custom-opportunity/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description,
          company: details.company || undefined,
          title: details.title || undefined,
          location: details.location || undefined,
          remoteType: details.remoteType || undefined,
          applicationUrl: details.applicationUrl || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to generate resume.");

      setState((current) => ({
        ...current,
        result: payload,
        editedResume: payload.resumePreview,
        details: payload.inferredDetails,
        notice: payload.message ?? "Custom opportunity resume generated.",
      }));
    } catch (caught) {
      setState((current) => ({
        ...current,
        error: caught instanceof Error ? caught.message : "Unable to generate resume.",
        errorContext: "generate",
      }));
    } finally {
      setState((current) => ({ ...current, generating: false }));
    }
  }

  async function saveResumeEdits() {
    if (!result) return;
    setState((current) => ({ ...current, saving: true, notice: "", error: "", errorContext: null }));

    try {
      const response = await fetch(`/api/resumes/generated/${result.resumeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: editedResume }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to save resume.");

      setState((current) => ({
        ...current,
        result: current.result ? { ...current.result, resumePreview: payload.resume?.plainText ?? current.editedResume } : current.result,
        editedResume: payload.resume?.plainText ?? current.editedResume,
        notice: payload.message ?? "Resume saved.",
      }));
    } catch (caught) {
      setState((current) => ({
        ...current,
        error: caught instanceof Error ? caught.message : "Unable to save resume.",
        errorContext: "save",
      }));
    } finally {
      setState((current) => ({ ...current, saving: false }));
    }
  }

  const previewTitle = result
    ? [details.company, details.title].filter(Boolean).join(" · ") || "Generated resume"
    : undefined;

  return (
    <AppShell>
      <Stack spacing={3} sx={{ maxWidth: 1400, mx: "auto" }}>
        <PageHeader
          eyebrow="Recruiter intake"
          title="Custom Opportunity Resume"
          description="Paste a recruiter message, confirm the role details, then generate a tailored resume from your approved profile evidence."
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1fr) 420px" }, gap: 3, alignItems: "start" }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack component="form" spacing={2.25} onSubmit={generateResume}>
                  {notice ? <Alert severity="success">{notice}</Alert> : null}
                  {previewError ? <Alert severity="warning">{previewError}</Alert> : null}
                  <TextField
                    required
                    fullWidth
                    multiline
                    minRows={10}
                    label="Recruiter role brief"
                    value={description}
                    onChange={(event) => setState((current) => ({ ...current, description: event.target.value }))}
                    helperText="Paste the full recruiter email, LinkedIn InMail, or job blurb to get started."
                  />
                  <Collapse in={Boolean(description.trim())}>
                    <Box sx={{ pt: 0.5, alignSelf: "flex-start", maxWidth: 520 }}>
                      <Button
                        type="button"
                        variant="outlined"
                        startIcon={inferring ? <CircularProgress color="inherit" size={16} thickness={5} /> : <SearchOutlinedIcon />}
                        disabled={inferring || generating}
                        onClick={() => void inferDetails()}
                      >
                        {inferring ? "Extracting..." : "Extract details"}
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.45 }}>
                        Optional. Parses the brief into the fields below — does not create a resume. Skip if you prefer to type them yourself.
                      </Typography>
                    </Box>
                  </Collapse>
                  <Typography variant="h3">
                    Opportunity details
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
                    Review or edit before generating. These shape how the role is labeled and tailored.
                  </Typography>
                  {extractNotice ? <Alert severity="success">{extractNotice}</Alert> : null}
                  {error && errorContext === "extract" ? (
                    <Alert severity="error" variant="filled">{error}</Alert>
                  ) : null}
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField fullWidth label="Company" value={details.company ?? ""} onChange={(event) => setDetail("company", event.target.value)} />
                    <TextField fullWidth label="Job title" value={details.title ?? ""} onChange={(event) => setDetail("title", event.target.value)} />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField fullWidth label="Location" value={details.location ?? ""} onChange={(event) => setDetail("location", event.target.value)} />
                    <TextField select fullWidth label="Remote type" value={details.remoteType ?? "unknown"} onChange={(event) => setDetail("remoteType", event.target.value)}>
                      <MenuItem value="remote">Remote</MenuItem>
                      <MenuItem value="hybrid">Hybrid</MenuItem>
                      <MenuItem value="onsite">Onsite</MenuItem>
                      <MenuItem value="unknown">Unknown</MenuItem>
                    </TextField>
                  </Stack>
                  <TextField
                    fullWidth
                    label="Application URL"
                    value={details.applicationUrl ?? ""}
                    onChange={(event) => setDetail("applicationUrl", event.target.value)}
                    helperText="Optional. Saved with the opportunity if you want to open the posting later."
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ mt: 0.5, alignSelf: "flex-start" }}
                    startIcon={generating ? <CircularProgress color="inherit" size={16} thickness={5} /> : <ArticleOutlinedIcon />}
                    disabled={inferring || generating || !description.trim()}
                  >
                    {generating ? "Generating..." : "Generate resume"}
                  </Button>
                  {error && errorContext === "generate" ? (
                    <Alert
                      ref={generateErrorRef}
                      severity="error"
                      variant="filled"
                      onClose={() => setState((current) => ({ ...current, error: "", errorContext: null }))}
                      sx={{ mt: 1.5, alignSelf: "stretch" }}
                    >
                      <AlertTitle sx={{ fontWeight: 800 }}>Resume generation failed</AlertTitle>
                      {error}
                    </Alert>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            {result ? (
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    {error && errorContext === "save" ? (
                      <Alert severity="error" variant="filled" onClose={() => setState((current) => ({ ...current, error: "", errorContext: null }))}>
                        <AlertTitle sx={{ fontWeight: 800 }}>Unable to save resume</AlertTitle>
                        {error}
                      </Alert>
                    ) : null}
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { md: "center" } }}>
                      <Box>
                        <Typography variant="h3">Editable resume</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Changes update the PDF preview instantly. Save when you are ready to export.
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                        <Button
                          type="button"
                          variant="contained"
                          color="success"
                          disabled={saving}
                          startIcon={saving ? <CircularProgress color="inherit" size={16} thickness={5} /> : undefined}
                          onClick={() => void saveResumeEdits()}
                        >
                          {saving ? "Saving..." : "Save edits"}
                        </Button>
                        <Button component={Link} href={result.textUrl} variant="outlined" startIcon={<OpenInNewOutlinedIcon />}>Text</Button>
                        <Button component={Link} href={result.pdfUrl} variant="outlined" startIcon={<DownloadOutlinedIcon />}>PDF</Button>
                        <Button component={Link} href={result.jobUrl} variant="outlined">Open job</Button>
                      </Stack>
                    </Stack>
                    {result.warnings.length ? (
                      <Alert severity="warning">{result.warnings.join(" ")}</Alert>
                    ) : null}
                    <TextField
                      fullWidth
                      multiline
                      minRows={22}
                      label="Resume text"
                      value={editedResume}
                      onChange={(event) => setState((current) => ({ ...current, editedResume: event.target.value }))}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 13,
                          lineHeight: 1.6,
                        },
                      }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ) : null}
          </Stack>

          <Box sx={{ position: { xl: "sticky" }, top: 24 }}>
            <ResumePdfViewerShell
              blobUrl={blobUrl}
              loading={previewLoading || generating}
              title={previewTitle ?? "Live preview"}
              subtitle={result ? "Updates as you edit the resume text." : "Generate a resume to see the PDF here."}
              atsScore={atsScore}
              atsReport={atsReport}
              emptyTitle="No preview yet"
              emptyBody="Paste a recruiter brief and click Generate resume to preview the tailored PDF."
              caption={result ? "Preview uses your saved resume theme. Save edits before downloading the stored PDF." : undefined}
            />
          </Box>
        </Box>
      </Stack>
    </AppShell>
  );

  function setDetail(key: keyof OpportunityDetails, value: string) {
    setState((current) => ({ ...current, details: { ...current.details, [key]: value } }));
  }
}
