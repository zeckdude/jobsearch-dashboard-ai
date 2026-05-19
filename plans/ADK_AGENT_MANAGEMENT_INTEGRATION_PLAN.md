# ADK Agent Management Integration Plan

## Summary

Integrate Google ADK as an opt-in TypeScript agent control plane, not as a replacement for the app's existing LangGraph workflows. ADK should define, inspect, and run selected agents through a consistent registry while preserving current `AgentRun`, `AgentRunEvent`, LangSmith redaction, local quality loops, MCP tools, and LangGraph durability for the application assistant and recruiting agency.

## Key Changes

- Add an ADK runtime layer behind a feature flag:
  - Add `@google/adk`.
  - Add `ADK_ENABLED=false`, `ADK_MODEL=gemini-2.5-flash`, and optional Google credential env docs.
  - Create a server-only ADK adapter that prevents ADK imports from leaking into Next.js client/RSC bundles.
- Build an app-native ADK registry:
  - Register selected agents with metadata: id, display name, existing `AgentType`, runtime type, allowed tools, risk level, and whether the agent is read-only or mutating.
  - Start with low-risk agents only: `DAILY_COMMAND_CENTER`, `MARKET_INTELLIGENCE`, and a read-only Jolene advisory agent.
  - Keep `APPLICATION_ASSISTANT` and `RECRUITING_AGENCY` on LangGraph for now because they already depend on durable checkpointing, resume, repair, and browser state.
- Wrap existing app capabilities as ADK tools:
  - Expose read-only tools for dashboard summary, application queue state, job pipeline state, market intelligence context, candidate profile context, and generated material lookup.
  - Expose mutating tools only through existing guarded service functions and only for agents explicitly marked mutating.
  - Reuse the existing MCP server tool definitions where practical so ADK and MCP do not drift.
- Preserve current agent management records:
  - Every ADK run still creates an `AgentRun`.
  - ADK events, tool calls, decisions, and failures are projected into `AgentRunEvent`.
  - Store ADK-specific metadata inside `AgentRun.observabilityJson.adk`, avoiding a Prisma migration for v1.
  - Continue using existing local quality examples/evaluations; do not depend on ADK evals for production behavior in the first pass.
- Update Agent Board / docs:
  - Show runtime source per run: `service`, `langgraph`, or `adk`.
  - Show ADK tool activity in the same activity feed as existing agent events.
  - Document when to use ADK vs LangGraph vs plain services.

## Public Interfaces And Types

- New env vars:
  - `ADK_ENABLED`
  - `ADK_MODEL`
  - provider credentials required by the selected ADK model/runtime
- No database migration in v1.
- Existing API contracts remain unchanged.
- `AgentRun.observabilityJson` gains an `adk` object with runtime metadata, tool summaries, and redacted event ids.

## Test Plan

- Unit test the ADK registry:
  - registered agent metadata maps to valid existing `AgentType`
  - unsafe tools are not available to read-only agents
  - ADK disabled path falls back to existing deterministic services
- Unit test ADK runner adapter:
  - creates `AgentRun`
  - records ADK tool events as `AgentRunEvent`
  - marks completed and failed runs correctly
  - redacts sensitive payloads before observability storage
- Integration test one pilot agent:
  - run Daily Command Center through ADK when `ADK_ENABLED=true`
  - verify existing API response shape remains stable
  - verify Agent Board can read runtime metadata and event stream
- Verification:
  - `npx tsc --noEmit --pretty false`
  - focused agent tests
  - `npm run build`
  - smoke `/agents`, `/dashboard`, `/api/agents/daily-command-center`, and Jolene read-only advisory behavior

## Assumptions

- ADK TypeScript is the first runtime.
- ADK is introduced as a control plane and pilot runtime, not a wholesale orchestration replacement.
- LangGraph remains the durable workflow engine for application assistant and recruiting agency until ADK proves equivalent resume/checkpoint/repair behavior inside this app.
- Existing Postgres app state remains the source of truth; ADK memory is not used for production memory in v1.
- LangSmith remains optional observability, while local `AgentQuality*` tables remain the governed learning loop.
