import type { AtsFactor, AtsReadabilityReport } from "@/lib/resumes/schemas";

export const ATS_ACCEPTABLE_SCORE = 76;
export const ATS_STRONG_SCORE = 88;
export const ATS_LEARN_MORE_PATH = "/docs/USER_GUIDE.md#ats-readability-score";

const REQUIRED_SECTIONS = ["Summary", "Skills", "Professional Experience"] as const;

type FactorTemplate = {
  id: string;
  label: string;
  pass: boolean;
  pointsLost: number;
  detail: string;
  recommendation: string;
  autoFixable: boolean;
  keepGuidance?: string;
};

export function checkAtsReadability(generatedPlainText: string, extractedPdfText = generatedPlainText): AtsReadabilityReport {
  const sectionsDetected = REQUIRED_SECTIONS.filter((section) => new RegExp(`\\b${section}\\b`, "i").test(extractedPdfText));
  const missingSections = REQUIRED_SECTIONS.filter((section) => !sectionsDetected.includes(section));
  const contactInfoDetected = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(extractedPdfText);
  const textExtractable = extractedPdfText.trim().length > 200;
  const educationDetected = /\bEducation\b/i.test(extractedPdfText);
  const projectsDetected = /\bProjects\b/i.test(extractedPdfText);

  const factorTemplates: FactorTemplate[] = [
    {
      id: "text-extractable",
      label: "Readable text volume",
      pass: textExtractable,
      pointsLost: 12,
      detail: textExtractable
        ? `Extracted ${extractedPdfText.trim().length} characters of resume text.`
        : "The PDF produced too little extractable text for ATS parsers.",
      recommendation: textExtractable
        ? "Keep substantive content in each major section."
        : "Add more resume body content in Edit Resume — summary, skills, experience, and supplemental sections.",
      autoFixable: false,
      keepGuidance: "Do not remove content solely for score — add missing sections instead.",
    },
    {
      id: "contact-email",
      label: "Contact email",
      pass: contactInfoDetected,
      pointsLost: 12,
      detail: contactInfoDetected ? "An email address was detected in the resume text." : "No email address was found in the generated resume text.",
      recommendation: contactInfoDetected ? "Keep your email visible near the top of the resume." : "Add your email in profile contact fields on Edit Resume.",
      autoFixable: false,
    },
    ...REQUIRED_SECTIONS.map((section) => ({
      id: `section-${section.toLowerCase().replace(/\s+/g, "-")}`,
      label: `${section} section`,
      pass: sectionsDetected.includes(section),
      pointsLost: 12,
      detail: sectionsDetected.includes(section)
        ? `The "${section}" heading was detected.`
        : `The "${section}" heading was not detected in plain text.`,
      recommendation: sectionsDetected.includes(section)
        ? `Keep the ${section} section — ATS parsers expect it.`
        : section === "Summary"
          ? "Add a professional summary in Edit Resume. The app can include the heading when summary text exists."
          : section === "Skills"
            ? "Add core skills in Edit Resume. The app can include the heading when skills exist."
            : "Save verified work history bullets in Edit Resume. The app includes experience when bullets exist.",
      autoFixable: section !== "Summary",
      keepGuidance: "Required for score — do not remove this section.",
    })),
    {
      id: "education-optional",
      label: "Education section (optional)",
      pass: educationDetected,
      pointsLost: 0,
      detail: educationDetected ? "Education content is present." : "No Education section detected.",
      recommendation: educationDetected
        ? "Keep education if accurate — it helps recruiters but does not change the ATS readability score."
        : "Add education in the Education editor if you want it on the PDF. Not required for the readability score.",
      autoFixable: false,
      keepGuidance: "Optional — add if relevant; omit only if you intentionally exclude education from this resume.",
    },
    {
      id: "projects-optional",
      label: "Projects section (optional)",
      pass: projectsDetected,
      pointsLost: 0,
      detail: projectsDetected ? "Projects content is present." : "No Projects section detected.",
      recommendation: projectsDetected
        ? "Keep strong projects that support your narrative. Weak or duplicate projects can be trimmed for clarity, not score."
        : "Add projects in the Projects editor if you want them on the PDF. Not required for the readability score.",
      autoFixable: false,
      keepGuidance: "Optional — keep projects that strengthen your story; remove only if they add noise.",
    },
  ];

  const factors: AtsFactor[] = factorTemplates.map((factor) => ({
    id: factor.id,
    label: factor.label,
    status: factor.pass ? "pass" : factor.pointsLost > 0 ? "fail" : "warn",
    pointsLost: factor.pass ? 0 : factor.pointsLost,
    detail: factor.detail,
    recommendation: factor.recommendation,
    autoFixable: factor.autoFixable,
    keepGuidance: factor.keepGuidance,
  }));

  const warnings = factors
    .filter((factor) => factor.status === "fail")
    .map((factor) => factor.detail);

  const score = Math.max(0, 100 - factors.reduce((total, factor) => total + factor.pointsLost, 0));

  return {
    textExtractable,
    contactInfoDetected,
    sectionsDetected: [...sectionsDetected],
    missingSections: [...missingSections],
    extractedTextLength: extractedPdfText.length,
    warnings,
    score,
    acceptableScore: ATS_ACCEPTABLE_SCORE,
    strongScore: ATS_STRONG_SCORE,
    factors,
  };
}

export function normalizeAtsReport(report: Partial<AtsReadabilityReport> | null | undefined): AtsReadabilityReport | null {
  if (!report || typeof report.score !== "number") return null;
  if (report.factors?.length) return report as AtsReadabilityReport;
  return checkAtsReadability(
    [
      report.sectionsDetected?.includes("Summary") ? "Summary\nExample" : "",
      report.sectionsDetected?.includes("Skills") ? "Skills\nReact" : "",
      report.sectionsDetected?.includes("Professional Experience") ? "Professional Experience\nAcme" : "",
      report.contactInfoDetected ? "alex@example.com" : "",
    ].filter(Boolean).join("\n"),
  );
}

export function atsScoreLabel(score: number, acceptable = ATS_ACCEPTABLE_SCORE, strong = ATS_STRONG_SCORE) {
  if (score >= strong) return "Strong";
  if (score >= acceptable) return "Acceptable";
  return "Needs work";
}
