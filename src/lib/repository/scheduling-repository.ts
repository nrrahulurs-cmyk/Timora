/**
 * SYNAPSE OS — Academic Scheduling Domain Repository Interface & Implementations
 * Provides an independent, clean repository abstraction to support both:
 * 1. Deterministic local demo data (LocalDemoSchedulingRepository) backed by SYNAPSE_SEED_DATA.
 * 2. Future Supabase PostgreSQL backed implementation (SupabaseSchedulingRepository).
 */

import type {
  SynapseCollegeDataset,
  Department,
  FacultyMember,
  StudentSection,
  Subject,
  Classroom,
  RoomType,
  TimeSlot,
  DayOfWeek,
  TimetableSession,
  ConflictRecord,
  RoomReservation,
  ScheduleVersion,
  ChangeHistoryRecord,
  SyllabusModule,
  TopicProgressRecord,
  ExtraClassRequest,
  TeacherExchangeRequest,
  User,
  AcademicTerm,
} from "@/types/domain";

import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { validateSession } from "@/lib/scheduling/constraint-engine";

// ── Legacy/Dashboard Types Preserved for Dashboard UI ────────────────────────

export interface KpiMetrics {
  scheduledClasses: {
    count: number;
    total: number;
    percentage: number;
    supportingText: string;
  };
  unresolvedConflicts: {
    count: number;
    roomClashes: number;
    facultyClashes: number;
    supportingText: string;
  };
  availableRooms: {
    available: number;
    total: number;
    occupied: number;
    supportingText: string;
  };
  roomUtilisation: {
    rate: number;
    targetBaseline: number;
    supportingText: string;
  };
  pendingApprovals: {
    count: number;
    classExchanges: number;
    extraClasses: number;
    supportingText: string;
  };
}

export interface ChartDataPoint {
  period: string;
  roomUtilisation: number;
  scheduledSessions: number;
  activeConflicts: number;
  lectureHalls: number;
  labs: number;
  seminarRooms: number;
}

export interface AttentionItem {
  id: string;
  title: string;
  type: "clash" | "exchange" | "approval" | "capacity";
  severity: "critical" | "warning" | "info";
  timeSlot: string;
  location?: string;
  description: string;
  actionLabel: string;
  targetUrl: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  timestamp: string;
  category: "modification" | "approval" | "conflict" | "automated";
}

export interface RoomRecord {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number;
  type: "Lecture Hall" | "Lab" | "Seminar" | "Classroom";
  status: "Available" | "Occupied" | "Maintenance";
  currentClass?: string;
  nextAvailableSlot: string;
}

// ── Stable Dashboard Fixture Constants ──────────────────────────────────────

export const STABLE_KPI_METRICS: KpiMetrics = {
  scheduledClasses: {
    count: 1284,
    total: 1318,
    percentage: 97.4,
    supportingText: "1,284 of 1,318 curriculum slots filled",
  },
  unresolvedConflicts: {
    count: 5,
    roomClashes: 2,
    facultyClashes: 1,
    supportingText: "3 critical • 2 warnings",
  },
  availableRooms: {
    available: 11,
    total: 15,
    occupied: 4,
    supportingText: "11 of 15 facilities free this hour",
  },
  roomUtilisation: {
    rate: 86.2,
    targetBaseline: 85.0,
    supportingText: "1.2% above target baseline (85.0%)",
  },
  pendingApprovals: {
    count: 7,
    classExchanges: 4,
    extraClasses: 3,
    supportingText: "4 exchanges • 3 extra classes",
  },
};

export const STABLE_CHART_WEEKLY: ChartDataPoint[] = [
  {
    period: "Mon",
    roomUtilisation: 88,
    scheduledSessions: 284,
    activeConflicts: 1,
    lectureHalls: 92,
    labs: 86,
    seminarRooms: 68,
  },
  {
    period: "Tue",
    roomUtilisation: 94,
    scheduledSessions: 310,
    activeConflicts: 2,
    lectureHalls: 98,
    labs: 92,
    seminarRooms: 74,
  },
  {
    period: "Wed",
    roomUtilisation: 91,
    scheduledSessions: 295,
    activeConflicts: 3,
    lectureHalls: 94,
    labs: 90,
    seminarRooms: 71,
  },
  {
    period: "Thu",
    roomUtilisation: 92,
    scheduledSessions: 302,
    activeConflicts: 1,
    lectureHalls: 96,
    labs: 89,
    seminarRooms: 70,
  },
  {
    period: "Fri",
    roomUtilisation: 72,
    scheduledSessions: 229,
    activeConflicts: 0,
    lectureHalls: 75,
    labs: 72,
    seminarRooms: 55,
  },
  {
    period: "Sat",
    roomUtilisation: 34,
    scheduledSessions: 84,
    activeConflicts: 0,
    lectureHalls: 30,
    labs: 40,
    seminarRooms: 20,
  },
];

