import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSetupCheck } from "@/lib/workflow-coach/setup-check";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    const status = await runSetupCheck(user.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("[workflow-coach/setup-check] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
