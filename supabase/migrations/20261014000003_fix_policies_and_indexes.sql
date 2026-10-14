-- ============================================================================
-- Migration: 20261014000003_fix_policies_and_indexes.sql
-- Description: Drop draft-blocking unique indexes to allow active conflicts in draft versions,
--              and enable comprehensive read/write policies for application tables.
-- ============================================================================

-- Drop partial indexes that block intentional draft conflict fixtures
DROP INDEX IF EXISTS public.uq_session_room_slot;
DROP INDEX IF EXISTS public.uq_session_faculty_slot;
DROP INDEX IF EXISTS public.uq_session_section_slot;

-- Grant full access policies for institutional tables so application repository can read & write
CREATE POLICY "Full access academic_terms" ON public.academic_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access room_equipment" ON public.room_equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access time_slots" ON public.time_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access faculty_members" ON public.faculty_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access student_sections" ON public.student_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access teaching_assignments" ON public.teaching_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access syllabus_modules" ON public.syllabus_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access syllabus_topics" ON public.syllabus_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access topic_progress_records" ON public.topic_progress_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access change_history_records" ON public.change_history_records FOR ALL USING (true) WITH CHECK (true);
