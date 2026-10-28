# Timora

Timora is an academic scheduling workspace for timetables, room allocation, faculty workloads, conflict resolution, timetable imports, extra classes, and exchanges. The current checkout is usable with local fixture data. **Institutional production launch is not yet approved.** See [Launch readiness](docs/LAUNCH_READINESS_REPORT.md) for verified behavior and blockers.

## What works

- Timetable Studio reads and stages schedule changes through a constraint engine. Coordinators can preview feasible moves and confirm them; saved allocations are checked again and audited.
- Conflict Center, room and faculty views, analytics, history, syllabus, extra-class requests, and exchange requests share the scheduling repository.
- CSV and XLSX timetable imports support record matching, editable review, validation, confirmation, duplicate detection, and read-after-write checks.
- Timo can reason over general questions and current Timora records. With `OPENROUTER_API_KEY`, its server-side model calls validated, role-scoped read tools for timetable, room and faculty availability, conflicts, feasible slots, syllabus progress, schedule health, request queues, and version comparisons. It can prepare a signed timetable move or extra-class request preview. Only a separate user confirmation can apply a move or submit a request for department review. Without OpenRouter, development can use a local Ollama model, then a repository-bound deterministic fallback.
- The local development login autofills fixture credentials. Production builds disable the local credential path.

## Run locally

Node.js 20+ and npm are required.

```bash
npm install
```

Create a git-ignored `.env.local` for the mode you are running:

```dotenv
# Local fixture evaluation only
NEXT_PUBLIC_DEMO_MODE=true

# Optional server-side model access. Chat text and relevant Timora records go to OpenRouter.
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_MODEL=openai/gpt-oss-120b

# Optional local model fallback in development
TIMORA_LOCAL_AI_URL=http://127.0.0.1:11434
TIMORA_LOCAL_AI_MODEL=gemma3:4b
```

Then run `npm run dev` and open [localhost:3000](http://localhost:3000). The local AI URL must point to a model service on the same machine; the default development URL is Ollama on localhost.

For live mode, configure Supabase Auth and database variables in the server environment instead of enabling demo mode. `TIMORA_COPILOT_LIVE_ENABLED=true` unlocks authenticated Copilot reads only. Live Copilot writes remain disabled until the database and authorization launch gates are completed.

## Verify

```bash
npm run test
npm run lint -- --quiet
npx tsc --noEmit --incremental false
npx playwright test --project=chromium
TIMORA_DISABLE_BUILD_CACHE=true npm run build -- --webpack
```

Browser journeys run serially because they share a mutable local fixture dataset. Live Supabase integration tests are skipped unless `TIMORA_RUN_LIVE_TESTS=true` is set against an isolated test project.

## Before institutional deployment

The remaining gates include scoped Supabase row policies, transactional and audited live writes, complete exchange consent and application, live role integration tests, backup and recovery checks, and full accessibility review. The supplied temporary OpenRouter key must be replaced by an institution-managed credential and approved provider data handling. The [launch readiness report](docs/LAUNCH_READINESS_REPORT.md) lists the current evidence and limitations.
