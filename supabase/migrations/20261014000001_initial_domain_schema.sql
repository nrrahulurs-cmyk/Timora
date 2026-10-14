-- ============================================================================
-- Migration: 20261014000001_initial_domain_schema.sql
-- Description: Core relational schema for SYNAPSE OS (Timora) Academic Scheduling
-- ============================================================================

-- 1. Academic Terms
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'published', 'archived')),
  weeks_count INTEGER NOT NULL DEFAULT 16,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  head_of_department_id TEXT,
  color_token TEXT NOT NULL,
  active_sections_count INTEGER NOT NULL DEFAULT 0,
  total_faculty_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('academic_admin', 'timetable_coordinator', 'dean', 'department_head', 'faculty_instructor', 'student_viewer')),
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Classrooms
CREATE TABLE IF NOT EXISTS public.classrooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  type TEXT NOT NULL CHECK (type IN ('Lecture Hall', 'Specialized Laboratory', 'Standard Classroom', 'Seminar Room', 'Auditorium')),
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_accessible BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Room Equipment
CREATE TABLE IF NOT EXISTS public.room_equipment (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'under_maintenance', 'needs_calibration')),
  serial_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Time Slots
CREATE TABLE IF NOT EXISTS public.time_slots (
  id TEXT PRIMARY KEY,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
  slot_index INTEGER NOT NULL CHECK (slot_index >= 1),
  start_time TEXT NOT NULL, -- HH:mm (e.g. '08:30')
  end_time TEXT NOT NULL,   -- HH:mm (e.g. '10:00')
  label TEXT NOT NULL,
  is_morning BOOLEAN NOT NULL DEFAULT true,
  is_peak_hour BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_day_slot UNIQUE (day_of_week, slot_index)
);

