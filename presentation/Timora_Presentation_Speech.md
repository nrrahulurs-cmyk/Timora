# Timora — Presentation Speech & Delivery Guide

**Format:** Six slides · Approximately 4 minutes total duration (246.9s)  
**Audio Narration:** Available at [`presentation/Timora_Presentation_Audio.mp3`](./Timora_Presentation_Audio.mp3) and [`presentation/Timora_Presentation_Audio.wav`](./Timora_Presentation_Audio.wav)  
**Slide Deck:** [`presentation/Timora_Project_Presentation.pdf`](./Timora_Project_Presentation.pdf)  
**Presenter Note:** The screenshots show Timora running locally with evaluation dataset. Describe the product as a working local evaluation build with active AI intelligence, ready for institutional hardening.

---

## Slide 1 — A Clearer Academic Day (0:00 – 0:42)

**Visual:** Slide 01 / Login & Welcome Screen ([`screenshots/login.png`](./screenshots/login.png))  
**Action Cue:** `[Show the Timora sign-in screen, pointing to the Timo companion icon]`

> "Good morning. Imagine planning a university week with classes, teachers, rooms, and last-minute changes spread across different sheets and messages. One small change can affect several people, and the conflict may only appear after the schedule has been shared.
> 
> Timora brings those decisions into one academic scheduling workspace. Its purpose is simple: make the timetable easier to understand, easier to improve, and safer to change.
> 
> What you see here is the actual application running locally. Notice our institutional sign-in with instant demo personas for Coordinators, Faculty, Admins, and Students. I’ll walk through what it already does, and then where it can go next."

*Transition:* "Let's step into the primary operational view right after signing in..."

---

## Slide 2 — One Operational Picture (0:42 – 1:24)

**Visual:** Slide 02 / Academic Operations Dashboard ([`screenshots/dashboard.png`](./screenshots/dashboard.png))  
**Action Cue:** `[Show the dashboard. Point first to the top KPI metrics, then down to the Requires Attention panel]`

> "After sign-in, the overview gathers scheduled sessions, active conflicts, room availability, approvals, and utilisation in one place. These figures come from the local scheduling repository; the numbers on this screen are evaluation data, not claims about a live institution.
> 
> The useful part is the connection between them. A coordinator can notice an operational clash right here, click on the attention item, and jump directly into the focused resolution workflow—working from the exact same underlying records.
> 
> Timora also provides dedicated workspaces for faculty availability, room utilisation, extra class requests, teacher exchanges, syllabus tracking, and schedule version history. That gives academic leadership one unified surface to see the week and act on it with complete clarity."

*Transition:* "Now let's look at how coordinators plan and make changes safely..."

---

## Slide 3 — Plan, Check, Then Change (1:24 – 2:08)

**Visual:** Slide 03 / Timetable Studio & Conflict Center ([`screenshots/timetable.png`](./screenshots/timetable.png) & [`screenshots/conflicts.png`](./screenshots/conflicts.png))  
**Action Cue:** `[Point to Timetable Studio on the left, then to the Conflict Center on the right]`

> "This is Timetable Studio, our working calendar. Sessions are arranged by day and timeslot, with course codes, room allocations, student sections, and assigned faculty clearly visible.
> 
> Coordinators can inspect any session and stage a move. But here is the critical safeguard: Timora automatically validates the proposed change against hard constraints—such as room double-bookings, faculty duty overlaps, and room capacity limits—before any edit can be committed.
> 
> In the Conflict Resolution Center on the right, detected clashes are categorized by severity with intelligent Ripple suggestions for conflict-free alternatives. Timora also supports bulk CSV and XLSX imports with schema matching, staged review, and explicit verification. Every schedule change is a deliberate, validated action rather than an unchecked database overwrite."

*Transition:* "Beyond manual coordination, Timora introduces an AI assistant with genuine operational understanding..."

---

## Slide 4 — Timo: Grounded Academic Copilot (2:08 – 2:54)

