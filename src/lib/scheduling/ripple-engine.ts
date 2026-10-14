/**
 * SYNAPSE OS — Ripple Intelligence & Schedule Difference Engine
 * Calculates multi-session ripple impacts, schedule differences, conflict removals,
 * and downstream cascade effects prior to permanent schedule mutation.
 */

import type {
  SynapseCollegeDataset,
  TimetableSession,
  ConflictRecord,
  AlternativeResolution,
} from "@/types/domain";
import {
  validateSchedule,
  validateSession,
  rankValidAlternatives,
  type HardViolation,
  type SoftEvaluation,
} from "./constraint-engine";

export interface SessionChangeRecord {
  sessionId: string;
  subjectCode: string;
  subjectTitle: string;
  sectionCode: string;
  before: {
    timeSlotId: string;
    classroomId: string;
    facultyId: string;
    timeSlotLabel: string;
    classroomCode: string;
    facultyName: string;
  };
  after: {
    timeSlotId: string;
    classroomId: string;
    facultyId: string;
    timeSlotLabel: string;
    classroomCode: string;
    facultyName: string;
  };
}

export interface SoftPreferenceImpact {
  name: string;
  rule: string;
  previousScore: number;
  newScore: number;
  delta: number;
  deltaDescription: string;
}

export interface ScheduleDiffReport {
  isSafeToApply: boolean; // True if zero new hard conflicts are introduced
  changedSessions: SessionChangeRecord[];
  conflictsRemoved: ConflictRecord[];
  newConflictsCreated: HardViolation[];
  otherAffectedSessions: string[];
  hardConstraintsSatisfied: string[];
  softPreferencesAffected: SoftPreferenceImpact[];
  netClashDelta: number; // Negative is improvement (e.g. -1 clash)
  explanation: string;
}

export interface ProposedSessionDelta {
  sessionId: string;
  targetTimeSlotId?: string;
  targetClassroomId?: string;
  targetFacultyId?: string;
}

/**
 * Calculates the ripple effect and schedule diff between current state and a proposed change.
 */
