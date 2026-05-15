import type { InterviewPrepOutput } from "@/lib/agents/interview-prep";
import { prisma } from "@/lib/prisma";

type PrepTaskDraft = {
  category: string;
  title: string;
  detail: string;
  evidenceRef?: string;
  priority: number;
};

export async function syncInterviewPrepTasks(input: {
  userId: string;
  applicationId: string;
  prep: InterviewPrepOutput;
}) {
  const drafts = interviewPrepTaskDrafts(input.prep);
  let count = 0;
  for (const draft of drafts) {
    await prisma.interviewPrepTask.upsert({
      where: {
        applicationId_title: {
          applicationId: input.applicationId,
          title: draft.title,
        },
      },
      create: {
        userId: input.userId,
        applicationId: input.applicationId,
        category: draft.category,
        title: draft.title,
        detail: draft.detail,
        evidenceRef: draft.evidenceRef,
        priority: draft.priority,
      },
      update: {
        category: draft.category,
        detail: draft.detail,
        evidenceRef: draft.evidenceRef,
        priority: draft.priority,
      },
    });
    count += 1;
  }
  return { count };
}

export function interviewPrepTaskDrafts(prep: InterviewPrepOutput): PrepTaskDraft[] {
  const drafts: PrepTaskDraft[] = [];
  for (const [index, risk] of prep.risksToPrepare.slice(0, 4).entries()) {
    drafts.push({
      category: "risk",
      title: `Prepare risk: ${shortTitle(risk)}`,
      detail: risk,
      priority: index + 1,
    });
  }
  for (const [index, story] of prep.evidenceStories.slice(0, 5).entries()) {
    drafts.push({
      category: "story",
      title: `Practice story: ${story.title}`,
      detail: story.talkingPoint,
      evidenceRef: story.evidenceRef,
      priority: index + 2,
    });
  }
  for (const [index, theme] of prep.likelyThemes.slice(0, 4).entries()) {
    drafts.push({
      category: "theme",
      title: `Review theme: ${theme}`,
      detail: `Prepare concise examples and tradeoffs for ${theme}.`,
      priority: index + 3,
    });
  }
  for (const [index, assessment] of (prep.likelyAssessments ?? []).slice(0, 4).entries()) {
    drafts.push({
      category: "assessment",
      title: `Practice assessment: ${shortTitle(assessment)}`,
      detail: assessment,
      priority: index + 2,
    });
  }
  for (const [index, question] of prep.questionsToAsk.slice(0, 4).entries()) {
    drafts.push({
      category: "question",
      title: `Ask: ${shortTitle(question)}`,
      detail: question,
      priority: index + 4,
    });
  }

  return dedupeByTitle(drafts).slice(0, 14);
}

function shortTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

function dedupeByTitle(drafts: PrepTaskDraft[]) {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = draft.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
