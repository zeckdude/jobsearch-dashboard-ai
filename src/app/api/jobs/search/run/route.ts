import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { parseSearchRunOptionsBody } from "@/lib/job-search/run-options";
import { startJobSearchRun } from "@/lib/job-search/start-run";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const runOptions = parseSearchRunOptionsBody(body);
    const result = await startJobSearchRun("manual", { runOptions });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function DELETE() {
  try {
    const activeRun = await prisma.jobSearchRun.findFirst({
      where: { status: "running" },
      orderBy: { startedAt: "desc" },
    });

    if (!activeRun) {
      return NextResponse.json({ error: "No active search run to cancel." }, { status: 404 });
    }

    const updated = await prisma.jobSearchRun.update({
      where: { id: activeRun.id },
      data: {
        status: "cancelled",
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({ run: updated });
  } catch (error) {
    return apiError(error, 400);
  }
}
