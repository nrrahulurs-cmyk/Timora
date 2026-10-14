/**
 * SYNAPSE OS — Deterministic Scheduling Constraint Engine
 * Pure TypeScript implementation for validating individual sessions and complete schedules.
 * Strictly separates Hard Constraints (must NEVER be violated) from Soft Preferences.
 * Uses half-open time intervals [start, end) so adjacent periods never falsely conflict.
 */

import type {
  SynapseCollegeDataset,
  TimetableSession,
  Subject,
  Classroom,
  FacultyMember,
  StudentSection,
  TimeSlot,
  RoomReservation,
  ConstraintType,
  ConflictSeverity,
  AlternativeResolution,
  ConflictRecord,
} from "@/types/domain";

// ── 1. Time Utilities (Half-Open Intervals [start, end)) ─────────────────────

/**
 * Converts "HH:MM" (e.g. "08:30", "14:00") to integer minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Checks if two half-open time ranges [startA, endA) and [startB, endB) overlap.
 * Adjacent ranges (e.g. [510, 600) and [600, 690)) do NOT overlap.
 */
export function timeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Checks if two time slots overlap on the same day using half-open intervals.
 */
export function slotsOverlap(slotA: TimeSlot, slotB: TimeSlot): boolean {
  if (slotA.dayOfWeek !== slotB.dayOfWeek) return false;
  const startA = parseTimeToMinutes(slotA.startTime);
  const endA = parseTimeToMinutes(slotA.endTime);
  const startB = parseTimeToMinutes(slotB.startTime);
  const endB = parseTimeToMinutes(slotB.endTime);
  return timeRangesOverlap(startA, endA, startB, endB);
}

// ── 2. Constraint Result Types ──────────────────────────────────────────────

export type HardConstraintRule =
  | "room_double_booking"
  | "faculty_double_booking"
  | "student_group_double_booking"
  | "room_capacity_deficit"
  | "equipment_and_lab_suitability"
  | "faculty_hard_availability"
  | "reservation_collision"
  | "accessibility_requirement";

export type SoftPreferenceRule =
  | "faculty_preferred_slot"
  | "faculty_daily_hours_limit"
  | "room_capacity_waste"
  | "preferred_period_alignment";

export interface HardViolation {
  rule: HardConstraintRule;
  constraintType: ConstraintType;
  title: string;
  description: string;
  conflictingEntityId?: string;
  conflictingSessionId?: string;
  conflictingReservationId?: string;
}

export interface SoftEvaluation {
  rule: SoftPreferenceRule;
  name: string;
  isSatisfied: boolean;
  score: number; // 0 to 100
  notes: string;
}

export interface SessionValidationResult {
  sessionId: string;
  isValid: boolean; // True if and only if zero hard violations exist
  hardViolations: HardViolation[];
  softEvaluations: SoftEvaluation[];
  softScore: number; // Weighted composite score 0 to 100
}

export interface ScheduleValidationReport {
  isValid: boolean;
  totalSessionsEvaluated: number;
  conflictedSessionsCount: number;
  hardViolationsCount: number;
  hardViolationsByRule: Record<HardConstraintRule, number>;
  sessionResults: Record<string, SessionValidationResult>;
  overallSoftScore: number;
}

// ── 3. Individual Session Validation (Deterministic) ─────────────────────────

export interface ValidationContext {
  activeSessions?: TimetableSession[];
  checkAccessibility?: boolean;
}

/**
 * Validates an individual timetable session against all hard constraints
 * and soft preferences in the context of the active schedule.
 */
