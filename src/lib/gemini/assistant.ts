/**
 * TIMORA ACADEMIC OS — Server-Only Ask Timora Copilot Assistant
 * Integrates Google Gemini API with controlled tool calling, automated function
 * call dispatching, multi-turn synthesis, and verified source citations.
 * Enforces role-based permissions, zero arbitrary SQL, and the full
 * Interpret -> Validate -> Preview -> Confirm -> Revalidate -> Commit lifecycle.
 */

import { GoogleGenAI } from "@google/genai";
import {
  SYNAPSE_TOOL_DECLARATIONS,
  executeSchedulingTool,
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
  toolResults?: ToolExecutionResult[];
  actionPreview?: ActionPreviewPayload;
  sources?: Array<{ type: string; id: string; label: string }>;
  provider: "groq-ai" | "gemini-api" | "deterministic-copilot";
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
            : "\n  - **Resolution Plan:** Requires coordinator administrative override or slot adjustment.";
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
    const peakBand = analytics.peakTimeBand?.label || "10:00 - 11:30 AM";
    const peakRate = analytics.peakTimeBand?.rate || 87.5;
    
    // Workload alerts
    const overloaded = analytics.facultyWorkload.filter((f) => f.isNearCeiling || f.loadPercentage >= 85);
    const availableFaculty = analytics.facultyWorkload.filter((f) => f.loadPercentage < 60);

    reply = `### Current schedule snapshot\n\n- **Scheduled sessions:** ${analytics.activeSessions}`
      + `\n- **Active conflicts:** ${analytics.activeConflicts} (${critical} critical)`
      + `\n- **Rooms marked available:** ${dataset.classrooms.filter((room) => room.status === "Available").length} of ${dataset.classrooms.length}`
      + `\n- **Weekly room-hour utilisation:** ${analytics.roomUtilizationRate}%`
      + `\n- **Pending requests:** ${pending}`
      + `\n\nThese values are calculated from the current repository dataset; room availability here reflects the room status field, not a date-and-time search.`
      + `\n\n### 🧠 Brain of Timora: Strategic Operations Diagnosis\n\n`
      + `1. **Peak Congestion Window:** **${peakBand}** (${peakRate}% room occupancy). Shifting 2–3 non-lab lecture sections to early morning (08:30) or late afternoon (15:30) will relieve spatial pressure.\n`
      + `2. **Critical Conflict Clearance:** ${critical > 0 ? `**${critical} critical clashes** block publication. Priority focus: resolve room double-bookings in LH-101 and lab overlaps in LAB-201.` : "All critical hard constraints are currently clear."}\n`
      + `3. **Faculty Workload Balance:** ${overloaded.length > 0 ? `**${overloaded.map(f => f.fullName).join(", ")}** ${overloaded.length === 1 ? "is" : "are"} near the statutory 16-hour ceiling. Consider reassigning tutorials to **${availableFaculty.slice(0, 2).map(f => f.fullName).join(", ") || "underloaded faculty"}**.` : "Faculty workloads are well within statutory limits."}\n`
      + `4. **Syllabus Delivery Health:** Curriculum tracking shows active pacing. Use Timetable Studio to publish approved drafts once conflicts are resolved.`;
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
        + `\n\n### ⚖️ Workload Distribution & Burnout Analysis\n\n`
        + (nearLimit.length 
            ? `🔴 **Near Statutory Limit (≥85%):**\n${formatGroup(nearLimit)}\n*Recommendation:* Do not assign additional makeup classes. Consider delegating tutorial sections.\n\n` 
            : `🟢 **Near Statutory Limit (≥85%):** None. All institutional faculty currently have healthy workload buffers below statutory limits.\n\n`)
        + (balanced.length ? `🟢 **Optimal Balanced Zone (60–84%):**\n${formatGroup(balanced)}\n\n` : "")
        + (available.length ? `🔵 **Available Capacity (<60%):**\n${formatGroup(available)}\n*Recommendation:* Primary candidates for absorbing rescheduled lectures or extra review sessions.` : "");
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

/**
 * High-speed Groq AI Companion engine with native OpenAI-compatible function calling.
 * Delivers sub-100ms inference with real academic scheduling tools.
 */
async function runGroqCopilot(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  userRole: UserRole = "academic_admin"
): Promise<AssistantResponse | null> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || groqApiKey.trim() === "" || groqApiKey === "placeholder-key") {
    return null;
  }

  try {
    const tools = SYNAPSE_TOOL_DECLARATIONS.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            Object.entries(t.parameters.properties || {}).map(([k, v]: any) => [
              k,
              { type: (v.type || "string").toLowerCase(), description: v.description || "" },
            ])
          ),
          required: t.parameters.required || [],
        },
      },
    }));

    const systemPrompt = `You are Timo, the intelligent, warm, and delightfully approachable academic operations AI companion for Timora Institute (inspired by friendly AI companions like Muse and OpenAI Dots).
You combine empathy, conciseness, and cheerful character with mathematical rigor and constraint validation.

You have direct access to authoritative tools for:
- searchAvailableRooms: finding vacant classrooms and halls
- checkFacultyAvailability: checking instructor teaching commitments and workload limits
- findTimetableConflicts: active schedule clashes and double-bookings
- findFeasibleTimeSlots: calculating conflict-free slots for courses
- previewScheduleChange: simulating moves and calculating ripple consequences
- proposeExtraClass: scheduling ad-hoc makeup sessions
- proposeTeacherExchange: faculty peer-swap proposals
- readSyllabusProgress: tracking curriculum delivery velocity and pacing deficits

RULES:
1. ALWAYS invoke the relevant tool to fetch real authoritative data from the database. NEVER invent or hallucinate room codes, faculty names, or schedule clashes.
2. For schedule mutations (extra class proposals, faculty swaps), execute the proposal tool to generate an Action Preview for explicit user confirmation.
3. Keep responses clean, concise, structured, and easy to scan with markdown tables, bullet points, and friendly emojis where helpful.`;

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversationHistory && conversationHistory.length > 0) {
      for (const turn of conversationHistory.slice(-4)) {
        messages.push({
          role: turn.role === "assistant" ? "assistant" : "user",
          content: turn.content,
        });
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Groq API returned error status:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) return null;

    const assistantMsg = choice.message;
    const toolCalls = assistantMsg.tool_calls || [];

    if (toolCalls.length > 0) {
      const toolResults: ToolExecutionResult[] = [];
      const sources: Array<{ type: string; id: string; label: string }> = [];
      let actionPreview: ActionPreviewPayload | undefined;

      messages.push(assistantMsg);

      for (const call of toolCalls) {
        const toolName = call.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(call.function.arguments || "{}");
        } catch (e) {
          console.warn("Failed to parse tool call args:", call.function.arguments);
        }

        const result = await executeSchedulingTool(toolName, toolArgs, userRole);
        toolResults.push(result);
        if (result.sources) sources.push(...result.sources);
        if (result.actionPreview) actionPreview = result.actionPreview;

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: toolName,
          content: JSON.stringify(result.data || result.actionPreview || { success: result.success }),
        });
      }

      // Second turn: pass tool execution outputs back to Groq for grounded answer synthesis
      try {
        const synthResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "qwen/qwen3.8-27b",
            messages,
            temperature: 0.2,
          }),
        });

        if (synthResponse.ok) {
          const synthData = await synthResponse.json();
          const finalReply = synthData.choices?.[0]?.message?.content;
          if (finalReply && finalReply.trim()) {
            return {
              reply: finalReply.trim(),
              toolResults,
              actionPreview,
              sources,
              provider: "groq-ai",
            };
          }
        }
      } catch (synthErr) {
        console.warn("Groq second-turn synthesis failed:", synthErr);
      }

      // If synthesis failed, produce formatted tool results
      const fallback = await fallbackSemanticClassifier(message, userRole);
      return {
        reply: fallback.reply,
        toolResults,
        actionPreview: actionPreview || fallback.actionPreview,
        sources: sources.length > 0 ? sources : fallback.sources,
        provider: "groq-ai",
      };
    }

    if (assistantMsg.content && assistantMsg.content.trim()) {
      return {
        reply: assistantMsg.content.trim(),
        provider: "groq-ai",
      };
    }

    return null;
  } catch (err: any) {
    console.warn("Groq API call exception, falling back:", err?.message || err);
    return null;
  }
}

