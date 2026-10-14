# Google Stitch "Artisanal Academic Precision" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Google Stitch "Artisanal Academic Precision" design system across Timora, featuring an atmospheric glowing canvas, floating glass master window (`shadow-app-window`), sleek rounded-2xl sidebar, pill segmented controls, spacious uncongested timetable grid, and a multi-format glassmorphic export modal.

**Architecture:** Update global design tokens and typography (Plus Jakarta Sans + OpenType tabular figures) in `globals.css` and `layout.tsx`. Restructure `app-shell.tsx` into a centered floating master window with fixed ambient blur orbs. Refactor `sidebar.tsx`, `topbar.tsx`, and timetable components (`studio-toolbar.tsx`, `grid-view.tsx`, `class-card.tsx`) to match Stitch's uncongested layout, pastel semantic tints, and bottom metrics dock. Wire the Stitch Export Dialog directly to the existing export service.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide React, Supabase PostgreSQL 17 client.

**Spec:** `docs/superpowers/specs/2026-10-15-google-stitch-glassmorphism-redesign.md`

## Global Constraints
- Preserve Supabase client connectivity and authentication context.
- Preserve 152/152 passing tests and zero TypeScript/ESLint errors.
- Preserve deterministic conflict engine and weekly export functionality.
- Git commits must specify `--author="nrrahulurs-cmyk <nrrahulurs@gmail.com>"`.

## Review Focus
1. Master window scaling on viewports < 1024px (mobile/tablet must fluidly fit without clipping).
2. Timetable horizontal scrolling inside the master window without breaking page layout.
3. Export modal opening, format selection (PDF, XLSX, CSV), and trigger execution.
4. Consistent card geometry and soft pastel color tokens across all lecture blocks.
5. Contrast ratios on muted metadata labels and active-day indicators.

---

### Task 1: Design Tokens, Typography & Ambient Background Glow

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Steps:**
- [ ] Add Plus Jakarta Sans font configuration via Next.js Google Fonts in `src/app/layout.tsx`.
- [ ] Add Stitch CSS variables and utility classes to `src/app/globals.css`:
  - Canvas background: `#F4F5FB` to `#FAF9FD`.
  - Ambient glow orbs (`.bg-blob-1`, `.bg-blob-2`) with radial gradient light fields.
  - Shadow physics: `shadow-app-window`, `shadow-card-soft`, `shadow-active-pill`.
  - Tabular figure utilities for numbers, times, and metrics.
- [ ] Verify compilation: `npx tsc --noEmit`.
- [ ] Commit changes.

---

### Task 2: Floating Master App Window & Ambient Shell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

**Steps:**
- [ ] Wrap main application workspace in the floating master card:
  - `w-full max-w-[1560px] mx-auto bg-white/95 rounded-[32px] lg:rounded-[38px] shadow-app-window border border-white/90 p-4 lg:p-7 flex flex-col xl:flex-row gap-6 min-h-[920px] overflow-hidden`
- [ ] Position ambient glow orbs behind the shell (`bg-blob-1` top-left, `bg-blob-2` bottom-right).
- [ ] Preserve mobile navigation drawer and command search modal (`⌘K`).
- [ ] Run test suite: `npm test`.
- [ ] Commit changes.

---