export function validateSession(
  session: TimetableSession,
  dataset: SynapseCollegeDataset,
  context: ValidationContext = {}
): SessionValidationResult {
  const hardViolations: HardViolation[] = [];
  const softEvaluations: SoftEvaluation[] = [];

  const subject = dataset.subjects.find((s) => s.id === session.subjectId);
  const classroom = dataset.classrooms.find((c) => c.id === session.classroomId);
  const faculty = dataset.faculty.find((f) => f.id === session.facultyId);
  const section = dataset.sections.find((s) => s.id === session.sectionId);
  const slot = dataset.timeSlots.find((t) => t.id === session.timeSlotId);

  // Missing entity references are fatal data errors
  if (!subject || !classroom || !faculty || !section || !slot) {
    hardViolations.push({
      rule: "room_double_booking",
      constraintType: "room_clash",
      title: "Missing Entity Reference",
      description: `Session ${session.id} references non-existent entities in dataset.`,
    });
    return {
      sessionId: session.id,
      isValid: false,
      hardViolations,
      softEvaluations: [],
      softScore: 0,
    };
  }

  const allSessions = context.activeSessions || dataset.timetableSessions;
  const otherSessions = allSessions.filter((s) => s.id !== session.id);

  // ── HARD 1: Room Double-Booking ──────────────────────────────────────────
  for (const other of otherSessions) {
    if (other.classroomId === session.classroomId) {
      const otherSlot = dataset.timeSlots.find((t) => t.id === other.timeSlotId);
      if (otherSlot && slotsOverlap(slot, otherSlot)) {
        const otherSubject = dataset.subjects.find((s) => s.id === other.subjectId);
        const otherSection = dataset.sections.find((s) => s.id === other.sectionId);
        hardViolations.push({
          rule: "room_double_booking",
          constraintType: "room_clash",
          title: `Room Double-Booking in ${classroom.code}`,
          description: `${classroom.name} (${classroom.code}) is concurrently assigned to ${otherSubject?.code || "Another class"} (${otherSection?.sectionCode || "Sec"}) during ${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}.`,
          conflictingSessionId: other.id,
          conflictingEntityId: classroom.id,
        });
      }
    }
  }

  // ── HARD 2: Faculty Double-Booking ───────────────────────────────────────
  for (const other of otherSessions) {
    if (other.facultyId === session.facultyId) {
      const otherSlot = dataset.timeSlots.find((t) => t.id === other.timeSlotId);
      if (otherSlot && slotsOverlap(slot, otherSlot)) {
        const otherSubject = dataset.subjects.find((s) => s.id === other.subjectId);
        hardViolations.push({
          rule: "faculty_double_booking",
          constraintType: "faculty_overlap",
          title: `Faculty Schedule Overlap for ${faculty.name}`,
          description: `${faculty.name} is scheduled to teach ${otherSubject?.code || "another class"} simultaneously on ${slot.dayOfWeek} at ${slot.startTime}–${slot.endTime}.`,
          conflictingSessionId: other.id,
          conflictingEntityId: faculty.id,
        });
      }
    }
  }

  // ── HARD 3: Student Group / Section Double-Booking ───────────────────────
  for (const other of otherSessions) {
    if (other.sectionId === session.sectionId) {
      const otherSlot = dataset.timeSlots.find((t) => t.id === other.timeSlotId);
      if (otherSlot && slotsOverlap(slot, otherSlot)) {
        const otherSubject = dataset.subjects.find((s) => s.id === other.subjectId);
        hardViolations.push({
          rule: "student_group_double_booking",
          constraintType: "section_clash",
          title: `Student Section Clash for ${section.sectionCode}`,
          description: `Section ${section.sectionCode} has two classes concurrently: ${subject.code} and ${otherSubject?.code || "another class"}.`,
          conflictingSessionId: other.id,
          conflictingEntityId: section.id,
        });
      }
    }
  }

  // ── HARD 4: Classroom Capacity Deficit ────────────────────────────────────
  if (classroom.capacity < section.studentCount) {
    const deficit = section.studentCount - classroom.capacity;
    hardViolations.push({
      rule: "room_capacity_deficit",
      constraintType: "capacity_deficit",
      title: `Room Capacity Deficit in ${classroom.code}`,
      description: `Classroom ${classroom.code} has ${classroom.capacity} seats, but section ${section.sectionCode} has ${section.studentCount} students (Deficit: -${deficit} seats).`,
      conflictingEntityId: classroom.id,
    });
  }

  // ── HARD 5: Laboratory Suitability & Equipment Prerequisites ──────────────
  if (subject.requiredRoomType && subject.requiredRoomType !== classroom.type) {
    // If subject requires specialized laboratory, cannot hold in lecture hall or seminar
    if (subject.requiredRoomType === "Specialized Laboratory") {
      hardViolations.push({
        rule: "equipment_and_lab_suitability",
        constraintType: "equipment_mismatch",
        title: `Room Type Incompatibility for ${subject.code}`,
        description: `${subject.code} requires a Specialized Laboratory, but ${classroom.code} is a ${classroom.type}.`,
        conflictingEntityId: classroom.id,
      });
    }
  }

  if (subject.requiredEquipment && subject.requiredEquipment.length > 0) {
    const missingEquip = subject.requiredEquipment.filter(
      (eq) => !classroom.equipment.includes(eq)
    );
    if (missingEquip.length > 0) {
      hardViolations.push({
        rule: "equipment_and_lab_suitability",
        constraintType: "equipment_mismatch",
        title: `Missing Required Facility Equipment in ${classroom.code}`,
        description: `Subject ${subject.code} requires [${missingEquip.join(", ")}], which ${classroom.code} lacks.`,
        conflictingEntityId: classroom.id,
      });
    }
  }

  // ── HARD 6: Faculty Hard Availability (Blocked Slots) ─────────────────────
  const dayPattern = faculty.availability.find((p) => p.dayOfWeek === slot.dayOfWeek);
  if (dayPattern && dayPattern.blockedSlotIds.includes(slot.id)) {
    hardViolations.push({
      rule: "faculty_hard_availability",
      constraintType: "faculty_overlap",
      title: `Faculty Blocked Duty Interval for ${faculty.name}`,
      description: `${faculty.name} is strictly unavailable at ${slot.label} due to institutional governance, committee duties, or research allocations.`,
      conflictingEntityId: faculty.id,
    });
  }

  // ── HARD 7: Room Reservation / Maintenance Block Collision ───────────────
  const reservationCollision = dataset.reservations.find(
    (r) =>
      r.classroomId === classroom.id &&
      r.blocksRegularClasses &&
      r.status === "approved" &&
      r.timeSlotIds.includes(slot.id)
  );

  if (reservationCollision) {
    hardViolations.push({
      rule: "reservation_collision",
      constraintType: "maintenance_block",
      title: `Pre-Approved Reservation Block in ${classroom.code}`,
      description: `Classroom ${classroom.code} is reserved for '${reservationCollision.title}' (${reservationCollision.category}) on ${slot.label}. Regular classes are blocked.`,
      conflictingReservationId: reservationCollision.id,
      conflictingEntityId: classroom.id,
    });
  }

  // ── HARD 8: Accessibility Requirements ────────────────────────────────────
  if (context.checkAccessibility && !classroom.isAccessible) {
    hardViolations.push({
      rule: "accessibility_requirement",
      constraintType: "room_clash",
      title: `Accessibility Incompatibility in ${classroom.code}`,
      description: `Classroom ${classroom.code} does not meet wheelchair/ADA accessibility standards.`,
      conflictingEntityId: classroom.id,
    });
  }

  // ── SOFT 1: Faculty Preferred Time Slot ───────────────────────────────────
  const isPreferredSlot = Boolean(
    dayPattern && dayPattern.preferredSlotIds.includes(slot.id)
  );
  softEvaluations.push({
    rule: "faculty_preferred_slot",
    name: "Faculty Preferred Slot Alignment",
    isSatisfied: isPreferredSlot,
    score: isPreferredSlot ? 100 : 50,
    notes: isPreferredSlot
      ? "Session is scheduled during faculty's preferred teaching window."
      : "Session is scheduled during acceptable non-preferred slot.",
  });

  // ── SOFT 2: Faculty Daily Teaching Hours Limit ─────────────────────────────
  if (dayPattern) {
    // Calculate total hours scheduled for faculty on this day
    const facultyDaySessions = otherSessions.filter((s) => {
      if (s.facultyId !== faculty.id) return false;
      const sSlot = dataset.timeSlots.find((t) => t.id === s.timeSlotId);
      return sSlot?.dayOfWeek === slot.dayOfWeek;
    });
    // Assuming each slot is ~1.5 hours
    const totalDailyHours = (facultyDaySessions.length + 1) * 1.5;
    const hoursOk = totalDailyHours <= dayPattern.maxHoursPerDay;
    softEvaluations.push({
      rule: "faculty_daily_hours_limit",
      name: "Faculty Daily Hours Fatigue Threshold",
      isSatisfied: hoursOk,
      score: hoursOk ? 100 : 30,
      notes: `Assigned ${totalDailyHours}h / Max ${dayPattern.maxHoursPerDay}h daily threshold.`,
    });
  }

  // ── SOFT 3: Room Capacity Waste / Utilization ──────────────────────────────
  const capacityRatio = classroom.capacity / Math.max(1, section.studentCount);
  const isOversized = capacityRatio > 3.0; // Room is 3x larger than needed
  softEvaluations.push({
    rule: "room_capacity_waste",
    name: "Room Sizing & Utilization Efficiency",
    isSatisfied: !isOversized,
    score: isOversized ? 40 : capacityRatio >= 1.0 && capacityRatio <= 1.5 ? 100 : 80,
    notes: `Room accommodates ${section.studentCount} students in ${classroom.capacity} seats (${Math.round(capacityRatio * 100)}% ratio).`,
  });

  // Composite Soft Score
  const totalSoft = softEvaluations.reduce((sum, e) => sum + e.score, 0);
  const softScore =
    softEvaluations.length > 0 ? Math.round(totalSoft / softEvaluations.length) : 100;

  return {
    sessionId: session.id,
    isValid: hardViolations.length === 0,
    hardViolations,
    softEvaluations,
    softScore,
  };
}

