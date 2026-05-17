# Agency-First Workflow and UX Streamlining Plan

## Summary
Make the app behave like an agent-led job search system instead of a manual review board. After a search finishes, the recruiting agency should automatically review new results, approve strong fits, prepare application packets, and leave only borderline exceptions for the user. The Dashboard becomes the main command center; Jobs and Applications become focused drill-down queues.

## Key Changes
- Trigger the recruiting agency automatically after successful or partial search runs when new matches are saved.
- Agency action is approve plus prepare: approved jobs move toward `ready_to_apply` with resume, cover letter, packet, and application tracker created.
- Keep final application submission manual.
- Prevent bulk prepare from bypassing agency approval by restricting it to already-approved/generated-material jobs.
- Keep a small `Needs Review` queue for borderline jobs the agency cannot confidently approve or reject.
- Add search-to-agency activity visibility in the Dashboard.

## Implementation Details
- Add an `autoRunAgencyAfterSearch` helper called at the end of `runJobSearch`.
- Auto-run only when search status is `completed` or `partial`, `jobsSaved > 0`, no agency run is already active, and an eligible 90+ match exists.
- Record search progress when the agency is skipped, queued, completed, or failed.
- Extend recruiting agency `triggeredBy` to support `search_auto`.
- Keep default agency threshold at 90 and limit at 10.

## Test Plan
- Unit test search completion auto-runs the agency when new eligible jobs exist.
- Unit test no agency run starts when search saves zero jobs or another agency run is active.
- Unit test bulk prepare no longer accepts `needs_review`.
- Smoke test `/dashboard`, `/jobs`, and `/applications`.
- Run `npx prisma validate`, `npx tsc --noEmit --pretty false`, `npm test`, `npm run build`, and `npm run smoke:pages`.

## Assumptions
- Agency-first means approve plus prepare, not approve-only.
- Borderline jobs stay visible in a small review queue.
- Final submission remains manual.
- No schema migration is required.
