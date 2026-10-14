/**
 * SYNAPSE OS — Supabase Database Row Mappers
 * Pure bidirectional transformations between PostgreSQL snake_case columns
 * and strongly typed domain interfaces.
 */

import type {
  AcademicTerm,
  Department,
  User,
  Classroom,
  RoomEquipment,
  TimeSlot,
  FacultyMember,
  StudentSection,
  Subject,
  TeachingAssignment,
  ScheduleVersion,
  TimetableSession,
  RoomReservation,
  ConflictRecord,
  ChangeHistoryRecord,
  SyllabusModule,
  TopicProgressRecord,
  ExtraClassRequest,
  TeacherExchangeRequest,
} from "@/types/domain";

export function mapAcademicTerm(row: any): AcademicTerm {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    weeksCount: row.weeks_count,
    isCurrent: Boolean(row.is_current),
  };
}

export function mapDepartment(row: any): Department {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    building: row.building,
    headOfDepartmentId: row.head_of_department_id || "",
    colorToken: row.color_token,
    activeSectionsCount: row.active_sections_count || 0,
    totalFacultyCount: row.total_faculty_count || 0,
  };
}

export function mapUserProfile(row: any): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    departmentId: row.department_id || undefined,
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapClassroom(row: any): Classroom {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    building: row.building,
    floor: row.floor,
    capacity: row.capacity,
    type: row.type,
    equipment: Array.isArray(row.equipment) ? row.equipment : [],
    isAccessible: Boolean(row.is_accessible),
    status: row.status,
  };
}

export function mapRoomEquipment(row: any): RoomEquipment {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    status: row.status,
    serialNumber: row.serial_number,
  };
}

export function mapTimeSlot(row: any): TimeSlot {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    slotIndex: row.slot_index,
    startTime: row.start_time,
    endTime: row.end_time,
    label: row.label,
    isMorning: Boolean(row.is_morning),
    isPeakHour: Boolean(row.is_peak_hour),
  };
}

export function mapFacultyMember(row: any): FacultyMember {
  return {
    id: row.id,
    userId: row.user_id,
    employeeCode: row.employee_code,
    name: row.name,
    email: row.email,
    departmentId: row.department_id,
    designation: row.designation,
    maxCreditHours: row.max_credit_hours,
    currentAssignedHours: row.current_assigned_hours,
    specializations: Array.isArray(row.specializations) ? row.specializations : [],
    availability: Array.isArray(row.availability) ? row.availability : [],
    status: row.status,
  };
}

export function mapStudentSection(row: any): StudentSection {
  return {
    id: row.id,
    departmentId: row.department_id,
    academicTermId: row.academic_term_id,
    semester: row.semester,
    sectionCode: row.section_code,
    name: row.name,
    studentCount: row.student_count,
    academicAdvisorId: row.academic_advisor_id || "",
    curriculumCredits: row.curriculum_credits,
    allocatedCredits: row.allocated_credits,
  };
}

export function mapSubject(row: any): Subject {
  return {
    id: row.id,
    departmentId: row.department_id,
    code: row.code,
    title: row.title,
    credits: row.credits,
    semester: row.semester,
    type: row.type,
    lectureHoursWeekly: row.lecture_hours_weekly,
    labHoursWeekly: row.lab_hours_weekly,
    tutorialHoursWeekly: row.tutorial_hours_weekly,
    requiredRoomType: row.required_room_type,
    requiredEquipment: Array.isArray(row.required_equipment) ? row.required_equipment : [],
    isElective: Boolean(row.is_elective),
  };
}

export function mapTeachingAssignment(row: any): TeachingAssignment {
  return {
    id: row.id,
    subjectId: row.subject_id,
    facultyId: row.faculty_id,
    sectionId: row.section_id,
    academicTermId: row.academic_term_id,
    weeklyHours: row.weekly_hours,
    isPrimaryInstructor: Boolean(row.is_primary_instructor),
  };
}

export function mapScheduleVersion(row: any): ScheduleVersion {
  return {
    id: row.id,
    academicTermId: row.academic_term_id,
    versionNumber: row.version_number,
    status: row.status,
    publishedAt: row.published_at || undefined,
    publishedBy: row.published_by || undefined,
    changesSummary: row.changes_summary || "",
    clashCount: row.clash_count || 0,
  };
}

export function mapTimetableSession(row: any): TimetableSession {
  return {
    id: row.id,
    academicTermId: row.academic_term_id,
    versionId: row.version_id,
    subjectId: row.subject_id,
    sectionId: row.section_id,
    facultyId: row.faculty_id,
    classroomId: row.classroom_id,
    timeSlotId: row.time_slot_id,
    status: row.status,
    isRecurringWeekly: Boolean(row.is_recurring_weekly),
    effectiveFrom: row.effective_from || "",
    effectiveUntil: row.effective_until || "",
  };
}

export function mapRoomReservation(row: any): RoomReservation {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    category: row.category,
    title: row.title,
    requestedBy: row.requested_by,
    date: row.date,
    timeSlotIds: Array.isArray(row.time_slot_ids) ? row.time_slot_ids : [],
    reason: row.reason,
    blocksRegularClasses: Boolean(row.blocks_regular_classes),
    status: row.status,
  };
}

export function mapConflictRecord(row: any): ConflictRecord {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    sessionIds: Array.isArray(row.session_ids) ? row.session_ids : [],
    classroomId: row.classroom_id || undefined,
    timeSlotId: row.time_slot_id || undefined,
    facultyId: row.faculty_id || undefined,
    sectionId: row.section_id || undefined,
    detectedAt: row.detected_at,
    status: row.status,
    hasFeasibleAlternative: Boolean(row.has_feasible_alternative),
    alternatives: Array.isArray(row.alternatives) ? row.alternatives : [],
    resolutionNotes: row.resolution_notes || undefined,
  };
}

export function mapChangeHistoryRecord(row: any): ChangeHistoryRecord {
  return {
    id: row.id,
    versionId: row.version_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    targetName: row.target_name,
    previousValue: row.previous_value || undefined,
    newValue: row.new_value || undefined,
    timestamp: row.timestamp,
    category: row.category,
  };
}

export function mapExtraClassRequest(row: any): ExtraClassRequest {
  return {
    id: row.id,
    facultyId: row.faculty_id,
    subjectId: row.subject_id,
    sectionId: row.section_id,
    classroomId: row.classroom_id,
    timeSlotId: row.time_slot_id,
    scheduledDate: row.scheduled_date,
    reason: row.reason,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
  };
}

export function mapTeacherExchangeRequest(row: any): TeacherExchangeRequest {
  return {
    id: row.id,
    requesterFacultyId: row.requester_faculty_id,
    requesterSessionId: row.requester_session_id,
    targetFacultyId: row.target_faculty_id,
    targetSessionId: row.target_session_id,
    date: row.date,
    reason: row.reason,
    status: row.status,
    submittedAt: row.submitted_at,
    isPeerAccepted: Boolean(row.is_peer_accepted),
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
  };
}

export function mapTopicProgressRecord(row: any): TopicProgressRecord {
  return {
    subjectId: row.subject_id,
    sectionId: row.section_id,
    totalPlannedHours: row.total_planned_hours,
    completedHours: row.completed_hours,
    percentageCompleted: Number(row.percentage_completed) || 0,
    lastUpdatedDate: row.last_updated_date,
    status: row.status,
  };
}
