/**
 * SYNAPSE OS — Timetable Validation & Conflict Detection Engine
 * Evaluates proposed timetable movements against room capacities, faculty availability,
 * equipment prerequisites, and facility maintenance blocks.
 */

import type {
  SynapseCollegeDataset,
  TimetableSession,
  ConflictRecord,
  AlternativeResolution,
  ConstraintType,
  ConflictSeverity,
} from "@/types/domain";

export interface ValidationIssue {
  type: ConstraintType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  conflictingSessionId?: string;
  conflictingReservationId?: string;
  suggestedAlternatives: AlternativeResolution[];
}

export interface MoveValidationResult {
  isValid: boolean;
  canStage: boolean;
  issues: ValidationIssue[];
  summary: string;
}

/**
 * Validates a proposed move or reallocation for a timetable session against the live dataset.
 */
export function validateSessionMove(
  dataset: SynapseCollegeDataset,
  sessionId: string,
  targetTimeSlotId: string,
  targetClassroomId?: string,
  targetFacultyId?: string,
  activeStagedMoves: Record<string, { timeSlotId: string; classroomId?: string; facultyId?: string }> = {}
): MoveValidationResult {
  const issues: ValidationIssue[] = [];

  const session = dataset.timetableSessions.find((s) => s.id === sessionId);
  if (!session) {
    return {
      isValid: false,
      canStage: false,
      issues: [
        {
          type: "room_clash",
          severity: "critical",
          title: "Session Not Found",
          description: `Session with ID ${sessionId} does not exist in the active timetable.`,
          suggestedAlternatives: [],
        },
      ],
      summary: "Invalid session.",
    };
  }

  const subject = dataset.subjects.find((s) => s.id === session.subjectId);
  const section = dataset.sections.find((s) => s.id === session.sectionId);
  const targetSlot = dataset.timeSlots.find((t) => t.id === targetTimeSlotId);

  const effectiveClassroomId = targetClassroomId || session.classroomId;
  const effectiveFacultyId = targetFacultyId || session.facultyId;
  const targetRoom = dataset.classrooms.find((c) => c.id === effectiveClassroomId);
  const targetFaculty = dataset.faculty.find((f) => f.id === effectiveFacultyId);

  if (!targetSlot || !targetRoom || !targetFaculty || !subject || !section) {
    return {
      isValid: false,
      canStage: false,
      issues: [
        {
          type: "room_clash",
          severity: "critical",
          title: "Missing Entity Reference",
          description: "One or more target entities could not be resolved from dataset fixtures.",
          suggestedAlternatives: [],
        },
      ],
      summary: "Invalid destination parameters.",
    };
  }

  // ── 1. Room Reservation / Maintenance Block Check ─────────────────────────
  const reservationCollision = dataset.reservations.find(
    (r) =>
      r.classroomId === effectiveClassroomId &&
      r.blocksRegularClasses &&
      r.status === "approved" &&
      r.timeSlotIds.includes(targetTimeSlotId)
  );

  if (reservationCollision) {
    // Check if this room has a strictly no-feasible alternative (e.g. sole BSL-3 laboratory)
    const isSoleBSL3 =
      targetRoom.id === "ROOM-LAB-BIO-BSL3" ||
      targetRoom.equipment.includes("bio_safety_cabinet_l3");

    const suggestedAlts: AlternativeResolution[] = [];

    if (!isSoleBSL3) {
      // Find another available room of suitable type
      const vacantRooms = dataset.classrooms.filter(
        (c) =>
          c.id !== effectiveClassroomId &&
          c.type === targetRoom.type &&
          c.capacity >= section.studentCount
      );
      if (vacantRooms.length > 0) {
        suggestedAlts.push({
          solutionId: `ALT-RES-${vacantRooms[0].id}`,
          description: `Relocate session to ${vacantRooms[0].name} (${vacantRooms[0].code}, ${vacantRooms[0].capacity} seats).`,
          targetClassroomId: vacantRooms[0].id,
          targetTimeSlotId,
          downstreamClashCount: 0,
          feasibilityScore: 92,
          isRecommended: true,
        });
      }
    }

    issues.push({
      type: isSoleBSL3 ? "equipment_mismatch" : "maintenance_block",
      severity: "critical",
      title: isSoleBSL3
        ? "Sole High-Containment BSL-3 Facility Under Mandatory Overhaul"
        : `Facility Maintenance Block Collision (${reservationCollision.title})`,
      description: isSoleBSL3
        ? "Statutory biosafety rules strictly prohibit pathogen experimentation in standard BSL-2 laboratories. No alternative BSL-3 facility exists on campus."
        : `Classroom ${targetRoom.code} is closed for '${reservationCollision.title}' during this slot. Reason: ${reservationCollision.reason}`,
      conflictingReservationId: reservationCollision.id,
      suggestedAlternatives: suggestedAlts,
    });
  }

  // ── 2. Room Double-Booking / Clash Check ──────────────────────────────────
  const otherSessions = dataset.timetableSessions.filter((s) => s.id !== sessionId);

  const roomClashSession = otherSessions.find((s) => {
    const staged = activeStagedMoves[s.id];
    const sSlot = staged?.timeSlotId || s.timeSlotId;
    const sRoom = staged?.classroomId || s.classroomId;
    return sSlot === targetTimeSlotId && sRoom === effectiveClassroomId;
  });

  if (roomClashSession) {
    const clashSubject = dataset.subjects.find((sub) => sub.id === roomClashSession.subjectId);
    const clashSection = dataset.sections.find((sec) => sec.id === roomClashSession.sectionId);

    // Generate room alternative
    const vacantRoom = dataset.classrooms.find(
      (c) =>
        c.id !== effectiveClassroomId &&
        c.type === targetRoom.type &&
        c.capacity >= section.studentCount
    );

    const alts: AlternativeResolution[] = [];
    if (vacantRoom) {
      alts.push({
        solutionId: `ALT-ROOM-${vacantRoom.id}`,
        description: `Reassign this session to ${vacantRoom.name} (${vacantRoom.code}, ${vacantRoom.capacity} seats).`,
        targetClassroomId: vacantRoom.id,
        targetTimeSlotId,
        downstreamClashCount: 0,
        feasibilityScore: 96,
        isRecommended: true,
      });
    }

    issues.push({
      type: "room_clash",
      severity: "critical",
      title: `Classroom Double-Booking in ${targetRoom.code}`,
      description: `${targetRoom.name} is already occupied by ${clashSubject?.code || "another class"} (${clashSection?.sectionCode || "Section"}) at this time slot.`,
      conflictingSessionId: roomClashSession.id,
      suggestedAlternatives: alts,
    });
  }

  // ── 3. Faculty Overlap Check ──────────────────────────────────────────────
  const facultyClashSession = otherSessions.find((s) => {
    const staged = activeStagedMoves[s.id];
    const sSlot = staged?.timeSlotId || s.timeSlotId;
    const sFaculty = staged?.facultyId || s.facultyId;
    return sSlot === targetTimeSlotId && sFaculty === effectiveFacultyId;
  });

  // Check faculty blocked slots pattern
  const dayPattern = targetFaculty.availability.find(
    (p) => p.dayOfWeek === targetSlot.dayOfWeek
  );
  const isFacultyBlockedSlot = dayPattern?.blockedSlotIds.includes(targetTimeSlotId);

  if (facultyClashSession) {
    const clashSubject = dataset.subjects.find((sub) => sub.id === facultyClashSession.subjectId);
    issues.push({
      type: "faculty_overlap",
      severity: "critical",
      title: `Faculty Schedule Collision for ${targetFaculty.name}`,
      description: `${targetFaculty.name} is already teaching ${clashSubject?.code || "another course"} at this slot.`,
      conflictingSessionId: facultyClashSession.id,
      suggestedAlternatives: [
        {
          solutionId: "ALT-FAC-SLOT",
          description: "Select another time slot when instructor is vacant.",
          downstreamClashCount: 0,
          feasibilityScore: 90,
          isRecommended: true,
        },
      ],
    });
  } else if (isFacultyBlockedSlot) {
    issues.push({
      type: "faculty_overlap",
      severity: "warning",
      title: `Faculty Blocked Interval for ${targetFaculty.name}`,
      description: `${targetFaculty.name} has designated ${targetSlot.label} as unavailable due to administrative, research, or governance duties.`,
      suggestedAlternatives: [
        {
          solutionId: "ALT-FAC-FREE-SLOT",
          description: `Move session to faculty's preferred slots on ${targetSlot.dayOfWeek}.`,
          downstreamClashCount: 0,
          feasibilityScore: 92,
          isRecommended: true,
        },
      ],
    });
  }

  // ── 4. Classroom Capacity Deficit Check ────────────────────────────────────
  if (targetRoom.capacity < section.studentCount) {
    const deficit = section.studentCount - targetRoom.capacity;
    const largerRooms = dataset.classrooms.filter(
      (c) => c.capacity >= section.studentCount && c.type === targetRoom.type
    );

    const alts: AlternativeResolution[] = largerRooms.map((lr) => ({
      solutionId: `ALT-CAP-${lr.id}`,
      description: `Move to ${lr.name} (${lr.code}, Capacity: ${lr.capacity} seats). Deficit resolved.`,
      targetClassroomId: lr.id,
      targetTimeSlotId,
      downstreamClashCount: 0,
      feasibilityScore: 98,
      isRecommended: true,
    }));

    issues.push({
      type: "capacity_deficit",
      severity: "warning",
      title: `Classroom Capacity Deficit in ${targetRoom.code}`,
      description: `Room capacity is ${targetRoom.capacity} seats, but ${section.name} has ${section.studentCount} enrolled students (Deficit: -${deficit} seats).`,
      suggestedAlternatives: alts,
    });
  }

  // ── 5. Equipment Prerequisites Check ──────────────────────────────────────
  if (subject.requiredEquipment && subject.requiredEquipment.length > 0) {
    const missingEquip = subject.requiredEquipment.filter(
      (eq) => !targetRoom.equipment.includes(eq)
    );
    if (missingEquip.length > 0) {
      issues.push({
        type: "equipment_mismatch",
        severity: "critical",
        title: `Equipment Prerequisites Missing in ${targetRoom.code}`,
        description: `${subject.code} requires specialized facility equipment: ${missingEquip.join(", ")}. Room ${targetRoom.code} does not supply these facilities.`,
        suggestedAlternatives: [],
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  const isValid = issues.length === 0;

  let summary = "Destination valid and conflict-free.";
  if (hasCritical) {
    summary = `Critical constraint violation detected (${issues[0].title}). Cannot schedule directly without resolution.`;
  } else if (issues.length > 0) {
    summary = `Warning constraint detected (${issues[0].title}). Requires coordinator acknowledgement.`;
  }

  return {
    isValid,
    canStage: !hasCritical,
    issues,
    summary,
  };
}
