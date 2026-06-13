import { z } from "zod";
import { PDF_PRESET_VALUES } from "@/lib/pdf/simple-resume-pdf";

const bulletSchema = z.object({
  company: z.string(),
  role: z.string(),
  text: z.string(),
  truthLevel: z.string().optional(),
  category: z.string().optional(),
});

const workSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  summary: z.string().nullable().optional(),
  skills: z.unknown().optional(),
  achievements: z.unknown().optional(),
  createdAt: z.string().datetime().optional(),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  technologies: z.unknown().optional(),
});

const profileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  githubUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  professionalSummary: z.string().nullable().optional(),
  masterSummary: z.string().optional(),
  coreSkills: z.unknown().optional(),
  technicalSkills: z.unknown().optional(),
});

export const resumePreviewRequestSchema = z.union([
  z.object({
    preset: z.enum(PDF_PRESET_VALUES).optional(),
    plainText: z.string().min(1),
  }),
  z.object({
    preset: z.enum(PDF_PRESET_VALUES).optional(),
    profile: profileSchema,
    bullets: z.array(bulletSchema).default([]),
    workExperiences: z.array(workSchema).optional(),
    projects: z.array(projectSchema).optional(),
    education: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    additionalSections: z
      .array(
        z.object({
          title: z.string(),
          content: z.string(),
        }),
      )
      .optional(),
  }),
]);

export const resumeThemeSchema = z.object({
  preset: z.enum(PDF_PRESET_VALUES),
});

const previewProfileFieldsSchema = profileSchema.pick({ fullName: true, email: true });

export function canPreviewResumeProfile(profile: { fullName: string; email: string }) {
  return previewProfileFieldsSchema.safeParse(profile).success;
}