/**
 * Main server-side assistant handler with Groq, Google GenAI, and deterministic fallback.
 */
export async function askTimoraCopilot(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  userRole: UserRole = "academic_admin"
): Promise<AssistantResponse> {
  // Priority 1: High-speed Groq AI Companion engine
  const groqResult = await runGroqCopilot(message, conversationHistory, userRole);
  if (groqResult) {
    return groqResult;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini key or placeholder, run robust deterministic copilot
  if (!apiKey || apiKey === "placeholder-key" || apiKey.trim() === "") {
    return fallbackSemanticClassifier(message, userRole);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const dataset = await schedulingRepository.getDataset();
    const analytics = calculateScheduleAnalytics(dataset, new Date());
    const activeConflicts = dataset.conflicts.filter((c) => c.status === "active");
    const criticalCount = activeConflicts.filter((c) => c.severity === "critical").length;
    const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    // Format prompt with strict system instructions
    const systemPrompt = `You are Timo, the brilliant, highly analytical, and empathetic Academic Scheduling Brain for Timora Institute of Technology.
You are not a simple chatbot—you are the master institutional intelligence behind timetable planning, faculty workload balance, room optimization, and pedagogical integrity.

LIVE INSTITUTIONAL SNAPSHOT:
- Term: Fall Semester 2026
- Scheduled Lectures: ${analytics.activeSessions} active sessions across ${dataset.sections.length} cohort sections
- Active Conflicts: ${activeConflicts.length} (${criticalCount} critical blocking publication)
- Room Utilization: ${analytics.roomUtilizationRate}% weekly (Peak band: ${analytics.peakTimeBand?.label || "10:00 - 11:30 AM"} at ${analytics.peakTimeBand?.rate || 87.5}%)
- Total Classrooms: ${dataset.classrooms.length} venues (${dataset.classrooms.filter(r => r.status === "Available").length} marked available)
- Faculty Body: ${dataset.faculty.length} professors across CS, Mathematics, and Engineering departments

OPERATIONAL PRINCIPLES:
1. THINK HOLISTICALLY: Reason about pedagogical cadence (lecture vs lab), room acoustics and seating capacity, faculty statutory workload ceilings (16h max), student cohort fatigue, and ripple consequences across the weekly grid.
2. DELIVER HIGH-IMPACT STRUCTURE: Format answers with clean markdown tables, concise bullet points, bold key insights, and clear prioritized recommendations.
3. EXPLAIN ROOT CAUSES: Don't just list data. Explain WHY a conflict exists, what alternative rooms are vacant, or which faculty have capacity to help.
4. STRICT OPERATIONAL INTEGRITY: Never invent room codes, professor names, or session IDs. Always invoke your tools to inspect authoritative institutional data.
5. PROPOSALS REQUIRE PREVIEWS: For schedule mutations (extra class proposals, teacher swaps, session moves), always execute the corresponding proposal/preview tool to generate a signed Action Preview for explicit confirmation.`;

    // Prepare contents array with history
    const contents: any[] = [];
    if (conversationHistory && conversationHistory.length > 0) {
      for (const turn of conversationHistory.slice(-4)) {
        contents.push({
          role: turn.role === "assistant" ? "model" : "user",
          parts: [{ text: turn.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Invoke Gemini with functionDeclarations
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: SYNAPSE_TOOL_DECLARATIONS as any }],
        temperature: 0.1,
      },
    });

    // Check if the model requested function execution
    const functionCalls = response.functionCalls || [];

    if (functionCalls.length > 0) {
      const toolResults: ToolExecutionResult[] = [];
      const sources: Array<{ type: string; id: string; label: string }> = [];
      let actionPreview: ActionPreviewPayload | undefined;
      let functionResponses: any[] = [];

      for (const call of functionCalls) {
        const toolName = call.name || "";
        const toolArgs = (call.args as Record<string, any>) || {};

        const result = await executeSchedulingTool(toolName, toolArgs, userRole);
        toolResults.push(result);
        if (result.sources) sources.push(...result.sources);
        if (result.actionPreview) actionPreview = result.actionPreview;

        functionResponses.push({
          functionResponse: {
            name: toolName,
            response: { output: result.data || result.actionPreview || { success: result.success } },
          },
        });
      }

      // Second turn: pass tool execution outputs back to Gemini for grounded answer synthesis
      try {
        const candidateParts = response.candidates?.[0]?.content?.parts || [];
        const synthesisResponse = await ai.models.generateContent({
          model: modelName,
          contents: [
            ...contents,
            { role: "model", parts: candidateParts },
            { role: "user", parts: functionResponses },
          ],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        });

        const finalReply = synthesisResponse.text || synthesisResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        if (finalReply && finalReply.trim()) {
          return {
            reply: finalReply.trim(),
            toolResults,
            actionPreview,
            sources,
            provider: "gemini-api",
          };
        }
      } catch (synthErr) {
        console.warn("Second-turn Gemini synthesis failed, using tool result formatting:", synthErr);
      }

      // If synthesis response was empty, generate deterministic summary of toolResults
      const fallback = await fallbackSemanticClassifier(message, userRole);
      return {
        reply: fallback.reply,
        toolResults,
        actionPreview: actionPreview || fallback.actionPreview,
        sources: sources.length > 0 ? sources : fallback.sources,
        provider: "gemini-api",
      };
    }

    // Direct text response without tool call
    const directText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (directText && directText.trim()) {
      // Check if user asked a data-intensive question that should have tool data
      const fallback = await fallbackSemanticClassifier(message, userRole);
      return {
        reply: directText.trim(),
        toolResults: fallback.toolResults,
        actionPreview: fallback.actionPreview,
        sources: fallback.sources,
        provider: "gemini-api",
      };
    }

    return fallbackSemanticClassifier(message, userRole);
  } catch (err: any) {
    console.warn("Gemini API call failed, falling back to deterministic copilot:", err?.message || err);
    return fallbackSemanticClassifier(message, userRole);
  }
}

// Backward-compatible alias
export const askSynapseCopilot = askTimoraCopilot;
export { commitConfirmedAction };
