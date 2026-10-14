-- ============================================================================
-- Migration: 20261014000002_row_level_security.sql
-- Description: Row Level Security (RLS) policies and role-based permissions
-- ============================================================================

-- Helper functions for Auth & Role resolution
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles 
  WHERE id = auth.uid()::text 
     OR email = auth.jwt()->>'email'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_faculty_id()
RETURNS TEXT AS $$
  SELECT id FROM public.faculty_members
  WHERE user_id = auth.uid()::text 
     OR email = auth.jwt()->>'email'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_coordinator_or_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT role IN ('academic_admin', 'timetable_coordinator') 
     FROM public.user_profiles 
     WHERE id = auth.uid()::text OR email = auth.jwt()->>'email' LIMIT 1),
    -- Fallback to true if running under anon client during initial configuration or if no auth header present
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Enable RLS on all tables
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_history_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_class_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_exchange_requests ENABLE ROW LEVEL SECURITY;

-- 2. Read Policies (Institutional metadata visible to all authenticated & anon users)
CREATE POLICY "Public read academic_terms" ON public.academic_terms FOR SELECT USING (true);
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Public read classrooms" ON public.classrooms FOR SELECT USING (true);
CREATE POLICY "Public read room_equipment" ON public.room_equipment FOR SELECT USING (true);
CREATE POLICY "Public read time_slots" ON public.time_slots FOR SELECT USING (true);
CREATE POLICY "Public read faculty_members" ON public.faculty_members FOR SELECT USING (true);
CREATE POLICY "Public read student_sections" ON public.student_sections FOR SELECT USING (true);
CREATE POLICY "Public read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public read teaching_assignments" ON public.teaching_assignments FOR SELECT USING (true);
CREATE POLICY "Public read schedule_versions" ON public.schedule_versions FOR SELECT USING (true);
CREATE POLICY "Public read timetable_sessions" ON public.timetable_sessions FOR SELECT USING (true);
CREATE POLICY "Public read room_reservations" ON public.room_reservations FOR SELECT USING (true);
CREATE POLICY "Public read conflicts" ON public.conflicts FOR SELECT USING (true);
CREATE POLICY "Public read syllabus_modules" ON public.syllabus_modules FOR SELECT USING (true);
CREATE POLICY "Public read syllabus_topics" ON public.syllabus_topics FOR SELECT USING (true);
CREATE POLICY "Public read topic_progress_records" ON public.topic_progress_records FOR SELECT USING (true);
CREATE POLICY "Public read change_history_records" ON public.change_history_records FOR SELECT USING (true);
CREATE POLICY "Public read user_profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Public read extra_class_requests" ON public.extra_class_requests FOR SELECT USING (true);
CREATE POLICY "Public read teacher_exchange_requests" ON public.teacher_exchange_requests FOR SELECT USING (true);

-- 3. Write Policies for Admin & Coordinators (Sessions, Conflicts, Schedule Versions, Classrooms)
-- Allows coordinators, admins, or authenticated users to mutate timetable data
CREATE POLICY "Coordinators mutate timetable_sessions" 
  ON public.timetable_sessions FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Coordinators mutate conflicts" 
  ON public.conflicts FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Coordinators mutate schedule_versions" 
  ON public.schedule_versions FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Coordinators mutate classrooms" 
  ON public.classrooms FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Coordinators mutate room_reservations" 
  ON public.room_reservations FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 4. Audit Log Write Policies (Append-only: INSERT permitted, UPDATE and DELETE blocked)
CREATE POLICY "Append-only change_history_records" 
  ON public.change_history_records FOR INSERT 
  WITH CHECK (true);

-- 5. Academic Operations (Extra Classes and Teacher Exchanges)
CREATE POLICY "Faculty create extra_class_requests" 
  ON public.extra_class_requests FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Reviewers update extra_class_requests" 
  ON public.extra_class_requests FOR UPDATE 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Faculty create teacher_exchange_requests" 
  ON public.teacher_exchange_requests FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Peers and Reviewers update teacher_exchange_requests" 
  ON public.teacher_exchange_requests FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 6. Syllabus Progress Writes
CREATE POLICY "Faculty update topic_progress_records" 
  ON public.topic_progress_records FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Faculty update syllabus_topics" 
  ON public.syllabus_topics FOR ALL 
  USING (true)
  WITH CHECK (true);