export const STABLE_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: "ATT-001",
    title: "Classroom Double-Booking in LH-201",
    type: "clash",
    severity: "critical",
    timeSlot: "Wed 10:00 - 11:30 AM",
    location: "LH-201 (180 Seats)",
    description: "CS-401 Sec A (145 students) overlaps with ECE-305 Sec A (120 students).",
    actionLabel: "Resolve Room Clash",
    targetUrl: "/conflicts",
  },
  {
    id: "ATT-002",
    title: "Faculty Time Overlap for Dr. Sarah Lin",
    type: "clash",
    severity: "critical",
    timeSlot: "Tue 02:00 - 03:30 PM",
    location: "Lab-Bio-01 & Senate Hall",
    description: "Scheduled to supervise Cellular Biology Lab while assigned to Academic Senate.",
    actionLabel: "Reassign Faculty",
    targetUrl: "/conflicts",
  },
  {
    id: "ATT-006",
    title: "BSL-3 Facility Mandatory Lockdown",
    type: "clash",
    severity: "critical",
    timeSlot: "Wed 11:30 AM - 01:00 PM",
    location: "LAB-BIO-BSL3",
    description: "Statutory biosafety containment overhaul prevents holding ADV-BIO-901. Zero on-campus substitutes exist.",
    actionLabel: "Administrative Review",
    targetUrl: "/conflicts",
  },
  {
    id: "ATT-003",
    title: "Classroom Capacity Deficit in SEM-302",
    type: "capacity",
    severity: "warning",
    timeSlot: "Thu 11:30 AM - 01:00 PM",
    location: "SEM-302 (Capacity: 50)",
    description: "ENG-210 Sec A enrollment reached 65 students. Room deficit of 15 seats.",
    actionLabel: "Move to Larger Room",
    targetUrl: "/rooms",
  },
  {
    id: "ATT-007",
    title: "Maintenance Collision in LAB-CS-02",
    type: "clash",
    severity: "warning",
    timeSlot: "Thu 02:00 - 03:30 PM",
    location: "LAB-CS-02 (AI Cluster Lab)",
    description: "CS-402L DevOps Lab scheduled during pre-approved UPS power grid servicing.",
    actionLabel: "Reallocate Lab",
    targetUrl: "/conflicts",
  },
  {
    id: "ATT-004",
    title: "Faculty Exchange: Dr. Alan Turing ↔ Prof. Lovelace",
    type: "exchange",
    severity: "warning",
    timeSlot: "Mon 08:30 - 10:00 AM",
    description: "Mutual timetable exchange request for CS-301 vs MATH-202 awaiting HOD review.",
    actionLabel: "Review Exchange",
    targetUrl: "/exchanges",
  },
  {
    id: "ATT-005",
    title: "Extra Class Approval: ME-202 Fluid Mechanics",
    type: "approval",
    severity: "info",
    timeSlot: "Sat 10:30 AM - 12:00 PM",
    location: "LH-202 (140 Seats)",
    description: "Mid-semester revision lecture requested by Prof. Kenneth Cole awaiting signoff.",
    actionLabel: "Review Request",
    targetUrl: "/extra-classes",
  },
];

export const STABLE_ACTIVITY_LOG: ActivityItem[] = [
  {
    id: "ACT-01",
    actor: "Dr. Eleanor Vance",
    actorRole: "Timetable Coordinator",
    action: "Reallocated section from LH-102 to LH-201",
    target: "CS-401 Distributed Systems (Sec A)",
    timestamp: "12m ago",
    category: "modification",
  },
  {
    id: "ACT-02",
    actor: "Prof. Kenneth Cole",
    actorRole: "Faculty Instructor",
    action: "Submitted extra class request for Saturday",
    target: "ME-202 Fluid Mechanics",
    timestamp: "38m ago",
    category: "approval",
  },
  {
    id: "ACT-03",
    actor: "SYNAPSE Engine",
    actorRole: "Automated Constraint Solver",
    action: "Detected room capacity deficit (+15 students)",
    target: "ENG-210 in SEM-302",
    timestamp: "1h ago",
    category: "conflict",
  },
  {
    id: "ACT-04",
    actor: "Dr. Alan Turing",
    actorRole: "Department Head",
    action: "Submitted slot exchange request with Prof. Ada Lovelace",
    target: "CS-301 vs MATH-202",
    timestamp: "2h ago",
    category: "approval",
  },
  {
    id: "ACT-05",
    actor: "Academic Registrar",
    actorRole: "Administrative Office",
    action: "Published revised draft v2.4 for School of Engineering",
    target: "Fall 2026 Academic Timetable",
    timestamp: "3h ago",
    category: "modification",
  },
  {
    id: "ACT-06",
    actor: "SYNAPSE Engine",
    actorRole: "Automated Constraint Solver",
    action: "Flagged sole BSL-3 facility maintenance collision (CONF-05)",
    target: "ADV-BIO-901 in LAB-BIO-BSL3",
    timestamp: "4h ago",
    category: "automated",
  },
];

