import { sendNotification } from "@/lib/notifications/send";
import { prisma } from "@/lib/prisma";

export async function notifyInterviewPrepReady(applicationId: string, source: "email" | "manual" | "outcome" = "manual") {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      jobPosting: { select: { company: true, title: true } },
      user: { include: { notificationSettings: true } },
    },
  });
  if (!application?.user.notificationSettings) return [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return sendNotification({
    user: application.user,
    settings: application.user.notificationSettings,
    subject: `Interview prep ready: ${application.jobPosting.company}`,
    body: [
      `Interview prep is ready for ${application.jobPosting.title} at ${application.jobPosting.company}.`,
      notificationSourceLine(source),
      "",
      `${appUrl}/applications/${application.id}`,
    ].join("\n"),
    payload: {
      source,
      applicationId: application.id,
      jobPostingId: application.jobPostingId,
      company: application.jobPosting.company,
      role: application.jobPosting.title,
    },
  });
}

function notificationSourceLine(source: "email" | "manual" | "outcome") {
  if (source === "email") return "This was triggered by a job-search email response.";
  if (source === "outcome") return "This was triggered by a recorded interview-stage outcome.";
  return "This was triggered from the application page.";
}
