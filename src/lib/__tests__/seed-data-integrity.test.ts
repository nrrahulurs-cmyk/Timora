import { describe, it, expect } from "vitest";
import {
  SYNAPSE_SEED_DATA,
  SEED_DEPARTMENTS,
  SEED_FACULTY,
  SEED_CLASSROOMS,
  SEED_SECTIONS,
  SEED_SUBJECTS,
  SEED_TEACHING_ASSIGNMENTS,
  SEED_TIME_SLOTS,
  SEED_TIMETABLE_SESSIONS,
  SEED_ROOM_RESERVATIONS,
  SEED_CONFLICTS,
  SEED_SYLLABUS_MODULES,
  SEED_SYLLABUS_PROGRESS,
  SEED_EXTRA_CLASSES,
  SEED_TEACHER_EXCHANGES,
} from "@/data/fixtures";
import {
  LocalDemoSchedulingRepository,
  schedulingRepository,
} from "@/lib/repository/scheduling-repository";

describe("SYNAPSE Seed Data & Domain Relationships Integrity", () => {
  describe("Institution & Campus Identity", () => {
    it("has stable institution identity and campus code", () => {
      expect(SYNAPSE_SEED_DATA.institutionName).toBe("Timora Institute of Technology");
      expect(SYNAPSE_SEED_DATA.campusCode).toBe("SIT-NORTH");
      expect(SYNAPSE_SEED_DATA.academicTerms.length).toBeGreaterThanOrEqual(1);
      const currentTerm = SYNAPSE_SEED_DATA.academicTerms.find((t) => t.isCurrent);
      expect(currentTerm).toBeDefined();
      expect(currentTerm?.id).toBe("TERM-FALL-2026");
    });
  });

  describe("Departments & Faculty Relationships", () => {
    it("defines at least 4 departments with unique codes", () => {
      expect(SEED_DEPARTMENTS.length).toBeGreaterThanOrEqual(4);
      const codes = SEED_DEPARTMENTS.map((d) => d.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("ensures each department HOD exists in faculty records", () => {
      const facultyIds = new Set(SEED_FACULTY.map((f) => f.id));
      for (const dept of SEED_DEPARTMENTS) {
        expect(facultyIds.has(dept.headOfDepartmentId)).toBe(true);
      }
    });

    it("verifies faculty availability patterns and hour allocations", () => {
      expect(SEED_FACULTY.length).toBeGreaterThanOrEqual(10);
      for (const faculty of SEED_FACULTY) {
        expect(faculty.maxCreditHours).toBeGreaterThanOrEqual(faculty.currentAssignedHours);
        expect(faculty.availability.length).toBeGreaterThan(0);
        for (const pattern of faculty.availability) {
          expect(pattern.maxHoursPerDay).toBeGreaterThan(0);
          expect(pattern.availableSlotIds.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Classrooms & Facility Capacity Requirements", () => {
    it("provides at least 12 classrooms with varied capacities", () => {
      expect(SEED_CLASSROOMS.length).toBeGreaterThanOrEqual(12);
      expect(SEED_CLASSROOMS.length).toBe(15);

      const capacities = SEED_CLASSROOMS.map((c) => c.capacity);
      const minCapacity = Math.min(...capacities);
      const maxCapacity = Math.max(...capacities);
      expect(minCapacity).toBeLessThanOrEqual(25);
      expect(maxCapacity).toBeGreaterThanOrEqual(200);
    });

    it("includes both lecture halls and specialized laboratories", () => {
      const lectureHalls = SEED_CLASSROOMS.filter(
        (c) => c.type === "Lecture Hall" || c.type === "Auditorium"
      );
      const specializedLabs = SEED_CLASSROOMS.filter(
        (c) => c.type === "Specialized Laboratory"
      );
      const seminarRooms = SEED_CLASSROOMS.filter((c) => c.type === "Seminar Room");

      expect(lectureHalls.length).toBeGreaterThanOrEqual(4);
      expect(specializedLabs.length).toBeGreaterThanOrEqual(5);
      expect(seminarRooms.length).toBeGreaterThanOrEqual(2);
    });

    it("includes high-containment BSL-3 laboratory facility", () => {
      const bsl3 = SEED_CLASSROOMS.find((c) => c.id === "ROOM-LAB-BIO-BSL3");
      expect(bsl3).toBeDefined();
      expect(bsl3?.equipment).toContain("bio_safety_cabinet_l3");
    });
  });

  describe("Student Sections & Teaching Assignments", () => {
    it("verifies referential integrity between sections, advisors, and terms", () => {
      expect(SEED_SECTIONS.length).toBeGreaterThanOrEqual(4);
      const facultyIds = new Set(SEED_FACULTY.map((f) => f.id));
      const deptIds = new Set(SEED_DEPARTMENTS.map((d) => d.id));

      for (const section of SEED_SECTIONS) {
        expect(deptIds.has(section.departmentId)).toBe(true);
        expect(facultyIds.has(section.academicAdvisorId)).toBe(true);
        expect(section.studentCount).toBeGreaterThan(0);
      }
    });

    it("verifies referential integrity of teaching assignments", () => {
      expect(SEED_TEACHING_ASSIGNMENTS.length).toBeGreaterThanOrEqual(8);
      const subjectIds = new Set(SEED_SUBJECTS.map((s) => s.id));
      const facultyIds = new Set(SEED_FACULTY.map((f) => f.id));
      const sectionIds = new Set(SEED_SECTIONS.map((s) => s.id));

      for (const ta of SEED_TEACHING_ASSIGNMENTS) {
        expect(subjectIds.has(ta.subjectId)).toBe(true);
        expect(facultyIds.has(ta.facultyId)).toBe(true);
        expect(sectionIds.has(ta.sectionId)).toBe(true);
        expect(ta.weeklyHours).toBeGreaterThan(0);
      }
    });
  });

  describe("Weekly Timetable Sessions & Reservations", () => {
    it("verifies timetable sessions map to valid time slots and classrooms", () => {
      expect(SEED_TIMETABLE_SESSIONS.length).toBeGreaterThanOrEqual(10);
      const slotIds = new Set(SEED_TIME_SLOTS.map((t) => t.id));
      const roomIds = new Set(SEED_CLASSROOMS.map((c) => c.id));
      const facultyIds = new Set(SEED_FACULTY.map((f) => f.id));
      const sectionIds = new Set(SEED_SECTIONS.map((s) => s.id));

      for (const session of SEED_TIMETABLE_SESSIONS) {
        expect(slotIds.has(session.timeSlotId)).toBe(true);
        expect(roomIds.has(session.classroomId)).toBe(true);
        expect(facultyIds.has(session.facultyId)).toBe(true);
        expect(sectionIds.has(session.sectionId)).toBe(true);
      }
    });

    it("verifies room reservations include exam and maintenance blocks", () => {
      expect(SEED_ROOM_RESERVATIONS.length).toBeGreaterThanOrEqual(3);
      const examBlock = SEED_ROOM_RESERVATIONS.find((r) => r.category === "examination");
      const maintBlock = SEED_ROOM_RESERVATIONS.find((r) => r.category === "maintenance");
      expect(examBlock).toBeDefined();
      expect(maintBlock).toBeDefined();
    });
  });

  describe("Documented Conflict Fixtures & Alternative Scenarios", () => {
    it("documents multiple test conflicts across distinct categories", () => {
      expect(SEED_CONFLICTS.length).toBeGreaterThanOrEqual(4);
      const types = new Set(SEED_CONFLICTS.map((c) => c.type));
      expect(types.has("room_clash")).toBe(true);
      expect(types.has("faculty_overlap")).toBe(true);
      expect(types.has("capacity_deficit")).toBe(true);
      expect(types.has("maintenance_block")).toBe(true);
      expect(types.has("equipment_mismatch")).toBe(true);
    });

    it("provides valid alternative resolutions for standard conflicts", () => {
      const roomClash = SEED_CONFLICTS.find((c) => c.id === "CONF-01");
      expect(roomClash).toBeDefined();
      expect(roomClash?.hasFeasibleAlternative).toBe(true);
      expect(roomClash?.alternatives.length).toBeGreaterThan(0);
      const recommended = roomClash?.alternatives.find((a) => a.isRecommended);
      expect(recommended).toBeDefined();
      expect(recommended?.targetClassroomId).toBe("ROOM-LH-102");
    });

    it("explicitly documents the NO-FEASIBLE-ALTERNATIVE scenario (CONF-05)", () => {
      const noAltConflict = SEED_CONFLICTS.find((c) => c.id === "CONF-05");
      expect(noAltConflict).toBeDefined();
      expect(noAltConflict?.hasFeasibleAlternative).toBe(false);
      expect(noAltConflict?.alternatives.length).toBe(0);
      expect(noAltConflict?.classroomId).toBe("ROOM-LAB-BIO-BSL3");
      expect(noAltConflict?.description).toContain("bio_safety_cabinet_l3");
    });
  });

  describe("Academic Operations: Requests & Syllabus", () => {
    it("contains extra class and teacher exchange requests", () => {
      expect(SEED_EXTRA_CLASSES.length).toBeGreaterThanOrEqual(3);
      expect(SEED_TEACHER_EXCHANGES.length).toBeGreaterThanOrEqual(3);

      const pendingExchanges = SEED_TEACHER_EXCHANGES.filter((e) =>
        e.status.startsWith("pending")
      );
      expect(pendingExchanges.length).toBeGreaterThan(0);
    });

    it("tracks syllabus completion progress with status indicators", () => {
      expect(SEED_SYLLABUS_MODULES.length).toBeGreaterThan(0);
      expect(SEED_SYLLABUS_PROGRESS.length).toBeGreaterThan(0);

      for (const progress of SEED_SYLLABUS_PROGRESS) {
        expect(progress.percentageCompleted).toBeGreaterThanOrEqual(0);
        expect(progress.percentageCompleted).toBeLessThanOrEqual(100);
        expect(["ahead", "on_track", "behind"]).toContain(progress.status);
      }
    });
  });

  describe("Scheduling Repository Contract & Operations", () => {
    it("returns complete dataset via getDataset()", async () => {
      const repo = new LocalDemoSchedulingRepository();
      const dataset = await repo.getDataset();
      expect(dataset.departments.length).toBe(4);
      expect(dataset.classrooms.length).toBe(15);
      expect(dataset.faculty.length).toBe(10);
      expect(dataset.conflicts.length).toBe(5);
    });

    it("successfully resolves conflict CONF-01 and updates session and history", async () => {
      const repo = new LocalDemoSchedulingRepository();
      const res = await repo.resolveConflict("CONF-01", "SOL-01-A");
      expect(res.success).toBe(true);
      expect(res.updatedSession?.classroomId).toBe("ROOM-LH-102");

      const conflicts = await repo.getConflicts("resolved");
      expect(conflicts.some((c) => c.id === "CONF-01")).toBe(true);

      const history = await repo.getChangeHistory();
      expect(history.some((h) => h.entityId === "CONF-01")).toBe(true);
    });

    it("refuses to resolve CONF-05 because no feasible alternative exists", async () => {
      const repo = new LocalDemoSchedulingRepository();
      const res = await repo.resolveConflict("CONF-05", "NON-EXISTENT");
      expect(res.success).toBe(false);
      expect(res.message).toContain("no feasible alternative");
    });

    it("approves extra class and teacher exchange requests", async () => {
      const repo = new LocalDemoSchedulingRepository();
      const extraSuccess = await repo.approveExtraClassRequest("EXTRA-001", "USER-TURING");
      expect(extraSuccess).toBe(true);

      const exchangeSuccess = await repo.approveTeacherExchangeRequest(
        "EXCH-001",
        "USER-TURING"
      );
      expect(exchangeSuccess).toBe(true);
    });
  });
});
