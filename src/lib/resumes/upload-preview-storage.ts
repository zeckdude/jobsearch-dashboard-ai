import type { ParsedResume } from "@/lib/resumes/schemas";

const STORAGE_KEY = "resume-upload-preview";

export type ResumeUploadPreview = {
  fileName: string;
  fileType: string;
  extractedText: string;
  parsedJson: ParsedResume;
};

export function readResumeUploadPreview(): ResumeUploadPreview | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeUploadPreview;
  } catch {
    return null;
  }
}

export function writeResumeUploadPreview(preview: ResumeUploadPreview) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preview));
}

export function clearResumeUploadPreview() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
