import { describe, it, expect } from "vitest";
import {
  DepartmentSchema,
  FacultyMemberSchema,
  StudentSectionSchema,
  SubjectSchema,
  TeachingAssignmentSchema,
  ClassroomSchema,
  RoomEquipmentSchema,
  TimeSlotSchema,
  TimetableSessionSchema,
  RoomReservationSchema,
  ConflictRecordSchema,
  ScheduleVersionSchema,
  ChangeHistoryRecordSchema,
  SyllabusTopicSchema,
  SyllabusModuleSchema,
  TopicProgressRecordSchema,
  ExtraClassRequestSchema,
  TeacherExchangeRequestSchema,
  UserSchema,
  AcademicTermSchema,
  SynapseCollegeDatasetSchema,
} from "@/lib/validations/scheduling";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";

describe("Domain Validation & Zod Schemas", () => {
  describe("DepartmentSchema", () => {
    it("validates a legitimate department", () => {
      const dept = {
        id: "DEPT-CSE",
        code: "CSE",
        name: "Computer Science & Engineering",
        building: "Turing Block",
        headOfDepartmentId: "FAC-TURING",
        colorToken: "#0066cc",
        activeSectionsCount: 4,
        totalFacultyCount: 18,
      };
      const result = DepartmentSchema.safeParse(dept);
      expect(result.success).toBe(true);
    });

    it("rejects invalid department with negative faculty count", () => {
      const invalid = {
        id: "DEPT-TEST",
        code: "T",
        name: "Te",
        building: "B",
        headOfDepartmentId: "FAC-1",
        colorToken: "#fff",
        activeSectionsCount: -1,
        totalFacultyCount: -5,
      };
      const result = DepartmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("FacultyMemberSchema", () => {
    it("validates faculty with availability pattern", () => {
      const faculty = {
        id: "FAC-VANCE",
        userId: "USER-VANCE",
        employeeCode: "FAC-101",
        name: "Dr. Eleanor Vance",
        email: "e.vance@synapse.edu",
        departmentId: "DEPT-CSE",
        designation: "Professor",
        maxCreditHours: 14,
        currentAssignedHours: 12,
        specializations: ["Distributed Systems"],
        availability: [
          {
            dayOfWeek: "Monday",
            availableSlotIds: ["SLOT-MON-1", "SLOT-MON-2"],
            preferredSlotIds: ["SLOT-MON-2"],
            blockedSlotIds: ["SLOT-MON-5"],
            maxHoursPerDay: 4,
          },
        ],
        status: "active",
      };
      const result = FacultyMemberSchema.safeParse(faculty);
      expect(result.success).toBe(true);
    });

    it("rejects invalid email address", () => {
      const invalid = {
        id: "FAC-INVALID",
        userId: "USER-1",
        employeeCode: "FAC-999",
        name: "Invalid Faculty",
        email: "not-an-email",
        departmentId: "DEPT-CSE",
        designation: "Professor",
        maxCreditHours: 14,
        currentAssignedHours: 0,
        specializations: [],
        availability: [],
        status: "active",
      };
      const result = FacultyMemberSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("ClassroomSchema", () => {
    it("validates classroom with equipment and accessibility", () => {
      const room = {
        id: "ROOM-LH-101",
        code: "LH-101",
        name: "Main Campus Auditorium",
        building: "Admin Wing",
        floor: 1,
        capacity: 250,
        type: "Auditorium",
        equipment: ["smart_projector", "dual_displays", "sound_reinforcement_mic"],
        isAccessible: true,
        status: "Available",
      };
      const result = ClassroomSchema.safeParse(room);
      expect(result.success).toBe(true);
    });

    it("rejects invalid room capacity of zero or negative", () => {
      const invalid = {
        id: "ROOM-BAD",
        code: "BAD-1",
        name: "Bad Room",
        building: "Wing A",
        floor: 0,
        capacity: 0,
        type: "Standard Classroom",
        equipment: [],
        isAccessible: false,
        status: "Available",
      };
      const result = ClassroomSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("ConflictRecordSchema", () => {
    it("validates conflict record with alternatives", () => {
      const conflict = {
        id: "CONF-TEST",
        type: "room_clash",
        severity: "critical",
        title: "Test Conflict",
        description: "Room clash between two sections",
        sessionIds: ["SESS-1", "SESS-2"],
        classroomId: "ROOM-LH-101",
        timeSlotId: "SLOT-MON-1",
        detectedAt: "2026-10-14T08:00:00Z",
        status: "active",
        hasFeasibleAlternative: true,
        alternatives: [
          {
            solutionId: "SOL-1",
            description: "Shift to LH-102",
            targetClassroomId: "ROOM-LH-102",
            downstreamClashCount: 0,
            feasibilityScore: 95,
            isRecommended: true,
          },
        ],
      };
      const result = ConflictRecordSchema.safeParse(conflict);
      expect(result.success).toBe(true);
    });

    it("validates conflict record with no feasible alternative", () => {
      const conflict = {
        id: "CONF-NO-ALT",
        type: "equipment_mismatch",
        severity: "critical",
        title: "No Alternative Scenario",
        description: "Sole BSL-3 laboratory is down for maintenance",
        sessionIds: ["SESS-BIO901"],
        detectedAt: "2026-10-14T08:00:00Z",
        status: "active",
        hasFeasibleAlternative: false,
        alternatives: [],
      };
      const result = ConflictRecordSchema.safeParse(conflict);
      expect(result.success).toBe(true);
    });
  });

  describe("Syllabus & Operations Schemas", () => {
    it("validates ExtraClassRequestSchema", () => {
      const req = {
        id: "EXTRA-101",
        facultyId: "FAC-COLE",
        subjectId: "SUB-ME202",
        sectionId: "SEC-ME-S3-A",
        classroomId: "ROOM-LH-202",
        timeSlotId: "SLOT-SAT-2",
        scheduledDate: "2026-10-24",
        reason: "Revision class",
        status: "pending_hod",
        submittedAt: "2026-10-14T08:00:00Z",
      };
      const result = ExtraClassRequestSchema.safeParse(req);
      expect(result.success).toBe(true);
    });

    it("validates TeacherExchangeRequestSchema", () => {
      const req = {
        id: "EXCH-101",
        requesterFacultyId: "FAC-TURING",
        requesterSessionId: "SESS-CS301-MON",
        targetFacultyId: "FAC-LOVELACE",
        targetSessionId: "SESS-MATH202-FRI",
        date: "2026-10-19",
        reason: "Conference keynote swap",
        status: "pending_hod",
        submittedAt: "2026-10-14T08:00:00Z",
        isPeerAccepted: true,
      };
      const result = TeacherExchangeRequestSchema.safeParse(req);
      expect(result.success).toBe(true);
    });
  });

  describe("Composite Dataset Schema", () => {
    it("successfully validates entire SYNAPSE_SEED_DATA with zero errors", () => {
      const result = SynapseCollegeDatasetSchema.safeParse(SYNAPSE_SEED_DATA);
      if (!result.success) {
        console.error("Zod Schema Errors:", result.error.format());
      }
      expect(result.success).toBe(true);
    });
  });
});
