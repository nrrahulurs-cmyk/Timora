import { z } from "zod";

// ── Enums & Literals ────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum([
  "academic_admin",
  "timetable_coordinator",
  "dean",
  "department_head",
  "faculty_instructor",
  "student_viewer",
]);

export const DayOfWeekSchema = z.enum([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

export const RoomTypeSchema = z.enum([
  "Lecture Hall",
  "Specialized Laboratory",
  "Standard Classroom",
  "Seminar Room",
  "Auditorium",
]);

export const RoomEquipmentTypeSchema = z.enum([
  "smart_projector",
  "dual_displays",
  "high_spec_workstations",
  "sound_reinforcement_mic",
  "bio_safety_cabinet_l2",
  "bio_safety_cabinet_l3",
  "fluid_dynamics_flume",
  "air_conditioning",
  "document_camera",
]);

export const SubjectTypeSchema = z.enum([
  "Lecture",
  "Laboratory",
  "Seminar",
  "Tutorial",
  "Project",
]);

export const ConstraintTypeSchema = z.enum([
  "room_clash",
  "faculty_overlap",
  "section_clash",
  "capacity_deficit",
  "equipment_mismatch",
  "maintenance_block",
  "consecutive_hours_exceeded",
]);

export const ConflictSeveritySchema = z.enum(["critical", "warning", "advisory"]);

export const RequestStatusSchema = z.enum([
  "pending_hod",
  "pending_dean",
  "approved",
  "rejected",
]);

// ── Entity Validation Schemas ───────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string().min(2),
  role: UserRoleSchema,
  departmentId: z.string().optional(),
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AcademicTermSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["draft", "active", "published", "archived"]),
  weeksCount: z.number().int().positive(),
  isCurrent: z.boolean(),
});

export const DepartmentSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2).max(10),
  name: z.string().min(3).max(100),
  building: z.string().min(2),
  headOfDepartmentId: z.string().min(1),
  colorToken: z.string().min(1),
  activeSectionsCount: z.number().int().nonnegative(),
  totalFacultyCount: z.number().int().nonnegative(),
});

export const FacultyAvailabilityPatternSchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  availableSlotIds: z.array(z.string()),
  preferredSlotIds: z.array(z.string()),
  blockedSlotIds: z.array(z.string()),
  maxHoursPerDay: z.number().int().positive().max(12),
});

export const FacultyMemberSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  employeeCode: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email(),
  departmentId: z.string().min(1),
  designation: z.enum([
    "Professor",
    "Associate Professor",
    "Assistant Professor",
    "Adjunct Lecturer",
  ]),
  maxCreditHours: z.number().int().positive().max(30),
  currentAssignedHours: z.number().int().nonnegative(),
  specializations: z.array(z.string()),
  availability: z.array(FacultyAvailabilityPatternSchema),
  status: z.enum(["active", "on_sabbatical", "leave"]),
});

export const StudentSectionSchema = z.object({
  id: z.string().min(1),
  departmentId: z.string().min(1),
  academicTermId: z.string().min(1),
  semester: z.number().int().min(1).max(10),
  sectionCode: z.string().min(2),
  name: z.string().min(2),
  studentCount: z.number().int().positive(),
  academicAdvisorId: z.string().min(1),
  curriculumCredits: z.number().positive(),
  allocatedCredits: z.number().nonnegative(),
});

export const SubjectSchema = z.object({
  id: z.string().min(1),
  departmentId: z.string().min(1),
  code: z.string().min(2).max(15),
  title: z.string().min(3),
  credits: z.number().int().positive(),
  semester: z.number().int().min(1).max(10),
  type: SubjectTypeSchema,
  lectureHoursWeekly: z.number().int().nonnegative(),
  labHoursWeekly: z.number().int().nonnegative(),
  tutorialHoursWeekly: z.number().int().nonnegative(),
  requiredRoomType: RoomTypeSchema,
  requiredEquipment: z.array(RoomEquipmentTypeSchema),
  isElective: z.boolean(),
});

export const TeachingAssignmentSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  facultyId: z.string().min(1),
  sectionId: z.string().min(1),
  academicTermId: z.string().min(1),
  weeklyHours: z.number().int().positive(),
  isPrimaryInstructor: z.boolean(),
});

export const RoomEquipmentSchema = z.object({
  id: z.string().min(1),
  type: RoomEquipmentTypeSchema,
  name: z.string().min(2),
  status: z.enum(["operational", "under_maintenance", "needs_calibration"]),
  serialNumber: z.string().min(2),
});

export const ClassroomSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2).max(15),
  name: z.string().min(3),
  building: z.string().min(2),
  floor: z.number().int(),
  capacity: z.number().int().positive(),
  type: RoomTypeSchema,
  equipment: z.array(RoomEquipmentTypeSchema),
  isAccessible: z.boolean(),
  status: z.enum(["Available", "Occupied", "Maintenance"]),
});

export const TimeSlotSchema = z.object({
  id: z.string().min(1),
  dayOfWeek: DayOfWeekSchema,
  slotIndex: z.number().int().min(1).max(8),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  label: z.string().min(3),
  isMorning: z.boolean(),
  isPeakHour: z.boolean(),
});

