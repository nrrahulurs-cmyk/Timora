# Timora

Timora helps institutional coordinators plan teaching, allocate rooms and faculty, resolve conflicts, and review changes before publication. Faculty request extra classes and exchanges; department heads and deans review them. Students consume authorised published information.

The local repository is the implementation source of truth. Explicit local demo mode uses seeded institutional data persisted on this machine. Production requires authenticated Supabase access and verified database policies. These environments must be clearly distinguished.

The central workflow is inspect → propose → validate → review → apply → verify. Invalid, stale, or unauthorised changes must fail without partial writes. Copilot answers must reference actual records and describe limitations without claiming unperformed actions.

Priorities: trustworthy schedules, accessible daily operation, efficient review, recoverable changes. No fake availability, invented metrics, simulated notifications, or hidden automatic publication.
