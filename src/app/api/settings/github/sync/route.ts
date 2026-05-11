import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { syncGithubRepositories } from "@/lib/github/context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await prisma.user.findFirst({
      include: { profile: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile?.githubUrl) {
      return NextResponse.json({ error: "Set a GitHub profile URL in Settings before syncing." }, { status: 400 });
    }

    const result = await syncGithubRepositories(user.profile.id, user.profile.githubUrl);

    return NextResponse.json({
      message: `Synced ${result.count} GitHub repositories for ${result.username}.`,
      ...result,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
