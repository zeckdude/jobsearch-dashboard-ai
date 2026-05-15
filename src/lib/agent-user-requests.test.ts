import { describe, expect, it } from "vitest";
import { agentUserRequestHref, agentUserRequestTypeLabel, buildAgentUserRequestData, buildAgentUserRequestNotification, buildAgentUserRequestResolutionEventPayload } from "@/lib/agent-user-requests";

describe("agent user requests", () => {
  it("builds open user request data from an agent blocker", () => {
    const data = buildAgentUserRequestData({
      userId: "user_1",
      agentRunId: "run_1",
      applicationId: "app_1",
      jobPostingId: "job_1",
      type: "UNKNOWN_ANSWER",
      question: "  What should I answer for sponsorship?  ",
      contextJson: { field: "sponsorship" },
    });

    expect(data).toMatchObject({
      userId: "user_1",
      agentRunId: "run_1",
      applicationId: "app_1",
      jobPostingId: "job_1",
      type: "UNKNOWN_ANSWER",
      status: "OPEN",
      question: "What should I answer for sponsorship?",
      contextJson: { field: "sponsorship" },
    });
  });

  it("links requests to the most useful context page", () => {
    expect(agentUserRequestHref({ applicationId: "app_1", jobPostingId: "job_1" })).toBe("/applications/app_1");
    expect(agentUserRequestHref({ applicationId: null, jobPostingId: "job_1" })).toBe("/jobs/job_1");
    expect(agentUserRequestHref({ applicationId: null, jobPostingId: null })).toBe("/dashboard");
  });

  it("formats request types for UI labels", () => {
    expect(agentUserRequestTypeLabel("APPLICATION_BLOCKED")).toBe("Application Blocked");
  });

  it("builds notification copy for agent blockers", () => {
    const notification = buildAgentUserRequestNotification({
      id: "request_1",
      type: "INTERVIEW_PREP",
      question: "This looks like an interview request. Confirm availability.",
      applicationId: "app_1",
      jobPostingId: "job_1",
    });

    expect(notification).toMatchObject({
      subject: "Job Search OS needs input: Interview Prep",
      href: "/applications/app_1",
    });
    expect(notification.body).toContain("The agent is paused until this is resolved.");
  });

  it("builds a non-sensitive application event when a blocker is resolved", () => {
    expect(buildAgentUserRequestResolutionEventPayload({
      requestId: "request_1",
      requestType: "UNKNOWN_ANSWER",
      question: "What should I answer for sponsorship?",
      status: "ANSWERED",
      answerSaved: true,
      resolvedAt: new Date("2026-05-15T18:00:00.000Z"),
    })).toEqual({
      source: "agent_user_request",
      requestId: "request_1",
      requestType: "UNKNOWN_ANSWER",
      question: "What should I answer for sponsorship?",
      status: "ANSWERED",
      answerSaved: true,
      resolvedAt: "2026-05-15T18:00:00.000Z",
    });
  });
});
