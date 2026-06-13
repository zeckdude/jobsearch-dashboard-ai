"use client";

import { useEffect, useRef, useState } from "react";
import type { PdfPreset } from "@/lib/pdf/simple-resume-pdf";
import type { AtsReadabilityReport } from "@/lib/resumes/schemas";

type UseLivePlainTextPreviewInput = {
  plainText: string;
  preset: PdfPreset;
  enabled?: boolean;
};

export function useLivePlainTextPreview({ plainText, preset, enabled = true }: UseLivePlainTextPreviewInput) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsReport, setAtsReport] = useState<AtsReadabilityReport | null>(null);
  const [error, setError] = useState("");
  const blobRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !plainText.trim()) {
      setBlobUrl(null);
      setAtsScore(null);
      setAtsReport(null);
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const body = { preset, plainText };

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
  }, [plainText, preset, enabled]);

  useEffect(() => () => {
    if (blobRef.current) URL.revokeObjectURL(blobRef.current);
  }, []);

  return { blobUrl, loading, atsScore, atsReport, error };
}
