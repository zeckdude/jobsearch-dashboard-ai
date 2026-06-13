import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resumeThemeSchema } from "@/lib/resumes/preview-schema";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const body = resumeThemeSchema.parse(await request.json());
    const user = await prisma.user.findFirst({
      include: { profile: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.profile) {
      return NextResponse.json({ error: "No candidate profile exists. Upload and approve a resume first." }, { status: 400 });
    }

    const profile = await prisma.userProfile.update({
      where: { id: user.profile.id },
      data: { resumePdfPreset: body.preset },
    });

    return NextResponse.json({ resumePdfPreset: profile.resumePdfPreset });
  } catch (error) {
    return apiError(error, 400);
  }
}
