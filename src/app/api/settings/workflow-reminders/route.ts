import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type WorkflowReminderPatch = {
  workflowMorningReminderEnabled?: boolean;
  workflowMorningReminderHour?: number;
  workflowMiddayReminderEnabled?: boolean;
  workflowMiddayReminderHour?: number;
  workflowEveningReminderEnabled?: boolean;
  workflowEveningReminderHour?: number;
  workflowWeeklyReminderEnabled?: boolean;
  workflowWeeklyReminderDay?: number;
  workflowWeeklyReminderHour?: number;
  workflowReminderTimezone?: string;
};

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as WorkflowReminderPatch;
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    const settings = await prisma.notificationSettings.upsert({
      where: { userId: user.id },
      update: body,
      create: { userId: user.id, ...body },
    });

    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings/workflow-reminders] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!user) return NextResponse.json({ error: "No user found" }, { status: 404 });

    const settings = await prisma.notificationSettings.findUnique({ where: { userId: user.id } });
    if (!settings) return NextResponse.json(null);

    return NextResponse.json({
      workflowMorningReminderEnabled: settings.workflowMorningReminderEnabled,
      workflowMorningReminderHour: settings.workflowMorningReminderHour,
      workflowMiddayReminderEnabled: settings.workflowMiddayReminderEnabled,
      workflowMiddayReminderHour: settings.workflowMiddayReminderHour,
      workflowEveningReminderEnabled: settings.workflowEveningReminderEnabled,
      workflowEveningReminderHour: settings.workflowEveningReminderHour,
      workflowWeeklyReminderEnabled: settings.workflowWeeklyReminderEnabled,
      workflowWeeklyReminderDay: settings.workflowWeeklyReminderDay,
      workflowWeeklyReminderHour: settings.workflowWeeklyReminderHour,
      workflowReminderTimezone: settings.workflowReminderTimezone,
    });
  } catch (err) {
    console.error("[settings/workflow-reminders] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
