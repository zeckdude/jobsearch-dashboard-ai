import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DAILY_STEPS } from "./steps";

/** Get or create today's session for the user (date in UTC date). */
export async function getOrCreateTodaySession(userId: string) {
  const today = todayDate();

  let session = await prisma.dailyWorkflowSession.findUnique({
    where: { userId_date: { userId, date: today } },
    include: { steps: { orderBy: { completedAt: "asc" } } },
  });

  if (!session) {
    session = await prisma.dailyWorkflowSession.create({
      data: { userId, date: today },
      include: { steps: { orderBy: { completedAt: "asc" } } },
    });
  }

  return session;
}

/** Log a step completion and update the session completion percentage. */
export async function logStepCompletion(
  sessionId: string,
  stepKey: string,
  durationSeconds?: number,
  metadata?: Record<string, unknown>
) {
  const [log] = await Promise.all([
    prisma.dailyWorkflowStepLog.create({
      data: { sessionId, stepKey, durationSeconds, metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined },
    }),
    updateSessionCompletionPct(sessionId),
  ]);
  return log;
}

/** Remove all step logs for a given stepKey in today's session and recalculate completion. */
export async function removeStepFromSession(userId: string, stepKey: string) {
  const today = todayDate();
  const session = await prisma.dailyWorkflowSession.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (!session) return;

  await prisma.dailyWorkflowStepLog.deleteMany({
    where: { sessionId: session.id, stepKey },
  });
  await updateSessionCompletionPct(session.id);
}

async function updateSessionCompletionPct(sessionId: string) {
  const session = await prisma.dailyWorkflowSession.findUnique({
    where: { id: sessionId },
    include: { steps: true },
  });
  if (!session) return;

  const completedKeys = new Set(session.steps.map((s) => s.stepKey));
  const dailyOnlySteps = DAILY_STEPS.filter((s) => s.timing !== "weekly");
  const completedCount = dailyOnlySteps.filter((s) => completedKeys.has(s.key)).length;
  const pct = Math.round((completedCount / dailyOnlySteps.length) * 100);

  const isFullyComplete = pct === 100 ? new Date() : undefined;

  await prisma.dailyWorkflowSession.update({
    where: { id: sessionId },
    data: {
      completionPct: pct,
      ...(isFullyComplete && !session.completedAt ? { completedAt: isFullyComplete } : {}),
    },
  });
}

/** Returns the set of stepKeys completed today in a session. */
export function completedStepKeys(steps: { stepKey: string }[]): Set<string> {
  return new Set(steps.map((s) => s.stepKey));
}

/** Get the start of today as a Date at midnight UTC. */
export function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Get the start of the current ISO week (Monday) at midnight UTC. */
export function startOfWeekUtc(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((day + 6) % 7)));
  return monday;
}
