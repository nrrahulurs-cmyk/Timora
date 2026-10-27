/**
 * SYNAPSE OS — Academic Scheduling Domain Entities & Relationships
 * Strictly typed definitions for institutional scheduling, constraint solving,
 * conflict tracking, facility management, and academic operations.
 */

// ── 1. Roles & Permissions ──────────────────────────────────────────────────

export type UserRole =
  | "academic_admin"
  | "timetable_coordinator"
  | "dean"
  | "department_head"
  | "faculty_instructor"
  | "student_viewer";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 2. Institution & Departments ────────────────────────────────────────────

export interface Department {
  id: string;
  code: string; // e.g. "CSE", "MECH", "ECE", "BIOTECH"
  name: string;
  building: string;
  headOfDepartmentId: string; // User/Faculty ID
  colorToken: string; // Hex or theme color for UI badge
  activeSectionsCount: number;
  totalFacultyCount: number;
}

export interface AcademicTerm {
  id: string;
  name: string; // e.g. "Fall 2026 (Odd Semester)"
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "published" | "archived";
  weeksCount: number;
  isCurrent: boolean;
}

// ── 3. Faculty & Availability ───────────────────────────────────────────────

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface FacultyAvailabilityPattern {
  dayOfWeek: DayOfWeek;
  availableSlotIds: string[]; // Time slot IDs when faculty can teach
  preferredSlotIds: string[]; // Highly preferred slots
  blockedSlotIds: string[]; // Hard unavailable (e.g. Dean senate duties, research block)
  maxHoursPerDay: number;
}

export interface FacultyMember {
  id: string;
  userId: string;
  employeeCode: string; // e.g. "FAC-104"
  name: string;
  email: string;
  departmentId: string;
  designation: "Professor" | "Associate Professor" | "Assistant Professor" | "Adjunct Lecturer";
  maxCreditHours: number; // e.g. 16 credits
  currentAssignedHours: number;
  specializations: string[];
  availability: FacultyAvailabilityPattern[];
  status: "active" | "on_sabbatical" | "leave";
}

// ── 4. Student Groups & Sections ────────────────────────────────────────────

export interface StudentSection {
  id: string;
  departmentId: string;
  academicTermId: string;
  semester: number; // 1 to 8
  sectionCode: string; // e.g. "CSE-S5-A", "ME-S3-B"
  name: string;
  studentCount: number; // e.g. 64 students
  academicAdvisorId: string; // Faculty ID
  curriculumCredits: number;
  allocatedCredits: number;
}

// ── 5. Subjects & Teaching Assignments ──────────────────────────────────────

export type SubjectType = "Lecture" | "Laboratory" | "Seminar" | "Tutorial" | "Project";

export interface Subject {
  id: string;
  departmentId: string;
  code: string; // e.g. "CS-401", "MATH-202"
  title: string;
  credits: number;
  semester: number;
  type: SubjectType;
  lectureHoursWeekly: number;
  labHoursWeekly: number;
  tutorialHoursWeekly: number;
  requiredRoomType: RoomType;
  requiredEquipment: RoomEquipmentType[];
  isElective: boolean;
}

export interface TeachingAssignment {
  id: string;
  subjectId: string;
  facultyId: string;
  sectionId: string;
  academicTermId: string;
  weeklyHours: number;
  isPrimaryInstructor: boolean;
}

// ── 6. Classrooms, Types & Equipment ────────────────────────────────────────

export type RoomType =
  | "Lecture Hall"
  | "Specialized Laboratory"
  | "Standard Classroom"
  | "Seminar Room"
  | "Auditorium";

export type RoomEquipmentType =
  | "smart_projector"
  | "dual_displays"
  | "high_spec_workstations"
  | "sound_reinforcement_mic"
  | "bio_safety_cabinet_l2"
  | "bio_safety_cabinet_l3"
  | "fluid_dynamics_flume"
  | "air_conditioning"
  | "document_camera";

export interface RoomEquipment {
  id: string;
  type: RoomEquipmentType;
  name: string;
  status: "operational" | "under_maintenance" | "needs_calibration";
  serialNumber: string;
}

export interface Classroom {
  id: string;
  code: string; // e.g. "LH-101", "LAB-CS-02", "SEM-302"
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: RoomType;
  equipment: RoomEquipmentType[];
  isAccessible: boolean; // Wheelchair accessible / ADA compliant
  status: "Available" | "Occupied" | "Maintenance";
}

// ── 7. Time Slots ───────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  slotIndex: number; // 1 to 6
  startTime: string; // "08:30"
  endTime: string; // "10:00"
  label: string; // "Mon 08:30 - 10:00 AM"
  isMorning: boolean;
  isPeakHour: boolean; // 10:00 - 13:00 are peak hours
}

// ── 8. Timetable Sessions ───────────────────────────────────────────────────

export type SessionStatus = "scheduled" | "cancelled" | "moved" | "extra_session";

