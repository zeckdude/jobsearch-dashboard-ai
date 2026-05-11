import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { createJobContentHash } from "@/lib/job-search/dedupe";
import { scoreJobAgainstProfile } from "@/lib/ai/job";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source = await prisma.jobSource.upsert({
      where: { type_name: { type: "manual", name: "Manual Paste" } },
      update: { enabled: true },
      create: { name: "Manual Paste", type: "manual", enabled: true },
    });
    const normalized = {
      company: body.company ?? "Unknown company",
      title: body.title ?? "Untitled role",
      location: body.location,
      description: body.description ?? body.text ?? "",
      applicationUrl: body.applicationUrl,
    };
    const contentHash = createJobContentHash(normalized);
    const job = await prisma.jobPosting.upsert({
      where: { contentHash },
      update: {
        ...normalized,
        sourceId: source.id,
        lastSeenAt: new Date(),
        rawData: body,
      },
      create: {
        ...normalized,
        sourceId: source.id,
        remoteType: body.remoteType ?? "unknown",
        atsProvider: body.atsProvider ?? "unknown",
        rawData: body,
        contentHash,
      },
    });
    const profiles = await prisma.jobSearchProfile.findMany({
      where: { enabled: true },
    });
    const userProfile = await prisma.userProfile.findFirst({
      include: { experienceBullets: { where: { truthLevel: "verified" } } },
    });
    const matches = [];

    for (const profile of profiles) {
      const score = await scoreJobAgainstProfile({
        job: normalized,
        profile,
        userProfile,
        experienceBullets: userProfile?.experienceBullets,
      });

      if (score.overallScore >= profile.minimumMatchScore) {
        const match = await prisma.jobProfileMatch.upsert({
          where: {
            jobPostingId_jobSearchProfileId: {
              jobPostingId: job.id,
              jobSearchProfileId: profile.id,
            },
          },
          update: {
            status: "needs_review",
            ...score,
          },
          create: {
            jobPostingId: job.id,
            jobSearchProfileId: profile.id,
            status: "needs_review",
            ...score,
          },
        });
        matches.push(match);
      }
    }

    return NextResponse.json({ job, matches }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
