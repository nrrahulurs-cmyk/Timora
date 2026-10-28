# Timora — Presentation Speech

**Six slides · approximately 4 minutes at a natural pace**  
**Presenter note:** The screenshots show Timora running locally with evaluation data. Describe the product as a working local evaluation build, not an institutional production deployment.

## Page 1 — A clearer academic day

Good morning. Imagine planning a university week with classes, teachers, rooms, and last-minute changes spread across different sheets and messages. One small change can affect several people, and the conflict may only appear after the schedule has been shared. Timora brings those decisions into one academic scheduling workspace. Its purpose is simple: make the timetable easier to understand, easier to improve, and safer to change. [Show the Timora sign-in screen.] What you see here is the actual application running locally. I’ll walk through what it already does, and then where it can go next.

## Page 2 — One operational picture

[Show the dashboard.] After sign-in, the overview gathers scheduled sessions, active conflicts, room availability, approvals, and utilisation in one place. These figures come from the local scheduling repository; the numbers on this screen are evaluation data, not claims about a live institution. The useful part is the connection between them. A coordinator can notice a problem, open the relevant workflow, and work from the same underlying records. Timora also has dedicated spaces for faculty, rooms, extra classes, exchanges, syllabus progress, analytics, and history. That gives the team one place to see the week and act on it.

## Page 3 — Plan, check, then change

[Point to Timetable Studio.] This is the working timetable. Sessions are arranged by day and time, with their course, room, section, and teacher visible. Coordinators can inspect a session and stage a move. Timora checks the proposed plan against scheduling constraints before it can be saved. [Point to the conflict panel.] The Conflict Center shows issues such as room double-bookings and faculty overlaps, and guides users toward reviewable alternatives. The room and faculty views support the same workflow. Timora also accepts CSV and XLSX imports through matching, editable review, validation, and explicit confirmation. This makes a schedule change a deliberate process rather than an unchecked edit.

## Page 4 — Timo, grounded in the timetable

[Show the Copilot conversation.] Timo is the in-app academic Copilot. In this real example, I asked for CS-401 sessions. Timo returned the Monday and Wednesday classes, their rooms and teacher, and links to the matching source records. It can also query conflicts, availability, workloads, syllabus progress, and version comparisons through validated, role-scoped tools. For supported changes, it prepares a preview; a person must confirm before an authorised action is applied. The language model runs server-side through OpenRouter when configured, with local fallback options for development. This is a practical assistant tied to Timora’s records, while final decisions stay with the user. The current chat has no microphone or spoken reply control.

## Page 5 — How the pieces fit

[Trace the diagram from left to right.] The interface is built with Next.js, React, TypeScript, and Tailwind CSS. A scheduling repository gives the dashboard, timetable, conflicts, and Timo a shared view of the data. The constraint and validation layer checks moves, imports, and requests. Supabase provides the planned live authentication and database path; the screenshots in this deck use the local evaluation repository. Timo’s server-side service can call bounded read tools and return record references. This separation helps prevent a fluent AI answer from being mistaken for a saved timetable change. The current code also has automated tests and a production build, but the live database path still needs further hardening.

## Page 6 — Practical value and the road ahead

[Show the analytics screen.] Timora’s value is clearer coordination: people can see the schedule, find conflicts earlier, evaluate alternatives, and keep an audit trail of approved changes. This local build demonstrates that connected workflow. The next stage is institutional readiness: tighten Supabase row policies, add transactional live writes, finish exchange consent and application, and test permissions and recovery against a real isolated database. Those are explicit launch gates, not features I’m claiming are finished today. Timora’s direction is a calmer academic day, where every class has the right people, place, and time—and each change can be explained and trusted. Thank you.
