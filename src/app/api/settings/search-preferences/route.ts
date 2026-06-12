import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import {
  hardcodedSearchPreferencesDefaults,
  serializeRunOptions,
  preferencesToRunOptions,
} from "@/lib/job-search/run-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  maxPostedAgeDays: z.number().int().min(0).nullable().optional(),
  postedAfter: z.string().nullable().optional(),
  postedBefore: z.string().nullable().optional(),
  includeUnknownPostedDates: z.boolean().optional(),
  defaultSourceIds: z.array(z.string()).optional(),
  defaultProfileIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ preferences: hardcodedSearchPreferencesDefaults, runOptions: serializeRunOptions(preferencesToRunOptions(hardcodedSearchPreferencesDefaults)) });
    }

    const prefs = await prisma.jobSearchPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        maxPostedAgeDays: 14,
        includeUnknownPostedDates: true,
        defaultSourceIds: [],
        defaultProfileIds: [],
      },
    });

    const preferences = {
      maxPostedAgeDays: prefs.maxPostedAgeDays,
      postedAfter: prefs.postedAfter,
      postedBefore: prefs.postedBefore,
      includeUnknownPostedDates: prefs.includeUnknownPostedDates,
      defaultSourceIds: Array.isArray(prefs.defaultSourceIds) ? prefs.defaultSourceIds.filter((id): id is string => typeof id === "string") : [],
      defaultProfileIds: Array.isArray(prefs.defaultProfileIds) ? prefs.defaultProfileIds.filter((id): id is string => typeof id === "string") : [],
    };

    return NextResponse.json({
      preferences,
      runOptions: serializeRunOptions(preferencesToRunOptions(preferences)),
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = patchSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "No user exists. Run seed first." }, { status: 400 });
    }

    const current = await prisma.jobSearchPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        maxPostedAgeDays: 14,
        includeUnknownPostedDates: true,
        defaultSourceIds: [],
        defaultProfileIds: [],
      },
    });

    const updated = await prisma.jobSearchPreferences.update({
      where: { id: current.id },
      data: {
        ...(body.maxPostedAgeDays !== undefined ? { maxPostedAgeDays: body.maxPostedAgeDays } : {}),
        ...(body.postedAfter !== undefined ? { postedAfter: body.postedAfter ? new Date(body.postedAfter) : null } : {}),
        ...(body.postedBefore !== undefined ? { postedBefore: body.postedBefore ? new Date(body.postedBefore) : null } : {}),
        ...(body.includeUnknownPostedDates !== undefined ? { includeUnknownPostedDates: body.includeUnknownPostedDates } : {}),
        ...(body.defaultSourceIds !== undefined ? { defaultSourceIds: body.defaultSourceIds } : {}),
        ...(body.defaultProfileIds !== undefined ? { defaultProfileIds: body.defaultProfileIds } : {}),
      },
    });

    const preferences = {
      maxPostedAgeDays: updated.maxPostedAgeDays,
      postedAfter: updated.postedAfter,
      postedBefore: updated.postedBefore,
      includeUnknownPostedDates: updated.includeUnknownPostedDates,
      defaultSourceIds: Array.isArray(updated.defaultSourceIds) ? updated.defaultSourceIds.filter((id): id is string => typeof id === "string") : [],
      defaultProfileIds: Array.isArray(updated.defaultProfileIds) ? updated.defaultProfileIds.filter((id): id is string => typeof id === "string") : [],
    };

    return NextResponse.json({
      preferences,
      runOptions: serializeRunOptions(preferencesToRunOptions(preferences)),
      message: "Search defaults saved.",
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
