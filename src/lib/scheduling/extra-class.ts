import { z } from "zod";
import type { SynapseCollegeDataset } from "@/types/domain";
import { previewSchedulePlan, type SchedulePlan } from "./plan";
const recordId = z.string().trim().min(1).max(120);
export const extraClassSchema = z.object({ facultyId: recordId, subjectId: recordId, sectionId: recordId, classroomId: recordId, timeSlotId: recordId, scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().trim().min(5).max(500) });
export function prepareExtraClass(dataset: SynapseCollegeDataset, input: unknown, id = "EXTRA-PREVIEW") {
  const request = extraClassSchema.parse(input);
  const section = dataset.sections.find(item => item.id === request.sectionId);
  const version = dataset.scheduleVersions.find(item => item.academicTermId === section?.academicTermId && item.status === "draft");
  if (!section || !version) throw new Error("An existing section and draft schedule are required.");
  const plan: SchedulePlan = { updates: [], inserts: [{ id, academicTermId: section.academicTermId, versionId: version.id, subjectId: request.subjectId, sectionId: request.sectionId, facultyId: request.facultyId, classroomId: request.classroomId, timeSlotId: request.timeSlotId, status: "extra_session", isRecurringWeekly: false, effectiveFrom: request.scheduledDate, effectiveUntil: request.scheduledDate }], reason: request.reason };
  const preview = previewSchedulePlan(dataset, plan);
  return { request, ...preview };
}
