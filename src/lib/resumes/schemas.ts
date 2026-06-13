import { z } from "zod";

export const parseUploadedResumeSchema = z.object({
  contactInfo: z.object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedinUrl: z.string().optional(),
    githubUrl: z.string().optional(),
    portfolioUrl: z.string().optional(),
  }),
  professionalSummary: z.string().optional(),
  skills: z.object({
    coreSkills: z.array(z.string()).default([]),
    technicalSkills: z.array(z.string()).default([]),
    toolsFrameworksLibraries: z.array(z.string()).default([]),
    programmingLanguages: z.array(z.string()).default([]),
  }),
  workExperience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isCurrent: z.boolean().default(false),
      summary: z.string().optional(),
      skills: z.array(z.string()).default([]),
      achievements: z.array(z.string()).default([]),
    }),
  ),
  experienceBullets: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      text: z.string(),
      category: z.string(),
      metrics: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
      keywords: z.array(z.string()).default([]),
      sourceText: z.string(),
      truthLevel: z.enum(["verified", "inferred", "needs_review"]).default("needs_review"),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      url: z.string().optional(),
      repoUrl: z.string().optional(),
      technologies: z.array(z.string()).default([]),
      highlights: z.array(z.string()).default([]),
    }),
  ),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  additionalSections: z
    .array(
      z.object({
        title: z.string(),
        content: z.string(),
      }),
    )
    .default([]),
  inferredTags: z.array(z.string()).default([]),
  fieldsNeedingReview: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export type ParsedResume = z.infer<typeof parseUploadedResumeSchema>;

export const tailorResumeForJobSchema = z.object({
  tailoredSummary: z.string(),
  selectedSkills: z.array(z.string()),
  selectedExperienceBullets: z.array(
    z.object({
      bulletId: z.string(),
      rationale: z.string(),
    }),
  ),
  projectSelections: z.array(
    z.object({
      projectId: z.string(),
      rationale: z.string(),
    }),
  ),
  keywordAlignment: z.object({
    matchedTerms: z.array(z.string()).default([]),
    missingTerms: z.array(z.string()).default([]),
    method: z.string(),
    notes: z.array(z.string()).default([]),
  }),
  markdownResume: z.string(),
  plainTextResume: z.string(),
  warnings: z.array(z.string()),
  unsupportedClaimsDetected: z.array(z.string()),
});

export const validateGeneratedResumeSchema = z.object({
  isTruthful: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  weakClaims: z.array(z.string()),
  missingHighValueKeywords: z.array(z.string()),
  overusedKeywords: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const generateCoverLetterSchema = z.object({
  body: z.string(),
  toneNotes: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
  unsupportedClaimsDetected: z.array(z.string()).default([]),
});

export const atsFactorSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["pass", "warn", "fail"]),
  pointsLost: z.number(),
  detail: z.string(),
  recommendation: z.string(),
  autoFixable: z.boolean(),
  keepGuidance: z.string().optional(),
});

export const checkAtsReadabilitySchema = z.object({
  textExtractable: z.boolean(),
  contactInfoDetected: z.boolean(),
  sectionsDetected: z.array(z.string()),
  missingSections: z.array(z.string()),
  extractedTextLength: z.number(),
  warnings: z.array(z.string()),
  score: z.number().min(0).max(100),
  acceptableScore: z.number(),
  strongScore: z.number(),
  factors: z.array(atsFactorSchema).default([]),
});

export type AtsReadabilityReport = z.infer<typeof checkAtsReadabilitySchema>;
export type AtsFactor = z.infer<typeof atsFactorSchema>;