### Task 3: Sleek Stitch Navigation Sidebar & Topbar Header

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/topbar.tsx`

**Steps:**
- [ ] Update `sidebar.tsx`:
  - Brand header with Timora monogram and bold lowercase title.
  - Category section headers (`MAIN MENU`, `SYSTEM`) with Stitch uppercase micro-tracking (`text-[11px] font-semibold text-slate-400 uppercase tracking-wider`).
  - Navigation links: `rounded-2xl` padding, active state with white soft card surface, hairline border, and active status dot.
  - Profile footer: User avatar circle, name, designation (e.g. Dean), and green status indicator dot.
- [ ] Update `topbar.tsx`:
  - Breadcrumb navigation: `Academic Operations > [Page Title]`.
  - Full pill search bar with search icon.
  - Primary obsidian button (`+ New Session` / `Publish`).
- [ ] Run tests and linting.
- [ ] Commit changes.

---

### Task 4: Stitch Weekly Export Dialog Modal

**Files:**
- Create: `src/components/timetable/export-dialog.tsx`
- Modify: `src/app/timetable/page.tsx`

**Steps:**
- [ ] Create `export-dialog.tsx` matching the exact Stitch design:
  - Fixed glassmorphic backdrop with `backdrop-blur-sm bg-slate-900/30`.
  - 3 format selector cards (PDF Document, XLSX Excel Sheet, CSV Raw Data) with radio indicators, format badges, and descriptive subtitles.
  - Appendix preference checkboxes: Faculty Notes & Cabin Details, Room Allocation & Floor Map, Student Conflict Ledger.
  - Schema verification badge: "Verified with timetable schema v4.2".
  - Action buttons: "Cancel" and "Download Timetable" with animated feedback.
- [ ] Wire `export-dialog.tsx` into `src/app/timetable/page.tsx` triggered by the toolbar Export button.
- [ ] Test export triggers for PDF, Excel (.xlsx), and CSV files.
- [ ] Commit changes.

---

### Task 5: Timetable Studio Toolbar & Spacious Grid

**Files:**
- Modify: `src/components/timetable/studio-toolbar.tsx`
- Modify: `src/components/timetable/grid-view.tsx`
- Modify: `src/components/timetable/class-card.tsx`

**Steps:**
- [ ] Refactor `studio-toolbar.tsx`:
  - Pill segmented switcher (`Week | Day | Month`) with active floating white pill.
  - Date range navigator with chevrons (`14 – 20 October 2026`).
  - Pill dropdowns for Cohort (`Cohort: 5th Sem (Sec-B)`) and Filter.
  - Pill Export button with download icon.
- [ ] Refactor `grid-view.tsx` and `class-card.tsx`:
  - Time column with large bold time range and duration badge (`90 min`).
  - Day headers with active-day obsidian pill indicator (`15 • Tue` with emerald pulse).
  - Pastel-tinted session cards (Mint, Indigo, Sky, Amber, Rose) with room code tag, lecturer name, section badge, and status dot.
  - Empty slots with dashed hairline borders and centered `+` target.
  - Bottom operational metrics dock (Allocated hours, Practical labs, Attention required, AI Constraint Engine status).
- [ ] Verify test suite passes: `npm test`.
- [ ] Commit changes.

---

### Task 6: Dashboard & Sub-pages Glassmorphic Refinements

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard/kpi-row.tsx`
- Modify: `src/components/dashboard/attention-panel.tsx`
- Modify: `src/components/dashboard/quick-actions.tsx`
- Modify: `src/app/conflicts/page.tsx`
- Modify: `src/app/rooms/page.tsx`
- Modify: `src/app/analytics/page.tsx`

**Steps:**
- [ ] Harmonize Dashboard KPI cards to match Stitch's rounded-2xl geometry and subtle hairline borders.
- [ ] Update Attention panel with clean severity dots and compact actionable rows.
- [ ] Update Quick actions grid with rounded-2xl cards and consistent icon containers.
- [ ] Apply Stitch card geometry and pill filters to `/conflicts`, `/rooms`, and `/analytics`.
- [ ] Commit changes.

---

### Task 7: Comprehensive Verification & Visual Capture

**Steps:**
- [ ] Run `npx tsc --noEmit` (must report 0 errors).
- [ ] Run `npm test` (all 152 tests must pass).
- [ ] Run `npm run lint` (0 lint errors).
- [ ] Run `npm run build` (all routes compiled cleanly).
- [ ] Start dev server and capture desktop (1440x900) and tablet (768x1024) screenshots of `/`, `/timetable`, and the Stitch Export Modal.
- [ ] Push to `origin main` with authorized author identity.
