# LangSmith-First Observability Plan

## Summary

Add LangSmith as the app's observability and regression-learning layer, with redacted metadata tracing by default. The first target is the application assistant, because that is where missed fields, stale running states, weak learning, and user handoff failures are hardest to debug.

LangChain usage stays selective. We will not refactor the whole app into LangChain. LangGraph remains the durable assistant workflow layer, and LangSmith becomes the trace/evaluation layer around it.

## Key Changes

- Add optional LangSmith environment configuration:
  - `LANGSMITH_TRACING`
  - `LANGSMITH_API_KEY`
  - `LANGSMITH_ENDPOINT`
  - `LANGSMITH_PROJECT=job-search-os-local`
  - `LANGSMITH_TRACING_SAMPLING_RATE`
  - `LANGCHAIN_CALLBACKS_BACKGROUND=true` for local/dev use.
- Add server-only redaction helpers that mask resume text, cover letters, form answers, email/phone/address values, raw personal prompts, and secrets.
- Add durable trace metadata fields:
  - `AgentRun.observabilityJson`
  - `ApplicationAutomationRun.observabilityJson`
- Instrument the application assistant first:
  - assistant start
  - package validation
  - browser launch
  - field inventory
  - command decisions
  - command results
  - user pause/resume
  - manual input observation
  - submit/close detection
  - reset and stale recovery follow-up hooks.
- Instrument OpenAI helper calls with sanitized metadata:
  - structured output parsing
  - text generation
  - embeddings metadata only, not raw embedded text.
- Link user-reported skill feedback to available run and trace metadata so real failures can become future evaluation examples.
- Update README and wiki with setup, defaults, privacy behavior, and operational guidance.

## Interfaces

- New server-only helper API:
  - `isLangSmithEnabled(): boolean`
  - `traceWorkflowStep(name, metadata, fn)`
  - `traceAgentOperation(name, metadata, fn)`
  - `sanitizeTraceInput(value)`
  - `sanitizeTraceOutput(value)`
- Existing application APIs keep the same request/response shape.
- `ApplicationAutomationRun.workflowStateJson` remains the UI projection of assistant state.
- `observabilityJson` stores trace metadata only; it does not replace `AgentRunEvent`, `actionsJson`, or workflow events.

## Test Plan

- Unit tests:
  - Redaction masks emails, phone numbers, answer values, resume text, cover letter text, and secrets.
  - Redaction preserves useful debugging metadata such as field label, input type, category, required flag, ATS provider, command type, result, and confidence.
  - LangSmith disabled mode is a no-op when env vars are missing.
  - Assistant workflow still works when tracing throws or LangSmith is unavailable.
- Integration tests:
  - Starting assistant records sanitized observability metadata.
  - Field inventory and command results create traceable events without raw values.
  - Skill feedback links to related run observability metadata when present.
- Regression checks:
  - `npx tsc --noEmit --pretty false`
  - assistant workflow route tests
  - application package tests
  - field-learning tests
  - smoke test `/applications/assistant`, `/needs-me`, `/settings`.

## Assumptions

- Default tracing mode is redacted metadata.
- LangSmith is opt-in. If `LANGSMITH_TRACING` or `LANGSMITH_API_KEY` is missing, the app runs unchanged.
- V1 focuses on LangSmith observability and failure capture, not a broad LangChain refactor.
- No screenshots, full resumes, full cover letters, raw prompts, raw application answers, or browser page HTML are sent to LangSmith by default.
- LangChain refactors are deferred until traces show repeated orchestration duplication that would justify them.