// ── 4. Complete Schedule Validation ──────────────────────────────────────────

/**
 * Validates an entire college schedule, cataloging all hard constraint violations
 * and computing aggregate compliance metrics.
 */
export function validateSchedule(
  dataset: SynapseCollegeDataset,
  activeSessions?: TimetableSession[]
): ScheduleValidationReport {
  const sessions = activeSessions || dataset.timetableSessions;
  const sessionResults: Record<string, SessionValidationResult> = {};

  const hardViolationsByRule: Record<HardConstraintRule, number> = {
    room_double_booking: 0,
    faculty_double_booking: 0,
    student_group_double_booking: 0,
    room_capacity_deficit: 0,
    equipment_and_lab_suitability: 0,
    faculty_hard_availability: 0,
    reservation_collision: 0,
    accessibility_requirement: 0,
  };

  let totalHardViolations = 0;
  let conflictedSessionsCount = 0;
  let softScoreSum = 0;

  for (const session of sessions) {
    const res = validateSession(session, dataset, { activeSessions: sessions });
    sessionResults[session.id] = res;

    softScoreSum += res.softScore;

    if (!res.isValid) {
      conflictedSessionsCount++;
      for (const v of res.hardViolations) {
        totalHardViolations++;
        hardViolationsByRule[v.rule] = (hardViolationsByRule[v.rule] || 0) + 1;
      }
    }
  }

  const overallSoftScore =
    sessions.length > 0 ? Math.round(softScoreSum / sessions.length) : 100;

  return {
    isValid: totalHardViolations === 0,
    totalSessionsEvaluated: sessions.length,
    conflictedSessionsCount,
    hardViolationsCount: totalHardViolations,
    hardViolationsByRule,
    sessionResults,
    overallSoftScore,
  };
}

