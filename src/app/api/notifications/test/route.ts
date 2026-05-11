import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { sendNotification } from "@/lib/notifications/send";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await prisma.user.findFirst({
      include: { notificationSettings: true },
      orderBy: { createdAt: "asc" },
    });

    if (!user?.notificationSettings) {
      return NextResponse.json({ error: "Notification settings have not been created." }, { status: 400 });
    }

    const settings = user.notificationSettings;
    const body = [
      "Test notification requested.",
      `Email digest: ${settings.emailEnabled ? "enabled" : "disabled"} (${settings.emailAddress ?? "no address"})`,
      `Pushover: ${settings.pushoverEnabled ? "enabled" : "disabled"}`,
      `Push threshold: ${settings.minimumScoreForPush}`,
    ].join("\n");
    const logs = await sendNotification({
      user,
      settings,
      subject: "Job Search OS test notification",
      body,
      payload: { source: "settings_test" },
      force: true,
    });
    const sent = logs.some((log) => log.status === "sent");
    const failed = logs.filter((log) => log.status === "failed");

    return NextResponse.json({
      logs,
      message: sent ? "Test notification sent." : notificationFailureMessage(failed),
    });
  } catch (error) {
    return apiError(error, 400);
  }
}

function notificationFailureMessage(failed: Array<{ type: string; payload: unknown }>) {
  if (failed.length === 0) {
    return "Notification test logged. Add Resend, Postmark, or Pushover credentials to send real messages.";
  }

  const providerFailures = failed.map((log) => {
    const payload = log.payload as { provider?: string; response?: { message?: string; errors?: string[] } } | null;
    const provider = payload?.provider ?? log.type;
    const message = payload?.response?.message ?? payload?.response?.errors?.join(", ") ?? "provider rejected the request";
    return `${provider}: ${message}`;
  });
  return `Notification test failed. ${providerFailures.join(" | ")}`;
}
