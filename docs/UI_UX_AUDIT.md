# Timora UI and workflow audit

**Reviewed:** 27 October 2026  
**Source of truth:** Local repository and local demo runtime.

## Direction

The owner preferred Timora's earlier soft, light interface over a dark minimal rail. The current shell restores that direction: pale background, floating translucent panels, restrained blur and shadow, compact navigation, readable tables, and a small expressive Timo companion. `DESIGN.md` records the current tokens and interaction principles. The app now uses a custom Timora mark across sign-in, navigation, and the browser icon; Timo keeps its own separate SVG character.

## Changes made

| Area | Change |
| --- | --- |
| Navigation | One shared route list now drives desktop and mobile navigation. Search and shortcuts open existing routes; route labels reflect the actual workspaces. |
| Overview | Live repository snapshots feed KPIs, trends, conflicts, weekly classes, and quick actions. Loading and failure states avoid passing fixture numbers off as live results. |
| Timetable | Current-week date is computed after hydration. Staged moves save through a validated plan. Import and publication have review and verification steps. Background data refresh no longer unmounts a confirmation dialog. |
| Analytics | Shared typed calculations use actual slot durations and room-hour capacity. Empty live results remain empty instead of falling back to sample KPIs. |
| Timo | Compact side panel with a friendly animated avatar, source records, follow-up suggestions, cancellable request, and distinct proposal/confirmation/result states. A saved result appears only after repository verification. |
| Extra classes | Form options come from actual academic records; requests and approvals are validated and persisted in local demo mode. |
| Exchanges | Replaced fixed session examples and fabricated consent/verification claims with actual selectable records and honest pending state. Applying swaps remains unavailable. |

## Visual and interaction review

Desktop Overview, desktop Timo, phone Timo, and phone Extra Classes were inspected in Chromium. Phone width was 390 px; the tested layouts had no horizontal document overflow. The Timo input stayed in view. Browser journeys exercised navigation, record references, conflict handling, import, role denial, and the Timo proposal preview. A full screen-reader and route-by-route responsive audit has not been completed.

## Known UX and product gaps

- Existing secondary pages still contain older visual patterns and some fixed academic labels. Align their typography, density, status language, and empty/error states with `DESIGN.md` before release.
- Exchanges need a peer-consent and dated exception workflow before approval controls can be enabled.
- Import supports structured CSV/XLSX, not document extraction or OCR; the UI states that limit.
- The Copilot is intentionally deterministic and supports a bounded set of academic questions. Unsupported requests need graceful clarification; natural-language breadth is not yet comparable to a general assistant.
- Test keyboard traversal, focus return, screen-reader names, motion preference, and narrow layouts on each route, with particular attention to dense timetable and exchange views.

The production security, database, and verification gates are tracked in `LAUNCH_READINESS_REPORT.md`.
