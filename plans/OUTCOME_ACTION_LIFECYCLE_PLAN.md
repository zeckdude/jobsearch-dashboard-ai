# Outcome Action Lifecycle Plan

## Summary
Make outcome review actions traceable after they are promoted into proposals. Settings should show whether each action is still advisory, already has an open proposal, was accepted, or was dismissed, so the review workflow is understandable and repeat promotion is not confusing.

## Key Changes
- Extend each `OutcomeCalibrationReviewAction` with optional linked proposal metadata derived from existing `AgentImprovementProposal.metadataJson`.
- Match outcome action proposals by `source: "outcome_review_action"`, action category, target type, and target id.
- Keep `POST /api/observability/outcomes/propose-actions` manual and idempotent, returning richer created/existing proposal details.
- Update Settings to show lifecycle chips and proposal context beside each outcome review action.
- Label outcome-action-generated proposals in the quality proposal list.
- Update README and wiki docs with the advisory -> promoted -> accepted/dismissed lifecycle.

## Public Interfaces
- `GET /api/observability/outcomes` includes linked proposal metadata on each action.
- `POST /api/observability/outcomes/propose-actions` keeps the endpoint path and adds status/risk/target details in `proposals`.
- No schema migration is required.

## Test Plan
- Unit test action proposal linkage for open, accepted, and dismissed proposals.
- Unit test unpromoted actions expose no proposal linkage.
- Unit test proposal promotion is idempotent against linked proposal history.
- Route test `GET /api/observability/outcomes` includes action lifecycle metadata.
- Route test `POST /api/observability/outcomes/propose-actions` returns richer proposal details.
- Run `npx prisma validate`, `npx tsc --noEmit --pretty false`, focused outcome tests, `npm test`, `npm run build`, and `npm run smoke:pages`.

## Assumptions
- Dismissed proposals remain linked history and block duplicate creation for the same active outcome action.
- This phase improves governance and visibility only; it does not auto-edit profiles, sources, suppressions, prompts, or workflows.
