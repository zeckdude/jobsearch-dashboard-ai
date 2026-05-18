# Agentic Market Intelligence Brief

## Summary

Build a weekly market intelligence agent that combines the app's real search/application data with current external labor-market sources to answer: "Where is demand moving for my skillset, what roles should I prioritize, and what should I change in my search strategy this week?"

The feature should be useful, not article spam. It should produce a concise briefing with trend charts, source links, role/skill signals, risks, and concrete recommended actions for search profiles, company targeting, resume positioning, and outreach.

## Key Changes

- Add a new `MARKET_INTELLIGENCE` agent type that runs through the existing `AgentRun` pattern.
- Inputs:
  - active search profiles
  - recent job postings and matched roles
  - rejected/applied/interview outcomes
  - profile performance snapshots
  - candidate skills/projects/evidence
  - curated external sources
- External source set for v1:
  - BLS Occupational Outlook for baseline role outlook: https://www.bls.gov/ooh/Computer-and-Information-Technology/Software-developers.htm
  - Indeed Hiring Lab snapshots/trends for near-real-time hiring movement: https://www.hiringlab.org/
  - Lightcast/Stanford AI labor-market trend references for AI skill demand: https://lightcast.io/resources/blog/stanford-ai-2026
  - Selected LinkedIn-style role trend articles only when cited and recent.
- Output:
  - weekly summary
  - market temperature by lane: AI product/frontend, design systems/frontend platform, enterprise SaaS, devtools, workflow/agentic apps
  - skill demand signals: rising, stable, declining, noisy
  - recommended search profile changes
  - companies/categories to prioritize
  - resume/LinkedIn positioning guidance
  - article/source digest with citations
  - confidence and data freshness
- UI:
  - Add a Market Intelligence panel to `/profiles`.
  - Show trend cards, simple charts, cited sources, and recommended next actions.
  - Keep actions review-only in v1; do not auto-edit profiles.

## Implementation Notes

- Store the report in `AgentRun.outputJson`; avoid a new table unless reports need long-term querying beyond recent runs.
- Use existing profile performance and outcome calibration data for internal trends.
- Use deterministic extraction for known sources first; summarize with the LLM only after source text and internal metrics are gathered.
- Treat external web research as advisory. The agent must clearly separate:
  - app-observed facts
  - sourced market data
  - inferred recommendations
- Add one route:
  - `POST /api/market-intelligence/run`
- Add one display surface:
  - latest report card with a `Run market brief` button and recent report output.

## Test Plan

- Unit test report builder with mocked profiles, jobs, outcomes, and source snippets.
- Verify recommendations are review-only and do not mutate profiles.
- Test stale/failed source handling: report should still run with internal app data.
- Test citation handling: every external claim must include source title and URL.
- Run:
  - `npx tsc --noEmit --pretty false`
  - focused agent tests
  - relevant page/API tests

## Assumptions

- First version is a weekly brief, not a full live analytics dashboard.
- Use both app data and web/current market sources.
- No automatic profile edits in v1.
- Graphs should be practical: trend direction, skill frequency, profile health, and application outcomes by lane.
- The primary goal is to help prioritize where to spend job-search effort this week.
