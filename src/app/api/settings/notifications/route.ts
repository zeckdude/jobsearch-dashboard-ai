import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  emailAddress: z.string().email(),
  pushoverEnabled: z.boolean(),
  pushoverUserKey: z.string().optional(),
  pushoverAppToken: z.string().optional(),
  minimumScoreForPush: z.coerce.number().int().min(0).max(100),
  digestMode: z.enum(["every_run", "daily_summary", "strong_matches_only"]),
});

export async function PATCH(request: Request) {
  try {
    const body = notificationSettingsSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: { notificationSettings: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user) return NextResponse.json({ error: "No user exists. Run the seed script first." }, { status: 400 });

    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      update: body,
      create: {
        userId: user.id,
        ...body,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return apiError(error, 400);
  }
}
