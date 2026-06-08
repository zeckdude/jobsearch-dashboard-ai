import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications/send";
import { todayDate, startOfWeekUtc } from "@/lib/workflow-coach/session";
import { DAILY_STEPS } from "@/lib/workflow-coach/steps";

const CRON_SECRET = process.env.CRON_SECRET;

type ReminderType = "morning" | "midday" | "evening" | "weekly";

const REMINDER_MESSAGES: Record<ReminderType, { subject: string; body: string }> = {
  morning: {
    subject: "☀️ Time for your morning workflow",
    body: "3 quick steps — Command Center → Needs Me → Jobs Review. Takes ~15 min and keeps the machine running.",
  },
  midday: {
    subject: "⚡ Midday check-in",
    body: "Any Ready to Apply apps waiting? Launch the Apply Sprint assistant for each one. ~10 min.",
  },
  evening: {
    subject: "🌙 Evening wrap-up",
    body: "Quick 5 min — check email updates and log any interview conversations before you call it a day.",
  },
  weekly: {
    subject: "📊 Weekly tune-up",
    body: "Run Market Intelligence, check Outcome Calibration, and tune any underperforming Search Profiles. ~15 min.",
  },
};

const WEEKLY_STEP_KEYS = DAILY_STEPS.filter((s) => s.timing === "weekly").map((s) => s.key);
const MORNING_STEP_KEYS = DAILY_STEPS.filter((s) => s.timing === "morning").map((s) => s.key);
const MIDDAY_STEP_KEYS = DAILY_STEPS.filter((s) => s.timing === "midday").map((s) => s.key);
const EVENING_STEP_KEYS = DAILY_STEPS.filter((s) => s.timing === "evening").map((s) => s.key);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      include: { notificationSettings: true },
    });

    if (!user?.notificationSettings) {
      return NextResponse.json({ skipped: "No user or notification settings" });
    }

    const settings = user.notificationSettings;
    const tz = settings.workflowReminderTimezone;

    // Get current hour in user's timezone
    const now = new Date();
    const localHour = parseInt(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: tz,
      }).format(now),
      10
    );

    // Get today's session steps
    const today = todayDate();
    const todaySession = await prisma.dailyWorkflowSession.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
      include: { steps: true },
    });
    const completedToday = new Set((todaySession?.steps ?? []).map((s) => s.stepKey));

    // Get this week's session steps
    const weekStart = startOfWeekUtc();
    const weeklySessions = await prisma.dailyWorkflowSession.findMany({
      where: { userId: user.id, date: { gte: weekStart } },
      include: { steps: true },
    });
    const completedThisWeek = new Set(weeklySessions.flatMap((s) => s.steps.map((st) => st.stepKey)));

    const sent: ReminderType[] = [];
    const skipped: string[] = [];

    const REMINDER_TYPES: ReminderType[] = ["morning", "midday", "evening", "weekly"];

    for (const type of REMINDER_TYPES) {
      const enabled = settings[`workflow${capitalize(type)}ReminderEnabled` as keyof typeof settings] as boolean;
      const configuredHour = settings[`workflow${capitalize(type)}ReminderHour` as keyof typeof settings] as number;

      if (!enabled) {
        skipped.push(`${type}: disabled`);
        continue;
      }

      if (localHour !== configuredHour) {
        skipped.push(`${type}: not the right hour (now=${localHour}, configured=${configuredHour})`);
        continue;
      }

      // Check dedup — did we already send this reminder in the last 2 hours?
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const recentLog = await prisma.notificationLog.findFirst({
        where: {
          userId: user.id,
          subject: { contains: REMINDER_MESSAGES[type].subject.slice(0, 20) },
          createdAt: { gte: twoHoursAgo },
        },
      });
      if (recentLog) {
        skipped.push(`${type}: already sent recently`);
        continue;
      }

      // Check if steps are already done
      if (type === "weekly") {
        const allWeeklyDone = WEEKLY_STEP_KEYS.every((k) => completedThisWeek.has(k));
        if (allWeeklyDone) {
          skipped.push(`${type}: all weekly steps done`);
          continue;
        }
      } else {
        const stepKeys = type === "morning" ? MORNING_STEP_KEYS : type === "midday" ? MIDDAY_STEP_KEYS : EVENING_STEP_KEYS;
        const allDone = stepKeys.every((k) => completedToday.has(k));
        if (allDone) {
          skipped.push(`${type}: all steps done`);
          continue;
        }
      }

      await sendNotification({
        user,
        settings,
        subject: REMINDER_MESSAGES[type].subject,
        body: REMINDER_MESSAGES[type].body,
        payload: { reminderType: type },
        force: false,
      });

      sent.push(type);
    }

    return NextResponse.json({ sent, skipped });
  } catch (err) {
    console.error("[workflow-reminder cron] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
