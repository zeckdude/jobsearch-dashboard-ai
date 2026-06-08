import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession } from "@/lib/workflow-coach/session";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    const session = await getOrCreateTodaySession(user.id);
    return NextResponse.json(session);
  } catch (err) {
    console.error("[workflow-coach/session] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