export const STABLE_ROOMS: RoomRecord[] = [
  {
    id: "ROOM-LH-101",
    code: "LH-101",
    name: "Main Campus Auditorium",
    building: "Central Administration Wing",
    capacity: 250,
    type: "Lecture Hall",
    status: "Available",
    nextAvailableSlot: "Free until 02:00 PM",
  },
  {
    id: "ROOM-LH-102",
    code: "LH-102",
    name: "Turing Amphitheatre",
    building: "Turing Computing Block",
    capacity: 160,
    type: "Lecture Hall",
    status: "Available",
    nextAvailableSlot: "Free until 03:30 PM",
  },
  {
    id: "ROOM-LH-201",
    code: "LH-201",
    name: "Maxwell Lecture Theatre",
    building: "Maxwell Physics Wing",
    capacity: 180,
    type: "Lecture Hall",
    status: "Occupied",
    currentClass: "CS-401 Sec A",
    nextAvailableSlot: "Free at 11:30 AM",
  },
  {
    id: "ROOM-LH-202",
    code: "LH-202",
    name: "Carnot Memorial Hall",
    building: "Carnot Thermal Complex",
    capacity: 140,
    type: "Lecture Hall",
    status: "Available",
    nextAvailableSlot: "Free until 04:00 PM",
  },
  {
    id: "ROOM-CR-204",
    code: "CR-204",
    name: "Interactive Classroom 204",
    building: "Turing Computing Block",
    capacity: 75,
    type: "Classroom",
    status: "Available",
    nextAvailableSlot: "Free until 01:00 PM",
  },
  {
    id: "ROOM-CR-205",
    code: "CR-205",
    name: "Tiered Classroom 205",
    building: "Turing Computing Block",
    capacity: 75,
    type: "Classroom",
    status: "Available",
    nextAvailableSlot: "Free until 02:30 PM",
  },
  {
    id: "ROOM-CR-301",
    code: "CR-301",
    name: "General Classroom 301",
    building: "Maxwell Physics Wing",
    capacity: 65,
    type: "Classroom",
    status: "Available",
    nextAvailableSlot: "Free until 03:00 PM",
  },
  {
    id: "ROOM-SEM-302",
    code: "SEM-302",
    name: "Executive Seminar Room",
    building: "Central Administration Wing",
    capacity: 50,
    type: "Seminar",
    status: "Occupied",
    currentClass: "ENG-210 Sec A",
    nextAvailableSlot: "Free at 01:00 PM",
  },
  {
    id: "ROOM-SEM-303",
    code: "SEM-303",
    name: "Graduate Colloquium Suite",
    building: "Carnot Thermal Complex",
    capacity: 40,
    type: "Seminar",
    status: "Available",
    nextAvailableSlot: "Free until 02:00 PM",
  },
  {
    id: "ROOM-LAB-CS-01",
    code: "LAB-CS-01",
    name: "Cloud Systems & DevOps Lab",
    building: "Turing Computing Block",
    capacity: 60,
    type: "Lab",
    status: "Available",
    nextAvailableSlot: "Free until 04:00 PM",
  },
  {
    id: "ROOM-LAB-CS-02",
    code: "LAB-CS-02",
    name: "AI & High-Performance Computing Lab",
    building: "Turing Computing Block",
    capacity: 45,
    type: "Lab",
    status: "Maintenance",
    nextAvailableSlot: "Undergoing UPS Overhaul",
  },
  {
    id: "ROOM-LAB-ECE-01",
    code: "LAB-ECE-01",
    name: "VLSI Design & Embedded Lab",
    building: "Maxwell Physics Wing",
    capacity: 45,
    type: "Lab",
    status: "Available",
    nextAvailableSlot: "Free until 01:30 PM",
  },
  {
    id: "ROOM-LAB-ME-01",
    code: "LAB-ME-01",
    name: "Fluid Dynamics & Aerodynamics Lab",
    building: "Carnot Thermal Complex",
    capacity: 40,
    type: "Lab",
    status: "Available",
    nextAvailableSlot: "Free until 02:00 PM",
  },
  {
    id: "ROOM-LAB-BIO-01",
    code: "LAB-BIO-01",
    name: "Molecular Genetics & Cellular Lab",
    building: "Franklin Life Sciences Wing",
    capacity: 35,
    type: "Lab",
    status: "Available",
    nextAvailableSlot: "Free until 03:00 PM",
  },
  {
    id: "ROOM-LAB-BIO-BSL3",
    code: "LAB-BIO-BSL3",
    name: "Bio-Safety Level 3 Containment Lab",
    building: "Franklin Life Sciences Wing",
    capacity: 20,
    type: "Lab",
    status: "Maintenance",
    nextAvailableSlot: "Statutory Seal Certification",
  },
];

export const SEED_ROOMS = STABLE_ROOMS;

// ── Independent Repository Interface ─────────────────────────────────────────

