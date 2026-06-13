"use client";

import { useEffect, useRef, useState } from "react";
import type { PdfPreset } from "@/lib/pdf/simple-resume-pdf";
import type { AtsReadabilityReport } from "@/lib/resumes/schemas";

type PreviewBullet = {
  company: string;
  role: string;
  text: string;
  truthLevel: string;
  category: string;
};

type PreviewProfile = {
  fullName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  professionalSummary?: string | null;
  masterSummary?: string;
  coreSkills?: unknown;
  technicalSkills?: unknown;
};

type PreviewWork = {
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
  summary?: string | null;
  skills?: unknown;
  achievements?: unknown;
  createdAt?: string;
};

type PreviewProject = {
  name: string;
  description?: string | null;
  technologies?: unknown;
};

type PreviewAdditionalSection = {
  title: string;
  content: string;
};

type UseLiveResumePreviewInput = {
  preset: PdfPreset;
  profile: PreviewProfile;
  bullets: PreviewBullet[];
  workExperiences?: PreviewWork[];
  projects?: PreviewProject[];
  education?: string[];
  certifications?: string[];
  additionalSections?: PreviewAdditionalSection[];
  enabled?: boolean;
};

function buildPreviewBody(input: Omit<UseLiveResumePreviewInput, "enabled">) {
  return {
    preset: input.preset,
    profile: input.profile,
    bullets: input.bullets,
    workExperiences: input.workExperiences,
    projects: input.projects,
    education: input.education,
    certifications: input.certifications,
    additionalSections: input.additionalSections,
  };
}

export function useLiveResumePreview({
  preset,
  profile,
  bullets,
  workExperiences,
  projects,
  education,
  certifications,
  additionalSections,
  enabled = true,
}: UseLiveResumePreviewInput) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsReport, setAtsReport] = useState<AtsReadabilityReport | null>(null);
  const [error, setError] = useState("");
  const blobRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError("");
      setAtsScore(null);
      setAtsReport(null);
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setBlobUrl(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const body = buildPreviewBody({
          preset,
          profile,
          bullets,
          workExperiences,
          projects,
          education,
          certifications,
          additionalSections,
        });

        const [pdfResponse, atsResponse] = await Promise.all([
          fetch("/api/resumes/preview/pdf", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
          fetch("/api/resumes/preview/ats", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
        ]);

        if (!pdfResponse.ok) {
          const pdfBody = await pdfResponse.json().catch(() => ({}));
          throw new Error(pdfBody.error ?? "Unable to render resume preview.");
        }

        if (requestIdRef.current !== requestId) return;

        const scoreHeader = pdfResponse.headers.get("x-ats-score");
        setAtsScore(scoreHeader ? Number(scoreHeader) : null);

        if (atsResponse.ok) {
          const atsBody = await atsResponse.json().catch(() => null);
          setAtsReport(atsBody);
        } else {
          setAtsReport(null);
        }

        const blob = await pdfResponse.blob();
        const nextUrl = URL.createObjectURL(blob);
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = nextUrl;
        setBlobUrl(nextUrl);
      } catch (previewError) {
        if (requestIdRef.current === requestId) {
          setError(previewError instanceof Error ? previewError.message : "Unable to render resume preview.");
        }
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [preset, profile, bullets, workExperiences, projects, education, certifications, additionalSections, enabled]);

  useEffect(() => () => {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
  }, []);

  return { blobUrl, loading, atsScore, atsReport, error };
}
