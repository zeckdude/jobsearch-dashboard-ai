import type { Prisma, SkillAdjustment } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RejectSkillAdjustmentInput = {
  adjustmentId: string;
  userId?: string | null;
  reason?: string | null;
  source?: string;
};

export async function rejectSkillAdjustment(input: RejectSkillAdjustmentInput): Promise<SkillAdjustment> {
  const existing = await prisma.skillAdjustment.findFirst({
    where: {
      id: input.adjustmentId,
      ...(input.userId ? { userId: input.userId } : {}),
    },
  });

  if (!existing) throw new Error("Skill adjustment not found.");

  const patch = objectValue(existing.patchJson);
  const disabledAt = new Date().toISOString();
  const disabledReason = input.reason?.trim();

  return prisma.skillAdjustment.update({
    where: { id: existing.id },
    data: {
      status: "REJECTED",
      patchJson: {
        ...patch,
        disabledAt,
        disabledSource: input.source ?? "settings_learning_impact",
        ...(disabledReason ? { disabledReason } : {}),
      },
    },
  });
}

function objectValue(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
