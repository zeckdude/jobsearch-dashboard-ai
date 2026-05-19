import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { buildCareerStandup, getLatestCareerStandup } from "@/lib/jolene/career-standup";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getUser();
    const standup = await getLatestCareerStandup(user.id);
    return NextResponse.json({ standup });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function POST() {
  try {
    const user = await getUser();
    const standup = await buildCareerStandup(user.id, { persist: true });
    return NextResponse.json({ standup });
  } catch (error) {
    return apiError(error, 400);
  }
}

async function getUser() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user exists. Run seed first.");
  return user;
}