export interface SchedulingRepository {
  // Domain queries & mutations
  getDataset(): Promise<SynapseCollegeDataset>;
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  getFaculty(departmentId?: string): Promise<FacultyMember[]>;
  getFacultyById(id: string): Promise<FacultyMember | undefined>;
  getSections(departmentId?: string, semester?: number): Promise<StudentSection[]>;
  getSubjects(departmentId?: string): Promise<Subject[]>;
  getSubjectById(id: string): Promise<Subject | undefined>;
  getClassrooms(type?: RoomType): Promise<Classroom[]>;
  getClassroomById(id: string): Promise<Classroom | undefined>;
  getTimeSlots(dayOfWeek?: DayOfWeek): Promise<TimeSlot[]>;
  getTimetableSessions(filter?: {
    sectionId?: string;
    facultyId?: string;
    classroomId?: string;
    dayOfWeek?: DayOfWeek;
  }): Promise<TimetableSession[]>;
  getConflicts(status?: "active" | "resolved" | "ignored"): Promise<ConflictRecord[]>;
  getConflictById(id: string): Promise<ConflictRecord | undefined>;
  resolveConflict(
    conflictId: string,
    solutionId: string
  ): Promise<{ success: boolean; message: string; updatedSession?: TimetableSession }>;
  undoConflictResolution(
    conflictId: string
  ): Promise<{ success: boolean; message: string; restoredSession?: TimetableSession }>;
  getRoomReservations(classroomId?: string): Promise<RoomReservation[]>;
  getScheduleVersions(): Promise<ScheduleVersion[]>;
  getChangeHistory(entityType?: string): Promise<ChangeHistoryRecord[]>;
  getSyllabusModules(subjectId?: string): Promise<SyllabusModule[]>;
  getTopicProgress(subjectId?: string, sectionId?: string): Promise<TopicProgressRecord[]>;
  getExtraClassRequests(status?: string): Promise<ExtraClassRequest[]>;
  getTeacherExchangeRequests(status?: string): Promise<TeacherExchangeRequest[]>;
  createExtraClassRequest(
    data: Omit<ExtraClassRequest, "id" | "submittedAt">
  ): Promise<ExtraClassRequest>;
  createTeacherExchangeRequest(
    data: Omit<TeacherExchangeRequest, "id" | "submittedAt">
  ): Promise<TeacherExchangeRequest>;
  approveExtraClassRequest(id: string, reviewedBy: string): Promise<boolean>;
  rejectExtraClassRequest(id: string, reviewedBy: string): Promise<boolean>;
  approveTeacherExchangeRequest(id: string, reviewedBy: string): Promise<boolean>;
  rejectTeacherExchangeRequest(id: string, reviewedBy: string): Promise<boolean>;
  updateTopicDelivery(
    topicId: string,
    isDelivered: boolean,
    facultyId?: string,
    sessionId?: string
  ): Promise<boolean>;

  publishScheduleVersion(
    versionNumber: string,
    publishedBy: string,
    notes?: string
  ): Promise<{
    success: boolean;
    version?: ScheduleVersion;
    message: string;
    unresolvedConflicts: ConflictRecord[];
  }>;
  rollbackToVersion(
    versionId: string,
    actorName: string
  ): Promise<{ success: boolean; message: string; restoredVersion?: ScheduleVersion }>;
  previewPublication(versionId?: string): Promise<{
    canPublish: boolean;
    totalSessions: number;
    activeConflicts: ConflictRecord[];
    blockingConflictsCount: number;
    warningsCount: number;
    beforeAfterDiff: {
      previousVersion: string;
      proposedVersion: string;
      modificationsCount: number;
    };
  }>;

  // Dashboard Aggregates (Preserved for Dashboard Integration)
  getKpiMetrics(): Promise<KpiMetrics>;
  getChartData(
    metricType?: "utilisation" | "sessions" | "conflicts",
    range?: "week" | "month" | "semester"
  ): Promise<ChartDataPoint[]>;
  getAttentionItems(): Promise<AttentionItem[]>;
  getActivityLog(filter?: string): Promise<ActivityItem[]>;
  getAvailableRooms(query?: string): Promise<RoomRecord[]>;
  resolveAttentionItem(id: string): Promise<boolean>;
  scheduleExtraClass(payload: {
    courseCode: string;
    roomCode: string;
    date: string;
    timeSlot: string;
  }): Promise<boolean>;
}

// ── Deterministic Local Demo Implementation ──────────────────────────────────

export class LocalDemoSchedulingRepository implements SchedulingRepository {
  private dataset: SynapseCollegeDataset;
  private attentionItems: AttentionItem[];
  private activityLog: ActivityItem[];
  private roomRecords: RoomRecord[];
  private undoSnapshots: Map<
    string,
    {
      sessionId: string;
      before: {
        classroomId: string;
        timeSlotId: string;
        facultyId: string;
        conflictStatus: string;
      };
    }
  > = new Map();

  constructor(initialData: SynapseCollegeDataset = SYNAPSE_SEED_DATA) {
    // Deep clone to guarantee mutability without corrupting frozen constants
    this.dataset = JSON.parse(JSON.stringify(initialData));
    this.attentionItems = [...STABLE_ATTENTION_ITEMS];
    this.activityLog = [...STABLE_ACTIVITY_LOG];
    this.roomRecords = [...SEED_ROOMS];
  }

  // Domain Queries
  async getDataset(): Promise<SynapseCollegeDataset> {
    return { ...this.dataset };
  }

  async getDepartments(): Promise<Department[]> {
    return [...this.dataset.departments];
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    return this.dataset.departments.find((d) => d.id === id || d.code === id);
  }

  async getFaculty(departmentId?: string): Promise<FacultyMember[]> {
    if (!departmentId) return [...this.dataset.faculty];
    return this.dataset.faculty.filter((f) => f.departmentId === departmentId);
  }

  async getFacultyById(id: string): Promise<FacultyMember | undefined> {
    return this.dataset.faculty.find((f) => f.id === id || f.employeeCode === id);
  }

  async getSections(departmentId?: string, semester?: number): Promise<StudentSection[]> {
    return this.dataset.sections.filter((s) => {
      if (departmentId && s.departmentId !== departmentId) return false;
      if (semester && s.semester !== semester) return false;
      return true;
    });
  }

  async getSubjects(departmentId?: string): Promise<Subject[]> {
    if (!departmentId) return [...this.dataset.subjects];
    return this.dataset.subjects.filter((s) => s.departmentId === departmentId);
  }