export interface TimetableSession {
  id: string;
  academicTermId: string;
  versionId: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  classroomId: string;
  timeSlotId: string;
  status: SessionStatus;
  isRecurringWeekly: boolean;
  effectiveFrom: string;
  effectiveUntil: string;
}

// ── 9. Reservations & Maintenance Blocks ────────────────────────────────────

export type ReservationCategory =
  | "examination"
  | "maintenance"
  | "university_event"
  | "ad_hoc_conference";

export interface RoomReservation {
  id: string;
  classroomId: string;
  category: ReservationCategory;
  title: string;
  requestedBy: string; // User ID
  date: string;
  timeSlotIds: string[];
  reason: string;
  blocksRegularClasses: boolean;
  status: "approved" | "pending" | "cancelled";
}

// ── 10. Scheduling Constraints & Conflicts ──────────────────────────────────

export type ConstraintType =
  | "room_clash"
  | "faculty_overlap"
  | "section_clash"
  | "capacity_deficit"
  | "equipment_mismatch"
  | "maintenance_block"
  | "consecutive_hours_exceeded";

export type ConflictSeverity = "critical" | "warning" | "advisory";

export interface AlternativeResolution {
  solutionId: string;
  description: string;
  targetClassroomId?: string;
  targetTimeSlotId?: string;
  substituteFacultyId?: string;
  downstreamClashCount: number; // Ripple effect count
  feasibilityScore: number; // 0 to 100
  isRecommended: boolean;
}

export interface ConflictRecord {
  id: string;
  type: ConstraintType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  sessionIds: string[]; // Sessions involved in conflict
  classroomId?: string;
  timeSlotId?: string;
  facultyId?: string;
  sectionId?: string;
  detectedAt: string;
  status: "active" | "resolved" | "ignored";
  hasFeasibleAlternative: boolean;
  alternatives: AlternativeResolution[];
  resolutionNotes?: string;
}

// ── 11. Schedule Versions & Change History ──────────────────────────────────

export interface ScheduleVersion {
  sessionSnapshot?: TimetableSession[];
  id: string;
  academicTermId: string;
  versionNumber: string; // e.g. "v2.4"
  status: "draft" | "review" | "published" | "archived";
  publishedAt?: string;
  publishedBy?: string;
  changesSummary: string;
  clashCount: number;
}

export interface ChangeHistoryRecord {
  id: string;
  versionId: string;
  entityType: "session" | "room" | "faculty" | "conflict";
  entityId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetName: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  category: "modification" | "approval" | "conflict" | "automated";
}

// ── 12. Syllabus Modules, Topics & Progress ─────────────────────────────────

export interface SyllabusTopic {
  id: string;
  moduleId: string;
  title: string;
  estimatedHours: number;
  sequenceOrder: number;
  isDelivered: boolean;
  deliveredAtSessionId?: string;
  deliveredByFacultyId?: string;
  deliveredDate?: string;
}

export interface SyllabusModule {
  id: string;
  subjectId: string;
  moduleNumber: number;
  title: string;
  description: string;
  totalPlannedHours: number;
  completedHours: number;
  topics: SyllabusTopic[];
}

export interface TopicProgressRecord {
  subjectId: string;
  sectionId: string;
  totalPlannedHours: number;
  completedHours: number;
  percentageCompleted: number;
  lastUpdatedDate: string;
  status: "ahead" | "on_track" | "behind";
}

// ── 13. Academic Operations Requests ────────────────────────────────────────

export type RequestStatus = "pending_hod" | "pending_dean" | "approved" | "rejected";

export interface ExtraClassRequest {
  id: string;
  facultyId: string;
  subjectId: string;
  sectionId: string;
  classroomId: string;
  timeSlotId: string;
  scheduledDate: string;
  reason: string;
  status: RequestStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface TeacherExchangeRequest {
  id: string;
  requesterFacultyId: string;
  requesterSessionId: string;
  targetFacultyId: string;
  targetSessionId: string;
  date: string;
  reason: string;
  status: RequestStatus;
  submittedAt: string;
  isPeerAccepted: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ── 14. Aggregate Complete Domain Model ─────────────────────────────────────

export interface SynapseCollegeDataset {
  institutionName: string;
  campusCode: string;
  academicTerms: AcademicTerm[];
  departments: Department[];
  users: User[];
  faculty: FacultyMember[];
  sections: StudentSection[];
  subjects: Subject[];
  teachingAssignments: TeachingAssignment[];
  classrooms: Classroom[];
  equipment: RoomEquipment[];
  timeSlots: TimeSlot[];
  timetableSessions: TimetableSession[];
  reservations: RoomReservation[];
  conflicts: ConflictRecord[];
  scheduleVersions: ScheduleVersion[];
  changeHistory: ChangeHistoryRecord[];
  syllabusModules: SyllabusModule[];
  syllabusProgress: TopicProgressRecord[];
  extraClassRequests: ExtraClassRequest[];
  teacherExchangeRequests: TeacherExchangeRequest[];
}
