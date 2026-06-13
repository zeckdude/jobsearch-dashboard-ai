import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resetResumeContent } from "@/lib/resumes/reset-resume";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 400 });

    const result = await resetResumeContent(user.id);
    return NextResponse.json({ ok: true, profileId: result.profileId });
  } catch (error) {
    return apiError(error, 400);
  }
}