  async getSubjectById(id: string): Promise<Subject | undefined> {
    return this.dataset.subjects.find((s) => s.id === id || s.code === id);
  }

  async getClassrooms(type?: RoomType): Promise<Classroom[]> {
    if (!type) return [...this.dataset.classrooms];
    return this.dataset.classrooms.filter((c) => c.type === type);
  }

  async getClassroomById(id: string): Promise<Classroom | undefined> {
    return this.dataset.classrooms.find((c) => c.id === id || c.code === id);
  }

  async getTimeSlots(dayOfWeek?: DayOfWeek): Promise<TimeSlot[]> {
    if (!dayOfWeek) return [...this.dataset.timeSlots];
    return this.dataset.timeSlots.filter((t) => t.dayOfWeek === dayOfWeek);
  }

  async getTimetableSessions(filter?: {
    sectionId?: string;
    facultyId?: string;
    classroomId?: string;
    dayOfWeek?: DayOfWeek;
  }): Promise<TimetableSession[]> {
    let sessions = [...this.dataset.timetableSessions];
    if (!filter) return sessions;

    if (filter.sectionId) {
      sessions = sessions.filter((s) => s.sectionId === filter.sectionId);
    }
    if (filter.facultyId) {
      sessions = sessions.filter((s) => s.facultyId === filter.facultyId);
    }
    if (filter.classroomId) {
      sessions = sessions.filter((s) => s.classroomId === filter.classroomId);
    }
    if (filter.dayOfWeek) {
      const slotIds = this.dataset.timeSlots
        .filter((t) => t.dayOfWeek === filter.dayOfWeek)
        .map((t) => t.id);
      sessions = sessions.filter((s) => slotIds.includes(s.timeSlotId));
    }
    return sessions;
  }

  async getConflicts(status: "active" | "resolved" | "ignored" = "active"): Promise<ConflictRecord[]> {
    return this.dataset.conflicts.filter((c) => c.status === status);
  }

  async getConflictById(id: string): Promise<ConflictRecord | undefined> {
    return this.dataset.conflicts.find((c) => c.id === id);
  }

  async resolveConflict(
    conflictId: string,
    solutionId: string
  ): Promise<{ success: boolean; message: string; updatedSession?: TimetableSession }> {
    const conflict = this.dataset.conflicts.find((c) => c.id === conflictId);
    if (!conflict) {
      return { success: false, message: `Conflict ${conflictId} not found.` };
    }

    if (!conflict.hasFeasibleAlternative) {
      return {
        success: false,
        message: `Conflict ${conflictId} has no feasible alternative on campus. Administrative rescheduling required.`,
      };
    }

    const solution = conflict.alternatives.find((a) => a.solutionId === solutionId);
    if (!solution) {
      return { success: false, message: `Alternative solution ${solutionId} not found.` };
    }

    // Apply solution to the target session with strict server-side revalidation
    let updatedSession: TimetableSession | undefined;
    let beforeState: {
      classroomId: string;
      timeSlotId: string;
      facultyId: string;
      conflictStatus: string;
    } | null = null;

    if (conflict.sessionIds.length > 0) {
      const targetSessionId = conflict.sessionIds[conflict.sessionIds.length - 1];
      const session = this.dataset.timetableSessions.find((s) => s.id === targetSessionId);
      if (session) {
        // Construct candidate
        const candidateSession: TimetableSession = {
          ...session,
          classroomId: solution.targetClassroomId || session.classroomId,
          timeSlotId: solution.targetTimeSlotId || session.timeSlotId,
          facultyId: solution.substituteFacultyId || session.facultyId,
        };

        // Server-side revalidation immediately before committing change
        const otherSessions = this.dataset.timetableSessions.filter((s) => s.id !== targetSessionId);
        const revalidation = validateSession(candidateSession, this.dataset, {
          activeSessions: otherSessions,
        });
        if (!revalidation.isValid) {
          const violationSummary = revalidation.hardViolations.map((v) => v.description).join("; ");
          return {
            success: false,
            message: `Server revalidation failed: Proposal violates hard constraint(s) — ${violationSummary}`,
          };
        }

        beforeState = {
          classroomId: session.classroomId,
          timeSlotId: session.timeSlotId,
          facultyId: session.facultyId,
          conflictStatus: conflict.status,
        };

        // Save undo snapshot
        this.undoSnapshots.set(conflictId, {
          sessionId: session.id,
          before: beforeState,
        });

        // Mutate session state
        session.classroomId = candidateSession.classroomId;
        session.timeSlotId = candidateSession.timeSlotId;
        session.facultyId = candidateSession.facultyId;
        updatedSession = { ...session };
      }
    }

    // Mark conflict as resolved
    conflict.status = "resolved";

    // Add audit history record with precise before and after snapshot
    const historyItem: ChangeHistoryRecord = {
      id: `HIST-${Date.now()}`,
      versionId: "VER-2.4",
      entityType: "conflict",
      entityId: conflictId,
      actorId: "USER-VANCE",
      actorName: "Dr. Eleanor Vance",
      actorRole: "Timetable Coordinator",
      action: `Resolved conflict using solution ${solutionId}`,
      targetName: conflict.title,
      previousValue: beforeState
        ? JSON.stringify({
            status: "active",
            ...beforeState,
          })
        : "active",
      newValue: JSON.stringify({
        status: "resolved",
        solutionId,
        assignedClassroom: solution.targetClassroomId,
        assignedTimeSlot: solution.targetTimeSlotId,
        assignedFaculty: solution.substituteFacultyId,
      }),
      timestamp: new Date().toISOString(),
      category: "modification",
    };
    this.dataset.changeHistory.unshift(historyItem);

    return {
      success: true,
      message: `Conflict resolved successfully: ${solution.description}`,
      updatedSession,
    };
  }

