# Agency Handoff Visibility Plan

## Summary

Make the post-search agency handoff first-class and visible. After a search finishes, the app should show whether the recruiting agency started, which `AgentRun` owns the work, what it is doing now, what it approved/prepared/skipped, and what the user needs to do next.

## Key Changes

- Add durable search-to-agency metadata to `JobSearchRun.progress` events without requiring a schema migration.
- Show an "Agency handoff" section in the Dashboard search command center with handoff state, linked `AgentRun` activity, totals, and failure recovery controls.
- Rename misleading preparation copy from "Auto-prepare top matches" to "Prepare approved packets".
- Preserve the guard that `needs_review` jobs cannot bypass agency approval.
- If a search saves no new jobs but existing 90+ eligible matches remain, still let the handoff explain whether the agency started or why it skipped.

## Test Plan

- Unit test `autoRunAgencyAfterSearch` structured handoff metadata for started, skipped, active-run, failed, and no-eligible cases.
- Verify Dashboard search run serialization preserves agency handoff progress data.
- Smoke test Dashboard rendering for completed search, agency handoff status, and retry/repair affordances.
- Regression test bulk prepare still rejects `needs_review`.

## Assumptions

- Use existing `JobSearchRun.progress` and `AgentRunEvent` records first; avoid a migration unless progress JSON becomes too brittle.
- This pass improves visibility and recovery, not agency approval criteria.
- Exception triage remains the next likely planning target after this work.
