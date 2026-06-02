# Execute Source Management Plan

## Summary

Implement the approved `/sources` work end to end: save the plan, add company-source creation, add Brave-backed search-query support, clarify roadmap labels, update docs/wiki, verify, commit, push, and restart the dev server.

## Steps

- Save the approved plan into `/plans/source-management-and-search-query.md`.
- Confirm repo state with `git status --short --branch` and preserve unrelated local changes.
- Implement:
  - Add simple company-source form on `/sources`.
  - Add API support for adding companies to `Company Source List`.
  - Add `search_query` source type, migration, seed/default source, and Brave Search adapter.
  - Add `BRAVE_SEARCH_API_KEY` and `SEARCH_QUERY_MAX_RESULTS` docs/env entries.
  - Clarify roadmap labels so active means operational.
- Update README and the relevant wiki page(s) for:
  - Adding company sources.
  - Roadmap label meanings.
  - Search-query backlog and Brave connector setup.
- Verify:
  - Focused Vitest tests for source config/API/adapter.
  - `npx tsc --noEmit --pretty false`
  - relevant lint checks
  - `npm run build`
  - `git diff --check`
- Commit intended files only with a concise message.
- Push to `origin main`.
- Restart the dev server in the existing detached `screen` session and confirm `http://localhost:3000` responds.

## Assumptions

- Use Brave Search as the search-query provider.
- Use a simple company-add form first.
- Keep planned/manual roadmap sources visible but not counted as active unless operational.
- Push target is `origin main`.