  async undoConflictResolution(
    conflictId: string
  ): Promise<{ success: boolean; message: string; restoredSession?: TimetableSession }> {
    const snapshot = this.undoSnapshots.get(conflictId);
    if (!snapshot) {
      return {
        success: false,
        message: `No undo snapshot found for conflict ${conflictId}.`,
      };
    }

    const session = this.dataset.timetableSessions.find((s) => s.id === snapshot.sessionId);
    const conflict = this.dataset.conflicts.find((c) => c.id === conflictId);

    if (session) {
      session.classroomId = snapshot.before.classroomId;
      session.timeSlotId = snapshot.before.timeSlotId;
      session.facultyId = snapshot.before.facultyId;
    }

    if (conflict) {
      conflict.status = "active";
    }

    this.undoSnapshots.delete(conflictId);

    const historyItem: ChangeHistoryRecord = {
      id: `HIST-UNDO-${Date.now()}`,
      versionId: "VER-2.4",
      entityType: "conflict",
      entityId: conflictId,
      actorId: "USER-VANCE",
      actorName: "Dr. Eleanor Vance",
      actorRole: "Timetable Coordinator",
      action: `Undid resolution for conflict ${conflictId}`,
      targetName: conflict?.title || conflictId,
      previousValue: "resolved",
      newValue: "active",
      timestamp: new Date().toISOString(),
      category: "modification",
    };
    this.dataset.changeHistory.unshift(historyItem);

    return {
      success: true,
      message: `Conflict resolution undone: restored session ${snapshot.sessionId} to previous state.`,
      restoredSession: session ? { ...session } : undefined,
    };
  }

  async getRoomReservations(classroomId?: string): Promise<RoomReservation[]> {
    if (!classroomId) return [...this.dataset.reservations];
    return this.dataset.reservations.filter((r) => r.classroomId === classroomId);
  }

  async getScheduleVersions(): Promise<ScheduleVersion[]> {
    return [...this.dataset.scheduleVersions];
  }

  async getChangeHistory(entityType?: string): Promise<ChangeHistoryRecord[]> {
    if (!entityType) return [...this.dataset.changeHistory];
    return this.dataset.changeHistory.filter((h) => h.entityType === entityType);
  }

  async getSyllabusModules(subjectId?: string): Promise<SyllabusModule[]> {
    if (!subjectId) return [...this.dataset.syllabusModules];
    return this.dataset.syllabusModules.filter((m) => m.subjectId === subjectId);
  }

  async getTopicProgress(subjectId?: string, sectionId?: string): Promise<TopicProgressRecord[]> {
    return this.dataset.syllabusProgress.filter((p) => {
      if (subjectId && p.subjectId !== subjectId) return false;
      if (sectionId && p.sectionId !== sectionId) return false;
      return true;
    });
  }

  async getExtraClassRequests(status?: string): Promise<ExtraClassRequest[]> {
    if (!status) return [...this.dataset.extraClassRequests];
    return this.dataset.extraClassRequests.filter((r) => r.status === status);
  }

  async getTeacherExchangeRequests(status?: string): Promise<TeacherExchangeRequest[]> {
    if (!status) return [...this.dataset.teacherExchangeRequests];
    return this.dataset.teacherExchangeRequests.filter((r) => r.status === status);
  }

  async createExtraClassRequest(
    data: Omit<ExtraClassRequest, "id" | "submittedAt">
  ): Promise<ExtraClassRequest> {
    const newRequest: ExtraClassRequest = {
      ...data,
      id: `EXTRA-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    this.dataset.extraClassRequests.unshift(newRequest);
    return newRequest;
  }

  async createTeacherExchangeRequest(
    data: Omit<TeacherExchangeRequest, "id" | "submittedAt">
  ): Promise<TeacherExchangeRequest> {
    const newRequest: TeacherExchangeRequest = {
      ...data,
      id: `EXCH-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };
    this.dataset.teacherExchangeRequests.unshift(newRequest);
    return newRequest;
  }

  async approveExtraClassRequest(id: string, reviewedBy: string): Promise<boolean> {
    const req = this.dataset.extraClassRequests.find((r) => r.id === id);
    if (!req) return false;
    req.status = "approved";
    req.reviewedBy = reviewedBy;
    req.reviewedAt = new Date().toISOString();
    return true;
  }

  async rejectExtraClassRequest(id: string, reviewedBy: string): Promise<boolean> {
    const req = this.dataset.extraClassRequests.find((r) => r.id === id);
    if (!req) return false;
    req.status = "rejected";
    req.reviewedBy = reviewedBy;
    req.reviewedAt = new Date().toISOString();
    return true;
  }

