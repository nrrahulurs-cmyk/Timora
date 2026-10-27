import type { SchedulingRepository } from "./scheduling-repository";

export const demoQueries = new Set([
  "getDataset", "getDepartments", "getDepartment", "getFaculty", "getFacultyById", "getSections", "getSubjects", "getSubjectById",
  "getClassrooms", "getClassroomById", "getTimeSlots", "getTimetableSessions", "getConflicts", "getConflictById", "getRoomReservations",
  "getScheduleVersions", "getChangeHistory", "getSyllabusModules", "getTopicProgress", "getExtraClassRequests", "getTeacherExchangeRequests",
  "previewPublication", "checkRoomImpact", "checkFacultyAvailabilityImpact", "getKpiMetrics", "getChartData", "getAttentionItems", "getActivityLog", "getAvailableRooms",
]);
export const demoMutations = new Set([
  "saveTimetableChanges", "resolveConflict", "undoConflictResolution", "createExtraClassRequest", "createTeacherExchangeRequest",
  "advanceExtraClassRequest", "approveExtraClassRequest", "rejectExtraClassRequest", "approveTeacherExchangeRequest", "rejectTeacherExchangeRequest",
  "updateTopicDelivery", "publishScheduleVersion", "rollbackToVersion", "createClassroom", "updateClassroom", "createFacultyMember", "updateFacultyMember", "updateFacultyAvailability",
]);

/** Demo clients and Copilot share one durable local server dataset. */
export function createDemoHttpRepository(): SchedulingRepository {
  return new Proxy({} as SchedulingRepository, {
    get(_target, method) {
      if (typeof method !== "string" || (!demoQueries.has(method) && !demoMutations.has(method))) return undefined;
      return async (...args: unknown[]) => {
        const response = await fetch("/api/demo-repository", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method, args }),
          signal: AbortSignal.timeout(20000),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The workspace request failed. Try again.");
        if (demoMutations.has(method) && result.data?.success !== false) window.dispatchEvent(new Event("timora:data-changed"));
        return result.data;
      };
    },
  });
}
