<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design system maintenance

When you change [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — tokens, component patterns, alert variants, spacing, or any documented UI convention — also update the interactive showcase:

- [`src/app/design-system/design-system-client.tsx`](src/app/design-system/design-system-client.tsx) — add/update live demos and section nav entries
- [`src/app/design-system/page.tsx`](src/app/design-system/page.tsx) — only if gating or page shell changes

The showcase must stay a faithful, interactive mirror of DESIGN_SYSTEM.md. If you add a new pattern to the doc, add a corresponding playable demo. If you remove or rename a pattern, remove or rename the matching demo.
