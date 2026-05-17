# Outcome Calibration Trends Plan

## Summary
Persist outcome calibration snapshots so the app can show whether job search, matching, recruiting agency, and application assistant quality are improving or regressing over time. This turns the current live scorecard into a trendable quality history without changing agent behavior automatically.

## Key Changes
- Add an `OutcomeCalibrationSnapshot` Prisma model with aggregate JSON fields for summary, workflows, signals, and actions.
- Capture snapshots from manual recompute and automatic outcome refresh paths.
- Throttle automatic snapshot writes so high-frequency events do not create excessive rows.
- Add trend reader logic that compares the latest snapshot with a prior snapshot and classifies metric/workflow movement.
- Add `GET /api/observability/outcomes/trends`.
- Add a read-only Outcome trends section in Settings.
- Update README and wiki docs to explain aggregate trend snapshots.

## Public Interfaces
- New API: `GET /api/observability/outcomes/trends`.
- Existing outcome endpoints keep their existing response shapes.
- Manual recompute and background refresh may write aggregate trend snapshots as a side effect.

## Test Plan
- Prisma validation for the new model and migration.
- Unit test snapshot persistence and automatic-refresh throttling.
- Unit test trend classification for improving, flat, regressing, and insufficient data.
- Route test `GET /api/observability/outcomes/trends`.
- Run `npx prisma validate`, `npx tsc --noEmit --pretty false`, focused observability tests, `npm test`, `npm run build`, and `npm run smoke:pages`.

## Assumptions
- Snapshot data is aggregate and redacted only.
- Trends are observational and do not auto-edit profiles, sources, suppressions, prompts, workflows, or learned rules.
- Snapshot writes are best-effort and fail-open.
