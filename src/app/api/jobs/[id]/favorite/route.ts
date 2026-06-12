import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { addJobFavorite, removeJobFavorite } from "@/lib/jobs/favorites";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function resolveUserId() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!user) throw new Error("No user found.");
  return user.id;
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await resolveUserId();
    const result = await addJobFavorite(userId, params.id);
    return NextResponse.json({ jobId: params.id, ...result });
  } catch (error) {
    return apiError(error, 400);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await resolveUserId();
    const result = await removeJobFavorite(userId, params.id);
    return NextResponse.json({ jobId: params.id, ...result });
  } catch (error) {
    return apiError(error, 400);
  }
}
