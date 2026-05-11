import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { suggestSearchProfiles } from "@/lib/ai/profile-suggestions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const profile = await prisma.userProfile.findFirst({
      include: {
        experienceBullets: { where: { truthLevel: "verified" }, take: 120 },
        workExperiences: { take: 80 },
        projects: { take: 40 },
        githubRepositories: { orderBy: [{ pushedAt: "desc" }, { stars: "desc" }], take: 50 },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "No approved candidate profile exists. Upload and approve a resume first." }, { status: 400 });
    }

    const existingProfiles = await prisma.jobSearchProfile.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const existingNames = new Set(existingProfiles.map((item) => item.name.toLowerCase()));
    const suggestions = (await suggestSearchProfiles({
      userProfile: profile,
      bullets: profile.experienceBullets,
      workExperiences: profile.workExperiences,
      projects: profile.projects,
      githubRepositories: profile.githubRepositories,
    })).map((suggestion) => ({
      ...suggestion,
      alreadyExists: existingNames.has(suggestion.name.toLowerCase()),
    }));

    return NextResponse.json({
      generatedBy: process.env.OPENAI_API_KEY ? "openai_structured_outputs" : "deterministic_fallback",
      githubRepositoriesConsidered: profile.githubRepositories.length,
      verifiedBulletsConsidered: profile.experienceBullets.length,
      suggestions,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
