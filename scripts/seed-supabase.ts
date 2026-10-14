/**
 * SYNAPSE OS — Seed Supabase Database Script
 * Connects to the Supabase instance and seeds all institutional entities,
 * classrooms, faculty, sections, sessions, conflicts, and operational fixtures.
 */

import { createClient } from "@supabase/supabase-js";
import { SYNAPSE_SEED_DATA } from "../src/data/fixtures/index";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rmweukwohbxxdoohlmih.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd2V1a3dvaGJ4eGRvb2hsbWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDIzMTMsImV4cCI6MjEwNjA3ODMxM30.nEYeS17vINjhH_PHtjDYndjCYgAfq2PQci53qMVmMKg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function seedDatabase() {
  console.log("🌱 Starting SYNAPSE OS Supabase seeding...");

  // 1. Academic Terms
  console.log("Seeding Academic Terms...");
  const termRows = SYNAPSE_SEED_DATA.academicTerms.map((t) => ({
    id: t.id,
    name: t.name,
    start_date: t.startDate,
    end_date: t.endDate,
    status: t.status,
    weeks_count: t.weeksCount,
    is_current: t.isCurrent,
  }));
  const { error: errTerms } = await supabase.from("academic_terms").upsert(termRows);
  if (errTerms) console.error("Error seeding academic_terms:", errTerms);

  // 2. Departments
  console.log("Seeding Departments...");
  const deptRows = SYNAPSE_SEED_DATA.departments.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    building: d.building,
    head_of_department_id: d.headOfDepartmentId,
    color_token: d.colorToken,
    active_sections_count: d.activeSectionsCount,
    total_faculty_count: d.totalFacultyCount,
  }));
  const { error: errDepts } = await supabase.from("departments").upsert(deptRows);
  if (errDepts) console.error("Error seeding departments:", errDepts);

  // 3. User Profiles
  console.log("Seeding User Profiles...");
  const userRows = SYNAPSE_SEED_DATA.users.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    role: u.role,
    department_id: u.departmentId || null,
    avatar_url: u.avatarUrl || null,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  }));
  const { error: errUsers } = await supabase.from("user_profiles").upsert(userRows);
  if (errUsers) console.error("Error seeding user_profiles:", errUsers);

  // 4. Classrooms
  console.log("Seeding Classrooms...");
  const roomRows = SYNAPSE_SEED_DATA.classrooms.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    building: r.building,
    floor: r.floor,
    capacity: r.capacity,
    type: r.type,
    equipment: r.equipment,
    is_accessible: r.isAccessible,
    status: r.status,
  }));
  const { error: errRooms } = await supabase.from("classrooms").upsert(roomRows);
  if (errRooms) console.error("Error seeding classrooms:", errRooms);

  // 5. Room Equipment
  console.log("Seeding Room Equipment...");
  const eqRows = SYNAPSE_SEED_DATA.equipment.map((e) => ({
    id: e.id,
    classroom_id: (e as any).classroomId || "ROOM-LH-101",
    type: e.type,
    name: e.name,
    status: e.status,
    serial_number: e.serialNumber,
  }));
  const { error: errEq } = await supabase.from("room_equipment").upsert(eqRows);
  if (errEq) console.error("Error seeding room_equipment:", errEq);

  // 6. Time Slots
  console.log("Seeding Time Slots...");
  const slotRows = SYNAPSE_SEED_DATA.timeSlots.map((s) => ({
    id: s.id,
    day_of_week: s.dayOfWeek,
    slot_index: s.slotIndex,
    start_time: s.startTime,
    end_time: s.endTime,
    label: s.label,
    is_morning: s.isMorning,
    is_peak_hour: s.isPeakHour,
  }));
  const { error: errSlots } = await supabase.from("time_slots").upsert(slotRows);
  if (errSlots) console.error("Error seeding time_slots:", errSlots);

  // 7. Faculty Members
  console.log("Seeding Faculty Members...");
  const facRows = SYNAPSE_SEED_DATA.faculty.map((f) => ({
    id: f.id,
    user_id: f.userId,
    employee_code: f.employeeCode,
    name: f.name,
    email: f.email,
    department_id: f.departmentId,
    designation: f.designation,
    max_credit_hours: f.maxCreditHours,
    current_assigned_hours: f.currentAssignedHours,
    specializations: f.specializations,
    availability: f.availability,
    status: f.status,
  }));
  const { error: errFac } = await supabase.from("faculty_members").upsert(facRows);
  if (errFac) console.error("Error seeding faculty_members:", errFac);

  // 8. Student Sections
  console.log("Seeding Student Sections...");
  const secRows = SYNAPSE_SEED_DATA.sections.map((s) => ({
    id: s.id,
    department_id: s.departmentId,
    academic_term_id: s.academicTermId,
    semester: s.semester,
    section_code: s.sectionCode,
    name: s.name,
    student_count: s.studentCount,
    academic_advisor_id: s.academicAdvisorId || null,
    curriculum_credits: s.curriculumCredits,
    allocated_credits: s.allocatedCredits,
  }));
  const { error: errSec } = await supabase.from("student_sections").upsert(secRows);
  if (errSec) console.error("Error seeding student_sections:", errSec);

  // 9. Subjects
  console.log("Seeding Subjects...");
  const subRows = SYNAPSE_SEED_DATA.subjects.map((s) => ({
    id: s.id,
    department_id: s.departmentId,
    code: s.code,
    title: s.title,
    credits: s.credits,
    semester: s.semester,
    type: s.type,
    lecture_hours_weekly: s.lectureHoursWeekly,
    lab_hours_weekly: s.labHoursWeekly,
    tutorial_hours_weekly: s.tutorialHoursWeekly,
    required_room_type: s.requiredRoomType,
    required_equipment: s.requiredEquipment,
    is_elective: s.isElective,
  }));
  const { error: errSub } = await supabase.from("subjects").upsert(subRows);
  if (errSub) console.error("Error seeding subjects:", errSub);

  // 10. Teaching Assignments
  console.log("Seeding Teaching Assignments...");
  const assignRows = SYNAPSE_SEED_DATA.teachingAssignments.map((a) => ({
    id: a.id,
    subject_id: a.subjectId,
    faculty_id: a.facultyId,
    section_id: a.sectionId,
    academic_term_id: a.academicTermId,
    weekly_hours: a.weeklyHours,
    is_primary_instructor: a.isPrimaryInstructor,
  }));
  const { error: errAssign } = await supabase.from("teaching_assignments").upsert(assignRows);
  if (errAssign) console.error("Error seeding teaching_assignments:", errAssign);

  // 11. Schedule Versions
  console.log("Seeding Schedule Versions...");
  const verRows = SYNAPSE_SEED_DATA.scheduleVersions.map((v) => ({
    id: v.id,
    academic_term_id: v.academicTermId,
    version_number: v.versionNumber,
    status: v.status,
    published_at: v.publishedAt || null,
    published_by: v.publishedBy || null,
    changes_summary: v.changesSummary,
    clash_count: v.clashCount,
    optimistic_lock_version: 1,
  }));
  const { error: errVer } = await supabase.from("schedule_versions").upsert(verRows);
  if (errVer) console.error("Error seeding schedule_versions:", errVer);

  // 12. Timetable Sessions
  console.log("Seeding Timetable Sessions...");
  const sessRows = SYNAPSE_SEED_DATA.timetableSessions.map((s) => ({
    id: s.id,
    academic_term_id: s.academicTermId,
    version_id: s.versionId,
    subject_id: s.subjectId,
    section_id: s.sectionId,
    faculty_id: s.facultyId,
    classroom_id: s.classroomId,
    time_slot_id: s.timeSlotId,
    status: s.status,
    is_recurring_weekly: s.isRecurringWeekly,
    effective_from: s.effectiveFrom || null,
    effective_until: s.effectiveUntil || null,
  }));
  const { error: errSess } = await supabase.from("timetable_sessions").upsert(sessRows);
  if (errSess) console.error("Error seeding timetable_sessions:", errSess);

  // 13. Room Reservations
  console.log("Seeding Room Reservations...");
  const resRows = SYNAPSE_SEED_DATA.reservations.map((r) => ({
    id: r.id,
    classroom_id: r.classroomId,
    category: r.category,
    title: r.title,
    requested_by: r.requestedBy,
    date: r.date,
    time_slot_ids: r.timeSlotIds,
    reason: r.reason,
    blocks_regular_classes: r.blocksRegularClasses,
    status: r.status,
  }));
  const { error: errRes } = await supabase.from("room_reservations").upsert(resRows);
  if (errRes) console.error("Error seeding room_reservations:", errRes);

  // 14. Conflicts
  console.log("Seeding Conflicts...");
  const confRows = SYNAPSE_SEED_DATA.conflicts.map((c) => ({
    id: c.id,
    type: c.type,
    severity: c.severity,
    title: c.title,
    description: c.description,
    session_ids: c.sessionIds,
    classroom_id: c.classroomId || null,
    time_slot_id: c.timeSlotId || null,
    faculty_id: c.facultyId || null,
    section_id: c.sectionId || null,
    detected_at: c.detectedAt,
    status: c.status,
    has_feasible_alternative: c.hasFeasibleAlternative,
    alternatives: c.alternatives,
    resolution_notes: c.resolutionNotes || null,
  }));
  const { error: errConf } = await supabase.from("conflicts").upsert(confRows);
  if (errConf) console.error("Error seeding conflicts:", errConf);

  // 15. Change History / Audit Records
  console.log("Seeding Change History...");
  const histRows = SYNAPSE_SEED_DATA.changeHistory.map((h) => ({
    id: h.id,
    version_id: h.versionId,
    entity_type: h.entityType,
    entity_id: h.entityId,
    actor_id: h.actorId,
    actor_name: h.actorName,
    actor_role: h.actorRole,
    action: h.action,
    target_name: h.targetName,
    previous_value: h.previousValue || null,
    new_value: h.newValue || null,
    timestamp: h.timestamp,
    category: h.category,
  }));
  const { error: errHist } = await supabase.from("change_history_records").upsert(histRows);
  if (errHist) console.error("Error seeding change_history_records:", errHist);

  // 16. Syllabus Modules & Topics & Progress
  console.log("Seeding Syllabus Modules & Progress...");
  const moduleRows: any[] = [];
  const topicRows: any[] = [];
  for (const m of SYNAPSE_SEED_DATA.syllabusModules) {
    moduleRows.push({
      id: m.id,
      subject_id: m.subjectId,
      module_number: m.moduleNumber,
      title: m.title,
      description: m.description,
      total_planned_hours: m.totalPlannedHours,
      completed_hours: m.completedHours,
    });
    for (const t of m.topics) {
      topicRows.push({
        id: t.id,
        module_id: m.id,
        title: t.title,
        estimated_hours: t.estimatedHours,
        sequence_order: t.sequenceOrder,
        is_delivered: t.isDelivered,
        delivered_at_session_id: t.deliveredAtSessionId || null,
        delivered_by_faculty_id: t.deliveredByFacultyId || null,
        delivered_date: t.deliveredDate || null,
      });
    }
  }
  const { error: errMod } = await supabase.from("syllabus_modules").upsert(moduleRows);
  if (errMod) console.error("Error seeding syllabus_modules:", errMod);

  const { error: errTop } = await supabase.from("syllabus_topics").upsert(topicRows);
  if (errTop) console.error("Error seeding syllabus_topics:", errTop);

  const progRows = SYNAPSE_SEED_DATA.syllabusProgress.map((p) => ({
    id: `${p.subjectId}_${p.sectionId}`,
    subject_id: p.subjectId,
    section_id: p.sectionId,
    total_planned_hours: p.totalPlannedHours,
    completed_hours: p.completedHours,
    percentage_completed: p.percentageCompleted,
    last_updated_date: p.lastUpdatedDate,
    status: p.status,
  }));
  const { error: errProg } = await supabase.from("topic_progress_records").upsert(progRows);
  if (errProg) console.error("Error seeding topic_progress_records:", errProg);

  // 17. Academic Operations Requests
  console.log("Seeding Academic Operations Requests...");
  const extraRows = SYNAPSE_SEED_DATA.extraClassRequests.map((e) => ({
    id: e.id,
    faculty_id: e.facultyId,
    subject_id: e.subjectId,
    section_id: e.sectionId,
    classroom_id: e.classroomId,
    time_slot_id: e.timeSlotId,
    scheduled_date: e.scheduledDate,
    reason: e.reason,
    status: e.status,
    submitted_at: e.submittedAt,
    reviewed_by: e.reviewedBy || null,
    reviewed_at: e.reviewedAt || null,
  }));
  const { error: errExtra } = await supabase.from("extra_class_requests").upsert(extraRows);
  if (errExtra) console.error("Error seeding extra_class_requests:", errExtra);

  const exchRows = SYNAPSE_SEED_DATA.teacherExchangeRequests.map((x) => ({
    id: x.id,
    requester_faculty_id: x.requesterFacultyId,
    requester_session_id: x.requesterSessionId,
    target_faculty_id: x.targetFacultyId,
    target_session_id: x.targetSessionId,
    date: x.date,
    reason: x.reason,
    status: x.status,
    submitted_at: x.submittedAt,
    is_peer_accepted: x.isPeerAccepted,
    reviewed_by: x.reviewedBy || null,
    reviewed_at: x.reviewedAt || null,
  }));
  const { error: errExch } = await supabase.from("teacher_exchange_requests").upsert(exchRows);
  if (errExch) console.error("Error seeding teacher_exchange_requests:", errExch);

  console.log("✅ Seeding completed successfully!");
}

// Execute if run directly
if (require.main === module || process.argv[1]?.endsWith("seed-supabase.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
