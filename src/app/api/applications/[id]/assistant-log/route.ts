import { existsSync, readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const event = await prisma.applicationEvent.findFirst({
      where: {
        applicationId: params.id,
        type: "note_added",
      },
      orderBy: { createdAt: "desc" },
    });

    const payload = event?.payload as { logPath?: string; pid?: number } | null;
    const logPath = payload?.logPath;
    if (!logPath) {
      return NextResponse.json({ log: "", message: "No assistant log has been created for this application yet." });
    }

    const logRoot = path.join(process.cwd(), ".assistant-logs");
    const resolved = path.resolve(logPath);
    if (!resolved.startsWith(logRoot)) {
      return NextResponse.json({ error: "Assistant log path is outside the allowed log directory." }, { status: 400 });
    }

    const log = existsSync(resolved) ? readFileSync(resolved, "utf8") : "";
    return NextResponse.json({
      logPath: resolved,
      pid: payload?.pid,
      log,
      createdAt: event?.createdAt,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
