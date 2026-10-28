/**
 * TIMORA ACADEMIC OS — Server-Only Ask Timora Copilot Assistant
 * Deterministic, repository-bound fallback for the authenticated Copilot service.
 */

import {
  executeSchedulingTool as executeRepositoryTool,
  commitConfirmedAction,
  type ToolExecutionResult,
  type ActionPreviewPayload,
} from "./tools";
import type { DayOfWeek, UserRole } from "@/types/domain";
import { schedulingRepository, type SchedulingRepository } from "@/lib/repository/scheduling-repository";
import { calculateScheduleAnalytics } from "@/lib/analytics/metrics";

export interface AssistantResponse {
  reply: string;
  download?: { filename: string; mimeType: "text/csv;charset=utf-8"; content: string; label: string };
  toolResults?: ToolExecutionResult[];
  actionPreview?: ActionPreviewPayload;
  sources?: Array<{ type: string; id: string; label: string }>;
  provider: "groq-ai" | "gemini-api" | "openrouter-ai" | "local-ai" | "deterministic-copilot";
}

/**
 * Intelligent deterministic semantic tool classifier for offline / fallback execution.
 * Invokes the exact same validated application tools and constraint engine.
 */
const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function findWeekday(message: string): DayOfWeek | undefined {
  const lower = message.toLowerCase();
  return WEEKDAYS.find((day) => new RegExp("\\b" + day.toLowerCase() + "\\b").test(lower));
}

function findCourseCode(message: string): string | undefined {
  const match = message.match(/\b([a-z]{2,6})[- ](\d{2,4}[a-z]?)\b/i);
  return match ? (match[1] + "-" + match[2]).toUpperCase() : undefined;
}

function findTimeRange(message: string): { startTime: string; endTime: string } | undefined {
  const match = message.match(/\b(\d{1,2}:\d{2})\s*(?:-|to)\s*(\d{1,2}:\d{2})\b/i);
  if (!match) return undefined;
  const parse = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : NaN;
  };
  return parse(match[1]) < parse(match[2])
    ? { startTime: match[1].padStart(5, "0"), endTime: match[2].padStart(5, "0") }
    : undefined;
}

function operationalQuery(message: string): boolean {
  return /\b(class(?:es)?|session(?:s)?|timetable|schedule|rooms?|faculty|instructor|workload|conflict|clash|availability|available|feasible|slot|syllabus|course|section|reservation|makeup|swap|exchange)\b/i.test(message);
}

/**
 * Read-only, data-grounded fallback for Timora operations. Incomplete proposals ask
 * for the missing record details instead of manufacturing an action preview.
 */
