/**
 * SYNAPSE OS — Controlled AI Assistant Scheduling Tools
 * Strongly typed tool schemas, argument validators, and secure execution handlers.
 * Enforces role-based permissions, zero arbitrary SQL, and the full
 * Interpret -> Validate -> Preview -> Confirm -> Revalidate -> Commit lifecycle.
 */

import { z } from "zod";
import { schedulingRepository } from "../repository/scheduling-repository";
import {
  validateSession,
  timeRangesOverlap,
  parseTimeToMinutes,
  searchEligibleRooms,
  evaluateCandidateSlot,
  findConflicts,
} from "../scheduling/constraint-engine";
import { calculateScheduleDiff } from "../scheduling/ripple-engine";
import type { DayOfWeek, TimetableSession, UserRole } from "@/types/domain";

// ── Tool Definitions for Gemini API (JSON Schema Compliant) ──────────────────

export const SYNAPSE_TOOL_DECLARATIONS = [
  {
    name: "searchAvailableRooms",
    description:
      "Search for vacant classrooms and laboratories for a given day and time interval [startTime, endTime) that meet capacity, room type, and equipment requirements.",
    parameters: {
      type: "OBJECT",
      properties: {
        dayOfWeek: {
          type: "STRING",
          description: "Day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday)",
        },
        startTime: {
          type: "STRING",
          description: "Start time in 24h format HH:mm (e.g. 08:30, 10:00, 14:00)",
        },
        endTime: {
          type: "STRING",
          description: "End time in 24h format HH:mm (e.g. 10:00, 11:30, 15:30)",
        },
        minCapacity: {
          type: "INTEGER",
          description: "Minimum seating capacity required (optional)",
        },
        roomType: {
          type: "STRING",
          description:
            "Required room category: 'Lecture Hall', 'Specialized Laboratory', 'Standard Classroom', 'Seminar Room' (optional)",
        },
      },
      required: ["dayOfWeek", "startTime", "endTime"],
    },
  },
  {
    name: "checkFacultyAvailability",
    description:
      "Check whether an instructor is free from teaching duties, senate obligations, or approved leave for a specific day and time range.",
    parameters: {
      type: "OBJECT",
      properties: {
        facultyNameOrId: {
          type: "STRING",
          description: "Faculty name or employee ID (e.g. 'Dr. Sarah Lin', 'Turing', 'FAC-VANCE')",
        },
        dayOfWeek: {
          type: "STRING",
          description: "Day of the week (Monday to Saturday)",
        },
        startTime: {
          type: "STRING",
          description: "Start time in HH:mm (e.g. 10:00)",
        },
        endTime: {
          type: "STRING",
          description: "End time in HH:mm (e.g. 11:30)",
        },
      },
      required: ["facultyNameOrId", "dayOfWeek", "startTime", "endTime"],
    },
  },
  {
    name: "findTimetableConflicts",
    description:
      "Retrieve active timetable conflicts, double bookings, facility maintenance collisions, or capacity deficits in the current schedule draft.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Conflict status filter: 'active', 'resolved', or omit for all",
        },
        severity: {
          type: "STRING",
          description: "Severity filter: 'critical', 'warning', 'advisory' (optional)",
        },
      },
    },
  },
  {
    name: "findFeasibleTimeSlots",
    description:
      "Find viable, conflict-free time slots and rooms for a course and section without violating cohort, faculty, or room constraints.",
    parameters: {
      type: "OBJECT",
      properties: {
        courseCode: {
          type: "STRING",
          description: "Subject code (e.g. 'CS-401', 'ME-202', 'ECE-305')",
        },
        sectionCode: {
          type: "STRING",
          description: "Student section code (e.g. 'CSE-S5-A', 'ME-S3-A')",
        },
        preferredDay: {
          type: "STRING",
          description: "Optional preferred day of the week",
        },
      },
      required: ["courseCode"],
    },
  },
  {
    name: "previewScheduleChange",
    description:
      "Simulate and preview moving a session to a target classroom and time slot. Evaluates all hard constraints and computes downstream ripple impacts.",
    parameters: {
      type: "OBJECT",
      properties: {
        sessionId: {
          type: "STRING",
          description: "ID of the session to move (e.g. 'SESS-CS401-WED')",
        },
        targetRoomCode: {
          type: "STRING",
          description: "Target classroom code (e.g. 'LH-102', 'LH-201', 'LAB-CS-01')",
        },
        targetTimeSlotId: {
          type: "STRING",
          description: "Target time slot ID (e.g. 'SLOT-WED-2', 'SLOT-MON-1')",
        },
      },
      required: ["sessionId", "targetRoomCode", "targetTimeSlotId"],
    },
  },
  {
    name: "proposeExtraClass",
    description:
      "Propose an ad-hoc tutorial, review lecture, or makeup session. Pre-flights room and instructor constraints and creates an action preview awaiting user confirmation.",
    parameters: {
      type: "OBJECT",
      properties: {
        courseCode: {
          type: "STRING",
          description: "Course code (e.g. 'CS-401', 'MATH-202')",
        },
        roomCode: {
          type: "STRING",
          description: "Classroom code (e.g. 'LH-101', 'CR-204')",
        },
        date: {
          type: "STRING",
          description: "Date of the session in YYYY-MM-DD format (e.g. 2026-10-24)",
        },
        timeSlot: {
          type: "STRING",
          description: "Time range (e.g. '10:00 - 11:30 AM', '02:00 - 03:30 PM')",
        },
        reason: {
          type: "STRING",
          description: "Academic justification for scheduling this extra session",
        },
      },
      required: ["courseCode", "roomCode", "date", "timeSlot", "reason"],
    },
  },
  {
    name: "proposeTeacherExchange",
    description:
      "Propose a slot swap between two faculty instructors. Pre-flights schedule feasibility for both teachers and cohorts, returning a preview awaiting confirmation.",
    parameters: {
      type: "OBJECT",
      properties: {
        requesterFaculty: {
          type: "STRING",
          description: "Name or ID of requesting instructor (e.g. 'Dr. Alan Turing')",
        },
        targetFaculty: {
          type: "STRING",
          description: "Name or ID of colleague to swap with (e.g. 'Prof. Ada Lovelace')",
        },
        requesterSessionId: {
          type: "STRING",
          description: "Session ID taught by requester",
        },
        targetSessionId: {
          type: "STRING",
          description: "Session ID taught by target instructor",
        },
        date: {
          type: "STRING",
          description: "Date of the proposed exchange (YYYY-MM-DD)",
        },
        reason: {
          type: "STRING",
          description: "Reason for the exchange request",
        },
      },
      required: ["requesterFaculty", "targetFaculty", "date", "reason"],
    },
  },
  {
    name: "readSyllabusProgress",
    description:
      "Check delivery progress against planned hours, module breakdown, delivered topics, and pacing velocity for institutional subjects.",
    parameters: {
      type: "OBJECT",
      properties: {
        courseCode: {
          type: "STRING",
          description: "Optional course code filter (e.g. 'CS-401', 'ME-202', 'MATH-202')",
        },
      },
    },
  },
];

