import type { InterviewPrepOutput } from "@/lib/agents/interview-prep";
import { runInterviewPrepAgent } from "@/lib/agents/interview-prep";
import { notifyInterviewPrepReady } from "@/lib/applications/interview-prep-notifications";
import { syncInterviewPrepTasks } from "@/lib/applications/interview-prep-tasks";
import { prisma } from "@/lib/prisma";

type InterviewPrepSource = "email" | "manual" | "outcome";

export async function ensureInterviewPrepForApplication(input: {
  applicationId: string;
  userId: string;
  source: InterviewPrepSource;
  notify?: boolean;
}) {
  const existing = await prisma.agentRun.findFirst({
    where: {
      agentType: "INTERVIEW_PREP",
      inputJson: {
        path: ["applicationId"],
        equals: input.applicationId,
      },
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const prep = interviewPrepOutput(existing.outputJson);
    if (prep) {
      await syncInterviewPrepTasks({
        userId: input.userId,
        applicationId: input.applicationId,
        prep,
      });
    }
    return { run: existing, created: false };
  }

  const result = await runInterviewPrepAgent({
    applicationId: input.applicationId,
    userId: input.userId,
  });
  await syncInterviewPrepTasks({
    userId: input.userId,
    applicationId: input.applicationId,
    prep: result.output,
  });
  if (input.notify !== false) {
    await notifyInterviewPrepReady(input.applicationId, input.source).catch(() => null);
  }
  return { run: result.run, created: true };
}

function interviewPrepOutput(value: unknown): InterviewPrepOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<InterviewPrepOutput>;
  return typeof candidate.applicationId === "string"
    && typeof candidate.company === "string"
    && typeof candidate.role === "string"
    ? candidate as InterviewPrepOutput
    : null;
}
