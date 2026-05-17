# Auto Rollback Policy Plan

## Summary

The app can now show learning impact, manually disable learned rules, and learn from rollbacks. The next step is a conservative automatic rollback policy: when an active proposal-backed learning rule repeatedly shows bad impact, the system should disable it, capture rollback learning, and leave a clear audit trail. This should be fail-safe and bounded, not a self-modifying prompt/code loop.

## Key Changes

- Add a server-side auto-rollback helper that scans active proposal-backed `SkillAdjustment` rules through the existing learning-impact logic.
- Disable only rules with strong negative signals:
  - `status === "needs_review"`
  - at least `2` applied runs
  - either `relatedFailedCount >= 1` or `relatedNeedsReviewCount >= 2`
- Reuse `rejectSkillAdjustment` so auto rollback:
  - marks the rule `REJECTED`
  - stores `disabledSource: "auto_learning_rollback"`
  - stores the impact snapshot in `patchJson.rollbackImpact`
  - creates the existing `ROLLBACK` quality example and review-only proposal path.
- Add an API endpoint:
  - `POST /api/observability/learning-impact/auto-rollback`
  - Optional body: `{ "dryRun": true }`
  - Response: `{ ok, scanned, eligible, rolledBack, results }`
- Add Settings controls near Learning Impact:
  - "Preview auto rollback" shows which rules would be disabled.
  - "Run auto rollback" performs the action.
  - Copy must state that auto rollback only disables future use and never deletes history.
- Keep automatic rollback manual-triggered in this phase. No scheduled/background rollback yet.

## Public Interfaces

- New API:
  - `POST /api/observability/learning-impact/auto-rollback`
- Request:
  - `{ "dryRun": boolean }`, default `false`
- Response result item:
  - `adjustmentId`, `skillId`, `category`, `status`, `eligible`, `reason`, and `rolledBack`.
- No schema migration required.

## Test Plan

- Unit test eligibility:
  - eligible when `needs_review`, `appliedRunCount >= 2`, and failed/needs-review thresholds are met.
  - not eligible for `helping`, `neutral`, `insufficient_data`, or low sample size.
- Unit test dry run does not call `rejectSkillAdjustment`.
- Unit test live run calls `rejectSkillAdjustment` with `source: "auto_learning_rollback"` and full impact context.
- API route test covers dry-run and live-run responses.
- Settings render/build check for the new controls.
- Full verification: `npx prisma validate`, `npx tsc --noEmit --pretty false`, focused tests, full `npm test`, `npm run build`, and `npm run smoke:pages`.

## Assumptions

- Auto rollback is opt-in/manual-triggered from Settings for now.
- Auto rollback only affects future skill runs; it does not rewrite old runs, examples, evaluations, or proposals.
- Rollback-created proposals remain review-only and do not auto-activate replacement learning.