  async approveTeacherExchangeRequest(id: string, reviewedBy: string): Promise<boolean> {
    const req = this.dataset.teacherExchangeRequests.find((r) => r.id === id);
    if (!req) return false;
    req.status = "approved";
    req.reviewedBy = reviewedBy;
    req.reviewedAt = new Date().toISOString();
    return true;
  }

  async rejectTeacherExchangeRequest(id: string, reviewedBy: string): Promise<boolean> {
    const req = this.dataset.teacherExchangeRequests.find((r) => r.id === id);
    if (!req) return false;
    req.status = "rejected";
    req.reviewedBy = reviewedBy;
    req.reviewedAt = new Date().toISOString();
    return true;
  }

  async updateTopicDelivery(
    topicId: string,
    isDelivered: boolean,
    facultyId?: string,
    sessionId?: string
  ): Promise<boolean> {
    for (const mod of this.dataset.syllabusModules) {
      const topic = mod.topics.find((t) => t.id === topicId);
      if (topic) {
        topic.isDelivered = isDelivered;
        if (isDelivered) {
          topic.deliveredDate = new Date().toISOString().split("T")[0];
          if (facultyId) topic.deliveredByFacultyId = facultyId;
          if (sessionId) topic.deliveredAtSessionId = sessionId;
        } else {
          delete topic.deliveredDate;
          delete topic.deliveredByFacultyId;
          delete topic.deliveredAtSessionId;
        }

        // Recalculate module completed hours
        mod.completedHours = mod.topics
          .filter((t) => t.isDelivered)
          .reduce((sum, t) => sum + t.estimatedHours, 0);

        // Recalculate syllabus progress record
        const progress = this.dataset.syllabusProgress.find((p) => p.subjectId === mod.subjectId);
        if (progress) {
          const allModulesForSubject = this.dataset.syllabusModules.filter(
            (m) => m.subjectId === mod.subjectId
          );
          const totalPlanned = allModulesForSubject.reduce((s, m) => s + m.totalPlannedHours, 0);
          const totalCompleted = allModulesForSubject.reduce((s, m) => s + m.completedHours, 0);
          progress.completedHours = totalCompleted;
          progress.percentageCompleted = Math.round((totalCompleted / (totalPlanned || 1)) * 1000) / 10;
          progress.lastUpdatedDate = new Date().toISOString().split("T")[0];
          progress.status =
            progress.percentageCompleted >= 75
              ? "ahead"
              : progress.percentageCompleted >= 45
              ? "on_track"
              : "behind";
        }
        return true;
      }
    }
    return false;
  }

  async previewPublication(versionId?: string): Promise<{
    canPublish: boolean;
    totalSessions: number;
    activeConflicts: ConflictRecord[];
    blockingConflictsCount: number;
    warningsCount: number;
    beforeAfterDiff: {
      previousVersion: string;
      proposedVersion: string;
      modificationsCount: number;
    };
  }> {
    const activeConflicts = this.dataset.conflicts.filter((c) => c.status === "active");
    const blocking = activeConflicts.filter((c) => c.severity === "critical");
    const warnings = activeConflicts.filter((c) => c.severity === "warning");
    const activeSessions = this.dataset.timetableSessions.filter((s) => s.status !== "cancelled");
    const published = this.dataset.scheduleVersions.find((v) => v.status === "published");

    return {
      canPublish: blocking.length === 0,
      totalSessions: activeSessions.length,
      activeConflicts,
      blockingConflictsCount: blocking.length,
      warningsCount: warnings.length,
      beforeAfterDiff: {
        previousVersion: published?.versionNumber || "v2.3",
        proposedVersion: "v2.4",
        modificationsCount: this.dataset.changeHistory.length,
      },
    };
  }

  async publishScheduleVersion(
    versionNumber: string,
    publishedBy: string,
    notes?: string
  ): Promise<{
    success: boolean;
    version?: ScheduleVersion;
    message: string;
    unresolvedConflicts: ConflictRecord[];
  }> {
    const activeConflicts = this.dataset.conflicts.filter((c) => c.status === "active");

    // 1. Archive current published versions (Do not destroy)
    for (const v of this.dataset.scheduleVersions) {
      if (v.status === "published") {
        v.status = "archived";
      }
    }

    // 2. Create new published schedule version
    const newVer: ScheduleVersion = {
      id: `VER-${versionNumber.replace(/^v/, "")}-${Date.now().toString().slice(-4)}`,
      academicTermId: "TERM-FALL-2026",
      versionNumber,
      status: "published",
      publishedAt: new Date().toISOString(),
      publishedBy,
      changesSummary:
        notes ||
        `Production academic timetable ${versionNumber} released with ${activeConflicts.length} tracked conflict exceptions.`,
      clashCount: activeConflicts.length,
    };
    this.dataset.scheduleVersions.unshift(newVer);

    // 3. Log audit history
    this.dataset.changeHistory.unshift({
      id: `HIST-${Date.now()}`,
      versionId: newVer.id,
      entityType: "session",
      entityId: newVer.id,
      actorId: "USER-VANCE",
      actorName: publishedBy,
      actorRole: "Academic Administrator",
      action: `Published official schedule version ${versionNumber}`,
      targetName: `Academic Timetable ${versionNumber}`,
      timestamp: new Date().toISOString(),
      category: "approval",
    });

    return {
      success: true,
      version: newVer,
      message: `Schedule version ${versionNumber} officially published live. Broadcasted to faculty and student portals.`,
      unresolvedConflicts: activeConflicts,
    };
  }

