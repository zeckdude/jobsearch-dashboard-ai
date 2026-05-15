import { createAgentUserRequest } from "@/lib/agent-user-requests";
import { prisma } from "@/lib/prisma";

export type FollowUpReminderResult = {
  scanned: number;
  created: number;
  skipped: number;
  requestIds: string[];
};

export async function scanDueApplicationFollowUps(now = new Date(), limit = 50): Promise<FollowUpReminderResult> {
  const applications = await prisma.application.findMany({
    where: {
      followUpAt: { lte: now },
      status: { in: ["applied", "follow_up_due"] },
    },
    include: {
      agentUserRequests: {
        where: {
          type: "FOLLOW_UP_DUE",
          status: "OPEN",
        },
        select: { id: true },
        take: 1,
      },
      jobPosting: { select: { company: true, title: true } },
    },
    orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
    take: clampFollowUpReminderLimit(limit),
  });

  const requestIds: string[] = [];
  let skipped = 0;
  for (const application of applications) {
    if (application.agentUserRequests.length > 0) {
      skipped += 1;
      continue;
    }

    const request = await createAgentUserRequest({
      userId: application.userId,
      applicationId: application.id,
      jobPostingId: application.jobPostingId,
      type: "FOLLOW_UP_DUE",
      question: `Follow up on ${application.jobPosting.company} - ${application.jobPosting.title}. Confirm whether to send a recruiter follow-up, mark ghosted, or update the outcome.`,
      contextJson: {
        source: "follow_up_reminder_scan",
        followUpAt: application.followUpAt?.toISOString() ?? null,
        status: application.status,
      },
    });
    requestIds.push(request.id);
  }

  return {
    scanned: applications.length,
    created: requestIds.length,
    skipped,
    requestIds,
  };
}

export function clampFollowUpReminderLimit(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(1, Math.round(value)));
}