export const TimetableSessionSchema = z.object({
  id: z.string().min(1),
  academicTermId: z.string().min(1),
  versionId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().min(1),
  facultyId: z.string().min(1),
  classroomId: z.string().min(1),
  timeSlotId: z.string().min(1),
  status: z.enum(["scheduled", "cancelled", "moved", "extra_session"]),
  isRecurringWeekly: z.boolean(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string(),
});

export const RoomReservationSchema = z.object({
  id: z.string().min(1),
  classroomId: z.string().min(1),
  category: z.enum(["examination", "maintenance", "university_event", "ad_hoc_conference"]),
  title: z.string().min(3),
  requestedBy: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlotIds: z.array(z.string()).min(1),
  reason: z.string().min(3),
  blocksRegularClasses: z.boolean(),
  status: z.enum(["approved", "pending", "cancelled"]),
});

export const ExtraClassRequestSchema = z.object({
  id: z.string().min(1),
  facultyId: z.string().min(1),
  subjectId: z.string().min(1),
  sectionId: z.string().min(1),
  classroomId: z.string().min(1),
  timeSlotId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(3),
  status: RequestStatusSchema,
  submittedAt: z.string(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
});

export const TeacherExchangeRequestSchema = z.object({
  id: z.string().min(1),
  requesterFacultyId: z.string().min(1),
  requesterSessionId: z.string().min(1),
  targetFacultyId: z.string().min(1),
  targetSessionId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(3),
  status: RequestStatusSchema,
  submittedAt: z.string(),
  isPeerAccepted: z.boolean(),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().optional(),
});

export const AlternativeResolutionSchema = z.object({
  solutionId: z.string(),
  description: z.string(),
  targetClassroomId: z.string().optional(),
  targetTimeSlotId: z.string().optional(),
  substituteFacultyId: z.string().optional(),
  downstreamClashCount: z.number().int().nonnegative(),
  feasibilityScore: z.number().min(0).max(100),
  isRecommended: z.boolean(),
});

export const ConflictRecordSchema = z.object({
  id: z.string().min(1),
  type: ConstraintTypeSchema,
  severity: ConflictSeveritySchema,
  title: z.string().min(3),
  description: z.string().min(5),
  sessionIds: z.array(z.string()),
  classroomId: z.string().optional(),
  timeSlotId: z.string().optional(),
  facultyId: z.string().optional(),
  sectionId: z.string().optional(),
  detectedAt: z.string(),
  status: z.enum(["active", "resolved", "ignored"]),
  hasFeasibleAlternative: z.boolean(),
  alternatives: z.array(AlternativeResolutionSchema),
  resolutionNotes: z.string().optional(),
});

export const ScheduleVersionSchema = z.object({
  id: z.string().min(1),
  academicTermId: z.string().min(1),
  versionNumber: z.string().min(1),
  status: z.enum(["draft", "review", "published", "archived"]),
  publishedAt: z.string().optional(),
  publishedBy: z.string().optional(),
  changesSummary: z.string(),
  clashCount: z.number().int().nonnegative(),
});

export const ChangeHistoryRecordSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  entityType: z.enum(["session", "room", "faculty", "conflict"]),
  entityId: z.string().min(1),
  actorId: z.string().min(1),
  actorName: z.string().min(2),
  actorRole: z.string().min(2),
  action: z.string().min(2),
  targetName: z.string().min(2),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
  timestamp: z.string(),
  category: z.enum(["modification", "approval", "conflict", "automated"]),
});

export const SyllabusTopicSchema = z.object({
  id: z.string().min(1),
  moduleId: z.string().min(1),
  title: z.string().min(3),
  estimatedHours: z.number().positive(),
  sequenceOrder: z.number().int().positive(),
  isDelivered: z.boolean(),
  deliveredAtSessionId: z.string().optional(),
  deliveredByFacultyId: z.string().optional(),
  deliveredDate: z.string().optional(),
});

export const SyllabusModuleSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  moduleNumber: z.number().int().positive(),
  title: z.string().min(3),
  description: z.string(),
  totalPlannedHours: z.number().int().positive(),
  completedHours: z.number().int().nonnegative(),
  topics: z.array(SyllabusTopicSchema),
});

export const TopicProgressRecordSchema = z.object({
  subjectId: z.string().min(1),
  sectionId: z.string().min(1),
  totalPlannedHours: z.number().int().positive(),
  completedHours: z.number().int().nonnegative(),
  percentageCompleted: z.number().min(0).max(100),
  lastUpdatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["ahead", "on_track", "behind"]),
});

export const SynapseCollegeDatasetSchema = z.object({
  institutionName: z.string().min(3),
  campusCode: z.string().min(2),
  academicTerms: z.array(AcademicTermSchema),
  departments: z.array(DepartmentSchema),
  users: z.array(UserSchema),
  faculty: z.array(FacultyMemberSchema),
  sections: z.array(StudentSectionSchema),
  subjects: z.array(SubjectSchema),
  teachingAssignments: z.array(TeachingAssignmentSchema),
  classrooms: z.array(ClassroomSchema),
  equipment: z.array(RoomEquipmentSchema),
  timeSlots: z.array(TimeSlotSchema),
  timetableSessions: z.array(TimetableSessionSchema),
  reservations: z.array(RoomReservationSchema),
  conflicts: z.array(ConflictRecordSchema),
  scheduleVersions: z.array(ScheduleVersionSchema),
  changeHistory: z.array(ChangeHistoryRecordSchema),
  syllabusModules: z.array(SyllabusModuleSchema),
  syllabusProgress: z.array(TopicProgressRecordSchema),
  extraClassRequests: z.array(ExtraClassRequestSchema),
  teacherExchangeRequests: z.array(TeacherExchangeRequestSchema),
});
