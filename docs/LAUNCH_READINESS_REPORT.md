# Timora launch readiness

**Reviewed:** 28 October 2026  
**Decision:** Local demo is usable for evaluation. Institutional production launch is blocked.

## What now works locally

- The dashboard, Conflict Center, timetable, and analytics read the same repository data. Conflict counts, room hours, workload, and week dates are calculated rather than hard-coded.
- The workspace uses the restored light, floating design requested by the owner. Navigation includes the real timetable, conflicts, analytics, history, faculty, rooms, extra classes, exchanges, syllabus, and settings routes. Desktop and phone layouts have been visually checked.
- A fresh unauthenticated visit opens the sign-in screen directly. The form offers a workspace role selector, email/password with password visibility, and a reset link for live accounts. Choosing a role never grants that role: sign-in checks it against the authenticated identity. In local development only, `NEXT_PUBLIC_DEMO_MODE=true` enables fixture accounts with the `timora2026` test password, which must be entered for each new sign-in. Production builds disable that credential path and use Supabase password authentication. The test credential is collapsed under sign-in help.
- The old calendar badge has been replaced with a custom Timora mark in the sign-in page, sidebar, and browser icon. The workspace role-switching dropdown and unused legacy top bar were removed; changing accounts now requires signing out and signing in again.
- The conflict workspace now uses a shorter header, compact status summary, searchable status tabs, and expandable filters; the duplicate top-right Timo action was removed. The bottom launcher remains the entry point for Timo.
- Timo answers supported operational questions from repository records, shows record references and follow-up suggestions, and can propose feasible timetable moves. The local action path signs previews, binds them to the actor and role, expires them, rejects replay or stale data, revalidates constraints, commits, then verifies the saved result. Read, propose, and apply remain distinct steps.
- Timetable Studio saves staged moves through a validated plan and publishes a draft only after critical conflicts and hard violations are checked. Local demo versions and audit history persist across server restarts. Historical metadata-only rollback is refused rather than presented as a restored timetable.
- CSV and XLSX import supports editable review, record matching, whole-plan validation, explicit confirmation, duplicate detection, and read-after-write verification. The limit is 1 MB and 200 data rows. Formula, date-object, link, image, PDF, DOCX, and OCR extraction are not supported.
- Extra-class requests use actual teaching assignments and schedule constraints. Local HOD review persists; final local approval creates a dated session and an audit record after revalidation.
- Exchange requests check session ownership and date/weekday before submission. Applying an exchange is intentionally unavailable until peer consent and date-specific timetable exceptions can be represented and verified. The UI no longer presents legacy approvals or proposed swaps as committed timetable changes.
- Local demo mutations are stored atomically in `.timora/demo-state.json` and are explicitly restricted to development. Demo HTTP role checks prevent a viewer from saving and scope faculty request creation.

## Verification performed

| Check | Result |
| --- | --- |
| TypeScript `npx tsc --noEmit --incremental false` | Passed after the latest exchange and import changes. |
| ESLint `npm run lint -- --quiet` | Passed with zero errors after the latest changes. Warning-only debt remains outside quiet mode. |
| Unit tests | 192 passed, 7 live Supabase tests skipped by default, 0 failed in the last full run. The skipped tests require `TIMORA_RUN_LIVE_TESTS=true` and an isolated project. |
| Chromium browser journeys | 11 passed, 0 failed. Covers incorrect/correct local passwords, Timo proposals, import persistence and duplicates, exchanges, conflict resolution, publishing, analytics, and responsive navigation. |
| Desktop and phone visuals | Screenshots reviewed at desktop and 390 px phone width for Login and Conflicts, in addition to Overview, Timo, and Extra Classes. No horizontal overflow or browser errors were observed in the latest Login and Conflicts pass. This is a targeted review, not a complete route-by-route accessibility audit. |
| Production build `TIMORA_DISABLE_BUILD_CACHE=true npm run build -- --webpack` | Passed after the sign-in and conflict refinements: compiled, TypeScript checked, and generated all 22 static pages. The cache was disabled for this disk-constrained machine. |
| Production sign-in boundary | Started the built app on port 3001 with `NEXT_PUBLIC_DEMO_MODE=true` at runtime. A fresh `/` visit redirected to `/login`; email and password were empty, the local account autofill and test credential were absent, and the browser reported no page errors. This verifies the local credential path is disabled by the production build. It does not verify live Supabase sign-in. |

## Required launch gates

1. **Supabase authorization:** Existing SQL migrations contain broad `USING (true)` / `WITH CHECK (true)` policies on scheduling and profile tables. Replace them with authenticated role and record scoped RLS, then test with student, faculty, department head, coordinator, dean, and admin identities. Browser role switching was removed as live authority; server verified Supabase identity is used for the Copilot, but database policies still need correction.
2. **Transactional live writes:** The Supabase adapter now fails safely for timetable plan commits and final extra-class approval until `commit_timetable_plan` and `approve_extra_class` transactional RPCs are implemented and deployed with audit writes. Live publish and rollback are also disabled because the existing multi-step writes cannot guarantee an atomic verified outcome. No migration or production database change was applied here.
3. **Complete exchange semantics:** Implement and verify peer consent, date-specific class exceptions, constraint checks, and atomic application. Stored legacy approvals must be reconciled with actual timetable history before being treated as completed swaps.
4. **Live Copilot scope and tools:** Local deterministic reads and signed actions are implemented. Production reads require an explicit server setting and are limited to a verified authenticated actor; production writes return 503 until database transactions, replay protection, record authorization, and live integration tests exist. There is no generative model call in this path and unsupported requests must receive a limitation response.
5. **Operational verification:** Test migrations and end-to-end permissions against an isolated Supabase environment, verify import persistence and rollback with real data, complete keyboard/screen-reader/mobile passes across every route, and review deployment configuration, observability, backup/recovery, and data retention. No isolated Supabase project or local PostgreSQL test runtime was available in this workspace, so the seven live integration tests and database policy fixes have not been verified or deployed.

## Deployment decision

Do not release this checkout as a production institutional scheduler yet. The local evaluation server is safe to use in demo mode; its fixture data and development-only persistence must not be mistaken for a production data path. No production deployment or live Supabase migration was performed.
