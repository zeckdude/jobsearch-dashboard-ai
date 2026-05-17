import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLearningRollbackAudit } from "@/lib/observability/rollback-audit";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillAdjustment: { findMany: vi.fn() },
    agentQualityExample: { findMany: vi.fn() },
    agentImprovementProposal: { findMany: vi.fn() },
  },
}));

const adjustmentFindManyMock = vi.mocked(prisma.skillAdjustment.findMany);
const exampleFindManyMock = vi.mocked(prisma.agentQualityExample.findMany);
const proposalFindManyMock = vi.mocked(prisma.agentImprovementProposal.findMany);

describe("learning rollback audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adjustmentFindManyMock.mockResolvedValue([
      adjustment({
        id: "adjustment_auto",
        skillId: "job_fit_scorer",
        patchJson: {
          source: "quality_proposal",
          category: "high_score_user_rejected",
          proposalId: "proposal_1",
          disabledAt: "2026-05-17T12:00:00.000Z",
          disabledSource: "auto_learning_rollback",
          disabledReason: "Auto rollback after failed evaluations.",
          rollbackLearningCaptured: true,
          rollbackImpact: {
            status: "needs_review",
            appliedRunCount: 3,
            relatedFailedCount: 1,
            relatedNeedsReviewCount: 2,
            averageScore: 42,
          },
        },
      }),
      adjustment({
        id: "adjustment_manual",
        skillId: "application_qa",
        patchJson: {
          source: "quality_proposal",
          category: "cover_letter_field",
          disabledAt: "2026-05-17T11:00:00.000Z",
          disabledSource: "settings_learning_impact",
          disabledReason: "Manual rollback.",
        },
      }),
      adjustment({
        id: "adjustment_plain_rejected",
        skillId: "job_fit_scorer",
        patchJson: { source: "quality_proposal", category: "dedupe_ineffective" },
      }),
    ] as never);
    exampleFindManyMock.mockResolvedValue([
      rollbackExample({ id: "example_1", adjustmentId: "adjustment_auto", target: "JOB_MATCHING", failureCategory: "high_score_user_rejected" }),
      rollbackExample({ id: "example_2", adjustmentId: "other", target: "APPLICATION_ASSISTANT", failureCategory: "cover_letter_field" }),
    ] as never);
    proposalFindManyMock.mockResolvedValue([
      rollbackProposal({ id: "proposal_auto", target: "JOB_MATCHING", rollbackCategory: "high_score_user_rejected", status: "PROPOSED" }),
      rollbackProposal({ id: "proposal_manual", target: "APPLICATION_ASSISTANT", rollbackCategory: "cover_letter_field", status: "DISMISSED" }),
    ] as never);
  });

  it("returns rejected adjustments with rollback metadata and linked rollback context", async () => {
    const audit = await getLearningRollbackAudit("user_1");

    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({
      adjustmentId: "adjustment_auto",
      skillId: "job_fit_scorer",
      source: "auto_learning_rollback",
      sourceLabel: "auto rollback",
      reason: "Auto rollback after failed evaluations.",
      category: "high_score_user_rejected",
      proposalId: "proposal_1",
      target: "JOB_MATCHING",
      impact: {
        status: "needs_review",
        appliedRunCount: 3,
        relatedFailedCount: 1,
        relatedNeedsReviewCount: 2,
        averageScore: 42,
      },
      rollbackExampleCount: 1,
      rollbackProposalCount: 1,
      latestProposalStatus: "PROPOSED",
    });
    expect(audit[1]).toMatchObject({
      adjustmentId: "adjustment_manual",
      sourceLabel: "learning impact",
      rollbackExampleCount: 1,
      rollbackProposalCount: 1,
      latestProposalStatus: "DISMISSED",
    });
  });
});

function adjustment(input: { id: string; skillId: string; patchJson: Record<string, unknown> }) {
  return {
    id: input.id,
    userId: "user_1",
    skillId: input.skillId,
    kind: "GUIDANCE",
    riskLevel: "LOW",
    status: "REJECTED",
    patchJson: input.patchJson,
    rationale: "Activated learning.",
    feedbackId: null,
    supersedesId: null,
    appliedAt: null,
    createdAt: new Date("2026-05-17T10:00:00.000Z"),
    updatedAt: new Date("2026-05-17T12:00:00.000Z"),
  };
}

function rollbackExample(input: { id: string; adjustmentId: string; target: string; failureCategory: string }) {
  return {
    id: input.id,
    target: input.target,
    source: "ROLLBACK",
    failureCategory: input.failureCategory,
    metadataJson: { source: "rollback_learning", adjustmentId: input.adjustmentId },
  };
}

function rollbackProposal(input: { id: string; target: string; rollbackCategory: string; status: string }) {
  return {
    id: input.id,
    target: input.target,
    status: input.status,
    metadataJson: { source: "rollback_learning", rollbackCategory: input.rollbackCategory },
  };
}
