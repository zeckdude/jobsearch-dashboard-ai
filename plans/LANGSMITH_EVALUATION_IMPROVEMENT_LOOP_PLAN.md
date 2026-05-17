# LangSmith Evaluation And Improvement Loop Plan

## Summary

Extend LangSmith from passive tracing into an evaluation and learning layer, starting with the application assistant. The goal is to turn real assistant failures into repeatable evaluation examples, score assistant quality over time, and generate proposed improvements for review.

Default policy: redacted examples, propose-only improvements, no automatic prompt or behavior changes.

## Key Changes

- Add local evaluation models:
  - `AgentQualityDataset`
  - `AgentQualityExample`
  - `AgentQualityEvaluation`
  - `AgentImprovementProposal`
- Add application-assistant dataset capture:
  - Convert user mistake reports, failed assistant runs, manual corrections, missed field memories, stale run repairs, and submit-detection repairs into eval examples.
  - Store sensitive local details only as redacted/summarized metadata; do not send raw resume, cover letter, prompts, field values, screenshots, or browser HTML to LangSmith.
- Add assistant quality scoring:
  - Metrics: submit-state accuracy, missed-field rate, unknown-field handling, cover-letter-field handling, manual-correction rate, Needs Me resolution success, stale/failed run recovery, and repeated failure by ATS/provider.
  - Persist scores locally and optionally mirror redacted eval results to LangSmith.
- Add improvement proposal workflow:
  - Cluster repeated failed examples by ATS, field category, workflow step, schema name, or skill.
  - Generate proposed `AgentImprovementProposal` / `SkillAdjustment` records only.
  - Show proposals in Settings or Agents page with rationale, affected examples, risk level, and review controls.
  - Do not auto-apply prompt or behavior changes in v1.

## Interfaces

- New API routes:
  - `POST /api/observability/examples/backfill`
  - `POST /api/observability/evaluations/run`
  - `GET /api/observability/evaluations`
  - `POST /api/observability/proposals/[id]/accept`
  - `POST /api/observability/proposals/[id]/dismiss`
- Existing `SkillFeedback` capture should attach or create an `AgentQualityExample` when feedback is related to application automation.
- Existing assistant run repair and failure paths should create examples automatically when a run becomes `FAILED`, `NEEDS_USER` due to watcher/page-close issues, or is manually repaired to `SUBMITTED`.
- LangSmith remains optional. If not configured, all datasets/evals still work locally.

## Test Plan

- Unit tests:
  - Redaction preserves useful evaluator metadata while masking sensitive values.
  - Skill feedback creates an application-assistant quality example.
  - Failed/repaired assistant runs create examples with correct failure categories.
  - Evaluation scoring classifies pass/fail for known submit, missed-field, and stale-run scenarios.
  - Improvement proposals are created as `PROPOSED`, never auto-applied.
- Integration tests:
  - Backfill creates examples from recent assistant failures and repairs.
  - Evaluation run stores local results without LangSmith config.
  - LangSmith sync is no-op/fail-open when disabled or unavailable.
- Regression checks:
  - `npx tsc --noEmit --pretty false`
  - focused observability/evaluation tests
  - assistant workflow and automation-run tests
  - smoke `/applications/assistant`, `/agents`, `/settings`

## Assumptions

- First quality target is the application assistant.
- Evaluation examples are redacted by default.
- Improvements are propose-only in v1.
- LangSmith receives only redacted metadata unless a future explicit privacy review changes that.
- This layer scores and proposes improvements; it does not replace LangGraph, Playwright, field memory, or existing skill learning.