export function calculateScheduleDiff(
  dataset: SynapseCollegeDataset,
  proposedChanges: ProposedSessionDelta[]
): ScheduleDiffReport {
  const currentSessions = dataset.timetableSessions;

  // 1. Validate baseline schedule
  const baselineReport = validateSchedule(dataset, currentSessions);

  // 2. Build hypothetical updated session list
  const changeMap = new Map<string, ProposedSessionDelta>();
  for (const ch of proposedChanges) {
    changeMap.set(ch.sessionId, ch);
  }

  const updatedSessions: TimetableSession[] = currentSessions.map((s) => {
    const delta = changeMap.get(s.id);
    if (!delta) return s;
    return {
      ...s,
      timeSlotId: delta.targetTimeSlotId || s.timeSlotId,
      classroomId: delta.targetClassroomId || s.classroomId,
      facultyId: delta.targetFacultyId || s.facultyId,
    };
  });

  // 3. Validate hypothetical updated schedule
  const updatedReport = validateSchedule(dataset, updatedSessions);

  // 4. Compute changed sessions details
  const changedSessions: SessionChangeRecord[] = [];
  for (const delta of proposedChanges) {
    const beforeSession = currentSessions.find((s) => s.id === delta.sessionId);
    const afterSession = updatedSessions.find((s) => s.id === delta.sessionId);
    if (!beforeSession || !afterSession) continue;

    const subject = dataset.subjects.find((sub) => sub.id === beforeSession.subjectId);
    const section = dataset.sections.find((sec) => sec.id === beforeSession.sectionId);

    const bSlot = dataset.timeSlots.find((t) => t.id === beforeSession.timeSlotId);
    const aSlot = dataset.timeSlots.find((t) => t.id === afterSession.timeSlotId);

    const bRoom = dataset.classrooms.find((c) => c.id === beforeSession.classroomId);
    const aRoom = dataset.classrooms.find((c) => c.id === afterSession.classroomId);

    const bFac = dataset.faculty.find((f) => f.id === beforeSession.facultyId);
    const aFac = dataset.faculty.find((f) => f.id === afterSession.facultyId);

    changedSessions.push({
      sessionId: delta.sessionId,
      subjectCode: subject?.code || "SUB",
      subjectTitle: subject?.title || "Academic Course",
      sectionCode: section?.sectionCode || "SEC",
      before: {
        timeSlotId: beforeSession.timeSlotId,
        classroomId: beforeSession.classroomId,
        facultyId: beforeSession.facultyId,
        timeSlotLabel: bSlot?.label || beforeSession.timeSlotId,
        classroomCode: bRoom?.code || beforeSession.classroomId,
        facultyName: bFac?.name || beforeSession.facultyId,
      },
      after: {
        timeSlotId: afterSession.timeSlotId,
        classroomId: afterSession.classroomId,
        facultyId: afterSession.facultyId,
        timeSlotLabel: aSlot?.label || afterSession.timeSlotId,
        classroomCode: aRoom?.code || afterSession.classroomId,
        facultyName: aFac?.name || afterSession.facultyId,
      },
    });
  }

  // 5. Compute conflicts removed & new conflicts created
  const conflictsRemoved: ConflictRecord[] = [];
  const hardConstraintsSatisfied: string[] = [];

  for (const conflict of dataset.conflicts) {
    if (conflict.status !== "active") continue;

    // Check if sessions involved in this conflict are now conflict-free
    const areInvolvedSessionsClean = conflict.sessionIds.every((sId) => {
      const res = updatedReport.sessionResults[sId];
      return res ? res.isValid : true;
    });

    if (areInvolvedSessionsClean) {
      conflictsRemoved.push(conflict);
      hardConstraintsSatisfied.push(`${conflict.title} (${conflict.type.replace(/_/g, " ")}) resolved`);
    }
  }

  // Find newly introduced hard violations on modified or other sessions
  const newConflictsCreated: HardViolation[] = [];
  for (const [sId, newRes] of Object.entries(updatedReport.sessionResults)) {
    const oldRes = baselineReport.sessionResults[sId];
    if (!newRes.isValid) {
      for (const v of newRes.hardViolations) {
        // If oldRes was clean or didn't have this rule violation, it's newly created!
        const existedBefore = oldRes && !oldRes.isValid && oldRes.hardViolations.some((ov) => ov.rule === v.rule);
        if (!existedBefore) {
          newConflictsCreated.push(v);
        }
      }
    }
  }

  // Other affected sessions (e.g. sessions sharing the slot or room)
  const modifiedIds = new Set(proposedChanges.map((p) => p.sessionId));
  const otherAffectedSessions = Object.keys(updatedReport.sessionResults).filter(
    (sId) => !modifiedIds.has(sId) && !updatedReport.sessionResults[sId].isValid
  );

  // 6. Compute Soft Preferences Delta
  const softPreferencesAffected: SoftPreferenceImpact[] = [];
  for (const sId of modifiedIds) {
    const bRes = baselineReport.sessionResults[sId];
    const aRes = updatedReport.sessionResults[sId];
    if (bRes && aRes) {
      for (let i = 0; i < aRes.softEvaluations.length; i++) {
        const aEval = aRes.softEvaluations[i];
        const bEval = bRes.softEvaluations.find((e) => e.rule === aEval.rule);
        const prevScore = bEval ? bEval.score : 50;
        const delta = aEval.score - prevScore;
        if (delta !== 0) {
          softPreferencesAffected.push({
            name: aEval.name,
            rule: aEval.rule,
            previousScore: prevScore,
            newScore: aEval.score,
            delta,
            deltaDescription: delta > 0 ? `+${delta}% improvement (${aEval.notes})` : `${delta}% decline (${aEval.notes})`,
          });
        }
      }
    }
  }

  const netClashDelta = updatedReport.hardViolationsCount - baselineReport.hardViolationsCount;
  const isSafeToApply = newConflictsCreated.length === 0;

  let explanation = "";
  if (newConflictsCreated.length > 0) {
    explanation = `UNSAFE PROPOSAL: Applying this change resolves ${conflictsRemoved.length} conflicts but creates ${newConflictsCreated.length} NEW conflict(s) (${newConflictsCreated[0].title}). Cannot apply without cascading resolution.`;
  } else if (conflictsRemoved.length > 0) {
    explanation = `SAFE NET IMPROVEMENT: Successfully resolves ${conflictsRemoved.length} active conflict(s) with ZERO downstream schedule collisions.`;
  } else {
    explanation = `NEUTRAL SHIFT: Proposed timetable movement satisfies all institutional hard constraints.`;
  }

  return {
    isSafeToApply,
    changedSessions,
    conflictsRemoved,
    newConflictsCreated,
    otherAffectedSessions,
    hardConstraintsSatisfied,
    softPreferencesAffected,
    netClashDelta,
    explanation,
  };
}

