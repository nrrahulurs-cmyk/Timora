import { describe, it, expect, beforeEach } from "vitest";
import {
  parseTimeToMinutes,
  timeRangesOverlap,
  slotsOverlap,
  validateSession,
  validateSchedule,
  findConflicts,
  searchEligibleRooms,
  checkFacultyAvailability,
  checkStudentGroupAvailability,
  evaluateCandidateSlot,
  rankValidAlternatives,
} from "../constraint-engine";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { LocalDemoSchedulingRepository } from "@/lib/repository/scheduling-repository";
import type {
  SynapseCollegeDataset,
  TimetableSession,
  Classroom,
} from "@/types/domain";

describe("SYNAPSE Constraint Engine — Core Deterministic Validation", () => {
  let dataset: SynapseCollegeDataset;

  beforeEach(() => {
    // Clone clean fixture data for each test
    dataset = JSON.parse(JSON.stringify(SYNAPSE_SEED_DATA));
  });

  // ── 1. Half-Open Time Ranges [start, end) ──────────────────────────────────
  describe("Half-Open Interval Semantics [start, end)", () => {
    it("converts HH:MM strings accurately to minutes from midnight", () => {
      expect(parseTimeToMinutes("00:00")).toBe(0);
      expect(parseTimeToMinutes("08:30")).toBe(510);
      expect(parseTimeToMinutes("10:00")).toBe(600);
      expect(parseTimeToMinutes("13:00")).toBe(780);
      expect(parseTimeToMinutes("23:59")).toBe(1439);
    });

    it("ensures adjacent periods STRICTLY DO NOT conflict", () => {
      // Period 1: 08:30 to 10:00 [510, 600)
      // Period 2: 10:00 to 11:30 [600, 690)
      const start1 = 510;
      const end1 = 600;
      const start2 = 600;
      const end2 = 690;

      // Overlap formula: max(start1, start2) < min(end1, end2)
      // max(510, 600) = 600, min(600, 690) = 600. 600 < 600 is FALSE.
      expect(timeRangesOverlap(start1, end1, start2, end2)).toBe(false);
      expect(timeRangesOverlap(start2, end2, start1, end1)).toBe(false);
    });

    it("detects genuine overlapping time ranges", () => {
      // 09:30 to 11:00 [570, 660) overlaps with 10:00 to 11:30 [600, 690)
      expect(timeRangesOverlap(570, 660, 600, 690)).toBe(true);
      // Enclosure: 09:00 to 12:00 contains 10:00 to 11:30
      expect(timeRangesOverlap(540, 720, 600, 690)).toBe(true);
    });

    it("checks slot overlap across day boundaries", () => {
      const slotMon1 = dataset.timeSlots.find((s) => s.id === "SLOT-MON-1")!;
      const slotMon2 = dataset.timeSlots.find((s) => s.id === "SLOT-MON-2")!;
      const slotTue1 = dataset.timeSlots.find((s) => s.id === "SLOT-TUE-1")!;

      // Mon Period 1 (08:30-10:00) vs Mon Period 2 (10:00-11:30) adjacent -> no overlap
      expect(slotsOverlap(slotMon1, slotMon2)).toBe(false);
      // Mon Period 1 vs Tue Period 1 -> different days -> no overlap
      expect(slotsOverlap(slotMon1, slotTue1)).toBe(false);
    });
  });

  // ── 2. Constraint Categories (Every Category Tested) ───────────────────────
  describe("Hard Constraint Rules (8 Categories)", () => {
    it("Category 1: detects room double-booking (two sessions in same room at same time)", () => {
      // SESS-CS401-WED and SESS-ECE305-WED in LH-201 at SLOT-WED-2
      const sessionA = dataset.timetableSessions.find((s) => s.id === "SESS-CS401-WED")!;
      const res = validateSession(sessionA, dataset, {
        activeSessions: dataset.timetableSessions,
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "room_double_booking")).toBe(true);
      const violation = res.hardViolations.find((v) => v.rule === "room_double_booking")!;
      expect(violation.constraintType).toBe("room_clash");
    });

    it("Category 2: detects faculty double-booking (same faculty in two rooms at once)", () => {
      // Create duplicate concurrent session for Dr. Alan Turing (who already teaches at SLOT-MON-1)
      const concurrentSession: TimetableSession = {
        id: "TEST-FAC-DOUBLE",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-CS301",
        sectionId: "SEC-CSE-S5-B",
        facultyId: "FAC-TURING", // Dr. Alan Turing
        classroomId: "ROOM-CR-204",
        timeSlotId: "SLOT-MON-1", // Already teaching CS-301 in LH-101 at SLOT-MON-1
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(concurrentSession, dataset, {
        activeSessions: dataset.timetableSessions,
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "faculty_double_booking")).toBe(true);
    });

    it("Category 3: detects student group overlap (section scheduled in two places concurrently)", () => {
      // Schedule SEC-CSE-S3-A concurrently in another room at SLOT-MON-1 (already in SESS-CS301-MON)
      const sectionClashSession: TimetableSession = {
        id: "TEST-SEC-DOUBLE",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-MATH202",
        sectionId: "SEC-CSE-S3-A", // Already in LH-101 at SLOT-MON-1
        facultyId: "FAC-LOVELACE",
        classroomId: "ROOM-CR-204",
        timeSlotId: "SLOT-MON-1",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(sectionClashSession, dataset, {
        activeSessions: dataset.timetableSessions,
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "student_group_double_booking")).toBe(true);
    });

    it("Category 4: detects room capacity deficit (students exceed seats)", () => {
      // Put SEC-CSE-S5-A (65 students) into SEM-302 (Capacity 50)
      const overflowSession: TimetableSession = {
        id: "TEST-CAPACITY-DEFICIT",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-CS401",
        sectionId: "SEC-CSE-S5-A", // 65 students
        facultyId: "FAC-TURING",
        classroomId: "ROOM-SEM-302", // 50 seats
        timeSlotId: "SLOT-FRI-5",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(overflowSession, dataset, {
        activeSessions: [],
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "room_capacity_deficit")).toBe(true);
      const capViolation = res.hardViolations.find((v) => v.rule === "room_capacity_deficit")!;
      expect(capViolation.description).toContain("Deficit");
    });

    it("Category 5: detects equipment mismatch & laboratory suitability", () => {
      // Put a lab requiring Specialized Laboratory & high_spec_workstations into a standard auditorium LH-101
      const labInLectureHall: TimetableSession = {
        id: "TEST-EQUIPMENT-MISMATCH",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-CS402L", // Requires Specialized Laboratory and high_spec_workstations
        sectionId: "SEC-CSE-S5-A",
        facultyId: "FAC-LOVELACE",
        classroomId: "ROOM-LH-101", // Auditorium, lacks workstations
        timeSlotId: "SLOT-FRI-5",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(labInLectureHall, dataset, {
        activeSessions: [],
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "equipment_and_lab_suitability")).toBe(true);
    });

    it("Category 6: detects hard faculty unavailability (blocked senate / hospital duty)", () => {
      // Dr. Sarah Lin is blocked on Tuesday Slot 4 (SLOT-TUE-4: Academic Senate duty)
      const linBlockedSession: TimetableSession = {
        id: "TEST-FAC-BLOCKED",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-BIO110",
        sectionId: "SEC-BIO-S7-A",
        facultyId: "FAC-LIN", // Blocked at SLOT-TUE-4
        classroomId: "ROOM-LAB-BIO-01",
        timeSlotId: "SLOT-TUE-4",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(linBlockedSession, dataset, {
        activeSessions: [],
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "faculty_hard_availability")).toBe(true);
    });

    it("Category 7: detects room reservation collisions (examination / maintenance block)", () => {
      // RES-MAINT-01 blocks ROOM-LAB-CS-02 on SLOT-THU-4
      const maintenanceSession: TimetableSession = {
        id: "TEST-MAINT-COLLISION",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-CS402L",
        sectionId: "SEC-CSE-S5-A",
        facultyId: "FAC-LOVELACE",
        classroomId: "ROOM-LAB-CS-02", // Under maintenance by RES-MAINT-01
        timeSlotId: "SLOT-THU-4",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(maintenanceSession, dataset, {
        activeSessions: [],
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "reservation_collision")).toBe(true);
      const resViolation = res.hardViolations.find((v) => v.rule === "reservation_collision")!;
      expect(resViolation.conflictingReservationId).toBe("RES-MAINT-01");
    });

    it("Category 8: detects accessibility requirements (wheelchair access required)", () => {
      // Existing inaccessible classroom in seed fixtures: ROOM-CR-205 (isAccessible: false)
      const inaccessibleRoom = dataset.classrooms.find((c) => c.id === "ROOM-CR-205")!;
      expect(inaccessibleRoom.isAccessible).toBe(false);

      const sessionNeedingA11y: TimetableSession = {
        id: "TEST-A11Y-FAIL",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-CS301",
        sectionId: "SEC-CSE-S5-A",
        facultyId: "FAC-TURING",
        classroomId: inaccessibleRoom.id,
        timeSlotId: "SLOT-FRI-1",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      const res = validateSession(sessionNeedingA11y, dataset, {
        activeSessions: [],
        checkAccessibility: true,
      });

      expect(res.isValid).toBe(false);
      expect(res.hardViolations.some((v) => v.rule === "accessibility_requirement")).toBe(true);
    });
  });

  // ── 3. Valid Moves and Search Functions ────────────────────────────────────
  describe("Valid Move & Eligible Room Search", () => {
    it("validates a completely clean move as isValid === true with zero hard violations", () => {
      // Target session: move ECE-305 from LH-201 to vacant LH-102 at SLOT-WED-2
      const candidateSession: TimetableSession = {
        id: "SESS-ECE305-WED",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-ECE305",
        sectionId: "SEC-ECE-S5-A",
        facultyId: "FAC-FEYNMAN",
        classroomId: "ROOM-LH-102", // Vacant 160-seat hall
        timeSlotId: "SLOT-WED-2",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      };

      // Exclude SESS-ECE305-WED itself from active sessions
      const otherSessions = dataset.timetableSessions.filter((s) => s.id !== "SESS-ECE305-WED");
      const res = validateSession(candidateSession, dataset, {
        activeSessions: otherSessions,
      });

      expect(res.isValid).toBe(true);
      expect(res.hardViolations.length).toBe(0);
      expect(res.softScore).toBeGreaterThanOrEqual(60);
    });

    it("searches eligible rooms and excludes rooms with capacity deficits or reservations", () => {
      const subject = dataset.subjects.find((s) => s.id === "SUB-CS401")!;
      const section = dataset.sections.find((s) => s.id === "SEC-CSE-S5-A")!; // 65 students
      const slot = dataset.timeSlots.find((s) => s.id === "SLOT-WED-2")!;

      const eligible = searchEligibleRooms(subject, section, slot, dataset);

      // All eligible rooms must have capacity >= 65
      for (const room of eligible) {
        expect(room.capacity).toBeGreaterThanOrEqual(65);
      }

      // SEM-302 (50 seats) must NOT be eligible
      expect(eligible.some((r) => r.id === "ROOM-SEM-302")).toBe(false);
    });

    it("checks faculty and student group availability correctly", () => {
      // Dr. Marie Curie is not teaching at SLOT-WED-2
      const curieAvail = checkFacultyAvailability("FAC-CURIE", "SLOT-WED-2", dataset);
      expect(curieAvail.isAvailable).toBe(true);

      // Dr. Richard Feynman is teaching ECE-305 at SLOT-WED-2
      const feynmanAvail = checkFacultyAvailability("FAC-FEYNMAN", "SLOT-WED-2", dataset);
      expect(feynmanAvail.isAvailable).toBe(false);

      // Student group availability for SEC-ECE-S5-A
      const secAvail = checkStudentGroupAvailability("SEC-ECE-S5-A", "SLOT-WED-2", dataset);
      expect(secAvail.isAvailable).toBe(false); // SESS-ECE305-WED is at SLOT-WED-2
    });
  });

  // ── 4. Multiple Interacting Conflicts & Full Schedule Validation ────────────
  describe("Schedule Validation & Multiple Interacting Conflicts", () => {
    it("runs complete schedule validation and reports all active conflict categories", () => {
      const report = validateSchedule(dataset);

      expect(report.totalSessionsEvaluated).toBe(dataset.timetableSessions.length);
      expect(report.isValid).toBe(false); // Because fixtures intentionally include CONF-01 to CONF-05
      expect(report.conflictedSessionsCount).toBeGreaterThan(0);
      expect(report.hardViolationsCount).toBeGreaterThan(0);

      // Verify specific rule counts
      expect(report.hardViolationsByRule.room_double_booking).toBeGreaterThan(0);
      expect(report.hardViolationsByRule.faculty_hard_availability).toBeGreaterThan(0);
    });

    it("finds conflict records matching the active schedule collisions", () => {
      const conflicts = findConflicts(dataset);
      expect(conflicts.length).toBeGreaterThanOrEqual(3);

      const roomClash = conflicts.find((c) => c.type === "room_clash");
      expect(roomClash).toBeDefined();
      expect(roomClash?.classroomId).toBe("ROOM-LH-201");
    });
  });

  // ── 5. Case with No Valid Alternative (CONF-05) ─────────────────────────────
  describe("Scenario with No Valid Alternative (CONF-05)", () => {
    it("returns zero feasible alternatives for BSL-3 laboratory lockdown (CONF-05)", () => {
      // SESS-BIO901-WED requires bio_safety_cabinet_l3 in LAB-BIO-BSL3
      // LAB-BIO-BSL3 is under mandatory containment seal overhaul
      const bsl3Session = dataset.timetableSessions.find((s) => s.id === "SESS-BIO901-WED");
      expect(bsl3Session).toBeDefined();

      if (bsl3Session) {
        const alternatives = rankValidAlternatives(bsl3Session.id, dataset);
        // Deterministic engine must return EMPTY alternatives array
        // It must NEVER silently relax the bio-safety hard constraint!
        expect(alternatives).toHaveLength(0);
      }
    });

    it("refuses to propose a standard BSL-2 lab for pathogen session", () => {
      const bsl3Session = dataset.timetableSessions.find((s) => s.id === "SESS-BIO901-WED")!;
      // Evaluate candidate slot in standard lab LAB-BIO-01
      const evalResult = evaluateCandidateSlot(
        bsl3Session,
        "SLOT-WED-3",
        "ROOM-LAB-BIO-01", // BSL-2 lab, lacks BSL-3 cabinet
        dataset
      );

      // Hard constraint violated: equipment_and_lab_suitability
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.tradeOffs.some((t) => t.includes("Hard violation"))).toBe(true);
    });
  });

  // ── 6. Safety: Failed Proposal Leaves Schedule Unchanged ────────────────────
  describe("Safe Application: Failed Proposal Integrity", () => {
    it("leaves schedule completely unmodified when a resolution proposal fails revalidation", async () => {
      const repo = new LocalDemoSchedulingRepository(dataset);
      const initialSessions = await repo.getTimetableSessions();
      const initialSessionSnapshots = JSON.stringify(initialSessions);

      // Attempt to resolve with non-existent alternative
      const res = await repo.resolveConflict("CONF-01", "NON-EXISTENT-SOLUTION");
      expect(res.success).toBe(false);

      // Verify sessions are 100% identical to original
      const afterSessions = await repo.getTimetableSessions();
      expect(JSON.stringify(afterSessions)).toBe(initialSessionSnapshots);
    });

    it("leaves schedule completely unmodified when attempting to resolve CONF-05 (no alternative)", async () => {
      const repo = new LocalDemoSchedulingRepository(dataset);
      const initialSessions = await repo.getTimetableSessions();
      const initialSessionSnapshots = JSON.stringify(initialSessions);

      const res = await repo.resolveConflict("CONF-05", "ANY-SOLUTION");
      expect(res.success).toBe(false);
      expect(res.message).toContain("no feasible alternative");

      const afterSessions = await repo.getTimetableSessions();
      expect(JSON.stringify(afterSessions)).toBe(initialSessionSnapshots);
    });

    it("supports reversible Undo action: restoring schedule to exact before state", async () => {
      const repo = new LocalDemoSchedulingRepository(dataset);

      // 1. Resolve CONF-01 with SOL-01-A
      const resolveRes = await repo.resolveConflict("CONF-01", "SOL-01-A");
      expect(resolveRes.success).toBe(true);

      const resolvedSession = (await repo.getTimetableSessions()).find(
        (s) => s.id === "SESS-ECE305-WED"
      );
      expect(resolvedSession?.classroomId).toBe("ROOM-LH-102");

      // 2. Undo resolution
      const undoRes = await repo.undoConflictResolution("CONF-01");
      expect(undoRes.success).toBe(true);
      expect(undoRes.restoredSession?.classroomId).toBe("ROOM-LH-201"); // Restored to LH-201

      // 3. Conflict should be active again
      const activeConflicts = await repo.getConflicts("active");
      expect(activeConflicts.some((c) => c.id === "CONF-01")).toBe(true);

      // 4. Change history should record the undo
      const history = await repo.getChangeHistory();
      expect(history.some((h) => h.id.startsWith("HIST-UNDO-"))).toBe(true);
    });
  });
});
