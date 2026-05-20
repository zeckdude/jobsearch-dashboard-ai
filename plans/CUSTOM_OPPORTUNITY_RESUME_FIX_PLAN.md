# Custom Opportunity Resume Fix Plan

## Summary

The resume under-emphasized this app because the current custom-opportunity flow uses the generic resume generator. That generator only explicitly forces full project tech stacks in the Projects section, while Summary and Skills are ranked mostly from profile skills plus job-term overlap. The fallback inference also does not recognize "Integration Engineer," so without successful OpenAI inference the opportunity can be weakly classified and less focused on MCP/integration work.

## Key Changes

- Improve recruiter-brief parsing for titles like `Integration Engineer`, `Systems Integration Engineer`, `MCP Engineer`, and contract/recruiter message formats.
- Add an MCP/integration emphasis mode for custom opportunities:
  - Detect briefs mentioning MCP, integrations, AI tooling, data platforms, workflow systems, Salesforce-style systems, Snowflake/data platforms, or automation.
  - Force supported Job Search OS evidence into Summary and Skills: MCP, agentic workflows, RAG, Next.js, React, TypeScript, Prisma/Postgres, pgvector, LangGraph, LangSmith-style observability, browser automation, email/outcome tracking, and application state reconciliation.
  - Keep the Projects section as the detailed proof point for the full app tech stack.
- Keep unsupported requested systems truthful:
  - Do not claim hands-on Salesforce, Gong, ZoomInfo, Ironclad, Harvey AI, SimpleLegal, Logikcull, Airtable, or Snowflake experience unless already present in approved evidence.
  - Surface missing requested systems in warnings/notes instead of adding them to resume Skills.

## Edit And Save

- Add an editable resume textarea to `/resumes/custom-opportunity` after generation.
- Add `PATCH /api/resumes/generated/[id]` to save edited resume content back to `GeneratedResume.markdown`, `plainText`, `html`, refresh ATS checks, and append edit metadata in `generationNotes`.
- After saving, keep existing PDF/Text buttons pointed at the same resume ID so exports use the edited version.
- Do not add global editing to `/resumes/generated` in this pass.

## Test Plan

- Add tests for Integration Engineer title inference from recruiter-style text.
- Add tests that MCP/integration briefs produce emphasis notes or generation inputs containing supported Job Search OS stack terms.
- Add tests that unsupported target systems appear in warnings/metadata, not generated Skills.
- Add route tests for saving edited resume content and verifying PDF/Text exports read the updated content.
- Run targeted Vitest tests, `npx tsc --noEmit --pretty false`, React Doctor diff scan, `npm run build`, and `git diff --check`.

## Assumptions

- Default emphasis choice is "auto-emphasize app stack" because no alternative was selected.
- Resume editing should live on the custom-opportunity page only.
- Truthfulness beats ATS stuffing: unsupported third-party systems should not be claimed as skills.
