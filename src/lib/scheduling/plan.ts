import { z } from "zod";
import type { SynapseCollegeDataset, TimetableSession } from "@/types/domain";
import { validateSession } from "./constraint-engine";

const id = z.string().trim().min(1).max(120);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date.");
export const allocationSchema = z.object({
  classroomId: id, timeSlotId: id, facultyId: id,
  status: z.enum(["scheduled", "cancelled", "moved", "extra_session"]),
}).strict();
export const sessionSchema = allocationSchema.extend({
  id, academicTermId: id, versionId: id, subjectId: id, sectionId: id,
  isRecurringWeekly: z.boolean(), effectiveFrom: date, effectiveUntil: date,
}).strict();
export const schedulePlanSchema = z.object({
  updates: z.array(z.object({ id, expected: allocationSchema, changes: allocationSchema.partial() }).strict()).max(200).default([]),
  inserts: z.array(sessionSchema).max(200).default([]),
  reason: z.string().trim().min(3).max(500),
}).strict().refine((plan) => plan.updates.length + plan.inserts.length > 0, "No changes to apply.");
export type SchedulePlan = z.infer<typeof schedulePlanSchema>;
export type SchedulePlanResult = { success: boolean; message: string; affectedSessionIds: string[] };
export function allocation(session: TimetableSession) {
  return { classroomId: session.classroomId, timeSlotId: session.timeSlotId, facultyId: session.facultyId, status: session.status };
}

/** Build and validate the complete candidate state before any write occurs. */
export function previewSchedulePlan(dataset: SynapseCollegeDataset, input: unknown) {
  const plan = schedulePlanSchema.parse(input);
  const errors: string[] = [];
  const seen = new Set<string>();
  const changes: { id: string; before?: TimetableSession; after: TimetableSession }[] = [];
  const sessions = dataset.timetableSessions.map((session) => ({ ...session }));
  for (const update of plan.updates) {
    if (seen.has(update.id)) { errors.push(`Duplicate change for ${update.id}.`); continue; }
    seen.add(update.id);
    const index = sessions.findIndex((session) => session.id === update.id);
    if (index < 0) { errors.push(`Session ${update.id} no longer exists.`); continue; }
    const before = sessions[index];
    if (Object.entries(update.expected).some(([key, value]) => before[key as keyof TimetableSession] !== value)) {
      errors.push(`${update.id} changed since this preview. Refresh and review it again.`);
      continue;
    }
    const after = { ...before, ...update.changes };
    if (Object.entries(update.changes).every(([key,value]) => before[key as keyof TimetableSession] === value)) { errors.push(`${update.id}: the proposed allocation is unchanged.`); continue; }
    sessions[index] = after;
    changes.push({ id: after.id, before, after });
  }
  for (const session of plan.inserts) {
    if (seen.has(session.id) || sessions.some((existing) => existing.id === session.id)) {
      errors.push(`Session ${session.id} already exists. Nothing will be overwritten.`); continue;
    }
    if (sessions.some((existing) => existing.status !== "cancelled" && existing.subjectId === session.subjectId && existing.sectionId === session.sectionId && existing.timeSlotId === session.timeSlotId && existing.effectiveFrom === session.effectiveFrom && existing.effectiveUntil === session.effectiveUntil)) {
      errors.push(`${session.id} duplicates an existing session.`); continue;
    }
    seen.add(session.id);
    sessions.push(session);
    changes.push({ id: session.id, after: session });
  }
  for (const { after: session } of changes) {
    if (session.status === "cancelled") continue;
    const term = dataset.academicTerms.find((item) => item.id === session.academicTermId);
    const section = dataset.sections.find((item) => item.id === session.sectionId);
    const version = dataset.scheduleVersions.find((item) => item.id === session.versionId);
    if (!term || section?.academicTermId !== term.id || version?.academicTermId !== term.id) errors.push(`${session.id}: term, section and version must belong to the same academic term.`);
    if (session.effectiveFrom > session.effectiveUntil || (term && (session.effectiveFrom < term.startDate || session.effectiveUntil > term.endDate))) errors.push(`${session.id}: dates must be ordered and fall within the academic term.`);
    if (!session.isRecurringWeekly && session.effectiveFrom !== session.effectiveUntil) errors.push(`${session.id}: a one-off class needs one exact date.`);
    const slot = dataset.timeSlots.find((item) => item.id === session.timeSlotId);
    if (slot && !session.isRecurringWeekly && new Date(`${session.effectiveFrom}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) !== slot.dayOfWeek) errors.push(`${session.id}: date and selected weekday do not match.`);
    if (!dataset.teachingAssignments.some((item) => item.subjectId === session.subjectId && item.facultyId === session.facultyId && item.sectionId === session.sectionId && item.academicTermId === session.academicTermId)) errors.push(`${session.id}: this instructor is not assigned to the selected course and section in this term.`);
    const validation = validateSession(session, dataset, { activeSessions: sessions });
    errors.push(...validation.hardViolations.map((violation) => `${session.id}: ${violation.description}`));
  }
  return { plan, isValid: errors.length === 0, errors: [...new Set(errors)], sessions, changes };
}
