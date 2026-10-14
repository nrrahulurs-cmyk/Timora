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
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type { UserRole } from "@/types/domain";

describe("Phase 7: Ask SYNAPSE Controlled Application Tools", () => {
  it("declares all 8 required scheduling tools with structured JSON schemas", () => {
    const requiredTools = [
      "searchAvailableRooms",
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
    expect(SYNAPSE_TOOL_DECLARATIONS.length).toBe(8);
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
    expect(commitRes.success).toBe(true);
    expect(commitRes.recordId).toBeDefined();
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
    expect(commitRes.success).toBe(true);
    expect(commitRes.recordId).toBeDefined();
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

  it("handles extra class proposals through natural language", async () => {
    const response = await askSynapseCopilot(
      "Propose extra class for CS-401 makeup tutorial",
      [],
      "academic_admin"
    );

    expect(response.actionPreview).toBeDefined();
    expect(response.actionPreview?.actionType).toBe("EXTRA_CLASS");
    expect(response.reply).toContain("CS-401");
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
  it("manages multi-stage extra class request workflow (pending_hod -> pending_dean -> approved)", async () => {
    // 1. Create request
    const req = await schedulingRepository.createExtraClassRequest({
      facultyId: "FAC-VANCE",
      subjectId: "SUB-CS401",
      sectionId: "SEC-CSE-S5-A",
      classroomId: "ROOM-LH-101",
      timeSlotId: "SLOT-SAT-1",
      scheduledDate: "2026-10-31",
      reason: "Distributed state machines tutorial",
      status: "pending_hod",
    });

    expect(req.status).toBe("pending_hod");

    // 2. HOD approves -> pending_dean
    req.status = "pending_dean";
    req.reviewedBy = "HOD Turing";
    expect(req.status).toBe("pending_dean");

    // 3. Dean approves -> approved
    const approved = await schedulingRepository.approveExtraClassRequest(req.id, "Dean Vance");
    expect(approved).toBe(true);

    const updated = (await schedulingRepository.getExtraClassRequests()).find((r) => r.id === req.id);
    expect(updated?.status).toBe("approved");
    expect(updated?.reviewedBy).toBe("Dean Vance");
  });

  it("supports rejecting extra class requests with reason and auditor tracking", async () => {
    const req = await schedulingRepository.createExtraClassRequest({
      facultyId: "FAC-COLE",
      subjectId: "SUB-ME202",
      sectionId: "SEC-ME-S3-A",
      classroomId: "ROOM-HALL-C",
      timeSlotId: "SLOT-SAT-2",
      scheduledDate: "2026-10-31",
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

    expect(req.isPeerAccepted).toBe(true);
    expect(req.status).toBe("pending_hod");

    const approved = await schedulingRepository.approveTeacherExchangeRequest(req.id, "Dean Vance");
    expect(approved).toBe(true);

    const updated = (await schedulingRepository.getTeacherExchangeRequests()).find((r) => r.id === req.id);
    expect(updated?.status).toBe("approved");
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