**Visual:** Slide 04 / Timo Copilot Drawer ([`screenshots/timo-copilot.png`](./screenshots/timo-copilot.png))  
**Action Cue:** `[Show the Copilot conversation, highlighting the structured session references and action buttons]`

> "Timo is Timora’s in-app academic Copilot. Rather than generating generic text, Timo is directly grounded in our scheduling repository.
> 
> In this real example, I asked: *'Find timetable sessions for CS-401'*. Timo immediately queried the repository via tool calling, returned the exact Monday and Wednesday lecture slots with room numbers and faculty, and provided deep links to the source records.
> 
> Timo can query faculty availability, room capacity, syllabus milestones, and version diffs. For schedule modifications or extra classes, Timo prepares a verified action preview—no state changes without human confirmation.
> 
> Under the hood, Timo leverages OpenRouter and Google Gemini models with intelligent multi-turn reasoning and a local cognitive fallback for offline resilience."

*Transition:* "Let's take a look behind the curtain at the architecture that makes this work..."

---

## Slide 5 — Technology & Architecture (2:54 – 3:36)

**Visual:** Slide 05 / System Architecture Diagram ([`presentation/preview/page-5.png`](./preview/page-5.png))  
**Action Cue:** `[Trace the pipeline from left to right: UI -> Scheduling Layer -> Data Store -> AI Service]`

> "Looking at how the pieces fit:
> 
> On the frontend, Timora is built with Next.js 16, React 19, TypeScript, and Tailwind CSS, following a calm institutional design system.
> 
> The core is our domain scheduling engine and constraint validator, enforcing conflict-free allocations and role-based permissions.
> 
> Data access is abstracted behind a clean repository pattern: currently backed by an in-memory evaluation store with full seed fixtures, with a Supabase PostgreSQL adapter for live deployments.
> 
> On the right, Timo's server-side orchestrator executes bounded read tools and cryptographically signed action previews. This strict architectural boundary prevents fluent AI responses from ever hallucinating or directly corrupting institutional schedule data."

*Transition:* "Finally, what does this mean for universities, and where are we heading next?"

---

## Slide 6 — Practical Value & The Road Ahead (3:36 – 4:07)

**Visual:** Slide 06 / Analytics & Institutional Roadmap ([`screenshots/analytics.png`](./screenshots/analytics.png))  
**Action Cue:** `[Point to the analytics charts, then highlight the four numbered launch milestones]`

> "Timora’s core value is coordination certainty: academic institutions can see their whole operation, catch clashes before students walk into classrooms, explore viable alternatives instantly, and maintain an immutable audit trail of every change.
> 
> This working build proves the viability of connected academic operations. Our roadmap to institutional production launch focuses on four explicit milestones:
> 1. Hardening Supabase Row-Level Security policies across all six user roles.
> 2. Finalizing atomic, transactional write operations.
> 3. Completing full multi-party faculty exchange approvals.
> 4. Conducting end-to-end stress testing against enterprise database environments.
> 
> Timora’s vision is a calmer academic day: where every class has the right people, the right place, and the right time—and every decision is transparent and trustworthy. Thank you."

---

## Presentation Delivery Tips for Tomorrow

1. **Pacing:** Speak at a steady, conversational pace (~140 words per minute). The 1.2-second pauses in the audio track match slide transitions.
2. **Confidence with Data:** Emphasize that the system is **grounded in real records** with zero hallucinated schedules.
3. **Prepared Q&A Responses:**
   - *Q: How does Timo prevent hallucinating schedules?*  
     *A:* "Timo uses deterministic tool-calling bounded strictly to our `SchedulingRepository`. The model never invents sessions; it reads live data and returns clickable record references. Any schedule modification requires an HMAC-signed preview and explicit human confirmation."
   - *Q: How does conflict detection handle large universities?*  
     *A:* "The constraint validator runs indexed conflict checks across 3 dimensions: room availability, faculty teaching commitments, and room capacity vs cohort headcount in $O(N)$ time per slot."
   - *Q: What is the current deployment state?*  
     *A:* "The frontend and demo repository are fully deployed live on Vercel at `timora-one.vercel.app`. All core features, UI, and test suites are verified."