/**
 * Deterministically scans a dataset and active timetable schedule for all conflicts,
 * returning structured ConflictRecord objects ready for administrator review.
 */
export function findConflicts(
  dataset: SynapseCollegeDataset,
  activeSessions?: TimetableSession[]
): ConflictRecord[] {
  const sessions = activeSessions || dataset.timetableSessions;
  const validation = validateSchedule(dataset, sessions);

  if (validation.isValid) return [];

  const conflicts: ConflictRecord[] = [];
  const processedConflictKeys = new Set<string>();

  for (const session of sessions) {
    const res = validation.sessionResults[session.id];
    if (!res || res.isValid) continue;

    for (const v of res.hardViolations) {
      const key = `${v.rule}-${session.classroomId}-${session.timeSlotId}-${v.conflictingSessionId || ""}`;
      if (processedConflictKeys.has(key)) continue;
      processedConflictKeys.add(key);

      const sessionIds = [session.id];
      if (v.conflictingSessionId && !sessionIds.includes(v.conflictingSessionId)) {
        sessionIds.push(v.conflictingSessionId);
      }

      // Check if existing conflict in dataset matches this
      const existing = dataset.conflicts.find(
        (c) =>
          c.type === v.constraintType &&
          sessionIds.some((id) => c.sessionIds.includes(id))
      );

      if (existing) {
        conflicts.push(existing);
      } else {
        const alts = rankValidAlternatives(session.id, dataset, sessions);
        conflicts.push({
          id: `CONF-AUTO-${conflicts.length + 1}`,
          type: v.constraintType,
          severity:
            v.rule === "room_double_booking" || v.rule === "faculty_double_booking"
              ? "critical"
              : "warning",
          title: v.title,
          description: v.description,
          sessionIds,
          classroomId: session.classroomId,
          timeSlotId: session.timeSlotId,
          facultyId: session.facultyId,
          detectedAt: new Date().toISOString(),
          status: "active",
          hasFeasibleAlternative: alts.length > 0,
          alternatives: alts,
        });
      }
    }
  }

  // Deduplicate by conflict id
  const uniqueMap = new Map<string, ConflictRecord>();
  for (const c of conflicts) {
    uniqueMap.set(c.id, c);
  }
  return Array.from(uniqueMap.values());
}

