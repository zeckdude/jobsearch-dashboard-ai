import type { NotificationSettings, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationPayload = {
  user: User;
  settings: NotificationSettings;
  subject: string;
  body: string;
  payload?: Record<string, unknown>;
  force?: boolean;
};

export async function sendNotification({ user, settings, subject, body, payload = {}, force = false }: NotificationPayload) {
  const logs = [];

  if ((settings.emailEnabled || force) && settings.emailAddress) {
    const email = await sendEmail(settings.emailAddress, subject, body);
    logs.push(
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          type: "email",
          subject,
          body,
          payload: { ...payload, provider: email.provider, response: email.response },
          status: email.status,
          sentAt: email.status === "sent" ? new Date() : null,
        },
      }),
    );
  }

  const pushoverUserKey = valueOrEnv(settings.pushoverUserKey, process.env.PUSHOVER_USER_KEY);
  const pushoverAppToken = valueOrEnv(settings.pushoverAppToken, process.env.PUSHOVER_APP_TOKEN);
  if ((settings.pushoverEnabled || force) && pushoverUserKey && pushoverAppToken) {
    const push = await sendPushover({
      userKey: pushoverUserKey,
      appToken: pushoverAppToken,
      subject,
      body,
    });
    logs.push(
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          type: "push",
          subject,
          body,
          payload: { ...payload, provider: "pushover", response: push.response },
          status: push.status,
          sentAt: push.status === "sent" ? new Date() : null,
        },
      }),
    );
  }

  if (logs.length === 0) {
    logs.push(
      await prisma.notificationLog.create({
        data: {
          userId: user.id,
          type: settings.emailEnabled ? "email" : "push",
          subject,
          body,
          payload: {
            ...payload,
            emailConfigured: Boolean(process.env.RESEND_API_KEY || process.env.POSTMARK_SERVER_TOKEN),
            pushoverConfigured: Boolean(pushoverUserKey && pushoverAppToken),
          },
          status: "provider_missing",
        },
      }),
    );
  }

  return logs;
}

async function sendEmail(to: string, subject: string, body: string) {
  const resendApiKey = normalizeOptional(process.env.RESEND_API_KEY);
  const postmarkServerToken = normalizeOptional(process.env.POSTMARK_SERVER_TOKEN);
  const fromEmail = normalizeOptional(process.env.NOTIFICATION_FROM_EMAIL);

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail ?? "Job Search OS <onboarding@resend.dev>",
        to,
        subject,
        text: body,
      }),
    });
    return { provider: "resend", status: response.ok ? "sent" : "failed", response: await safeJson(response) };
  }

  if (postmarkServerToken) {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": postmarkServerToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        From: fromEmail,
        To: to,
        Subject: subject,
        TextBody: body,
      }),
    });
    return { provider: "postmark", status: response.ok ? "sent" : "failed", response: await safeJson(response) };
  }

  return { provider: "none", status: "provider_missing", response: null };
}

async function sendPushover({
  userKey,
  appToken,
  subject,
  body,
}: {
  userKey: string;
  appToken: string;
  subject: string;
  body: string;
}) {
  const form = new URLSearchParams({
    token: appToken,
    user: userKey,
    title: subject,
    message: body.slice(0, 1024),
  });
  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return { status: response.ok ? "sent" : "failed", response: await safeJson(response) };
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

function normalizeOptional(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function valueOrEnv(value: string | null | undefined, envValue: string | undefined) {
  return normalizeOptional(value) ?? normalizeOptional(envValue);
}
