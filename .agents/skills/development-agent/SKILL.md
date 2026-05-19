---
name: development-agent
description: Use when the user asks Codex to implement a plan end to end in this repo, update README/wiki docs, run verification, commit, and push to origin main. Captures the repo's preferred development agent workflow for future refinement.
version: "1.0.0"
---

# Development Agent

Use this workflow for requests shaped like: "implement this plan, update README and wiki, commit, and push."

## Workflow

1. Confirm the working tree with `git status --short --branch`.
2. Read the relevant wiki page(s), README section, schema/API entrypoints, and existing tests before editing.
3. Implement the smallest complete vertical slice that satisfies the plan.
4. Update README and wiki in the same commit as the feature.
5. Add focused tests for new behavior and preserve existing deterministic fallbacks.
6. Run verification:
   - relevant `npx vitest run ... --config vitest.config.ts`
   - `npx tsc --noEmit --pretty false`
   - `npx react-doctor@latest --verbose --diff` when React code changed or feature completion warrants it
   - `npm run build`
   - `git diff --check`
7. Stage only intended files, commit with a terse message, and push `origin main`.

## Repo Rules

- Read `AGENTS.md` first; if Next.js docs referenced there are unavailable, follow existing local patterns.
- Do not revert unrelated user changes.
- Keep autonomous/external actions gated; app-local repairs may use Jolene confirmation cards when supported.
- Use existing Prisma, agent, ADK, LangGraph, Jolene, and wiki patterns before introducing new architecture.
- If GPG signing times out, retry with `git -c commit.gpgsign=false commit ...` and mention that in the final response.
