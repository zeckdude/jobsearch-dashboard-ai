import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toExperienceCategory } from "@/lib/resumes/db";

export const dynamic = "force-dynamic";

const createBulletSchema = z.object({
  userProfileId: z.string().optional(),
  company: z.string().min(1),
  role: z.string().min(1),
  category: z.string().min(1),
  text: z.string().min(1),
  keywords: z.string().optional(),
  sourceText: z.string().optional(),
  truthLevel: z.enum(["verified", "inferred", "estimated", "needs_review"]).default("verified"),
});

export async function POST(request: Request) {
  try {
    const body = createBulletSchema.parse(await request.json());
    const profile =
      body.userProfileId
        ? await prisma.userProfile.findUnique({ where: { id: body.userProfileId } })
        : await prisma.userProfile.findFirst({ orderBy: { createdAt: "asc" } });

    if (!profile) {
      return NextResponse.json({ error: "Create or seed a candidate profile before adding bullets." }, { status: 400 });
    }

    const keywords = body.keywords
      ? body.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
      : [];
    const bullet = await prisma.experienceBullet.create({
      data: {
        userProfileId: profile.id,
        company: body.company,
        role: body.role,
        category: toExperienceCategory(body.category),
        text: body.text,
        keywords: keywords as Prisma.InputJsonValue,
        metrics: {},
        sourceText: body.sourceText || body.text,
        truthLevel: body.truthLevel,
      },
    });

    return NextResponse.json({ bullet }, { status: 201 });
  } catch (error) {
    return apiError(error, 400);
  }
}
