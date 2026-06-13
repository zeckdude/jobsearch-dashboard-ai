import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const projectsSchema = z.object({
  projects: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      repoUrl: z.string().nullable().optional(),
      technologies: z.array(z.string()).default([]),
      highlights: z.array(z.string()).default([]),
    }),
  ),
});

export async function PUT(request: Request) {
  try {
    const body = projectsSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: { profile: { include: { projects: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile) {
      return NextResponse.json({ error: "No candidate profile exists." }, { status: 400 });
    }

    await prisma.project.deleteMany({ where: { userProfileId: user.profile.id } });

    for (const project of body.projects) {
      await prisma.project.create({
        data: {
          userProfileId: user.profile.id,
          name: project.name,
          description: project.description,
          url: project.url,
          repoUrl: project.repoUrl ?? project.url,
          technologies: project.technologies as Prisma.InputJsonValue,
          highlights: project.highlights as Prisma.InputJsonValue,
        },
      });
    }

    const projects = await prisma.project.findMany({
      where: { userProfileId: user.profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return apiError(error, 400);
  }
}
