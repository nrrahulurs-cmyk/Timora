# Timora (SYNAPSE OS) — Production Deployment & Operations Guide

This guide details the deployment, environment configuration, database migration, and verification procedures for **Timora (SYNAPSE OS)** on **Vercel** and **Supabase**.

---

## 1. Architecture Overview

- **Frontend & Fullstack API**: Next.js 16 (App Router, Turbopack, React 19) deployed to Vercel Serverless Edge/Node.js runtime.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS), real-time publications, and multi-tenant constraints.
- **AI Copilot (Ask SYNAPSE)**: Google Gemini API (`@google/genai`, model `gemini-2.5-flash`) with strict server-side schema tool calling and deterministic fallback.
- **Constraint Engine & Scheduling Services**: Deterministic TypeScript engine with interval overlapping checks, capacity validation, accessibility compliance, and non-destructive versioning.

---

## 2. Environment Variables

Create or configure these environment variables in your Vercel Project Settings (`Settings` -> `Environment Variables`) or in your local `.env.local`:

```bash
# ==============================================================================
# Supabase Configuration
# ==============================================================================
# Public URL of your Supabase Project
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co

# Anon Public API Key (used for client-side queries protected by RLS)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Service Role Secret Key (Server-Only, used for administrative operations)
# CAUTION: Never expose this key in client-side bundles!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# ==============================================================================
# AI Provider (Ask SYNAPSE Copilot)
# ==============================================================================
# Google Gemini API Key for natural language schedule copilot
GEMINI_API_KEY=AIzaSy...

# Optional: Override Gemini Model (defaults to gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash

# ==============================================================================
# Application Environment
# ==============================================================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://timora.vercel.app
```

---

## 3. Supabase Database Setup & Migrations

### 3.1 Initial Schema Migration

All database tables, constraints, indexes, triggers, and Row Level Security (RLS) policies are version-controlled in:
```
supabase/migrations/00001_initial_schema.sql
```

To apply migrations to your remote Supabase instance:

#### Option A: Supabase CLI (Recommended)
```bash
# 1. Login to Supabase CLI
npx supabase login

# 2. Link your local repository to your Supabase project
npx supabase link --project-ref <your-project-id>

# 3. Push schema migrations
npx supabase db push
```

#### Option B: Supabase Web Dashboard SQL Editor
1. Navigate to the **SQL Editor** in your Supabase Dashboard.
2. Open `supabase/migrations/00001_initial_schema.sql`.
3. Copy the entire script and click **Run**.
4. Confirm table creation:
   - `departments`, `users`, `faculty_members`, `student_groups`, `subjects`
   - `classrooms`, `room_equipment`, `time_slots`, `timetable_sessions`
   - `conflicts`, `schedule_versions`, `change_history_records`
   - `extra_class_requests`, `teacher_exchange_requests`, `topic_progress_records`

---

## 4. Database Seed Procedures

To populate the database with realistic academic seed data (departments, 12+ classrooms, curriculum modules, mock conflict scenarios `CONF-01` through `CONF-05`, and initial schedule versions):

### Via CLI Script:
```bash
# Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local
npm run seed
```

### Script Execution Reference:
The seed procedure executes `src/scripts/seed-supabase.ts` which performs idempotent upserts with relational foreign keys.

---

## 5. Vercel Deployment Guide

### Step 1: Connect Git Repository
1. Import the Git repository in the [Vercel Dashboard](https://vercel.com/new).
2. Framework Preset: **Next.js**.
3. Root Directory: `./`.

### Step 2: Build & Output Settings
- **Build Command**: `npm run build` (or `next build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### Step 3: Configure Environment Variables
Add all required environment variables specified in Section 2 above to the Vercel Production and Preview environments.

### Step 4: Deploy & Verify
Click **Deploy**. Upon build completion:
1. Verify `/` (Dashboard overview with CIIRC KPIs and quick links).
2. Verify `/analytics` (Recharts facility utilisation, statutory workload, syllabus pacing).
3. Verify `/timetable` (Interactive studio with session inspection and filters).
4. Verify `/conflicts` (Conflict radar with deterministic resolution engine).
5. Verify `/history` (Schedule publication, pre-flight check, rollback, and change log).
6. Verify `/api/ask-synapse` (Gemini API serverless endpoint with automatic local fallback).

---

## 6. Pre-Flight Verification Checklist

Before releasing any deployment to production, execute the following commands:

| Check | Command | Expected Result |
| :--- | :--- | :--- |
| **Linting** | `npm run lint` | Exits 0 with 0 errors |
| **Type Check** | `npx tsc --noEmit` | Exits 0 with 0 errors |
| **Unit & Integration** | `npm run test` | 141/141 Vitest tests passing |
| **E2E Journeys** | `npx playwright test` | 5/5 Playwright tests passing |
| **Production Build** | `npm run build` | Exits 0, 14 routes compiled |

---

## 7. Operational Resilience & Fallback

- **Supabase Offline / Cold-Start**:
  The application is architected with dual repository support. If remote database connectivity is interrupted or unconfigured, `SchedulingRepository` automatically degrades gracefully to the in-memory `LocalDemoSchedulingRepository` with full seed fidelity and 0 downtime.
- **AI Provider Interruption / Rate-Limit**:
  If the Gemini API key is missing, invalid, or reaches quotas, the `/api/ask-synapse` route engages the deterministic local constraint parser, returning verified timetable suggestions with clear disclosure tags.
