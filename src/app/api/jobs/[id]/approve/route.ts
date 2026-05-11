import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { matchId } = await request.json();
    const match = await prisma.jobProfileMatch.update({
      where: { id: matchId },
      data: { status: "approved", reviewedAt: new Date() },
    });

    return NextResponse.json({ jobId: params.id, match });
  } catch (error) {
    return apiError(error, 400);
  }
}
