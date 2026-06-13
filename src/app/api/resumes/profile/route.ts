import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const resumeProfilePatchSchema = z.object({
  professionalSummary: z.string().max(4000).optional(),
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  coreSkills: z.array(z.string()).optional(),
});

export async function PATCH(request: Request) {
  try {
    const body = resumeProfilePatchSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: { profile: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile) {
      return NextResponse.json({ error: "No candidate profile exists." }, { status: 400 });
    }

    const data: Prisma.UserProfileUpdateInput = {};
    if (body.professionalSummary !== undefined) {
      data.professionalSummary = body.professionalSummary;
      data.masterSummary = body.professionalSummary;
    }
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.location !== undefined) data.location = body.location;
    if (body.coreSkills !== undefined) {
      data.coreSkills = body.coreSkills as Prisma.InputJsonValue;
      data.technicalSkills = body.coreSkills as Prisma.InputJsonValue;
    }

    const profile = await prisma.userProfile.update({
      where: { id: user.profile.id },
      data,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error, 400);
  }
}
