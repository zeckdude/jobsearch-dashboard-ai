# Rollback Intelligence Plan

## Summary

Manual rollback now stops a bad learned rule, but the system does not yet learn from the rollback itself. Add a feedback loop so disabling a `SkillAdjustment` creates a quality example and follow-up proposal context, making "this learned rule was wrong" part of future evaluations instead of only an audit status.

## Key Changes

- Extend `rejectSkillAdjustment` so rollback records structured metadata:
  - `disabledAt`, `disabledSource`, `disabledReason`
  - `rollbackLearningCaptured: true`
  - impact context when available: status, applied run count, failures, needs-review count, average score.
- Create a redacted `AgentQualityExample` when an active learned rule is disabled.
  - Source should identify rollback feedback.
  - Target should map from the adjustment skill, using the same skill-to-target mapping as learning impact.
  - Failure category should use the adjustment's proposal category when available, otherwise `learning_rule_rollback`.
- Add a lightweight quality proposal path for rollback examples:
  - If repeated rollback examples exist for the same target/category, create a review-only `AgentImprovementProposal`.
  - Do not auto-activate new skill adjustments from rollback-generated proposals in this phase.
- Update Settings copy and docs so rollback is described as a learning signal, not just a disable action.
- Fix stale `wiki/Home.md` wording that still says learning impact is read-only.

## Public Interfaces

- Keep existing endpoint:
  - `POST /api/skills/adjustments/[id]/reject`
- Extend optional request body:
  - `{ "reason": "...", "impact": { ... } }`
- Response remains compatible:
  - `{ "ok": true, "adjustment": ..., "message": "Learning rule disabled." }`
- Add `ROLLBACK` to `AgentQualityExampleSource` for rollback-generated quality examples.

## Test Plan

- Unit test rollback creates a quality example for an active proposal-backed adjustment.
- Unit test rollback preserves existing `patchJson` and stores rollback-learning metadata.
- Unit test missing or non-owned adjustments still fail without creating examples.
- Unit test repeated rollback examples can create a review-only improvement proposal.
- API route test passes reason and impact context into rollback handling.
- Regression test `runSkill` continues to ignore rejected adjustments.
- Verification: `npx prisma validate`, `npx tsc --noEmit --pretty false`, focused tests, full `npm test`, `npm run build`, and `npm run smoke:pages`.

## Assumptions

- Rollback intelligence remains review-only; it should not automatically create or activate a replacement rule.
- Rollback affects future runs only and does not rewrite historical evaluations.
- Use existing redaction patterns from the quality loop; do not store raw resumes, cover letters, prompts, or full field values.
