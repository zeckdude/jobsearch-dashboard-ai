import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const workExperienceSchema = z.object({
  workExperiences: z.array(
    z.object({
      company: z.string().min(1),
      title: z.string().min(1),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
    }),
  ),
});

export async function PUT(request: Request) {
  try {
    const body = workExperienceSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: { profile: { include: { workExperiences: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile) {
      return NextResponse.json({ error: "No candidate profile exists." }, { status: 400 });
    }

    const existing = user.profile.workExperiences;
    const incoming = body.workExperiences;

    const matchedIds = new Set<string>();
    for (const work of incoming) {
      const match = existing.find(
        (entry) => !matchedIds.has(entry.id) && entry.company === work.company && entry.title === work.title,
      ) ?? existing.find((entry) => !matchedIds.has(entry.id));

      if (match) {
        matchedIds.add(match.id);
        await prisma.workExperience.update({
          where: { id: match.id },
          data: {
            company: work.company,
            title: work.title,
            startDate: work.startDate ?? null,
            endDate: work.endDate ?? null,
          },
        });
        continue;
      }

      await prisma.workExperience.create({
        data: {
          userProfileId: user.profile.id,
          company: work.company,
          title: work.title,
          startDate: work.startDate ?? null,
          endDate: work.endDate ?? null,
          achievements: [] as Prisma.InputJsonValue,
          skills: [] as Prisma.InputJsonValue,
        },
      });
    }

    const toDelete = existing.filter((entry) => !matchedIds.has(entry.id));
    if (toDelete.length) {
      await prisma.workExperience.deleteMany({
        where: { id: { in: toDelete.map((entry) => entry.id) } },
      });
    }

    const workExperiences = await prisma.workExperience.findMany({
      where: { userProfileId: user.profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workExperiences });
  } catch (error) {
    return apiError(error, 400);
  }
}
