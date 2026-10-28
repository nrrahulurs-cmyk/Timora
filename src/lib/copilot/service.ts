import { z } from "zod";
import type { SchedulingRepository } from "@/lib/repository/scheduling-repository";
import type { DayOfWeek, SynapseCollegeDataset, TimetableSession } from "@/types/domain";
import { fallbackSemanticClassifier, type AssistantResponse } from "@/lib/gemini/assistant";
import { reasonWithLocalModel } from "./local-brain";
import { reasonWithOpenRouter } from "./openrouter-brain";
import { allocation, previewSchedulePlan } from "@/lib/scheduling/plan";
import { rankValidAlternatives } from "@/lib/scheduling/constraint-engine";
import { signScheduleAction, canEditSchedule, type CopilotActor } from "./actions";
import { executeSchedulingTool } from "@/lib/gemini/tools";

export const copilotRequestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(16).default([]),
  context: z.object({ page: z.string().max(80).optional(), sessionId: z.string().max(120).optional() }).optional(),
});
export type CopilotRequest = z.infer<typeof copilotRequestSchema>;
export type CopilotResponse = AssistantResponse & { suggestions: string[] };
const days: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const mentions = (text: string, value: string) => value.length > 2 && text.toLowerCase().includes(value.toLowerCase());
const dayIn = (text: string) => days.find((day) => new RegExp(`\\b${day}\\b`, "i").test(text));
function timesIn(text: string) {
  return [...text.matchAll(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?\b/gi)].flatMap((match) => {
    if (!match[2] && !match[3]) return [];
    let hour = Number(match[1]);
    if (match[3]) { if (hour < 1 || hour > 12) return []; hour = hour % 12 + (match[3].toLowerCase() === "pm" ? 12 : 0); }
    return hour < 24 ? [`${String(hour).padStart(2, "0")}:${match[2] || "00"}`] : [];
  });
}
function identify(text: string, dataset: SynapseCollegeDataset) {
  return {
    subject: dataset.subjects.find((record) => mentions(text, record.code) || mentions(text, record.title)),
    room: dataset.classrooms.find((record) => mentions(text, record.code) || mentions(text, record.name)),
    section: dataset.sections.find((record) => mentions(text, record.sectionCode) || mentions(text, record.id)),
    faculty: dataset.faculty.find((record) => mentions(text, record.name) || mentions(text, record.employeeCode) || mentions(text, record.id)),
  };
}
function describe(session: TimetableSession, data: SynapseCollegeDataset) {
  const slot = data.timeSlots.find((item) => item.id === session.timeSlotId);
  return `${data.subjects.find((item) => item.id === session.subjectId)?.code || session.subjectId} · ${slot?.dayOfWeek} ${slot?.startTime} · ${data.classrooms.find((item) => item.id === session.classroomId)?.code || session.classroomId}`;
}