// ── 5. Eligible Resource Searches ───────────────────────────────────────────

/**
 * Searches for all classrooms that satisfy subject type, capacity, equipment,
 * accessibility, and are unoccupied at the specified time slot.
 */
export function searchEligibleRooms(
  subject: Subject,
  section: StudentSection,
  timeSlot: TimeSlot,
  dataset: SynapseCollegeDataset,
  excludeSessionId?: string,
  activeSessions?: TimetableSession[]
): Classroom[] {
  const sessions = activeSessions || dataset.timetableSessions;

  return dataset.classrooms.filter((room) => {
    // Capacity check
    if (room.capacity < section.studentCount) return false;

    // Room type suitability
    if (subject.requiredRoomType === "Specialized Laboratory" && room.type !== "Specialized Laboratory") {
      return false;
    }

    // Equipment prerequisites
    if (subject.requiredEquipment && subject.requiredEquipment.length > 0) {
      const hasAllEquip = subject.requiredEquipment.every((eq) => room.equipment.includes(eq));
      if (!hasAllEquip) return false;
    }

    // Reservation collision check
    const isReserved = dataset.reservations.some(
      (r) =>
        r.classroomId === room.id &&
        r.blocksRegularClasses &&
        r.status === "approved" &&
        r.timeSlotIds.includes(timeSlot.id)
    );
    if (isReserved) return false;

    // Room occupancy check at this slot
    const isOccupied = sessions.some((s) => {
      if (excludeSessionId && s.id === excludeSessionId) return false;
      if (s.classroomId !== room.id) return false;
      const sSlot = dataset.timeSlots.find((t) => t.id === s.timeSlotId);
      return sSlot ? slotsOverlap(sSlot, timeSlot) : false;
    });

    return !isOccupied;
  });
}

/**
 * Checks if a faculty member is available and free from teaching or administrative blocks.
 */
export function checkFacultyAvailability(
  facultyId: string,
  timeSlotId: string,
  dataset: SynapseCollegeDataset,
  excludeSessionId?: string,
  activeSessions?: TimetableSession[]
): { isAvailable: boolean; isPreferred: boolean; reason?: string } {
  const faculty = dataset.faculty.find((f) => f.id === facultyId);
  const targetSlot = dataset.timeSlots.find((t) => t.id === timeSlotId);

  if (!faculty || !targetSlot) {
    return { isAvailable: false, isPreferred: false, reason: "Faculty or slot not found" };
  }

  // Check blocked slots
  const dayPattern = faculty.availability.find((p) => p.dayOfWeek === targetSlot.dayOfWeek);
  if (dayPattern && dayPattern.blockedSlotIds.includes(timeSlotId)) {
    return {
      isAvailable: false,
      isPreferred: false,
      reason: `Blocked interval for ${faculty.name} on ${targetSlot.dayOfWeek}`,
    };
  }

  // Check teaching collisions
  const sessions = activeSessions || dataset.timetableSessions;
  const isTeaching = sessions.some((s) => {
    if (excludeSessionId && s.id === excludeSessionId) return false;
    if (s.facultyId !== facultyId) return false;
    const sSlot = dataset.timeSlots.find((t) => t.id === s.timeSlotId);
    return sSlot ? slotsOverlap(sSlot, targetSlot) : false;
  });

  if (isTeaching) {
    return {
      isAvailable: false,
      isPreferred: false,
      reason: `${faculty.name} is already teaching another class during this time.`,
    };
  }

  const isPreferred = Boolean(dayPattern && dayPattern.preferredSlotIds.includes(timeSlotId));
  return { isAvailable: true, isPreferred };
}

