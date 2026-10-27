/**
 * SYNAPSE OS — Supabase Database, Authentication & Governance Test Suite
 * Tests relational data mappers, structured errors, role-based authorization,
 * optimistic concurrency control, pre-commit validation, and live database queries.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAcademicTerm,
  mapDepartment,
  mapUserProfile,
  mapClassroom,
  mapTimeSlot,
  mapFacultyMember,
  mapStudentSection,
  mapSubject,
  mapTeachingAssignment,
  mapScheduleVersion,
  mapTimetableSession,
  mapRoomReservation,
  mapConflictRecord,
  mapChangeHistoryRecord,
  mapExtraClassRequest,
  mapTeacherExchangeRequest,
  mapTopicProgressRecord,
} from "@/lib/supabase/mappers";

import {
  SchedulingError,
  ConcurrencyError,
  ConstraintViolationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
} from "@/lib/errors";

import {
  activeDataSource,
  createSchedulingRepository,
  LocalDemoSchedulingRepository,
  SupabaseSchedulingRepository,
} from "@/lib/repository/scheduling-repository";

describe("Phase 6: Data Source Configuration & Provider Selection", () => {
  it("determines active data source correctly based on credentials", () => {
    expect(["supabase", "demo"]).toContain(activeDataSource);
  });

  it("creates a repository instance matching the active provider contract", () => {
    const repo = createSchedulingRepository();
    expect(repo).toBeDefined();
    expect(typeof repo.getDepartments).toBe("function");
    expect(typeof repo.getTimetableSessions).toBe("function");
    expect(typeof repo.resolveConflict).toBe("function");
    expect(typeof repo.undoConflictResolution).toBe("function");
  });
});

describe("Phase 6: Relational Domain Mappers (Bidirectional Snake/CamelCase)", () => {
  it("correctly maps academic term rows", () => {
    const row = {
      id: "TERM-FALL-2026",
      name: "Fall 2026",
      start_date: "2026-08-17",
      end_date: "2026-12-18",
      status: "active",
      weeks_count: 16,
      is_current: true,
    };
    const mapped = mapAcademicTerm(row);
    expect(mapped.id).toBe("TERM-FALL-2026");
    expect(mapped.startDate).toBe("2026-08-17");
    expect(mapped.endDate).toBe("2026-12-18");
    expect(mapped.weeksCount).toBe(16);
    expect(mapped.isCurrent).toBe(true);
  });

  it("correctly maps department rows", () => {
    const row = {
      id: "DEPT-CSE",
      code: "CSE",
      name: "Computer Science",
      building: "Turing Block",
      head_of_department_id: "FAC-TURING",
      color_token: "#0066cc",
      active_sections_count: 4,
      total_faculty_count: 18,
    };
    const mapped = mapDepartment(row);
    expect(mapped.code).toBe("CSE");
    expect(mapped.headOfDepartmentId).toBe("FAC-TURING");
    expect(mapped.activeSectionsCount).toBe(4);
    expect(mapped.totalFacultyCount).toBe(18);
  });

  it("correctly maps user profile rows with roles", () => {
    const row = {
      id: "USR-01",
      email: "admin@synapse.edu",
      full_name: "Eleanor Vance",
      role: "academic_admin",
      department_id: "DEPT-CSE",
      avatar_url: "/avatar.png",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    };
    const mapped = mapUserProfile(row);
    expect(mapped.fullName).toBe("Eleanor Vance");
    expect(mapped.role).toBe("academic_admin");
    expect(mapped.departmentId).toBe("DEPT-CSE");
  });

  it("correctly maps classroom rows with jsonb equipment and accessibility", () => {
    const row = {
      id: "ROOM-LH-101",
      code: "LH-101",
      name: "Auditorium",
      building: "Central",
      floor: 1,
      capacity: 250,
      type: "Lecture Hall",
      equipment: ["smart_projector", "air_conditioning"],
      is_accessible: true,
      status: "Available",
    };
    const mapped = mapClassroom(row);
    expect(mapped.capacity).toBe(250);
    expect(mapped.equipment).toEqual(["smart_projector", "air_conditioning"]);
    expect(mapped.isAccessible).toBe(true);
  });

  it("correctly maps timetable sessions with half-open scheduling references", () => {
    const row = {
      id: "SESS-01",
      academic_term_id: "TERM-FALL-2026",
      version_id: "VER-2.4",
      subject_id: "SUB-CS401",
      section_id: "SEC-CSE-S5-A",
      faculty_id: "FAC-VANCE",
      classroom_id: "ROOM-LH-102",
      time_slot_id: "SLOT-MON-2",
      status: "scheduled",
      is_recurring_weekly: true,
      effective_from: "2026-08-17",
      effective_until: "2026-12-18",
    };
    const mapped = mapTimetableSession(row);
    expect(mapped.academicTermId).toBe("TERM-FALL-2026");
    expect(mapped.versionId).toBe("VER-2.4");
    expect(mapped.isRecurringWeekly).toBe(true);
    expect(mapped.effectiveFrom).toBe("2026-08-17");
  });

  it("correctly maps conflict records with alternatives", () => {
    const row = {
      id: "CONF-01",
      type: "room_clash",
      severity: "critical",
      title: "Room Overlap in LH-201",
      description: "Concurrent classes scheduled",
      session_ids: ["SESS-01", "SESS-02"],
      classroom_id: "ROOM-LH-201",
      time_slot_id: "SLOT-WED-2",
      detected_at: "2026-10-14T10:00:00Z",
      status: "active",
      has_feasible_alternative: true,
      alternatives: [
        {
          solutionId: "SOL-1",
          description: "Relocate to LH-102",
          targetClassroomId: "ROOM-LH-102",
          downstreamClashCount: 0,
          feasibilityScore: 92,
          isRecommended: true,
        },
      ],
      resolution_notes: null,
    };
    const mapped = mapConflictRecord(row);
    expect(mapped.id).toBe("CONF-01");
    expect(mapped.type).toBe("room_clash");
    expect(mapped.alternatives).toHaveLength(1);
    expect(mapped.alternatives[0].feasibilityScore).toBe(92);
  });
});

describe("Phase 6: Structured Errors & Governance Rules", () => {
  it("creates ConcurrencyError with lock version details", () => {
    const err = new ConcurrencyError(2, 3);
    expect(err.name).toBe("ConcurrencyError");
    expect(err.code).toBe("SCHEDULE_VERSION_STALE");
    expect(err.expectedVersion).toBe(2);
    expect(err.currentVersion).toBe(3);
    expect(err.message).toContain("Optimistic lock failure");
  });

  it("creates ConstraintViolationError with list of violated rules", () => {
    const violations = [
      "Room LH-201 is already occupied by CS-401",
      "Cohort SEC-CSE-S5-A exceeds room capacity",
    ];
    const err = new ConstraintViolationError(violations);
    expect(err.name).toBe("ConstraintViolationError");
    expect(err.code).toBe("HARD_CONSTRAINT_VIOLATED");
    expect(err.violations).toHaveLength(2);
    expect(err.message).toContain("2 hard constraint(s) violated");
  });

  it("creates AuthorizationError preventing unauthorized mutations", () => {
    const err = new AuthorizationError("student_viewer", "Publish Schedule");
    expect(err.name).toBe("AuthorizationError");
    expect(err.code).toBe("FORBIDDEN");
    expect(err.role).toBe("student_viewer");
    expect(err.action).toBe("Publish Schedule");
    expect(err.message).toContain("not authorized");
  });

  it("creates NotFoundError for missing entities", () => {
    const err = new NotFoundError("TimetableSession", "SESS-MISSING");
    expect(err.name).toBe("NotFoundError");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.entityType).toBe("TimetableSession");
    expect(err.entityId).toBe("SESS-MISSING");
  });
});

describe("Phase 6: Role-Based Authorization & Governance Enforcement", () => {
  let repo: SupabaseSchedulingRepository;

  beforeEach(() => {
    repo = new SupabaseSchedulingRepository({} as SupabaseClient);
  });

  it("blocks student_viewer role from resolving conflicts", async () => {
    repo.setUserContext("USR-STUDENT", "Student Viewer", "student_viewer");
    await expect(
      repo.resolveConflict("CONF-01", "SOL-01")
    ).rejects.toThrow(AuthorizationError);
  });

  it("blocks faculty_instructor role from resolving institutional conflicts", async () => {
    repo.setUserContext("USR-FACULTY", "Dr. Sarah Lin", "faculty_instructor");
    await expect(
      repo.resolveConflict("CONF-01", "SOL-01")
    ).rejects.toThrow(AuthorizationError);
  });

  it("permits academic_admin and timetable_coordinator to initiate conflict resolution", () => {
    repo.setUserContext("USR-ADMIN", "Eleanor Vance", "academic_admin");
    expect(repo.getRole()).toBe("academic_admin");

    repo.setUserContext("USR-COORD", "Eleanor Vance", "timetable_coordinator");
    expect(repo.getRole()).toBe("timetable_coordinator");
  });

  it("blocks non-administrative roles from approving extra classes", async () => {
    repo.setUserContext("USR-STUDENT", "Student Viewer", "student_viewer");
    await expect(
      repo.approveExtraClassRequest("REQ-EXTRA-01", "Student")
    ).rejects.toThrow(AuthorizationError);
  });
});

describe.skipIf(process.env.TIMORA_RUN_LIVE_TESTS !== "true")("Phase 6: Live Supabase Database Connectivity & Data Integrity (explicit opt-in)", () => {
  let repo: SupabaseSchedulingRepository;
  beforeEach(() => { repo = new SupabaseSchedulingRepository(); });

  it("fetches academic terms from live Supabase database", async () => {
    const terms = await repo.getDataset();
    expect(terms.academicTerms.length).toBeGreaterThanOrEqual(1);
    const fallTerm = terms.academicTerms.find((t) => t.id === "TERM-FALL-2026");
    expect(fallTerm).toBeDefined();
    expect(fallTerm?.name).toContain("Fall 2026");
  }, 30000);

  it("fetches departments and verifying institutional entity integrity", async () => {
    const depts = await repo.getDepartments();
    expect(depts.length).toBeGreaterThanOrEqual(4);
    const cse = depts.find((d) => d.code === "CSE");
    expect(cse).toBeDefined();
    expect(cse?.building).toBe("Turing Computing Block");
  });

  it("fetches classrooms and equipment specs from live database", async () => {
    const classrooms = await repo.getClassrooms();
    expect(classrooms.length).toBeGreaterThanOrEqual(12);

    const bsl3 = classrooms.find((c) => c.code === "LAB-BIO-BSL3");
    expect(bsl3).toBeDefined();
    expect(bsl3?.equipment).toContain("bio_safety_cabinet_l3");
    expect(bsl3?.status).toBe("Maintenance");
  });

  it("fetches live active conflicts including CONF-01 and CONF-05", async () => {
    const conflicts = await repo.getConflicts();
    expect(conflicts.length).toBeGreaterThanOrEqual(3);

    const conf01 = conflicts.find((c) => c.id === "CONF-01");
    expect(conf01).toBeDefined();
    expect(conf01?.type).toBe("room_clash");

    const conf05 = conflicts.find((c) => c.id === "CONF-05");
    expect(conf05).toBeDefined();
    expect(conf05?.hasFeasibleAlternative).toBe(false);
  });

  it("fetches live schedule versions with optimistic lock versions", async () => {
    const versions = await repo.getScheduleVersions();
    expect(versions.length).toBeGreaterThanOrEqual(1);
    const v24 = versions.find((v) => v.id === "VER-2.4" || v.versionNumber.includes("v2.4"));
    expect(v24).toBeDefined();
    expect(v24?.clashCount).toBe(5);
  });

  it("fetches live change history audit records", async () => {
    const history = await repo.getChangeHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]).toHaveProperty("action");
    expect(history[0]).toHaveProperty("actorRole");
    expect(history[0]).toHaveProperty("timestamp");
  });

  it("calculates live KPI metrics from database tables", async () => {
    const kpi = await repo.getKpiMetrics();
    expect(kpi.unresolvedConflicts.count).toBeGreaterThanOrEqual(1);
    expect(kpi.availableRooms.total).toBeGreaterThanOrEqual(12);
  }, 30000);
});
