import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { rescoreNeedsReviewMatches } from "@/lib/job-search/rescore-matches";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  confirm: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json().catch(() => ({})));
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    const result = await rescoreNeedsReviewMatches({
      dryRun: !body.confirm,
      userId: user?.id,
    });

    return NextResponse.json({
      ...result,
      message: result.dryRun
        ? `Dry run: ${result.toDelete} would be deleted, ${result.toUpdate} would be updated (${result.skippedFavorites} favorites protected).`
        : `Rescored queue: deleted ${result.deleted}, updated ${result.updated} (${result.skippedFavorites} favorites protected).`,
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
