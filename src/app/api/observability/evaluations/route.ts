import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    const where = user ? { userId: user.id, target: "APPLICATION_ASSISTANT" as const } : { target: "APPLICATION_ASSISTANT" as const };
    const [datasets, examples, evaluations, proposals] = await Promise.all([
      prisma.agentQualityDataset.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.agentQualityExample.findMany({
        where,
        include: {
          evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
          application: { include: { jobPosting: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.agentQualityEvaluation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      prisma.agentImprovementProposal.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 50,
      }),
    ]);
    const failed = evaluations.filter((evaluation) => evaluation.status === "FAILED").length;
    const needsReview = evaluations.filter((evaluation) => evaluation.status === "NEEDS_REVIEW").length;
    const passed = evaluations.filter((evaluation) => evaluation.status === "PASSED").length;
    const averageScore = evaluations.length
      ? Math.round(evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / evaluations.length)
      : null;
    return Response.json({
      datasets,
      examples,
      evaluations,
      proposals,
      summary: {
        examples: examples.length,
        evaluations: evaluations.length,
        passed,
        failed,
        needsReview,
        averageScore,
        proposedImprovements: proposals.filter((proposal) => proposal.status === "PROPOSED").length,
      },
    });
  } catch (error) {
    return apiError(error, 400);
  }
}
