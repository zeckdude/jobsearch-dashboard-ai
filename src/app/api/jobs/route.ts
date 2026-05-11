import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await prisma.jobPosting.findMany({
      include: {
        matches: {
          include: {
            jobSearchProfile: {
              select: { id: true, name: true },
            },
          },
        },
        source: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return apiError(error);
  }
}
