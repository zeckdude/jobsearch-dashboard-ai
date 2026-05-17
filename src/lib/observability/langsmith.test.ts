import { describe, expect, it } from "vitest";
import { isLangSmithEnabled, langSmithTraceMetadata, sanitizeTraceInput, traceWorkflowStep } from "@/lib/observability/langsmith";

describe("LangSmith observability helpers", () => {
  it("is disabled unless tracing and an API key are configured", () => {
    expect(isLangSmithEnabled({ LANGSMITH_TRACING: "true", LANGSMITH_API_KEY: "key" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(isLangSmithEnabled({ LANGSMITH_TRACING: "false", LANGSMITH_API_KEY: "key" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isLangSmithEnabled({ LANGSMITH_TRACING: "true", LANGSMITH_API_KEY: "" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it("stores metadata-only LangSmith configuration", () => {
    expect(langSmithTraceMetadata({
      LANGSMITH_TRACING: "true",
      LANGSMITH_API_KEY: "key",
      LANGSMITH_PROJECT: "job-search-os-test",
      LANGSMITH_ENDPOINT: "https://example.test",
    } as unknown as NodeJS.ProcessEnv)).toMatchObject({
      provider: "langsmith",
      enabled: true,
      project: "job-search-os-test",
      endpoint: "https://example.test",
      redactionMode: "metadata",
    });
  });

  it("redacts sensitive fields but keeps decision metadata", () => {
    const sanitized = sanitizeTraceInput({
      field: {
        label: "Cover letter",
        inputType: "textarea",
        category: "cover_letter",
        required: true,
        value: "My private cover letter text",
      },
      email: "person@example.com",
      phone: "555-123-4567",
      commandType: "fill",
      confidence: 91,
      apiKey: "secret",
    });

    expect(sanitized).toMatchObject({
      field: {
        label: "Cover letter",
        inputType: "textarea",
        category: "cover_letter",
        required: true,
        value: "[redacted]",
      },
      email: "[redacted]",
      phone: "[redacted]",
      commandType: "fill",
      confidence: 91,
      apiKey: "[redacted]",
    });
  });

  it("runs as a no-op when LangSmith is not configured", async () => {
    const priorTracing = process.env.LANGSMITH_TRACING;
    const priorKey = process.env.LANGSMITH_API_KEY;
    delete process.env.LANGSMITH_TRACING;
    delete process.env.LANGSMITH_API_KEY;
    await expect(traceWorkflowStep("test.step", { email: "person@example.com" }, async () => "ok")).resolves.toBe("ok");
    restoreEnv("LANGSMITH_TRACING", priorTracing);
    restoreEnv("LANGSMITH_API_KEY", priorKey);
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