-- 7. Faculty Members
CREATE TABLE IF NOT EXISTS public.faculty_members (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  employee_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  designation TEXT NOT NULL CHECK (designation IN ('Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Lecturer')),
  max_credit_hours INTEGER NOT NULL DEFAULT 16,
  current_assigned_hours INTEGER NOT NULL DEFAULT 0,
  specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active', 'on_sabbatical', 'leave')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Student Sections
CREATE TABLE IF NOT EXISTS public.student_sections (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  academic_term_id TEXT NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  section_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  student_count INTEGER NOT NULL CHECK (student_count > 0),
  academic_advisor_id TEXT REFERENCES public.faculty_members(id) ON DELETE SET NULL,
  curriculum_credits INTEGER NOT NULL DEFAULT 24,
  allocated_credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits >= 0),
  semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  type TEXT NOT NULL CHECK (type IN ('Lecture', 'Laboratory', 'Seminar', 'Tutorial', 'Project')),
  lecture_hours_weekly INTEGER NOT NULL DEFAULT 0,
  lab_hours_weekly INTEGER NOT NULL DEFAULT 0,
  tutorial_hours_weekly INTEGER NOT NULL DEFAULT 0,
  required_room_type TEXT NOT NULL,
  required_equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_elective BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Teaching Assignments
CREATE TABLE IF NOT EXISTS public.teaching_assignments (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id TEXT NOT NULL REFERENCES public.faculty_members(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES public.student_sections(id) ON DELETE CASCADE,
  academic_term_id TEXT NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  weekly_hours INTEGER NOT NULL DEFAULT 3,
  is_primary_instructor BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_assignment UNIQUE (subject_id, faculty_id, section_id, academic_term_id)
);

-- 11. Schedule Versions (with Optimistic Concurrency Control)
CREATE TABLE IF NOT EXISTS public.schedule_versions (
  id TEXT PRIMARY KEY,
  academic_term_id TEXT NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  version_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  published_by TEXT,
  changes_summary TEXT,
  clash_count INTEGER NOT NULL DEFAULT 0,
  optimistic_lock_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Timetable Sessions
CREATE TABLE IF NOT EXISTS public.timetable_sessions (
  id TEXT PRIMARY KEY,
  academic_term_id TEXT NOT NULL REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  version_id TEXT NOT NULL REFERENCES public.schedule_versions(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  section_id TEXT NOT NULL REFERENCES public.student_sections(id) ON DELETE RESTRICT,
  faculty_id TEXT NOT NULL REFERENCES public.faculty_members(id) ON DELETE RESTRICT,
  classroom_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE RESTRICT,
  time_slot_id TEXT NOT NULL REFERENCES public.time_slots(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'moved', 'extra_session')),
  is_recurring_weekly BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Database-Level Concurrency & Conflict Prevention:
-- A room cannot be double-booked by two active sessions in the same schedule version & time slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_room_slot 
  ON public.timetable_sessions (version_id, classroom_id, time_slot_id) 
  WHERE status != 'cancelled';

-- A faculty member cannot be double-booked in two places at the same time slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_faculty_slot 
  ON public.timetable_sessions (version_id, faculty_id, time_slot_id) 
  WHERE status != 'cancelled';

-- A student section cohort cannot be in two classes simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_section_slot 
  ON public.timetable_sessions (version_id, section_id, time_slot_id) 
  WHERE status != 'cancelled';

-- 13. Room Reservations (Exams, Events, Maintenance)
CREATE TABLE IF NOT EXISTS public.room_reservations (
  id TEXT PRIMARY KEY,
  classroom_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('examination', 'maintenance', 'university_event', 'ad_hoc_conference')),
  title TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  date DATE NOT NULL,
  time_slot_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  blocks_regular_classes BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL CHECK (status IN ('approved', 'pending', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Conflicts
CREATE TABLE IF NOT EXISTS public.conflicts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'advisory')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  session_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  classroom_id TEXT REFERENCES public.classrooms(id) ON DELETE SET NULL,
  time_slot_id TEXT REFERENCES public.time_slots(id) ON DELETE SET NULL,
  faculty_id TEXT REFERENCES public.faculty_members(id) ON DELETE SET NULL,
  section_id TEXT REFERENCES public.student_sections(id) ON DELETE SET NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'ignored')),
  has_feasible_alternative BOOLEAN NOT NULL DEFAULT true,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Change History / Audit Records
CREATE TABLE IF NOT EXISTS public.change_history_records (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL CHECK (category IN ('modification', 'approval', 'conflict', 'automated'))
);

-- 16. Syllabus Modules & Topics & Progress
CREATE TABLE IF NOT EXISTS public.syllabus_modules (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  total_planned_hours INTEGER NOT NULL DEFAULT 0,
  completed_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES public.syllabus_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL DEFAULT 1,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  is_delivered BOOLEAN NOT NULL DEFAULT false,
  delivered_at_session_id TEXT REFERENCES public.timetable_sessions(id) ON DELETE SET NULL,
  delivered_by_faculty_id TEXT REFERENCES public.faculty_members(id) ON DELETE SET NULL,
  delivered_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.topic_progress_records (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES public.student_sections(id) ON DELETE CASCADE,
  total_planned_hours INTEGER NOT NULL DEFAULT 0,
  completed_hours INTEGER NOT NULL DEFAULT 0,
  percentage_completed NUMERIC(5, 2) NOT NULL DEFAULT 0,
  last_updated_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ahead', 'on_track', 'behind')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_topic_progress UNIQUE (subject_id, section_id)
);

-- 17. Academic Operations Requests
CREATE TABLE IF NOT EXISTS public.extra_class_requests (
  id TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL REFERENCES public.faculty_members(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES public.student_sections(id) ON DELETE CASCADE,
  classroom_id TEXT NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  time_slot_id TEXT NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_hod', 'pending_dean', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.teacher_exchange_requests (
  id TEXT PRIMARY KEY,
  requester_faculty_id TEXT NOT NULL REFERENCES public.faculty_members(id) ON DELETE CASCADE,
  requester_session_id TEXT NOT NULL REFERENCES public.timetable_sessions(id) ON DELETE CASCADE,
  target_faculty_id TEXT NOT NULL REFERENCES public.faculty_members(id) ON DELETE CASCADE,
  target_session_id TEXT NOT NULL REFERENCES public.timetable_sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_hod', 'pending_dean', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_peer_accepted BOOLEAN NOT NULL DEFAULT false,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_term_version ON public.timetable_sessions (academic_term_id, version_id);
CREATE INDEX IF NOT EXISTS idx_sessions_faculty ON public.timetable_sessions (faculty_id);
CREATE INDEX IF NOT EXISTS idx_sessions_classroom ON public.timetable_sessions (classroom_id);
CREATE INDEX IF NOT EXISTS idx_sessions_section ON public.timetable_sessions (section_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON public.conflicts (status);
CREATE INDEX IF NOT EXISTS idx_change_history_version ON public.change_history_records (version_id, timestamp DESC);
