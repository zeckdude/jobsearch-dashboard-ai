import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = patchSchema.parse(await request.json());
    const source = await prisma.jobSource.update({
      where: { id: params.id },
      data: { enabled: body.enabled },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
      },
    });
    return NextResponse.json({ source, message: `${source.name} ${source.enabled ? "enabled" : "disabled"}.` });
  } catch (error) {
    return apiError(error, 400);
  }
}
