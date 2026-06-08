import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession, logStepCompletion, removeStepFromSession } from "@/lib/workflow-coach/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      stepKey: string;
      durationSeconds?: number;
      metadata?: Record<string, unknown>;
    };

    if (!body.stepKey) {
      return NextResponse.json({ error: "stepKey is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    const session = await getOrCreateTodaySession(user.id);
    const log = await logStepCompletion(session.id, body.stepKey, body.durationSeconds, body.metadata);

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error("[workflow-coach/step] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json() as { stepKey: string };

    if (!body.stepKey) {
      return NextResponse.json({ error: "stepKey is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    await removeStepFromSession(user.id, body.stepKey);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[workflow-coach/step] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