export async function fallbackSemanticClassifier(
  message: string,
  userRole: UserRole,
  repository: SchedulingRepository = schedulingRepository
): Promise<AssistantResponse> {
  const lower = message.toLowerCase();
  const dataset = await repository.getDataset();
  const executeSchedulingTool = (name: string, args: Record<string, unknown>, role: UserRole) => executeRepositoryTool(name, args, role, repository);
  const sources: Array<{ type: string; id: string; label: string }> = [];
  const toolResults: ToolExecutionResult[] = [];
  let reply: string;

  if (/\b(propose|create|book|schedule|request)\b/i.test(message) && /\b(extra|makeup|tutorial)\b/i.test(message)) {
    reply = "I can help prepare an extra-class request, but I need the exact course, section, assigned instructor, date, time slot, room, and reason before I can validate it. I haven’t created or submitted anything.";
  } else if (/\b(propose|create|request|swap)\b/i.test(message) && /\b(exchange|swap|trade)\b/i.test(message)) {
    reply = "I can help prepare a faculty exchange request. Please provide both session IDs, the requested date, and the reason. I haven’t created or submitted anything.";
  } else if (lower.includes("conflict") || lower.includes("clash") || lower.includes("double book")) {
    const severity = lower.includes("critical") ? "critical" : lower.includes("warning") ? "warning" : undefined;
    const res = await executeSchedulingTool("findTimetableConflicts", { status: "active", severity }, userRole);
    toolResults.push(res);
    if (res.sources) sources.push(...res.sources);
    const conflicts = res.data?.conflicts || [];
    const critical = conflicts.filter((conflict: any) => conflict.severity === "critical").length;
    
    if (!conflicts.length) {
      reply = "No active conflicts match that filter in the current schedule dataset.";
    } else {
      const conflictBreakdown = conflicts.map((conflict: any, index: number) => {
        const sol = conflict.recommendedSolution 
          ? `\n  - **Resolution Plan:** ${conflict.recommendedSolution}`
          : conflict.hasFeasibleAlternative
            ? "\n  - **Resolution Plan:** Feasible alternative venues are available in the Conflict Center."
            : "\n  - **Resolution Plan:** No feasible alternative is recorded. Review this conflict manually.";
        return `${index + 1}. **${conflict.id}: ${conflict.title}** (${conflict.severity.toUpperCase()})\n  - **Root Cause:** ${conflict.description}${sol}`;
      }).join("\n\n");

      reply = `The current dataset has **${conflicts.length} active ${severity || ""} conflict${conflicts.length === 1 ? "" : "s"}** (${critical} critical).\n\n### Conflict Diagnostics & Remediation\n\n${conflictBreakdown}\n\n💡 **Next Step:** You can ask me to evaluate alternative rooms or move any conflicting session directly.`;
    }
  } else if (/\b(summary|overview|status|report|how many classes|schedule health|bottlenecks?|risks?|recommendations?|improve|optimize|optimization|briefing|executive)\b/i.test(message)) {
    const analytics = calculateScheduleAnalytics(dataset, new Date());
    const pending = dataset.extraClassRequests.filter((request) => request.status === "pending_hod" || request.status === "pending_dean").length
      + dataset.teacherExchangeRequests.filter((request) => request.status === "pending_hod" || request.status === "pending_dean").length;
    const activeConflicts = dataset.conflicts.filter((conflict) => conflict.status === "active");
    const critical = activeConflicts.filter((c) => c.severity === "critical").length;
    sources.push(...activeConflicts.slice(0, 10).map((conflict) => ({ type: "conflict", id: conflict.id, label: conflict.title })));

    // Congestion analysis
    const peakBand = analytics.peakTimeBand?.label || "unavailable";
    const peakRate = analytics.peakTimeBand?.rate ?? 0;
    
    // Workload alerts
    const overloaded = analytics.facultyWorkload.filter((f) => f.isNearCeiling || f.loadPercentage >= 85);
    const availableFaculty = analytics.facultyWorkload.filter((f) => f.loadPercentage < 60);

    reply = `### Current schedule snapshot\n\n- **Scheduled sessions:** ${analytics.activeSessions}`
      + `\n- **Active conflicts:** ${analytics.activeConflicts} (${critical} critical)`
      + `\n- **Rooms marked available:** ${dataset.classrooms.filter((room) => room.status === "Available").length} of ${dataset.classrooms.length}`
      + `\n- **Weekly room-hour utilisation:** ${analytics.roomUtilizationRate}%`
      + `\n- **Pending requests:** ${pending}`
      + `\n\nThese values are calculated from the current repository dataset; room availability here reflects the room status field, not a date-and-time search.`
      + `\n\nPeak room usage is **${peakBand}** (${peakRate}%). ${critical ? `${critical} critical conflicts need review.` : "No critical conflicts are recorded."} ${overloaded.length ? `${overloaded.map(f => f.fullName).join(", ")} are near their configured workload limits.` : "No faculty are near their configured workload limits."} ${availableFaculty.length ? `${availableFaculty.length} faculty have less than 60% of their configured load assigned.` : ""}`;
  } else if (/\b(rooms?|facilities|classrooms?|halls?|labs?)\b/i.test(message) && /\b(free|available|vacant|search|find)\b/i.test(message)) {
    const day = findWeekday(message);
    const interval = findTimeRange(message);
    const period = lower.includes("morning") ? "morning" : lower.includes("afternoon") ? "afternoon" : undefined;
    const capacityMatch = lower.match(/\b(?:for|at least|minimum(?: of)?)\s+(\d+)\s*(?:students|people|seats)?\b/);
    const roomType = lower.includes("lecture hall") ? "Lecture Hall" : /\blab(?:oratory)?\b/.test(lower) ? "Laboratory" : lower.includes("seminar") ? "Seminar Room" : undefined;

    if (!day) {
      reply = "Which weekday should I check? If you also provide a time range, I can search that interval; you can say morning or afternoon to check the institution’s configured periods.";
    } else {
      const slots = interval
        ? [{ dayOfWeek: day, ...interval }]
        : period
          ? dataset.timeSlots.filter((slot) => slot.dayOfWeek === day && slot.isMorning === (period === "morning"))
          : [];
      if (slots.length === 0) {
        reply = "I couldn’t identify a time interval for " + day + ". Provide a range such as 10:00-11:30, or say morning/afternoon to use the configured timetable periods.";
      } else {
        for (const slot of slots) {
          const result = await executeSchedulingTool("searchAvailableRooms", {
            dayOfWeek: day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            minCapacity: capacityMatch ? Number(capacityMatch[1]) : undefined,
            roomType,
          }, userRole);
          toolResults.push(result);
          if (result.sources) sources.push(...result.sources);
        }
        const summaries = toolResults.map((result) => (result.data?.interval || "interval") + ": **" + (result.data?.count ?? 0) + "** room" + (result.data?.count === 1 ? "" : "s")).join("; ");
        reply = "Checked current room bookings and blocking reservations for **" + day + (period ? " " + period : "") + "**. " + summaries + ". The room cards below list matching available facilities.";
      }
    }
  } else if (/\b(bsl-?3|biocontainment|pathogen|bio.?safety)\b/i.test(message)) {
    const result = await executeSchedulingTool("findTimetableConflicts", { status: "active" }, userRole);
    toolResults.push(result);
    const related = (result.data?.conflicts || []).filter((conflict: any) => /bsl|biosafety|bio-safety|containment|pathogen/i.test(conflict.title + " " + conflict.description));
    if (result.sources) sources.push(...result.sources.filter((source) => related.some((conflict: any) => conflict.id === source.id)));
    reply = related.length
      ? related.map((conflict: any) => "**" + conflict.id + ": " + conflict.title + "**\n\n" + conflict.description + (conflict.hasFeasibleAlternative ? "\n\nA feasible alternative is recorded: " + (conflict.recommendedSolution || "see the conflict record") + "." : "\n\nNo feasible alternative is recorded; use the conflict workflow for escalation.")).join("\n\n")
      : "I found no active biocontainment-related conflict in the current schedule dataset.";
  } else if (lower.includes("syllabus") || lower.includes("progress") || lower.includes("topic") || lower.includes("velocity")) {
    const courseCode = findCourseCode(message);
    const res = await executeSchedulingTool("readSyllabusProgress", courseCode ? { courseCode } : {}, userRole);
    toolResults.push(res);
    if (res.sources) sources.push(...res.sources);
    const courses = res.data?.courses || [];
    reply = courses.length
      ? "### Syllabus delivery progress\n\n" + courses.map((course: any) => "- **" + course.courseCode + " — " + course.title + ":** " + course.completionRate + "% complete (" + course.completedHours + "/" + course.plannedHours + " planned hours); " + course.velocityStatus.replace("_", " ") + (course.isDeficitRisk ? ", deficit risk flagged" : "") + ".").join("\n")
      : res.error || "No syllabus progress records matched that query.";
  } else if (/\b(workload|burnout|overloaded|faculty load|teaching hours|faculty balance)\b/i.test(message) || (lower.includes("workload") && (lower.includes("compare") || lower.includes("balance") || lower.includes("faculty")))) {
    const workloads = calculateScheduleAnalytics(dataset, new Date()).facultyWorkload;
    const rows = workloads.slice().sort((left, right) => right.loadPercentage - left.loadPercentage);
    
    if (!rows.length) {
      reply = "No faculty workload records are available in the current dataset.";
    } else {
      const nearLimit = rows.filter(f => f.isNearCeiling || f.loadPercentage >= 85);
      const balanced = rows.filter(f => f.loadPercentage >= 60 && f.loadPercentage < 85);
      const available = rows.filter(f => f.loadPercentage < 60);

      const formatGroup = (list: typeof rows) => list.map(f => `- **${f.fullName}** (${f.department}): ${f.assignedHours}/${f.maxHours} hrs (${f.loadPercentage}%)`).join("\n");

      reply = `### Faculty workload from scheduled sessions\n\n`
        + rows.slice(0, 8).map((faculty) => "- **" + faculty.fullName + ":** " + faculty.assignedHours + " / " + faculty.maxHours + " hours (" + faculty.loadPercentage + "%).").join("\n")
        + `\n\n### Workload distribution against configured limits\n\n`
        + (nearLimit.length 
            ? `**Near configured maximum (≥85%):**\n${formatGroup(nearLimit)}\nReview these loads before adding classes.\n\n`
            : `**Near configured maximum (≥85%):** None recorded.\n\n`)
        + (balanced.length ? `🟢 **Optimal Balanced Zone (60–84%):**\n${formatGroup(balanced)}\n\n` : "")
        + (available.length ? `**Below 60% of configured load:**\n${formatGroup(available)}\nCheck subject assignment and availability before proposing additional classes.` : "");
    }
    sources.push(...rows.slice(0, 8).map((faculty) => ({ type: "faculty", id: dataset.faculty.find((item) => item.name === faculty.fullName)?.id || faculty.fullName, label: faculty.fullName })));
  } else if (/\b(available|availability|free)\b/i.test(message) && /\bfaculty|instructor|professor|dr\.?\b/i.test(message)) {
    const faculty = dataset.faculty.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.employeeCode.toLowerCase()) || lower.includes(item.id.toLowerCase()));
    const day = findWeekday(message);
    const interval = findTimeRange(message);
    if (!faculty || !day || !interval) {
      reply = "To check availability, give me a faculty name, weekday, and exact time range, for example: “Is Dr. Ada Lovelace available Wednesday 10:00-11:30?”";
    } else {
      const res = await executeSchedulingTool("checkFacultyAvailability", {
        facultyNameOrId: faculty.id,
        dayOfWeek: day,
        ...interval,
      }, userRole);
      toolResults.push(res);
      if (res.sources) sources.push(...res.sources);
      const data = res.data;
      reply = data
        ? "**" + data.facultyName + "** is " + (data.isAvailable ? "available" : "not available") + " on **" + day + " " + interval.startTime + "-" + interval.endTime + "**. Scheduled workload: " + data.currentAssignedHours + " of " + data.maxCreditHours + " hours." + (data.conflictingSessions?.length ? " Conflicting session IDs: " + data.conflictingSessions.map((session: any) => session.sessionId).join(", ") + "." : "")
        : res.error || "I couldn’t verify that faculty member’s availability.";
    }
  } else if (/\b(feasible|alternative|free slot|available slot)\b/i.test(message)) {
    const courseCode = findCourseCode(message);
    if (!courseCode) {
      reply = "Which course should I check? Provide its course code so I can evaluate alternatives using the assigned section, faculty, room, and timetable constraints.";
    } else {
      const res = await executeSchedulingTool("findFeasibleTimeSlots", { courseCode }, userRole);
      toolResults.push(res);
      if (res.sources) sources.push(...res.sources);
      const slots = res.data?.feasibleSlots || [];
      reply = slots.length
        ? "I evaluated **" + res.data.courseCode + " — " + res.data.title + "** against " + res.data.evaluatedCandidates + " room-and-slot candidates. Feasible options:\n\n" + slots.slice(0, 6).map((slot: any) => "- **" + slot.dayOfWeek + " " + slot.startTime + "-" + slot.endTime + "** · " + slot.roomCode + " for " + slot.sectionCode + " (score " + slot.feasibilityScore + "/100).").join("\n")
        : "I found no feasible alternatives for **" + (res.data?.courseCode || courseCode) + "** in the current schedule. No changes were made.";
    }
  } else {
    const courseCode = findCourseCode(message);
    const subject = dataset.subjects.find((item) =>
      (courseCode && item.code.toUpperCase() === courseCode) ||
      lower.includes(item.code.toLowerCase()) ||
      lower.includes(item.title.toLowerCase())
    );
    const effectiveCourseCode = courseCode || subject?.code;
    const room = dataset.classrooms.find((item) => lower.includes(item.code.toLowerCase()) || lower.includes(item.name.toLowerCase()));
    const section = dataset.sections.find((item) => lower.includes(item.sectionCode.toLowerCase()) || lower.includes(item.id.toLowerCase()));
    const faculty = dataset.faculty.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.employeeCode.toLowerCase()) || lower.includes(item.id.toLowerCase()));
    const day = findWeekday(message);

    if (effectiveCourseCode || room || section || faculty || day) {
      const filters = {
        ...(effectiveCourseCode ? { courseCode: effectiveCourseCode } : {}),
        ...(room ? { roomCode: room.code } : {}),
        ...(section ? { sectionCode: section.sectionCode } : {}),
        ...(faculty ? { facultyNameOrId: faculty.id } : {}),
        ...(day ? { dayOfWeek: day } : {}),
      };
      const res = await executeSchedulingTool("searchTimetable", filters, userRole);
      toolResults.push(res);
      if (res.sources) sources.push(...res.sources);
      const sessions = res.data?.sessions || [];
      if (sessions.length > 0) {
        const entityLabels = [
          effectiveCourseCode ? `course **${effectiveCourseCode}**` : null,
          faculty ? `**${faculty.name}**` : null,
          room ? `room **${room.code}**` : null,
          section ? `section **${section.sectionCode}**` : null,
          day ? `**${day}**` : null,
        ].filter(Boolean).join(", ");
        reply = `Found **${res.data.totalCount}** matching timetable session${res.data.totalCount === 1 ? "" : "s"} for ${entityLabels || "your query"}.\n\n` +
          sessions.slice(0, 5).map((s: any) => `- **${s.courseCode || s.subjectId}** · ${s.dayOfWeek || ""} ${s.startTime || ""}-${s.endTime || ""} in **${s.roomCode || s.classroomId}** (${s.facultyName || s.facultyId}, ${s.sectionCode || s.sectionId})`).join("\n") +
          (sessions.length > 5 ? `\n\n*(Showing 5 of ${res.data.totalCount} total sessions)*` : "");
      } else {
        reply = `No active timetable sessions matched your query in the current schedule dataset.`;
      }
    } else {
      const analytics = calculateScheduleAnalytics(dataset, new Date());
      const activeConflicts = dataset.conflicts.filter((c) => c.status === "active");
      const critical = activeConflicts.filter((c) => c.severity === "critical").length;
      const vacantRooms = dataset.classrooms.filter((r) => r.status === "Available").length;

      if (operationalQuery(message)) {
        reply = `### Current Schedule Insight\n\n- **Scheduled sessions:** ${analytics.activeSessions} active sessions\n- **Active conflicts:** ${activeConflicts.length} (${critical} critical needing resolution)\n- **Available venues:** ${vacantRooms} of ${dataset.classrooms.length} rooms\n- **Weekly room utilization:** ${analytics.roomUtilizationRate}%\n\nHow can I help you optimize or adjust this? You can ask me to find vacant rooms, check faculty availability, examine specific conflicts, or look up classes for any day or instructor.`;
      } else {
        reply = `Hello! I’m **Timo**, your Timora academic operations AI companion. I'm here with full insight into our institutional timetable, faculty commitments, classroom availability, and schedule conflicts. What would you like to explore or optimize today?`;
      }
    }
  }

  return {
    reply,
    toolResults,
    sources,
    provider: "deterministic-copilot",
  };
}

/** Compatibility entry point for older callers. The authenticated API uses CopilotService. */
export async function askTimoraCopilot(
  message: string,
  _conversationHistory: Array<{ role: string; content: string }> = [],
  userRole: UserRole = "academic_admin",
  repository: SchedulingRepository = schedulingRepository,
): Promise<AssistantResponse> {
  return fallbackSemanticClassifier(message, userRole, repository);
}

// Backward-compatible alias
export const askSynapseCopilot = askTimoraCopilot;
export { commitConfirmedAction };