/** Interpret locally. External model text never authorizes or commits a change. */
export async function answerCopilot(request: CopilotRequest, actor: CopilotActor, repository: SchedulingRepository): Promise<CopilotResponse> {
  const data = await repository.getDataset();
  const result: CopilotResponse = { reply: "", toolResults: [], sources: [], provider: "deterministic-copilot", suggestions: ["Show active conflicts", "Compare faculty workloads", "Show schedule summary"] };
  const text = request.message;
  const previous = request.conversationHistory.filter((message) => message.role === "user").at(-1)?.content || "";
  const followsUp = /\b(it|that|those|there|them|instead|same|what about|and on)\b/i.test(text);
  const inherited: Partial<ReturnType<typeof identify>> = followsUp ? identify(previous, data) : {};
  const explicit = identify(text, data);
  const subject = explicit.subject || inherited.subject;
  const room = explicit.room || inherited.room;
  const section = explicit.section || inherited.section;
  const faculty = explicit.faculty || inherited.faculty;
  const day = dayIn(text) || (followsUp ? dayIn(previous) : undefined);
  const timeValues = timesIn(text);
  const times = timeValues.length ? timeValues : followsUp ? timesIn(previous) : [];
  const sessions = data.timetableSessions.filter((session) => session.status !== "cancelled");
  const selected = sessions.find((session) => mentions(text, session.id)) || (request.context?.sessionId ? sessions.find((session) => session.id === request.context?.sessionId) : undefined) || (followsUp ? sessions.find((session) => mentions(previous, session.id)) : undefined);
  const matched = selected ? [selected] : sessions.filter((session) => subject && session.subjectId === subject.id && (!section || session.sectionId === section.id));

  if (!canEditSchedule(actor.role) && /\b(put|place|switch|relocate|change)\b/i.test(text) && /\b(session|class|lecture|timetable|schedule)\b|SESS-/i.test(text)) {
    result.reply = "Your role can inspect schedules but cannot apply timetable changes. Ask your coordinator to review the proposed move.";
    return result;
  }

  if (/\b(move|reschedule|reassign|shift)\b/i.test(text) && !/extra|exchange/i.test(text)) {
    if (!canEditSchedule(actor.role)) { result.reply = "Your role can inspect schedules but cannot apply timetable changes. Ask your coordinator to review the proposed move."; return result; }
    if (matched.length !== 1) {
      result.reply = matched.length ? `Choose the session to move:\n${matched.map((session) => `${session.id} — ${describe(session, data)}`).join("\n")}` : "Which session should I move? Include its session ID, target weekday/time, and optionally a room.";
      result.suggestions = matched.slice(0, 3).map((session) => `Find alternatives for ${session.id}`);
      return result;
    }
    const session = matched[0];
    const targetSlots = data.timeSlots.filter((slot) => slot.dayOfWeek === day && times.length > 0 && slot.startTime === times[0]);
    if (targetSlots.length !== 1) { result.reply = `What weekday and start time should ${session.id} move to? Include an exact institutional time slot.`; result.suggestions = [`Find alternatives for ${session.id}`]; return result; }
    const plan = { updates: [{ id: session.id, expected: allocation(session), changes: { timeSlotId: targetSlots[0].id, classroomId: room?.id || session.classroomId, status: "moved" as const } }], inserts: [], reason: `Copilot move reviewed by ${actor.name}` };
    const preview = previewSchedulePlan(data, plan);
    result.reply = preview.isValid ? "The proposed move satisfies the checked constraints. Review the change, then confirm to save it. This preview expires in five minutes." : "The proposed move is blocked by the constraints below. No changes have been made.";
    result.actionPreview = { actionType: "SCHEDULE_CHANGE", summary: `Move ${session.id}`, details: { before: describe(session, data), after: describe(preview.changes[0]?.after || session, data), sessionId: session.id }, isValid: preview.isValid, violations: preview.errors, requiresConfirmation: true, confirmationToken: preview.isValid ? signScheduleAction(plan, actor) : "" };
    result.sources = [{ type: "session", id: session.id, label: describe(session, data) }];
    result.suggestions = [`Find alternatives for ${session.id}`];
  } else if (/\b(alternative|alternatives|feasible|what.if|simulate)\b/i.test(text) && matched.length === 1) {
    const session = matched[0];
    const alternatives = rankValidAlternatives(session.id, data).filter((item) => !day || data.timeSlots.find((slot) => slot.id === item.targetTimeSlotId)?.dayOfWeek === day).slice(0, 6);
    result.reply = alternatives.length ? `${alternatives.length} alternatives satisfy the current constraints for ${session.id}.\n${alternatives.map((item) => item.description).join("\n")}` : `No feasible alternative was found for ${session.id}${day ? ` on ${day}` : ""}. No changes were made.`;
    result.sources = [{ type: "session", id: session.id, label: describe(session, data) }];
    result.suggestions = alternatives.slice(0, 3).flatMap((item) => {
      const slot = data.timeSlots.find((value) => value.id === item.targetTimeSlotId);
      const targetRoom = data.classrooms.find((value) => value.id === item.targetClassroomId);
      return slot && targetRoom ? [`Move ${session.id} to ${slot.dayOfWeek} ${slot.startTime} in ${targetRoom.code}`] : [];
    });
  } else if (selected && /\b(show|find|read|explain|when|where|session|timetable)\b/i.test(text)) {
    const tool = await executeSchedulingTool("searchTimetable", { sessionId: selected.id }, actor.role, repository);
    result.toolResults = [tool]; result.sources = tool.sources || [];
    result.reply = `${selected.id}: ${describe(selected, data)}. ${data.faculty.find(item => item.id === selected.facultyId)?.name || selected.facultyId} teaches ${data.sections.find(item => item.id === selected.sectionId)?.sectionCode || selected.sectionId}. Effective ${selected.effectiveFrom} through ${selected.effectiveUntil}.`;
    result.suggestions = [`Find alternatives for ${selected.id}`];
  } else if (/\b(upload|import|extract|document|pdf|xlsx|csv)\b/i.test(text)) {
    result.reply = "Open Timetable Studio → Import timetable to upload CSV or XLSX, review matched records, correct errors and validate the candidate schedule before applying it. PDF and image extraction are not available yet. File contents are treated as data, never as instructions.";
  } else if (/\b(compare|difference|diff)\b/i.test(text) && /\b(version|draft|published)\b/i.test(text)) {
    const explanation = await reasonWithOpenRouter(text, request.conversationHistory, actor, repository);
    if (explanation?.toolResults?.some((tool) => tool.toolName === "compareScheduleVersions" && tool.success)) {
      Object.assign(result, explanation);
      return result;
    }
    const published = data.scheduleVersions.find((version) => version.status === "published");
    if (!published?.sessionSnapshot) result.reply = "The published version has no saved session snapshot, so a reliable comparison is unavailable. Newly published local versions retain session snapshots for comparison and recovery.";
    else {
      const old = new Map(published.sessionSnapshot.map((session) => [session.id, session]));
      const changed = sessions.filter((session) => JSON.stringify(allocation(session)) !== JSON.stringify(old.get(session.id) ? allocation(old.get(session.id)!) : null));
      result.reply = `${changed.length} current sessions differ from published ${published.versionNumber}.\n${changed.map((session) => `${session.id} — ${describe(session, data)}`).join("\n") || "No allocation differences."}`;
      result.sources = changed.map((session) => ({ type: "session", id: session.id, label: describe(session, data) }));
    }
  } else {
    let contextual = text;
    if (followsUp) {
      const references = [subject?.code, room?.code, section?.sectionCode, faculty?.name, selected?.id].filter(Boolean).join(" ");
      contextual = `${text} ${references}`;
      if (/available|free|vacant/i.test(previous) && /room|hall|lab/i.test(previous)) contextual = `Find available rooms ${day || ""} ${times.join("-")}`;
      else if (day && !/class|session|schedule|timetable|workload|available|free|conflict/i.test(text)) contextual = `Find timetable sessions ${references} ${day}`;
    }
    const modelStarted = Date.now();
    const remote = await reasonWithOpenRouter(contextual, request.conversationHistory, actor, repository);
    // Leave time for the browser's 30-second request budget after a slow provider failure.
    const response = remote
      || (Date.now() - modelStarted < 8_000 ? await reasonWithLocalModel(contextual, request.conversationHistory, actor.role, repository) : null)
      || await fallbackSemanticClassifier(contextual, actor.role, repository);
    Object.assign(result, response);
    const sourceSession = response.sources?.find((source) => source.type === "session");
    if (sourceSession) result.suggestions = [`Find alternatives for ${sourceSession.id}`, "Show active conflicts"];
  }
  return result;
}