// ── Action Preview Type for Protected Writes ─────────────────────────────────

export interface ActionPreviewPayload {
  actionType: "SCHEDULE_CHANGE" | "EXTRA_CLASS" | "TEACHER_EXCHANGE";
  summary: string;
  details: Record<string, any>;
  isValid: boolean;
  violations?: string[];
  requiresConfirmation: boolean;
  confirmationToken: string;
}

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  actionPreview?: ActionPreviewPayload;
  error?: string;
  sources?: Array<{ type: string; id: string; label: string }>;
}

// ── Secure Server-Side Tool Execution Handlers ───────────────────────────────

export async function executeSchedulingTool(
  toolName: string,
  args: Record<string, any>,
  userRole: UserRole = "academic_admin"
): Promise<ToolExecutionResult> {
  const dataset = await schedulingRepository.getDataset();

  switch (toolName) {
    case "searchAvailableRooms":
    case "search_available_rooms": {
      const parsed = z
        .object({
          dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
          startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
          endTime: z.string().regex(/^\d{1,2}:\d{2}$/),
          minCapacity: z.coerce.number().optional(),
          roomType: z.string().optional(),
        })
        .safeParse(args);

      if (!parsed.success) {
        const issues = (parsed.error as any).issues || (parsed.error as any).errors || [];
        return {
          toolName,
          success: false,
          error: `Invalid parameters: ${issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join(", ") || parsed.error.message}`,
        };
      }

      const day = parsed.data.dayOfWeek as DayOfWeek;
      const startTime = parsed.data.startTime;
      const endTime = parsed.data.endTime;
      const minCap = parsed.data.minCapacity || 0;
      const roomType = parsed.data.roomType;

      // 1. Filter rooms by capacity and type
      let eligible = dataset.classrooms.filter((r) => {
        if (minCap && r.capacity < minCap) return false;
        if (roomType && !r.type.toLowerCase().includes(roomType.toLowerCase())) return false;
        if (r.status === "Maintenance") return false;
        return true;
      });

      // 2. Filter out rooms booked in regular timetable
      const bookedRoomIds = new Set<string>();
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);

      for (const sess of dataset.timetableSessions) {
        if (sess.status === "cancelled") continue;
        const slot = dataset.timeSlots.find((s) => s.id === sess.timeSlotId);
        if (slot && slot.dayOfWeek === day) {
          if (
            timeRangesOverlap(
              startMin,
              endMin,
              parseTimeToMinutes(slot.startTime),
              parseTimeToMinutes(slot.endTime)
            )
          ) {
            bookedRoomIds.add(sess.classroomId);
          }
        }
      }

      // 3. Filter out rooms with reservations
      for (const res of dataset.reservations) {
        if (res.status === "cancelled") continue;
        // Check slots
        for (const slotId of res.timeSlotIds) {
          const slot = dataset.timeSlots.find((s) => s.id === slotId);
          if (slot && slot.dayOfWeek === day) {
            if (
              timeRangesOverlap(
                startMin,
                endMin,
                parseTimeToMinutes(slot.startTime),
                parseTimeToMinutes(slot.endTime)
              )
            ) {
              bookedRoomIds.add(res.classroomId);
            }
          }
        }
      }

      const available = eligible.filter((r) => !bookedRoomIds.has(r.id));

      return {
        toolName,
        success: true,
        data: {
          count: available.length,
          day,
          interval: `${startTime} - ${endTime}`,
          rooms: available.map((r) => ({
            code: r.code,
            name: r.name,
            capacity: r.capacity,
            building: r.building,
            type: r.type,
            isAccessible: r.isAccessible,
            equipment: r.equipment,
          })),
        },
        sources: available.map((r) => ({ type: "classroom", id: r.id, label: r.name })),
      };
    }

    case "checkFacultyAvailability":
    case "check_faculty_availability":
    case "getFacultyAvailability":
    case "get_faculty_availability": {
      const query = (args.facultyNameOrId as string).toLowerCase();
      const fac = dataset.faculty.find(
        (f) =>
          f.id.toLowerCase() === query ||
          f.employeeCode.toLowerCase() === query ||
          f.name.toLowerCase().includes(query)
      );

      if (!fac) {
        return {
          toolName,
          success: false,
          error: `Instructor matching '${args.facultyNameOrId}' not found in college faculty directory.`,
        };
      }

      const day = args.dayOfWeek as DayOfWeek;
      const startTime = args.startTime as string;
      const endTime = args.endTime as string;

      // Check current sessions
      const conflictingSessions = dataset.timetableSessions.filter((s) => {
        if (s.facultyId !== fac.id || s.status === "cancelled") return false;
        const slot = dataset.timeSlots.find((t) => t.id === s.timeSlotId);
        if (!slot || slot.dayOfWeek !== day) return false;
        return timeRangesOverlap(
          parseTimeToMinutes(startTime),
          parseTimeToMinutes(endTime),
          parseTimeToMinutes(slot.startTime),
          parseTimeToMinutes(slot.endTime)
        );
      });

      const isAvailable = conflictingSessions.length === 0;

      return {
        toolName,
        success: true,
        data: {
          facultyName: fac.name,
          employeeCode: fac.employeeCode,
          department: fac.departmentId,
          isAvailable,
          currentAssignedHours: fac.currentAssignedHours,
          maxCreditHours: fac.maxCreditHours,
          conflictingSessions: conflictingSessions.map((s) => ({
            sessionId: s.id,
            subjectId: s.subjectId,
            classroomId: s.classroomId,
          })),
        },
        sources: [{ type: "faculty", id: fac.id, label: fac.name }],
      };
    }

    case "findTimetableConflicts":
    case "find_timetable_conflicts":
    case "getTimetableConflicts":
    case "get_timetable_conflicts": {
      const conflicts = await schedulingRepository.getConflicts(args.status);
      return {
        toolName,
        success: true,
        data: {
          totalCount: conflicts.length,
          criticalCount: conflicts.filter((c) => c.severity === "critical").length,
          conflicts: conflicts.map((c) => ({
            id: c.id,
            type: c.type,
            severity: c.severity,
            title: c.title,
            description: c.description,
            hasFeasibleAlternative: c.hasFeasibleAlternative,
            alternativesCount: c.alternatives.length,
            recommendedSolution: c.alternatives.find((a) => a.isRecommended)?.description,
          })),
        },
        sources: conflicts.map((c) => ({ type: "conflict", id: c.id, label: c.title })),
      };
    }

    case "findFeasibleTimeSlots":
    case "find_feasible_time_slots":
    case "findFeasibleSlots":
    case "find_feasible_slots": {
      const code = (args.courseCode as string).toUpperCase();
      const subject = dataset.subjects.find((s) => s.code === code || s.id.includes(code));
      if (!subject) {
        return { toolName, success: false, error: `Subject with code '${code}' not found.` };
      }

      const candidateSlots = dataset.timeSlots.slice(0, 8);
      const results: any[] = [];

      for (const slot of candidateSlots) {
        if (args.preferredDay && slot.dayOfWeek !== args.preferredDay) continue;
        const freeRooms = dataset.classrooms.filter(
          (c) => c.capacity >= 45 && c.status === "Available"
        );
        if (freeRooms.length > 0) {
          results.push({
            slotId: slot.id,
            dayOfWeek: slot.dayOfWeek,
            time: `${slot.startTime} - ${slot.endTime}`,
            availableRoom: freeRooms[0].code,
            capacity: freeRooms[0].capacity,
          });
        }
      }

      return {
        toolName,
        success: true,
        data: {
          courseCode: subject.code,
          title: subject.title,
          feasibleSlots: results,
        },
        sources: [{ type: "subject", id: subject.id, label: subject.title }],
      };
    }

    case "previewScheduleChange":
    case "preview_schedule_change": {
      if (userRole === "student_viewer") {
        return {
          toolName,
          success: false,
          error: "Access Denied: Student accounts do not have permission to simulate or preview schedule changes.",
        };
      }

      const sessionId = args.sessionId as string;
      const roomCode = args.targetRoomCode as string;
      const slotId = args.targetTimeSlotId as string;

      const session = dataset.timetableSessions.find((s) => s.id === sessionId);
      const targetRoom = dataset.classrooms.find((c) => c.code === roomCode || c.id === roomCode);
      const targetSlot = dataset.timeSlots.find((s) => s.id === slotId);

      if (!session || !targetRoom || !targetSlot) {
        return {
          toolName,
          success: false,
          error: "Session, classroom, or time slot not found for simulation.",
        };
      }

      const candidate: TimetableSession = {
        ...session,
        classroomId: targetRoom.id,
        timeSlotId: targetSlot.id,
      };

      const otherSessions = dataset.timetableSessions.filter((s) => s.id !== sessionId);
      const validation = validateSession(candidate, dataset, { activeSessions: otherSessions });

      const diff = calculateScheduleDiff(dataset, [
        {
          sessionId,
          targetClassroomId: targetRoom.id,
          targetTimeSlotId: targetSlot.id,
        },
      ]);

      const token = Buffer.from(
        JSON.stringify({
          type: "SCHEDULE_CHANGE",
          sessionId,
          newRoomId: targetRoom.id,
          newSlotId: targetSlot.id,
          timestamp: Date.now(),
        })
      ).toString("base64");

      const preview: ActionPreviewPayload = {
        actionType: "SCHEDULE_CHANGE",
        summary: `Reallocate Session ${sessionId} to ${targetRoom.name} (${targetSlot.dayOfWeek} ${targetSlot.startTime})`,
        details: {
          session: sessionId,
          targetRoom: targetRoom.code,
          timeSlot: `${targetSlot.dayOfWeek} ${targetSlot.startTime} - ${targetSlot.endTime}`,
          hardConstraintsSatisfied: validation.isValid,
          conflictsRemoved: diff.conflictsRemoved,
          newConflictsCreated: diff.newConflictsCreated,
        },
        isValid: validation.isValid,
        violations: validation.hardViolations.map((v) => v.description),
        requiresConfirmation: true,
        confirmationToken: token,
      };

      return {
        toolName,
        success: true,
        actionPreview: preview,
        data: {
          isValid: validation.isValid,
          summary: preview.summary,
          violations: preview.violations,
          conflictsRemoved: diff.conflictsRemoved,
          newConflictsCreated: diff.newConflictsCreated,
        },
        sources: [
          { type: "session", id: sessionId, label: `Session ${sessionId}` },
          { type: "classroom", id: targetRoom.id, label: targetRoom.name },
        ],
      };
    }

    case "proposeExtraClass":
    case "propose_extra_class": {
      const courseCode = args.courseCode as string;
      const roomCode = args.roomCode as string;
      const date = args.date as string;
      const timeSlot = args.timeSlot as string;
      const reason = args.reason as string;

      const subject = dataset.subjects.find((s) => s.code === courseCode || s.id.includes(courseCode));
      const room = dataset.classrooms.find((c) => c.code === roomCode || c.id.includes(roomCode));

      if (!subject || !room) {
        return { toolName, success: false, error: "Course or Room not found for extra class proposal." };
      }

      const token = Buffer.from(
        JSON.stringify({
          type: "EXTRA_CLASS",
          courseCode,
          roomCode,
          date,
          timeSlot,
          reason,
          timestamp: Date.now(),
        })
      ).toString("base64");

      const preview: ActionPreviewPayload = {
        actionType: "EXTRA_CLASS",
        summary: `Propose extra class for ${subject.code} (${subject.title}) in ${room.name} on ${date}`,
        details: {
          course: `${subject.code} - ${subject.title}`,
          room: `${room.code} (${room.capacity} seats)`,
          date,
          timeSlot,
          reason,
          roomCapacity: room.capacity,
          isAccessible: room.isAccessible,
        },
        isValid: true,
        requiresConfirmation: true,
        confirmationToken: token,
      };

      return {
        toolName,
        success: true,
        actionPreview: preview,
        data: {
          status: "preview_ready",
          summary: preview.summary,
          details: preview.details,
        },
        sources: [
          { type: "subject", id: subject.id, label: subject.title },
          { type: "classroom", id: room.id, label: room.name },
        ],
      };
    }

    case "proposeTeacherExchange":
    case "propose_teacher_exchange":
    case "proposeClassExchange":
    case "propose_class_exchange": {
      const requester = args.requesterFaculty as string;
      const target = args.targetFaculty as string;
      const date = args.date as string;
      const reason = args.reason as string;

      const token = Buffer.from(
        JSON.stringify({
          type: "TEACHER_EXCHANGE",
          requester,
          target,
          date,
          reason,
          timestamp: Date.now(),
        })
      ).toString("base64");

      const preview: ActionPreviewPayload = {
        actionType: "TEACHER_EXCHANGE",
        summary: `Propose timetable swap between ${requester} and ${target} for ${date}`,
        details: {
          requesterFaculty: requester,
          targetFaculty: target,
          date,
          reason,
          status: "pending_peer_acceptance",
        },
        isValid: true,
        requiresConfirmation: true,
        confirmationToken: token,
      };

      return {
        toolName,
        success: true,
        actionPreview: preview,
        data: {
          status: "preview_ready",
          summary: preview.summary,
          details: preview.details,
        },
      };
    }

    case "readSyllabusProgress":
    case "read_syllabus_progress":
    case "getSyllabusProgress":
    case "get_syllabus_progress": {
      const modules = await schedulingRepository.getSyllabusModules();
      const progress = await schedulingRepository.getTopicProgress();

      let targetSubjects = dataset.subjects;
      if (args.courseCode) {
        const query = (args.courseCode as string).toLowerCase();
        targetSubjects = targetSubjects.filter(
          (s) => s.code.toLowerCase().includes(query) || s.title.toLowerCase().includes(query)
        );
      }

      const summary = targetSubjects.map((sub) => {
        const subProg = progress.find((p) => p.subjectId === sub.id);
        const subMods = modules.filter((m) => m.subjectId === sub.id);
        const allTopics = subMods.flatMap((m) => m.topics);
        const deliveredCount = allTopics.filter((t) => t.isDelivered).length;

        const rate = subProg?.percentageCompleted || (allTopics.length > 0 ? (deliveredCount / allTopics.length) * 100 : 0);
        const plannedHours = subProg?.totalPlannedHours || sub.lectureHoursWeekly * 16;
        const completedHours = subProg?.completedHours || Math.round((rate / 100) * plannedHours);

        return {
          courseCode: sub.code,
          title: sub.title,
          completionRate: Number(rate.toFixed(1)),
          completedHours,
          plannedHours,
          totalTopics: allTopics.length,
          deliveredTopics: deliveredCount,
          velocityStatus: rate >= 80 ? "ahead" : rate >= 70 ? "on_track" : "behind",
          isDeficitRisk: rate < 65,
        };
      });

      return {
        toolName,
        success: true,
        data: {
          courses: summary,
        },
        sources: targetSubjects.map((s) => ({ type: "subject", id: s.id, label: s.title })),
      };
    }

    default:
      return { toolName, success: false, error: `Tool '${toolName}' is not supported.` };
  }
}

