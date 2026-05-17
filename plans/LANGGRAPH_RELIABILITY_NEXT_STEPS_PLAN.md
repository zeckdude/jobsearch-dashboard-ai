# LangGraph Reliability Next-Step Plan

## Summary

The next step should be reliability before expanding LangGraph to more agents. The app now has durable `AgentRun` state and a graph-backed recruiting agency, but the system still needs explicit controls for stuck, failed, or interrupted graph runs. This plan adds safe resume, retry, cancel, and repair behavior for graph-backed agents, starting with the recruiting agency and reusing the same pattern for the application assistant where applicable.

## Key Changes

- Add a shared graph-run control layer for `AgentRun`:
  - `resume` continues a resumable graph run from its stored `graphThreadId` and `workflowStateJson`.
  - `retry` creates a new child `AgentRun` with `parentRunId` pointing to the failed/stuck run.
  - `cancel` marks a running graph-backed agent as failed/cancelled with a clear event and final node.
  - `repair` normalizes stale `RUNNING` runs when no active work remains.
- Extend recruiting agency reliability behavior:
  - Detect stale `RUNNING` recruiting agency runs by age and lack of recent events.
  - Allow retrying a failed/stale agency run without duplicating already prepared applications.
  - Preserve existing dedupe, suppression, and application checks on retry.
  - Emit visible events for retry started, retry skipped duplicate, retry prepared packet, cancelled, and repaired stale state.
- Add API support:
  - Add graph-run control endpoints for `AgentRun` actions: resume, retry, cancel, and repair.
  - Keep action responses small and consistent: run id, status, current node, message, and latest event.
  - Require graph-backed runs to have `workflowVersion` and `graphThreadId`; otherwise return a clear unsupported-action error.
- Add UI support:
  - On the Agents page and recruiting agency activity surface, show current node, workflow version, stale/running age, and parent run link when present.
  - Show action buttons only when valid for the current state.
  - Keep all controls explicit; no automatic retry loop in v1.
- Add quality capture:
  - Create `AgentQualityExample` records when a run is repaired from stale running, cancelled after partial work, or retried after failure.
  - Tag categories as `stale_graph_run`, `manual_cancel`, `retry_after_failure`, or `resume_failed`.

## Test Plan

- Unit tests for stale detection, retry child runs, duplicate-safe retry, cancel, and repair.
- API tests for resume/retry/cancel/repair validation and responses.
- UI smoke tests for graph metadata and controls on the Agents page.
- Regression checks: Prisma validate, TypeScript, focused tests, full tests, build, and smoke pages.

## Assumptions

- Reliability work comes before moving more workflows to LangGraph.
- Retry creates a new child run instead of mutating the original failed run.
- Cancel is explicit user/admin action, not an automatic timeout.
- Repair is conservative: it fixes stale state and records why, but it does not pretend work completed.
- Application submission remains manual-only; this plan does not add auto-submit.