/**
 * Checks if a student section has any existing classes at the specified time slot.
 */
export function checkStudentGroupAvailability(
  sectionId: string,
  timeSlotId: string,
  dataset: SynapseCollegeDataset,
  excludeSessionId?: string,
  activeSessions?: TimetableSession[]
): { isAvailable: boolean; conflictingSessionId?: string } {
  const targetSlot = dataset.timeSlots.find((t) => t.id === timeSlotId);
  if (!targetSlot) return { isAvailable: false };

  const sessions = activeSessions || dataset.timetableSessions;
  const collision = sessions.find((s) => {
    if (excludeSessionId && s.id === excludeSessionId) return false;
    if (s.sectionId !== sectionId) return false;
    const sSlot = dataset.timeSlots.find((t) => t.id === s.timeSlotId);
    return sSlot ? slotsOverlap(sSlot, targetSlot) : false;
  });

  if (collision) {
    return { isAvailable: false, conflictingSessionId: collision.id };
  }
  return { isAvailable: true };
}

// ── 6. Candidate Slot Evaluation & Alternative Ranking ───────────────────────

export interface CandidateEvaluation {
  timeSlot: TimeSlot;
  classroom: Classroom;
  isValid: boolean;
  feasibilityScore: number; // 0 to 100
  downstreamClashCount: number;
  tradeOffs: string[];
  isRecommended: boolean;
}

/**
 * Evaluates a candidate slot and classroom for a session, checking all hard constraints
 * and soft trade-offs.
 */
export function evaluateCandidateSlot(
  session: TimetableSession,
  targetSlotId: string,
  targetRoomId: string,
  dataset: SynapseCollegeDataset,
  activeSessions?: TimetableSession[]
): CandidateEvaluation {
  const targetSlot = dataset.timeSlots.find((t) => t.id === targetSlotId);
  const targetRoom = dataset.classrooms.find((c) => c.id === targetRoomId);
  const subject = dataset.subjects.find((s) => s.id === session.subjectId);
  const section = dataset.sections.find((s) => s.id === session.sectionId);

  if (!targetSlot || !targetRoom || !subject || !section) {
    return {
      timeSlot: targetSlot!,
      classroom: targetRoom!,
      isValid: false,
      feasibilityScore: 0,
      downstreamClashCount: 99,
      tradeOffs: ["Invalid entity references"],
      isRecommended: false,
    };
  }

  // Create temporary hypothetical session
  const candidateSession: TimetableSession = {
    ...session,
    timeSlotId: targetSlotId,
    classroomId: targetRoomId,
  };

  const sessions = activeSessions || dataset.timetableSessions;
  const tempSchedule = sessions.map((s) => (s.id === session.id ? candidateSession : s));

  // Validate hypothetical session
  const valResult = validateSession(candidateSession, dataset, { activeSessions: tempSchedule });

  const tradeOffs: string[] = [];
  if (!valResult.isValid) {
    for (const v of valResult.hardViolations) {
      tradeOffs.push(`Hard violation: ${v.title}`);
    }
  }

  for (const s of valResult.softEvaluations) {
    if (!s.isSatisfied) {
      tradeOffs.push(s.notes);
    }
  }

  // Compute composite feasibility score
  let score = 0;
  if (valResult.isValid) {
    // Base 70 for meeting all hard constraints
    score = 70 + Math.round(valResult.softScore * 0.3);
  }

  return {
    timeSlot: targetSlot,
    classroom: targetRoom,
    isValid: valResult.isValid,
    feasibilityScore: score,
    downstreamClashCount: valResult.hardViolations.length,
    tradeOffs,
    isRecommended: valResult.isValid && score >= 85,
  };
}

/**
 * Finds and ranks all valid alternative resolutions for a conflict or session.
 * Guaranteed to return [] if no feasible solution exists (e.g. sole BSL-3 facility shutdown).
 */
