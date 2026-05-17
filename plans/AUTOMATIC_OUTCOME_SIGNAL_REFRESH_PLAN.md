# Automatic Outcome Signal Refresh Plan

## Summary

Make outcome calibration operational by refreshing it automatically when high-signal events happen, instead of relying on manual recompute from Settings. The app should update redacted outcome quality examples after rejections, applied marks, explicit application outcomes, email-derived outcomes, assistant failures, and search/match state changes that can indicate resurfacing or duplicate noise.

## Key Changes

- Add a shared outcome-refresh helper around `recomputeOutcomeCalibration(userId)`.
- Trigger refresh after job rejection/archive changes, Apply Sprint deletion, application outcome recording, email-derived outcomes, and assistant terminal states.
- Keep refresh best-effort and fail-open so user actions are never blocked by observability work.
- Preserve source metadata such as `settings_manual`, `job_rejected`, `application_outcome`, `email_outcome`, `assistant_state`, and `search_state`.
- Keep Settings manual recompute as a repair/backfill action.

## Interfaces

- Keep `GET /api/observability/outcomes`.
- Keep `POST /api/observability/outcomes/recompute`, with optional body `{ "source": "settings_manual" | "job_rejected" | "application_outcome" | "email_outcome" | "assistant_state" | "search_state" }`.
- No schema migration. Source metadata is stored in existing redacted `AgentQualityExample.metadataJson`.

## Test Plan

- Unit tests for refresh helper failure handling, recompute idempotency, and source metadata.
- Route/service tests for job rejection, application outcomes, email outcomes, and assistant terminal states triggering refresh.
- Regression checks: Prisma validate, TypeScript, focused tests, full tests, build, and smoke pages.

## Assumptions

- Automatic refresh is non-blocking and best-effort.
- Existing schema is enough for this phase.
- This only keeps calibration current; richer drill-down UI and outcome-driven review actions remain separate future work.
