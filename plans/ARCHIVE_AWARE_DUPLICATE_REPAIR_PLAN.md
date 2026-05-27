# Archive-Aware Duplicate Repair

## Summary
Make the existing **Check duplicates** action run duplicate/stale detection and then repair active jobs that collide with already tracked, applied, rejected, archived, or ready-to-apply records. The goal is that a job the user has already applied to, rejected, archived, or prepared should not keep appearing in active job search, Apply Sprint, or agency queues through another posting row, ATS URL, or duplicate group.

## Key Changes
- Extend `/api/jobs/detect-duplicates` so the current button performs detect plus repair by default.
- Add a suppression repair service that scans applications, rejected/archived/ready matches, existing suppressions, duplicate groups, and canonical title/company/location/application URL keys.
- Use source-mirroring repair: submitted/application collisions sync active duplicate matches to the submitted status; rejected collisions mark duplicates rejected; archived collisions mark duplicates archived; ready-to-apply collisions archive sibling active duplicates while preserving the canonical ready item.
- Apply precedence in this order: submitted/application history, rejected, archived, ready-to-apply duplicate cleanup.

## API / Interface Updates
- Keep the existing request shape for `POST /api/jobs/detect-duplicates`.
- Extend the response with `suppressionRepair` containing scanned, source, repaired, suppression, and reason counts.
- Update the button success message to mention duplicate detection and suppression cleanup.
- Reuse the existing `JobSuppression` table; no schema migration is planned.

## Test Plan
- Unit test the repair planner for applied, rejected, archived, ready-to-apply, duplicate group, and precedence cases.
- Route test that duplicate detection returns repair counts.
- Verify active Jobs, Applications, dashboard agency candidates, and bulk prepare no longer show repaired duplicates.
- Run `npm test`, `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run build`, and `git diff --check`.

## Assumptions
- “Check duplicates” should mutate active match statuses automatically, not just preview.
- Mirroring source status is preferred over always archiving.
- Ready-to-apply duplicates should be hidden as archived duplicate cleanup, while the original ready-to-apply application remains available.
- Existing `JobSuppression` records and canonical keys are the persistence layer for this version.
