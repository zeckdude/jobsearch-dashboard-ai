import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { scanDueApplicationFollowUps } from "@/lib/applications/follow-up-reminders";

export const dynamic = "force-dynamic";

const scanFollowUpsSchema = z.object({
  limit: z.number().optional(),
});

export async function POST(request: Request) {
  try {
    const configuredSecret = process.env.FOLLOW_UP_SCAN_SECRET?.trim();
    if (configuredSecret && request.headers.get("authorization") !== `Bearer ${configuredSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = scanFollowUpsSchema.parse(await request.json().catch(() => ({})));
    const result = await scanDueApplicationFollowUps(new Date(), body.limit);

    return NextResponse.json({
      ...result,
      message: `Created ${result.created} follow-up reminder${result.created === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
