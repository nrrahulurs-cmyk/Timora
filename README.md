# Timora — Enterprise Academic Scheduling & Timetable Studio

**Timora** is a mission-critical, enterprise academic scheduling system and timetable management platform built for modern universities and higher education institutions. Designed around the clean, restrained light aesthetic of the **CIIRC Admin Panel** and high-density **Orbitask Table View**, Timora combines deterministic constraint validation, automated conflict resolution, live Supabase persistence, and Google Gemini-powered academic operations.

---

## 🌟 Key Capabilities

### 1. Timetable Studio (Matrix & Orbitask Table Views)
* Responsive weekly academic timetable matrix (Monday through Saturday, 08:30 AM – 05:00 PM).
* Multi-dimensional filtering by Department, Semester, Section, Faculty, and Room category.
* High-density **Orbitask Table View** with sortable columns, monospace identifiers, and quick status pills.
* Session reassignments, room swaps, and instructor replacements with conflict validation.

### 2. Deterministic Constraint Engine & Ripple Intelligence
* **Strict Separation of Hard Constraints vs Soft Preferences:**
  * Room overlap, faculty collision, student section clashes, capacity deficit, equipment mismatch, and BSL-3 laboratory containment protocols.
* **Ripple Resolution Engine:**
  * Evaluates alternative time slots, eligible facilities, and substitute instructors.
  * Generates zero-cascade alternatives ranked by feasibility scores (0–100).
  * Safely isolates impossible scenarios (e.g. `CONF-05`: single specialized containment facility undergoing statutory maintenance).

### 3. Ask Timora AI Copilot (Google Gemini 2.5 Flash)
* Server-only AI integration using the official `@google/genai` SDK.
* Grounded function calling with strictly validated tool schemas (`findConflicts`, `searchEligibleRooms`, `checkFacultyAvailability`, `previewScheduleChange`, `proposeExtraClass`).
* Deterministic pre-flight verification: `Interpret → Validate → Preview Diff → Confirm → Commit`.

### 4. Live Supabase Database & Role-Based Governance
* PostgreSQL schema with relational integrity, foreign keys, and indexes.
* Multi-role authorization: `academic_admin`, `timetable_coordinator`, `faculty_instructor`, and `student_viewer`.
* Safe optimistic concurrency protection preventing silent schedule corruption.

### 5. Institutional Analytics & Curriculum Pacing
* Interactive data visualizations built with Recharts:
  * Facility occupancy index and temporal distribution.
  * Departmental faculty workload distribution.
  * Conflict categorizations and resolution velocity.
  * Curriculum and syllabus pacing progress tracking.

### 6. Immutable Version Publishing & Rollback Audit Trail
* Draft staging and one-click production publishing.
* Pre-flight validation gate ensuring zero unresolved blocking conflicts before release.
* Non-destructive versioning with audited rollback capabilities.

---

## 🛠️ Technology Stack

* **Framework:** Next.js 16 (App Router & Turbopack)
* **Frontend:** React 19, TypeScript, Vanilla CSS Tokens + Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL 17)
* **AI & Machine Intelligence:** Google Gemini API (`@google/genai`)
* **Visualizations:** Recharts
* **Testing:** Vitest (141 unit/integration tests) + Playwright (5 E2E journeys)

---

## 🚀 Getting Started

### Prerequisites
* Node.js 20+
* npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/nrrahulurs-cmyk/Timora.git
cd Timora

# Install dependencies
npm install
```

### Environment Configuration

Create a `.env.local` file with your credentials:

```bash
# Supabase Connectivity
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

### Running Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open Timora.

---

## 🧪 Testing & Verification

```bash
# Run unit & domain integration tests (141 tests)
npm run test

# Run Playwright End-to-End journeys
npx playwright test --workers=1

# Typecheck and production bundle build
npx tsc --noEmit
npm run build
```

---

## 🌐 Deploy to Vercel

Timora is production-ready for deployment on [Vercel](https://vercel.com):

1. Import this repository into Vercel.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `GEMINI_API_KEY` in Project Settings > Environment Variables.
3. Deploy!