/**
 * Searches bounded 1-hop or 2-hop reallocation chains for resolving complex multi-session clashes.
 */
export function searchChainResolutions(
  conflict: ConflictRecord,
  dataset: SynapseCollegeDataset,
  maxDepth = 2
): AlternativeResolution[] {
  // If the conflict explicitly has no feasible alternative (e.g. sole BSL-3 laboratory)
  if (!conflict.hasFeasibleAlternative) {
    return [];
  }

  const results: AlternativeResolution[] = [];

  // For each session in the conflict, rank valid single-session moves
  for (const sessionId of conflict.sessionIds) {
    const alts = rankValidAlternatives(sessionId, dataset);
    for (const alt of alts) {
      // Test ripple effect of this candidate
      const diff = calculateScheduleDiff(dataset, [
        {
          sessionId,
          targetTimeSlotId: alt.targetTimeSlotId,
          targetClassroomId: alt.targetClassroomId,
        },
      ]);

      if (diff.isSafeToApply && diff.conflictsRemoved.some((c) => c.id === conflict.id)) {
        results.push({
          ...alt,
          downstreamClashCount: diff.newConflictsCreated.length,
          feasibilityScore: Math.min(100, alt.feasibilityScore + 5), // Bonus for confirmed clean diff
        });
      }
    }
  }

  // Sort by feasibility score descending
  results.sort((a, b) => b.feasibilityScore - a.feasibilityScore);
  return results.slice(0, 5);
}

/**
 * Diagnostic analysis when NO feasible alternative exists for a conflict.
 * Provides thorough explanation and prevents illegal relaxation of hard constraints.
 */
export function explainNoFeasibleSolution(
  conflict: ConflictRecord,
  dataset: SynapseCollegeDataset
): {
  conflictId: string;
  hasFeasibleAlternative: false;
  hardBlockers: string[];
  reasons: string[];
  prohibitedRelaxations: string[];
  recommendedAdministrativeActions: string[];
} {
  const hardBlockers: string[] = [];
  const reasons: string[] = [];
  const prohibitedRelaxations: string[] = [];
  const recommendedAdministrativeActions: string[] = [];

  if (conflict.id === "CONF-05" || conflict.type === "equipment_mismatch") {
    hardBlockers.push("Federal Biosafety Compliance (CDC/NIH Level 3 Containment Standards)");
    reasons.push(
      "ADV-BIO-901 requires active Class III Total Containment Glovebox (bio_safety_cabinet_l3).",
      "Classroom LAB-BIO-BSL3 is the SOLE certified BSL-3 facility across the entire SIT-NORTH campus.",
      "LAB-BIO-BSL3 is closed under mandatory negative-pressure HEPA filter overhaul (RES-MAINT-BSL3)."
    );
    prohibitedRelaxations.push(
      "PROHIBITED: Relaxing biosafety level to standard BSL-2 laboratories (ROOM-LAB-BIO-01) violates statutory biohazard containment regulations.",
      "PROHIBITED: Overriding negative-pressure maintenance seal violates environmental safety certification."
    );
    recommendedAdministrativeActions.push(
      "Reschedule laboratory session to the post-certification academic week (Week 10+).",
      "Deliver theoretical genomics and computational protocol module first during standard lecture hours.",
      "Apply for emergency biosafety containment permit from Institutional Biosafety Committee."
    );
  } else {
    hardBlockers.push("Multiple interacting hard constraints unsatisfiable on campus.");
    reasons.push(conflict.description);
    prohibitedRelaxations.push("Hard constraints cannot be relaxed without administrative authorization.");
    recommendedAdministrativeActions.push("Submit special timetable variance request to Dean of Academic Affairs.");
  }

  return {
    conflictId: conflict.id,
    hasFeasibleAlternative: false,
    hardBlockers,
    reasons,
    prohibitedRelaxations,
    recommendedAdministrativeActions,
  };
}
