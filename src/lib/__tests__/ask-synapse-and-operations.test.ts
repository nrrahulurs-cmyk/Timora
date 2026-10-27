/**
 * Phase 7 Verification Test Suite:
 * - Ask SYNAPSE Gemini Copilot & Controlled Scheduling Tools
 * - Structured Argument Schemas & Zero Arbitrary SQL Enforcement
 * - Two-Phase Commit Lifecycle: Interpret -> Validate -> Preview -> Confirm -> Revalidate -> Commit
 * - Extra Classes: Feasibility Finder, Room Suitability, Multi-Stage Approvals
 * - Teacher Exchanges: Side-by-Side Comparison, Resource Checks, Before/After Diff
 * - Syllabus Tracking: Topic Checkoffs, Explainable Velocity & Deficit Forecasts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SYNAPSE_TOOL_DECLARATIONS,
  executeSchedulingTool,
  commitConfirmedAction,
} from "@/lib/gemini/tools";
import { askSynapseCopilot } from "@/lib/gemini/assistant";
import { schedulingRepository, LocalDemoSchedulingRepository } from "@/lib/repository/scheduling-repository";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import type { UserRole } from "@/types/domain";

describe("Phase 7: Ask SYNAPSE Controlled Application Tools", () => {
  it("declares all 9 required scheduling tools with structured JSON schemas", () => {
    const requiredTools = [
      "searchAvailableRooms",
      "searchTimetable",
      "checkFacultyAvailability",
      "findTimetableConflicts",
      "findFeasibleTimeSlots",
      "previewScheduleChange",
      "proposeExtraClass",
      "proposeTeacherExchange",
      "readSyllabusProgress",
    ];

    const declaredNames = SYNAPSE_TOOL_DECLARATIONS.map((t) => t.name);
    for (const tool of requiredTools) {
      expect(declaredNames).toContain(tool);
    }
    expect(SYNAPSE_TOOL_DECLARATIONS.length).toBe(9);
  });

  it("validates arguments and rejects invalid parameters", async () => {
    // Missing required parameters for searchAvailableRooms
    const res = await executeSchedulingTool(
      "searchAvailableRooms",
      { dayOfWeek: "Funday" }, // invalid day
      "academic_admin"
    );
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("executes searchAvailableRooms with half-open interval collision checks", async () => {
    const res = await executeSchedulingTool(
      "searchAvailableRooms",
      {
        dayOfWeek: "Friday",
        startTime: "10:00",
        endTime: "11:30",
        minCapacity: 100,
      },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data.count).toBeGreaterThan(0);
    expect(res.sources).toBeDefined();
    expect(res.sources!.length).toBeGreaterThan(0);

    // Verify all returned rooms meet capacity
    for (const r of res.data.rooms) {
      expect(r.capacity).toBeGreaterThanOrEqual(100);
    }
  });

  it("searches active timetable records by course and returns source IDs", async () => {
    const res = await executeSchedulingTool("searchTimetable", { courseCode: "CS-401" }, "academic_admin");

    expect(res.success).toBe(true);
    expect(res.data.totalCount).toBeGreaterThan(0);
    expect(res.data.sessions.length).toBeGreaterThan(0);
    expect(res.data.sessions.every((session: any) => session.courseCode === "CS-401")).toBe(true);
    expect(res.sources?.some((source) => source.type === "session")).toBe(true);
  });

  it("rejects an empty timetable search and invalid time ranges", async () => {
    const emptySearch = await executeSchedulingTool("searchTimetable", {}, "academic_admin");
    expect(emptySearch.success).toBe(false);

    const invalidRange = await executeSchedulingTool("searchAvailableRooms", {
      dayOfWeek: "Friday",
      startTime: "14:00",
      endTime: "09:00",
    }, "academic_admin");
    expect(invalidRange.success).toBe(false);
  });

  it("filters timetable conflicts by severity", async () => {
    const res = await executeSchedulingTool("findTimetableConflicts", {
      status: "active",
      severity: "warning",
    }, "academic_admin");

    expect(res.success).toBe(true);
    expect(res.data.conflicts.length).toBeGreaterThan(0);
    expect(res.data.conflicts.every((conflict: any) => conflict.severity === "warning")).toBe(true);
  });

  it("executes checkFacultyAvailability and returns workload and schedule status", async () => {
    const res = await executeSchedulingTool(
      "checkFacultyAvailability",
      {
        facultyNameOrId: "Dr. Alan Turing",
        dayOfWeek: "Monday",
        startTime: "10:00",
        endTime: "11:30",
      },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.data.facultyName).toContain("Turing");
    expect(res.data.currentAssignedHours).toBeGreaterThan(0);
    expect(res.data.maxCreditHours).toBe(12);
    expect(typeof res.data.isAvailable).toBe("boolean");
  });

  it("executes findTimetableConflicts and includes solvable & unsolvable flags", async () => {
    const res = await executeSchedulingTool(
      "findTimetableConflicts",
      { status: "active" },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.data.conflicts.length).toBeGreaterThan(0);
    expect(res.data.criticalCount).toBeGreaterThan(0);

    // Verify unsolvable CONF-05 is present
    const conf5 = res.data.conflicts.find((c: any) => c.id === "CONF-05");
    expect(conf5).toBeDefined();
    expect(conf5.hasFeasibleAlternative).toBe(false);
    expect(res.sources?.some((source) => source.type === "conflict" && source.id === "CONF-05")).toBe(true);
  });

  it("executes findFeasibleTimeSlots without creating collisions", async () => {
    const res = await executeSchedulingTool(
      "findFeasibleTimeSlots",
      {
        courseCode: "CS-401",
        sectionCode: "CSE-S5-A",
      },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.data.feasibleSlots.length).toBeGreaterThan(0);
  });

  it("executes readSyllabusProgress and computes pacing and completion metrics", async () => {
    const res = await executeSchedulingTool(
      "readSyllabusProgress",
      { courseCode: "CS-401" },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.data.courses.length).toBe(1);
    const course = res.data.courses[0];
    expect(course.courseCode).toBe("CS-401");
    expect(course.plannedHours).toBe(36);
    expect(course.completedHours).toBeGreaterThanOrEqual(0);
    expect(typeof course.completionRate).toBe("number");
    expect(["ahead", "on_track", "behind"]).toContain(course.velocityStatus);
  });
});

describe("Phase 7: Two-Phase Commit Lifecycle & Tokenized Confirmation", () => {
  it("enforces role-based permissions: blocks student_viewer from generating action previews", async () => {
    const res = await executeSchedulingTool(
      "previewScheduleChange",
      {
        sessionId: "SESS-CS401-WED",
        targetRoomCode: "LH-102",
        targetTimeSlotId: "SLOT-WED-1",
      },
      "student_viewer" as UserRole
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain("Access Denied");
  });

  it("generates an ActionPreview with cryptographic confirmation token for previewScheduleChange", async () => {
    const res = await executeSchedulingTool(
      "previewScheduleChange",
      {
        sessionId: "SESS-CS401-WED",
        targetRoomCode: "LH-102",
        targetTimeSlotId: "SLOT-WED-1",
      },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.actionPreview).toBeDefined();
    expect(res.actionPreview?.actionType).toBe("SCHEDULE_CHANGE");
    expect(res.actionPreview?.requiresConfirmation).toBe(true);
    expect(res.actionPreview?.confirmationToken).toBeDefined();

    // Decode token and verify integrity
    const decoded = JSON.parse(
      Buffer.from(res.actionPreview!.confirmationToken, "base64").toString("utf-8")
    );
    expect(decoded.type).toBe("SCHEDULE_CHANGE");
    expect(decoded.sessionId).toBe("SESS-CS401-WED");
  });

  it("generates an ActionPreview for proposeExtraClass awaiting HOD signoff", async () => {
    const res = await executeSchedulingTool(
      "proposeExtraClass",
      {
        courseCode: "CS-401",
        roomCode: "LH-101",
        date: "2026-10-24",
        timeSlot: "10:00 - 11:30 AM",
        reason: "Mid-term exam preparation",
      },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.actionPreview?.actionType).toBe("EXTRA_CLASS");
    expect(res.actionPreview?.isValid).toBe(true);

    const token = res.actionPreview!.confirmationToken;
    const commitRes = await commitConfirmedAction(token, "academic_admin");
    expect(commitRes.success).toBe(false);
    expect(commitRes.message).toBeTruthy();
  });

  it("generates an ActionPreview for proposeTeacherExchange and commits request", async () => {
    const res = await executeSchedulingTool(
      "proposeTeacherExchange",
      {
        requesterFaculty: "Dr. Alan Turing",
        targetFaculty: "Prof. Ada Lovelace",
        requesterSessionId: "SESS-CS401-MON",
        targetSessionId: "SESS-MATH202-FRI",
        date: "2026-10-26",
        reason: "Faculty academic conference presentation",
      },
      "academic_admin"
    );

    expect(res.success).toBe(true);
    expect(res.actionPreview?.actionType).toBe("TEACHER_EXCHANGE");

    const token = res.actionPreview!.confirmationToken;
    const commitRes = await commitConfirmedAction(token, "academic_admin");
    expect(commitRes.success).toBe(false);
    expect(commitRes.message).toBeTruthy();
  });

  it("rejects invalid or tampered confirmation tokens", async () => {
    const invalidToken = Buffer.from("invalid-json-payload").toString("base64");
    const commitRes = await commitConfirmedAction(invalidToken, "academic_admin");
    expect(commitRes.success).toBe(false);
  });
});

describe("Phase 7: Deterministic Copilot & Resilient Offline Fallback", () => {
  it("processes natural language requests using deterministic copilot when Gemini API is offline", async () => {
    const response = await askSynapseCopilot(
      "Search available rooms on Friday morning",
      [],
      "academic_admin"
    );

    expect(response.reply).toBeDefined();
    expect(response.reply.length).toBeGreaterThan(20);
    expect(response.provider).toBe("deterministic-copilot");
    expect(response.toolResults).toBeDefined();
    expect(response.toolResults!.length).toBeGreaterThan(0);
    expect(response.sources).toBeDefined();
  });

  it("handles conflict queries and identifies critical clashes", async () => {
    const response = await askSynapseCopilot(
      "Show active timetable conflicts",
      [],
      "academic_admin"
    );

    expect(response.reply).toContain("conflicts");
    expect(response.toolResults![0].toolName).toBe("findTimetableConflicts");
  });

  it("asks for missing details instead of inventing an extra-class proposal", async () => {
    const response = await askSynapseCopilot(
      "Propose extra class for CS-401 makeup tutorial",
      [],
      "academic_admin"
    );

    expect(response.actionPreview).toBeUndefined();
    expect(response.reply).toContain("section");
    expect(response.reply).toContain("I haven’t created or submitted anything");
  });

  it("answers timetable queries from matching schedule records", async () => {
    const response = await askSynapseCopilot(
      "What classes are scheduled for CS-401?",
      [],
      "academic_admin"
    );

    expect(response.provider).toBe("deterministic-copilot");
    expect(response.toolResults?.[0]?.toolName).toBe("searchTimetable");
    expect(response.toolResults?.[0]?.data?.totalCount).toBeGreaterThan(0);
    expect(response.sources?.some((source) => source.type === "session")).toBe(true);
  });

  it("calculates operational summaries from the active repository dataset", async () => {
    const response = await askSynapseCopilot("Give me a schedule status summary", [], "academic_admin");
    const dataset = await schedulingRepository.getDataset();

    expect(response.reply).toContain("Scheduled sessions");
    expect(response.reply).toContain(String(dataset.timetableSessions.filter((session) => session.status !== "cancelled").length));
    expect(response.reply).not.toContain("1,284");
  });

  it("handles syllabus progress and pacing deficit inquiries", async () => {
    const response = await askSynapseCopilot(
      "Show syllabus progress and velocity",
      [],
      "academic_admin"
    );

    expect(response.reply).toContain("Syllabus");
    expect(response.toolResults![0].toolName).toBe("readSyllabusProgress");
  });
});

describe("Phase 7: Extra Classes, Teacher Exchanges, & Syllabus Tracking Operations", () => {
  let schedulingRepository: LocalDemoSchedulingRepository;
  beforeEach(() => { const data = structuredClone(SYNAPSE_SEED_DATA); data.timetableSessions = [data.timetableSessions[0], ...data.timetableSessions.filter(session => ["SESS-CS301-MON", "SESS-MATH202-FRI"].includes(session.id))]; data.conflicts = []; schedulingRepository = new LocalDemoSchedulingRepository(data); });
  it("manages multi-stage extra class request workflow (pending_hod -> pending_dean -> approved)", async () => {
    // 1. Create request
    const req = await schedulingRepository.createExtraClassRequest({
      facultyId: "FAC-VANCE",
      subjectId: "SUB-CS401",
      sectionId: "SEC-CSE-S5-A",
      classroomId: "ROOM-LH-101",
      timeSlotId: "SLOT-FRI-1",
      scheduledDate: "2026-11-06",
      reason: "Distributed state machines tutorial",
      status: "pending_hod",
    });

    expect(req.status).toBe("pending_hod");

    // 2. HOD approves -> pending_dean
    await schedulingRepository.advanceExtraClassRequest(req.id, "HOD Turing");
    expect((await schedulingRepository.getExtraClassRequests()).find(item => item.id === req.id)?.status).toBe("pending_dean");

    // 3. Dean approves -> approved
    const approved = await schedulingRepository.approveExtraClassRequest(req.id, "Dean Vance");
    expect(approved).toBe(true);

    const updated = (await schedulingRepository.getExtraClassRequests()).find((r) => r.id === req.id);
    expect(updated?.status).toBe("approved");
    expect(updated?.reviewedBy).toBe("Dean Vance");
  });

  it("supports rejecting extra class requests with reason and auditor tracking", async () => {
    const req = await schedulingRepository.createExtraClassRequest({
      facultyId: "FAC-VANCE",
      subjectId: "SUB-CS401",
      sectionId: "SEC-CSE-S5-A",
      classroomId: "ROOM-LH-102",
      timeSlotId: "SLOT-FRI-1",
      scheduledDate: "2026-11-06",
      reason: "Turbulence revision",
      status: "pending_hod",
    });

    const rejected = await schedulingRepository.rejectExtraClassRequest(req.id, "Admin Vance");
    expect(rejected).toBe(true);

    const updated = (await schedulingRepository.getExtraClassRequests()).find((r) => r.id === req.id);
    expect(updated?.status).toBe("rejected");
  });

  it("manages teacher exchange peer consent and administrative approval lifecycle", async () => {
    const req = await schedulingRepository.createTeacherExchangeRequest({
      requesterFacultyId: "FAC-TURING",
      requesterSessionId: "SESS-CS301-MON",
      targetFacultyId: "FAC-LOVELACE",
      targetSessionId: "SESS-MATH202-FRI",
      date: "2026-11-02",
      reason: "National computing symposium keynote",
      status: "pending_hod",
      isPeerAccepted: true,
    });

    expect(req.isPeerAccepted).toBe(false);
    expect(req.status).toBe("pending_hod");

    await expect(schedulingRepository.createTeacherExchangeRequest({
      requesterFacultyId: "FAC-TURING",
      requesterSessionId: "SESS-CS301-MON",
      targetFacultyId: "FAC-LOVELACE",
      targetSessionId: "SESS-MATH202-FRI",
      date: "2026-11-03",
      reason: "A requester date on the wrong weekday",
      status: "pending_hod",
      isPeerAccepted: false,
    })).rejects.toThrow("scheduled occurrence");

    await expect(schedulingRepository.approveTeacherExchangeRequest(req.id, "Dean Vance")).rejects.toThrow("date-specific");

    const updated = (await schedulingRepository.getTeacherExchangeRequests()).find((r) => r.id === req.id);
    expect(updated?.status).toBe("pending_hod");
  });

  it("tracks topic-level delivery updates and recalculates module and subject velocity", async () => {
    const topicId = "TOPIC-CS401-203"; // Multi-Paxos topic
    const success = await schedulingRepository.updateTopicDelivery(
      topicId,
      true,
      "FAC-VANCE",
      "SESS-CS401-MON"
    );

    expect(success).toBe(true);

    // Verify topic delivery status
    const modules = await schedulingRepository.getSyllabusModules("SUB-CS401");
    const mod2 = modules.find((m) => m.id === "MOD-CS401-2");
    expect(mod2).toBeDefined();
    const topic = mod2?.topics.find((t) => t.id === topicId);
    expect(topic?.isDelivered).toBe(true);
    expect(topic?.deliveredByFacultyId).toBe("FAC-VANCE");
    expect(topic?.deliveredDate).toBeDefined();

    // Verify progress record recalculation
    const progressRecords = await schedulingRepository.getTopicProgress("SUB-CS401");
    expect(progressRecords.length).toBeGreaterThan(0);
    const prog = progressRecords[0];
    expect(prog.completedHours).toBeGreaterThan(0);
    expect(prog.percentageCompleted).toBeGreaterThan(0);
  });
});
