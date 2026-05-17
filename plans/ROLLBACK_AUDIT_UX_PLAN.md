# Rollback Audit UX Plan

## Summary

Learning governance can now disable bad learned rules manually or through manual-triggered auto rollback, and rollbacks create quality examples/proposals. The next step is visibility: Settings should show a clear rollback history so it is obvious what was disabled, why, what impact signal caused it, and whether follow-up review proposals exist.

## Key Changes

- Add a rollback audit data helper for Settings that reads recent `SkillAdjustment` records with `status: "REJECTED"` and rollback metadata in `patchJson`.
- Include linked rollback context where available:
  - disabled source: manual learning impact, learning audit log, or auto rollback
  - disabled reason
  - disabled timestamp
  - original skill, category, proposal id, target
  - rollback impact snapshot
  - matching `ROLLBACK` quality example count
  - matching rollback-generated proposal count and latest status
- Add a "Rollback history" section under Learning Impact in Settings:
  - show recent rejected learned rules
  - filter visually by manual vs auto source with chips
  - show concise reason and impact numbers
  - link context through existing Settings proposal/audit areas rather than adding new pages
- Keep the section read-only in this phase. Restoring or reactivating rollback rules should be planned separately.
- Update docs to describe the rollback history surface.

## Public Interfaces

- No schema migration.
- Internal helper: `getLearningRollbackAudit(userId, limit = 25)`.
- No new API required unless a future client-side filter/search UI needs it.

## Test Plan

- Unit test rollback audit helper:
  - returns only rejected adjustments with rollback metadata
  - parses manual and auto rollback sources
  - includes impact snapshot values
  - counts matching `ROLLBACK` examples and rollback proposals
- Settings build/render coverage through existing `npm run build` and smoke pages.
- Full verification:
  - `npx prisma validate`
  - `npx tsc --noEmit --pretty false`
  - focused rollback audit tests
  - full `npm test`
  - `npm run build`
  - `npm run smoke:pages`

## Assumptions

- Rollback history is read-only.
- "Restore learned rule" is out of scope for this step.
- The audit view should summarize metadata only and must not expose raw resumes, cover letters, application answers, prompts, or browser content.
