# Application State Integrity And Repair Plan

## Summary

Add a shared integrity audit and repair layer so `/dashboard`, `/jobs`, `/applications`, Apply Sprint, outcomes, email sync, and assistant runs all agree on application state. The app should detect stale approved/ready duplicates, email-confirmed applications still shown as pending, submitted jobs resurfacing in search, and match/application status drift, then repair those issues deterministically.

## Key Changes

- Add an application state integrity service that audits canonical job groups and reports stale duplicate trackers, match status drift, email-confirmed pending applications, resurfaced submitted jobs, and assistant submitted state drift.
- Add `GET /api/applications/integrity` for read-only issue counts and `POST /api/applications/integrity/repair` for deterministic repair.
- Repair by running canonical reconciliation, marking high-confidence submitted signals as applied, syncing linked match statuses, recording submitted suppressions, and writing `ApplicationEvent` audit notes.
- Surface state integrity on Dashboard with a manual repair action.
- Update README and wiki documentation to explain the integrity audit and repair workflow.

## Test Plan

- Unit test each drift detector with canonical duplicate, stale match status, email-confirmed pending application, resurfaced submitted job, and assistant submitted mismatch fixtures.
- API test the read endpoint returns issue counts without mutating data.
- API test the repair endpoint runs the deterministic repair service.
- Regression test Gecko-style duplicate behavior remains canonical after repair.
- Run `npx tsc --noEmit --pretty false`, `npm test`, `npm run build`, and smoke pages.

## Assumptions

- Deterministic repair should run before adding any new LLM behavior here.
- Email confirmation is trusted enough to mark an application applied only when matched to an existing application with high confidence.
- Repairs should archive or sync records, never hard-delete history.
- Every automatic repair must leave an `ApplicationEvent` trail so future debugging is possible.
