# LangGraph And LangSmith Expansion Plan

## Goal

Move the remaining agentic workflows toward durable LangGraph state machines and shared LangSmith/local quality feedback, starting with the recruiting agency. The current application assistant already proves the pattern for open page, inspect, classify fields, pause, observe user input, save memory, continue, and detect submit/close. The next step is to apply that same operational discipline to job search, agency decisions, GitHub review, outreach, and outcome learning.

## Principles

- Keep existing API contracts stable while replacing brittle imperative loops with graph-backed workflow state.
- Store durable workflow state on `AgentRun` so every agent has a visible current node, thread id, workflow version, and resumable state payload.
- Use LangGraph for multi-step decisions, branching, pauses, retries, and handoffs.
- Use LangSmith where configured for trace visibility, and keep local observability useful when LangSmith is not configured.
- Treat evaluation and improvement proposals as review-only. The app may recommend prompt, skill, classifier, or workflow changes, but it should not silently apply them.

## Phase 1: Shared Agent Workflow Runtime

Add shared workflow metadata to `AgentRun`:

- `graphThreadId`
- `currentNode`
- `workflowStateJson`
- `workflowVersion`
- `parentRunId`

This makes every agent run inspectable from the UI and gives future workflows a common persistence surface.

## Phase 2: Recruiting Agency LangGraph Rewrite

Rewrite the recruiting agency as the first non-application-assistant graph:

1. Start run
2. Load approval policy
3. Find eligible candidates
4. Evaluate candidate
5. Approve or skip
6. Prepare application packet
7. Record result
8. Finalize run

The existing routes must continue returning the same status/result shape, but the internals should now update `currentNode`, checkpoint workflow state, and emit meaningful activity events.

## Phase 3: Quality Targets For Every Agentic Surface

Expand quality targets beyond the application assistant:

- Application assistant
- Recruiting agency
- Job matching and search
- Generated materials
- GitHub portfolio review
- Outreach
- Outcome learning
- Command center recommendations

Failures, manual repairs, rejected recommendations, and user feedback should become quality examples when they are useful for evaluation.

## Phase 4: Future Graph Templates

Create graph templates for the remaining agentic workflows:

- Job search: profile load -> source query -> dedupe/suppression -> scoring -> proposal
- Job matching: evidence load -> scoring -> rejection memory check -> recommendation
- GitHub review: repo discovery -> README/About/Wiki inspection -> evidence extraction -> portfolio readiness
- Outcome learning: email/application outcome -> classify -> update suppression and search guidance
- Command center: gather state -> prioritize needs -> create review-only recommendations

## Phase 5: Documentation And Operations

Update README and wiki docs to explain:

- Which workflows use LangGraph today.
- Which workflows are planned next.
- How `AgentRun` state is used.
- How LangSmith traces and local quality datasets help diagnose agent behavior.
- How improvement proposals are reviewed before being accepted.

## Verification

- Add or update focused tests for the recruiting agency graph.
- Validate Prisma schema and generate the client.
- Run TypeScript checks.
- Run affected tests, then the broader suite if feasible.
- Restart the dev server after schema/client changes.