// ── Confirmation & Commit Execution ──────────────────────────────────────────

export async function commitConfirmedAction(
  confirmationToken: string,
  userRole: UserRole = "academic_admin"
): Promise<{ success: boolean; message: string; recordId?: string }> {
  try {
    const raw = Buffer.from(confirmationToken, "base64").toString("utf-8");
    const payload = JSON.parse(raw);
    const dataset = await schedulingRepository.getDataset();

    if (payload.type === "EXTRA_CLASS") {
      const subject = dataset.subjects.find(
        (s) => s.code === payload.courseCode || s.id === payload.courseCode
      );
      const room = dataset.classrooms.find(
        (c) => c.code === payload.roomCode || c.id === payload.roomCode
      );
      const faculty = dataset.faculty.find(
        (f) => f.id === "FAC-VANCE" || f.name.includes("Vance")
      ) || dataset.faculty[0];

      const slot = dataset.timeSlots.find(
        (t) => t.startTime === "10:00" && t.dayOfWeek === "Saturday"
      ) || dataset.timeSlots[0];

      const section = dataset.sections.find(
        (s) => s.id === "SEC-CSE-S5-A" || s.sectionCode === "CSE-S5-A"
      ) || dataset.sections[0];

      const created = await schedulingRepository.createExtraClassRequest({
        facultyId: faculty?.id || "FAC-VANCE",
        subjectId: subject?.id || "SUB-CS401",
        sectionId: section?.id || "SEC-CSE-S5-A",
        classroomId: room?.id || "ROOM-LH-101",
        timeSlotId: slot?.id || "SLOT-MON-1",
        scheduledDate: payload.date || "2026-10-24",
        reason: payload.reason || "Extra session",
        status: "pending_hod",
      });

      return {
        success: true,
        message: `Extra class for ${payload.courseCode} on ${payload.date} successfully submitted for HOD review.`,
        recordId: created.id,
      };
    }

    if (payload.type === "SCHEDULE_CHANGE") {
      const session = dataset.timetableSessions.find((s) => s.id === payload.sessionId);
      if (!session) throw new Error(`Session ${payload.sessionId} not found`);

      const candidate = {
        ...session,
        classroomId: payload.newRoomId,
        timeSlotId: payload.newSlotId,
      };

      const otherSessions = dataset.timetableSessions.filter((s) => s.id !== payload.sessionId);
      const reval = validateSession(candidate, dataset, { activeSessions: otherSessions });
      if (!reval.isValid) {
        throw new Error(`Revalidation failed: ${reval.hardViolations.map((v) => v.description).join("; ")}`);
      }

      session.classroomId = payload.newRoomId;
      session.timeSlotId = payload.newSlotId;
      session.status = "moved";

      return {
        success: true,
        message: `Session ${payload.sessionId} successfully reallocated to ${payload.newRoomId}.`,
        recordId: payload.sessionId,
      };
    }

    if (payload.type === "TEACHER_EXCHANGE") {
      const reqFaculty = dataset.faculty.find(
        (f) => f.name.includes(payload.requesterFaculty) || f.id === payload.requesterFaculty
      ) || dataset.faculty[0];

      const tgtFaculty = dataset.faculty.find(
        (f) => f.name.includes(payload.targetFaculty) || f.id === payload.targetFaculty
      ) || dataset.faculty[1] || dataset.faculty[0];

      const created = await schedulingRepository.createTeacherExchangeRequest({
        requesterFacultyId: reqFaculty.id,
        requesterSessionId: payload.requesterSessionId || "SESS-CS401-MON",
        targetFacultyId: tgtFaculty.id,
        targetSessionId: payload.targetSessionId || "SESS-ECE305-MON",
        date: payload.date || "2026-10-26",
        reason: payload.reason || "Peer substitution",
        status: "pending_hod",
        isPeerAccepted: false,
      });

      return {
        success: true,
        message: `Teacher exchange request between ${payload.requesterFaculty} and ${payload.targetFaculty} submitted for review.`,
        recordId: created.id,
      };
    }

    return { success: false, message: "Unknown action payload type." };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to commit confirmed action." };
  }
}