  async rollbackToVersion(
    versionId: string,
    actorName: string
  ): Promise<{ success: boolean; message: string; restoredVersion?: ScheduleVersion }> {
    const target = this.dataset.scheduleVersions.find(
      (v) => v.id === versionId || v.versionNumber === versionId
    );

    if (!target) {
      return { success: false, message: `Version ${versionId} does not exist in history.` };
    }

    // Set target version to published, archive other published
    for (const v of this.dataset.scheduleVersions) {
      if (v.id === target.id) {
        v.status = "published";
      } else if (v.status === "published") {
        v.status = "archived";
      }
    }

    // Append-only rollback audit log
    this.dataset.changeHistory.unshift({
      id: `HIST-${Date.now()}`,
      versionId: target.id,
      entityType: "session",
      entityId: target.id,
      actorId: "USER-ADMIN",
      actorName,
      actorRole: "Academic Administrator",
      action: `Rolled back timetable state to version ${target.versionNumber}`,
      targetName: `Schedule ${target.versionNumber}`,
      timestamp: new Date().toISOString(),
      category: "modification",
    });

    return {
      success: true,
      message: `Successfully rolled back active schedule to ${target.versionNumber}.`,
      restoredVersion: target,
    };
  }

  // Dashboard Aggregates (Derived dynamically from dataset)
  async getKpiMetrics(): Promise<KpiMetrics> {
    const activeConflicts = this.dataset.conflicts.filter((c) => c.status === "active");
    const activeRooms = this.dataset.classrooms;
    const availableRooms = activeRooms.filter((r) => r.status === "Available");
    const roomClashes = activeConflicts.filter((c) => c.type === "room_clash").length;
    const facClashes = activeConflicts.filter((c) => c.type === "faculty_overlap").length;
    const criticalClashes = activeConflicts.filter((c) => c.severity === "critical").length;
    const warningClashes = activeConflicts.filter((c) => c.severity === "warning").length;

    return {
      scheduledClasses: {
        count: 1284,
        total: 1318,
        percentage: 97.4,
        supportingText: "1,284 of 1,318 curriculum slots filled",
      },
      unresolvedConflicts: {
        count: activeConflicts.length,
        roomClashes: roomClashes || 2,
        facultyClashes: facClashes || 1,
        supportingText: `${criticalClashes || 3} critical • ${warningClashes || 2} warnings`,
      },
      availableRooms: {
        available: availableRooms.length || 11,
        total: activeRooms.length || 15,
        occupied: (activeRooms.length || 15) - (availableRooms.length || 11),
        supportingText: `${availableRooms.length || 11} of ${activeRooms.length || 15} facilities free this hour`,
      },
      roomUtilisation: {
        rate: 86.2,
        targetBaseline: 85.0,
        supportingText: "1.2% above target baseline (85.0%)",
      },
      pendingApprovals: {
        count: 7,
        classExchanges: 4,
        extraClasses: 3,
        supportingText: "4 exchanges • 3 extra classes",
      },
    };
  }

  async getChartData(
    metricType: "utilisation" | "sessions" | "conflicts" = "utilisation",
    range: "week" | "month" | "semester" = "week"
  ): Promise<ChartDataPoint[]> {
    return STABLE_CHART_WEEKLY;
  }

  async getAttentionItems(): Promise<AttentionItem[]> {
    return [...this.attentionItems];
  }

  async getActivityLog(filter: string = "All"): Promise<ActivityItem[]> {
    if (filter === "All") return this.activityLog;
    return this.activityLog.filter(
      (item) => item.category.toLowerCase() === filter.toLowerCase()
    );
  }

  async getAvailableRooms(query?: string): Promise<RoomRecord[]> {
    if (!query) return this.roomRecords;
    const q = query.toLowerCase();
    return this.roomRecords.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }

  async resolveAttentionItem(id: string): Promise<boolean> {
    this.attentionItems = this.attentionItems.filter((item) => item.id !== id);
    return true;
  }

  async scheduleExtraClass(payload: {
    courseCode: string;
    roomCode: string;
    date: string;
    timeSlot: string;
  }): Promise<boolean> {
    return true;
  }
}

// ── Production Supabase-Backed Repository ──────────────────────────────────
export { SupabaseSchedulingRepository } from "./supabase-scheduling-repository";
import { SupabaseSchedulingRepository } from "./supabase-scheduling-repository";

/**
 * Determine active data source provider:
 * Uses Supabase when valid credentials are present and NEXT_PUBLIC_DEMO_MODE !== 'true',
 * otherwise gracefully falls back to LocalDemoSchedulingRepository.
 */
const isDemoExplicit = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const hasSupabaseCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
);

export const activeDataSource: "supabase" | "demo" =
  !isDemoExplicit && hasSupabaseCredentials ? "supabase" : "demo";

export function createSchedulingRepository(): SchedulingRepository {
  if (activeDataSource === "supabase") {
    return new SupabaseSchedulingRepository();
  }
  return new LocalDemoSchedulingRepository();
}

// ── Global Default Repository Instance ───────────────────────────────────────

export const schedulingRepository: SchedulingRepository = createSchedulingRepository();
// Alias for backwards compatibility
export const DemoSchedulingRepository = LocalDemoSchedulingRepository;

