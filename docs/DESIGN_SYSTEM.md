> **Agents:** Changes here require matching updates to `/design-system` — see AGENTS.md § Design system maintenance.

# Design System

Source of truth for Job Search OS UI patterns. The interactive showcase lives at `/design-system` (admin-gated).

## Foundations

- **Typography:** `h2` section titles, `h3` card titles, `body1` primary copy, `body2` secondary/metadata.
- **Colors:** Use theme palette tokens (`primary`, `success`, `warning`, `error`, `info`) — avoid one-off hex except resume PDF themes.
- **Spacing:** Prefer MUI `Stack` `spacing={2}` inside cards; page-level `spacing={3}`.

## Buttons

- Primary actions: `variant="contained"`.
- Secondary actions: `variant="outlined"`.
- Tertiary / cancel: `variant="text"` with `color="inherit"`.
- Destructive: `color="error"` on outlined or contained as appropriate.
- Loading: disable button and show `CircularProgress` in `startIcon`.

## Forms

- Labels always visible; helper text for format hints (e.g. comma-separated skills).
- Validation errors: `error` + `helperText` on field; form-level `Alert severity="error" variant="filled"` for submit failures.
- Date fields on resume jobs: month/year picker with flexible display (`MM/YYYY` default).

## Feedback

- **Success notices:** `Alert severity="success" variant="filled"` with slightly subdued `success.dark` background (see resume page).
- **Errors:** `Alert severity="error" variant="filled"` — high visibility, used on custom opportunity and resume pages.
- **Warnings / info:** standard variant unless emphasis is required.
- **Inline empty sections (resume editors):** `ResumeSectionEmptyAlert` — `severity="info"`, standard variant, `sx={{ mt: 1.5 }}` for work history, education, projects, etc.
- **Chips:** Use sparingly for status (`proposed`, parsing status). Avoid redundant metadata chips (email, bullet counts) in headers.

## Surfaces

- Content grouped in `Card` + `CardContent`.
- `Divider` between major resume sections (work history, education, projects).

## Layout

- `PageHeader` for page title, eyebrow, description, actions slot.
- Resume page: two-column grid; right column sticky with `maxHeight: calc(100vh - 24px)` and `overflowY: auto`.
- Floating `ResumeScrollActionBar` when scrolled past edit anchor; content gets bottom padding when bar visible.

## Overlays

- Import, theme change, nuke confirm, admin unlock: MUI `Dialog`.
- PDF preview: `ResumePdfViewerShell` with expand-to-fullscreen.

## Resume-specific

- **Import modal:** tabs for Resume file, LinkedIn PDF, LinkedIn data export ZIP — all feed the same merge/commit pipeline.
- **Theme:** sidebar shows active theme name + “Change theme” opens large modal preview.
- **FAB stack:** Jolene + Workflow Coach aligned on `FAB_RIGHT`; lift by `RESUME_ACTION_BAR_HEIGHT + FAB_BREATHING_ROOM` when action bar visible.

## Admin access

- Settings → Admin access → password → Admin nav item (localStorage flag + httpOnly cookie).
- `/admin` hub links to this showcase. Revoke clears cookie and nav flag.
