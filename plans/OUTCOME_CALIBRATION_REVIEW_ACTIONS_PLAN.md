# Outcome Calibration Review Actions Plan

## Summary

Add review-only action recommendations on top of outcome calibration drill-downs. The app should translate noisy signals into concrete next steps, such as pausing a weak source, tightening a search profile, raising a threshold, resolving duplicate groups, or repairing assistant reliability. Nothing should apply automatically in this phase.

## Key Changes

- Extend outcome calibration with an `actions` section for source review, profile tightening, duplicate resolution, suppression repair, and assistant failure review.
- Each action includes category, severity, title, summary, rationale, affected count, optional linked target, and a manual destination.
- Add Settings UI under Outcome Calibration that shows recommended review actions above signal drill-downs.
- Keep all actions advisory only; no source pausing, profile edits, threshold updates, duplicate merges, suppressions, proposals, or skill changes.
- Reuse existing outcome calibration API responses; no new route or schema migration.

## Test Plan

- Unit tests for each action category and clean calibration empty state.
- API tests continue to verify outcome responses include the added actions field.
- Regression checks: Prisma validate, TypeScript, focused outcome calibration tests, full tests, build, and smoke pages.

## Assumptions

- Settings remains the first surface.
- Existing drill-down details provide enough context for v1 actions.
- Converting repeated actions into formal proposals is a separate future step.
