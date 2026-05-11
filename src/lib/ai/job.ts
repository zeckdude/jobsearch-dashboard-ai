import type { ExperienceBullet, JobSearchProfile, UserProfile } from "@prisma/client";
import { z } from "zod";
import { parseStructuredOutput } from "@/lib/ai/openai";
import { scoreJobForProfile, type ScoreInput } from "@/lib/job-search/scoring";

const scoreJobAgainstProfileSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  titleFit: z.number().int().min(0).max(100),
  skillFit: z.number().int().min(0).max(100),
  seniorityFit: z.number().int().min(0).max(100),
  industryFit: z.number().int().min(0).max(100),
  compensationFit: z.number().int().min(0).max(100),
  remoteFit: z.number().int().min(0).max(100),
  relocationFit: z.number().int().min(0).max(100),
  strongestMatches: z.array(z.string()),
  concerns: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  recommendedAction: z.string(),
  aiExplanation: z.string(),
});

export async function scoreJobAgainstProfile({
  job,
  profile,
  userProfile,
  experienceBullets,
}: {
  job: ScoreInput;
  profile: JobSearchProfile;
  userProfile?: UserProfile | null;
  experienceBullets?: ExperienceBullet[];
}) {
  const fallback = scoreJobForProfile(job, profile);

  try {
    const score = await parseStructuredOutput({
      schema: scoreJobAgainstProfileSchema,
      schemaName: "score_job_against_profile",
      system:
        "Score this job against the saved search profile and candidate profile. " +
        "Be strict about seniority, job title, required skills, compensation, remote constraints, relocation constraints, and excluded terms. " +
        "Do not assume the candidate has skills that are not in the supplied profile or verified bullets.",
      input: {
        normalizedJob: job,
        searchProfile: profile,
        candidateProfile: userProfile,
        verifiedExperienceBullets: experienceBullets?.map((bullet) => ({
          company: bullet.company,
          role: bullet.role,
          category: bullet.category,
          text: bullet.text,
          keywords: bullet.keywords,
        })),
        deterministicBaseline: fallback,
      },
    });

    return score ?? fallback;
  } catch (error) {
    console.warn("OpenAI job scoring failed; using deterministic fallback.", error);
    return fallback;
  }
}
