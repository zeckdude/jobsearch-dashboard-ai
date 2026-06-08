import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfWeekUtc } from "@/lib/workflow-coach/session";
import { DAILY_STEPS } from "@/lib/workflow-coach/steps";

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    // Last 90 days of sessions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

    const sessions = await prisma.dailyWorkflowSession.findMany({
      where: { userId: user.id, date: { gte: ninetyDaysAgo } },
      include: { steps: { orderBy: { completedAt: "asc" } } },
      orderBy: { date: "desc" },
    });

    // Step breakdown — count completions per stepKey
    const stepCounts: Record<string, number> = {};
    const stepLastDone: Record<string, Date> = {};
    for (const session of sessions) {
      const seenInSession = new Set<string>();
      for (const step of session.steps) {
        if (!seenInSession.has(step.stepKey)) {
          seenInSession.add(step.stepKey);
          stepCounts[step.stepKey] = (stepCounts[step.stepKey] ?? 0) + 1;
          if (!stepLastDone[step.stepKey] || step.completedAt > stepLastDone[step.stepKey]) {
            stepLastDone[step.stepKey] = step.completedAt;
          }
        }
      }
    }

    const totalSessions = sessions.length;
    const stepBreakdown = DAILY_STEPS.map((s) => ({
      key: s.key,
      label: s.label,
      timing: s.timing,
      completions: stepCounts[s.key] ?? 0,
      completionRate: totalSessions > 0 ? Math.round(((stepCounts[s.key] ?? 0) / totalSessions) * 100) : 0,
      lastDoneAt: stepLastDone[s.key] ?? null,
    }));

    // Streak calculation — consecutive days with ≥1 step completed
    const sessionDates = new Set(
      sessions.filter((s) => s.steps.length > 0).map((s) => s.date.toISOString().split("T")[0])
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;

    const checkDate = new Date();
    // Allow today to count even if not yet complete
    for (let i = 0; i < 365; i++) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (sessionDates.has(dateStr)) {
        streak++;
        if (i <= 1) currentStreak = streak; // today or yesterday still counts
      } else {
        if (i > 0 && currentStreak === 0) break; // gap found
        streak = 0;
      }
      longestStreak = Math.max(longestStreak, streak);
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    // Weekly steps done this week
    const weekStart = startOfWeekUtc();
    const weekStepKeys = new Set<string>();
    for (const session of sessions) {
      if (session.date >= weekStart) {
        for (const step of session.steps) weekStepKeys.add(step.stepKey);
      }
    }

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        completionPct: s.completionPct,
        stepCount: new Set(s.steps.map((st) => st.stepKey)).size,
        steps: s.steps,
      })),
      stats: {
        totalSessions,
        currentStreak,
        longestStreak,
        avgCompletionPct:
          totalSessions > 0
            ? Math.round(sessions.reduce((sum, s) => sum + s.completionPct, 0) / totalSessions)
            : 0,
        weeklyStepsCompletedThisWeek: weekStepKeys.size,
      },
      stepBreakdown,
    });
  } catch (err) {
    console.error("[workflow-coach/history] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