export function rankValidAlternatives(
  sessionId: string,
  dataset: SynapseCollegeDataset,
  activeSessions?: TimetableSession[]
): AlternativeResolution[] {
  const session = (activeSessions || dataset.timetableSessions).find((s) => s.id === sessionId);
  if (!session) return [];

  const subject = dataset.subjects.find((s) => s.id === session.subjectId);
  const section = dataset.sections.find((s) => s.id === session.sectionId);
  if (!subject || !section) return [];

  // Special Check: Is this a subject requiring sole BSL-3 facility?
  const requiresBSL3 = subject.requiredEquipment.includes("bio_safety_cabinet_l3");
  const bsl3Room = dataset.classrooms.find((c) => c.equipment.includes("bio_safety_cabinet_l3"));

  // If requires BSL-3 and no other BSL-3 laboratory exists, check if BSL-3 is under maintenance
  if (requiresBSL3 && bsl3Room) {
    const isBsl3UnderMaintenance = dataset.reservations.some(
      (r) =>
        r.classroomId === bsl3Room.id &&
        r.blocksRegularClasses &&
        r.status === "approved"
    );
    // If the only room is down and no other room has BSL-3 equipment on campus:
    const otherBsl3Rooms = dataset.classrooms.filter(
      (c) => c.id !== bsl3Room.id && c.equipment.includes("bio_safety_cabinet_l3")
    );
    if (otherBsl3Rooms.length === 0 && isBsl3UnderMaintenance) {
      // Strictly NO FEASIBLE ALTERNATIVE ON CAMPUS
      return [];
    }
  }

  const validAlternatives: AlternativeResolution[] = [];
  const currentSlot = dataset.timeSlots.find((t) => t.id === session.timeSlotId);

  // Search candidate rooms at the same time slot first
  if (currentSlot) {
    const eligibleRoomsSameSlot = searchEligibleRooms(
      subject,
      section,
      currentSlot,
      dataset,
      session.id,
      activeSessions
    );

    for (const room of eligibleRoomsSameSlot) {
      const evalRes = evaluateCandidateSlot(
        session,
        currentSlot.id,
        room.id,
        dataset,
        activeSessions
      );
      if (evalRes.isValid) {
        validAlternatives.push({
          solutionId: `SOL-ROOM-${room.id}`,
          description: `Reassign to ${room.name} (${room.code}, ${room.capacity} seats). Same time slot.`,
          targetClassroomId: room.id,
          targetTimeSlotId: currentSlot.id,
          downstreamClashCount: 0,
          feasibilityScore: evalRes.feasibilityScore,
          isRecommended: false,
        });
      }
    }
  }

  // Search candidate alternative time slots on the same day or other days
  for (const slot of dataset.timeSlots) {
    if (currentSlot && slot.id === currentSlot.id) continue;

    const facultyCheck = checkFacultyAvailability(
      session.facultyId,
      slot.id,
      dataset,
      session.id,
      activeSessions
    );
    if (!facultyCheck.isAvailable) continue;

    const sectionCheck = checkStudentGroupAvailability(
      session.sectionId,
      slot.id,
      dataset,
      session.id,
      activeSessions
    );
    if (!sectionCheck.isAvailable) continue;

    const eligibleRooms = searchEligibleRooms(
      subject,
      section,
      slot,
      dataset,
      session.id,
      activeSessions
    );

    for (const room of eligibleRooms) {
      const evalRes = evaluateCandidateSlot(session, slot.id, room.id, dataset, activeSessions);
      if (evalRes.isValid) {
        validAlternatives.push({
          solutionId: `SOL-SLOT-${slot.id}-${room.id}`,
          description: `Shift to ${slot.label} in ${room.name} (${room.code}).`,
          targetClassroomId: room.id,
          targetTimeSlotId: slot.id,
          downstreamClashCount: 0,
          feasibilityScore: evalRes.feasibilityScore,
          isRecommended: false,
        });
      }
    }
  }

  // Sort by feasibility score descending
  validAlternatives.sort((a, b) => b.feasibilityScore - a.feasibilityScore);

  // Mark top 1 as recommended
  if (validAlternatives.length > 0) {
    validAlternatives[0].isRecommended = true;
  }

  return validAlternatives.slice(0, 5); // Return top 5
}
