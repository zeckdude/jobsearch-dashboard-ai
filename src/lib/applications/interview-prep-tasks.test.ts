import { describe, expect, it } from "vitest";
import { interviewPrepTaskDrafts } from "@/lib/applications/interview-prep-tasks";

describe("interview prep tasks", () => {
  it("creates persistent task drafts from interview prep output", () => {
    const tasks = interviewPrepTaskDrafts({
      applicationId: "app_1",
      company: "Acme",
      role: "Senior Frontend Engineer",
      positioning: "Positioning",
      likelyThemes: ["React/TypeScript product UI depth"],
      evidenceStories: [{
        title: "Progression Lab AI",
        evidenceRef: "ev_1",
        talkingPoint: "Explain structured AI product workflow.",
      }],
      likelyStages: ["Recruiter screen."],
      likelyAssessments: ["React/TypeScript UI implementation exercise."],
      risksToPrepare: ["Prepare a truthful boundary around infrastructure depth."],
      questionsToAsk: ["What would make someone successful in the first 90 days?"],
      followUpFocus: [],
      sourceNotes: ["Saved job description."],
      confidence: 0.7,
      reasoningSummary: "Built from evidence.",
    });

    expect(tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "risk", priority: 1 }),
      expect.objectContaining({ category: "story", evidenceRef: "ev_1" }),
      expect.objectContaining({ category: "theme" }),
      expect.objectContaining({ category: "assessment" }),
      expect.objectContaining({ category: "question" }),
    ]));
  });
});
