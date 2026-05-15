import { describe, expect, it } from "vitest";
import { buildEmailApplicationEventPayload, classifyJobEmail } from "@/lib/email-response-agent";

describe("email response agent", () => {
  it("classifies rejection emails without requiring user action", () => {
    const result = classifyJobEmail({
      subject: "Update on your application",
      snippet: "Unfortunately, we are not moving forward.",
      bodyText: null,
    });

    expect(result).toMatchObject({
      classification: "REJECTION",
      actionRequired: false,
      recommendedOutcome: "REJECTED",
    });
  });

  it("classifies scheduling emails as actionable interview prep", () => {
    const result = classifyJobEmail({
      subject: "Next step with Acme",
      snippet: "Can you share availability to schedule a call?",
      bodyText: null,
    });

    expect(result).toMatchObject({
      classification: "SCHEDULING_REQUEST",
      actionRequired: true,
      recommendedOutcome: "RECRUITER_SCREEN",
    });
  });

  it("classifies technical assessments separately from generic interviews", () => {
    const result = classifyJobEmail({
      subject: "CodeSignal assessment",
      snippet: "Please complete the technical assessment.",
      bodyText: null,
    });

    expect(result).toMatchObject({
      classification: "CODING_ASSESSMENT",
      actionRequired: true,
      recommendedOutcome: "TECH_SCREEN",
    });
  });

  it("builds a compact application timeline payload for matched emails", () => {
    const classification = classifyJobEmail({
      subject: "Next step with Acme",
      snippet: "Can you share availability to schedule a call?",
      bodyText: null,
    });

    expect(buildEmailApplicationEventPayload({
      emailMessageId: "email_1",
      from: "recruiter@acme.example",
      subject: "Next step with Acme",
      receivedAt: new Date("2026-05-15T12:00:00.000Z"),
      classification,
    })).toEqual({
      source: "email_response_agent",
      emailMessageId: "email_1",
      from: "recruiter@acme.example",
      subject: "Next step with Acme",
      receivedAt: "2026-05-15T12:00:00.000Z",
      classification: "SCHEDULING_REQUEST",
      confidenceScore: 84,
      actionRequired: true,
      recommendedOutcome: "RECRUITER_SCREEN",
      rationale: "Detected interview or scheduling language.",
    });
  });
});
