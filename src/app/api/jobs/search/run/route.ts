import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { runJobSearch } from "@/lib/job-search/ingest";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const profiles = await prisma.jobSearchProfile.findMany({
      where: { enabled: true },
      select: { id: true },
    });
    const run = await prisma.jobSearchRun.create({
      data: {
        status: "running",
        triggeredBy: "manual",
        profileIds: profiles.map((profile) => profile.id),
        progress: [{ at: new Date().toISOString(), message: "Search queued." }],
      },
    });

    void runJobSearch("manual", run.id).catch(async (error) => {
      const latest = await prisma.jobSearchRun.findUnique({
        where: { id: run.id },
        select: { progress: true },
      });
      const progress = Array.isArray(latest?.progress) ? latest.progress : [];
      await prisma.jobSearchRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errors: [{ message: error instanceof Error ? error.message : "Unknown search failure" }],
          progress: [
            ...progress,
            {
              at: new Date().toISOString(),
              message: `Search failed: ${error instanceof Error ? error.message : "Unknown search failure"}`,
            },
          ],
        },
      });
    });

    return NextResponse.json({ run }, { status: 202 });
  } catch (error) {
    return apiError(error, 400);
  }
}
