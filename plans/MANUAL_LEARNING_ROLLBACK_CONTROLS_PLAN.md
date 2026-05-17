# Manual Learning Rollback Controls

## Summary

Add an explicit rollback path for learned rules. The learning impact dashboard can already show `needs_review`, but it is read-only. This plan makes that signal actionable by letting you disable an active `SkillAdjustment` from Settings so it stops influencing future agent runs.

## Key Changes

- Add a server helper to disable a skill adjustment by changing `SkillAdjustment.status` from `ACTIVE` or `PROPOSED` to `REJECTED`.
- Preserve auditability by updating `patchJson` with disable metadata: `disabledAt`, `disabledSource`, and optional `disabledReason`.
- Add a POST route for disabling a learned rule at `/api/skills/adjustments/[id]/reject`.
- Add "Disable learning" actions in Settings:
  - In `Learning impact`, show the action for active rules, with stronger emphasis on `needs_review`.
  - In `Learning audit log`, show the same action for active adjustments.
- Keep rollback manual in this phase. No automatic disabling based on scores yet.
- Confirm existing skill execution continues to load only `ACTIVE` adjustments, so rejected rules stop affecting future runs without deleting history.

## Public Interfaces

- New API:
  - `POST /api/skills/adjustments/[id]/reject`
  - Optional JSON body: `{ "reason": "..." }`
  - Response: `{ "ok": true, "adjustment": { ... } }`
- No schema migration.
- No change to existing learning-impact API shape.

## Test Plan

- Unit test the disable helper:
  - Active adjustment becomes `REJECTED`.
  - Existing `patchJson` is preserved.
  - Disable metadata is added.
- API route tests:
  - Rejects a valid user-owned adjustment.
  - Returns not found or failure for a missing adjustment.
  - Handles already rejected adjustments safely.
- Regression test that rejected adjustments are not applied by future skill runs.
- UI/build verification:
  - `npx prisma validate`
  - `npx tsc --noEmit --pretty false`
  - focused tests for skill adjustment rollback
  - full test suite
  - production build
  - smoke pages

## Assumptions

- "Disable learning" means mark the adjustment `REJECTED`, not delete it.
- Rollback affects future agent behavior only; it does not rewrite prior runs, scores, or audit history.
- Auto-rollback should be planned separately after manual rollback proves useful.
