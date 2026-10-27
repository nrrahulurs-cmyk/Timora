import { describe, expect, it } from "vitest";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { calculateScheduleAnalytics } from "@/lib/analytics/metrics";

describe("schedule analytics", () => {
  it("derives conflict and utilization metrics from the same schedule records", () => {
    const analytics = calculateScheduleAnalytics(SYNAPSE_SEED_DATA, new Date(2026, 9, 19));
    const activeSessions = SYNAPSE_SEED_DATA.timetableSessions.filter((session) => session.status !== "cancelled");
    const activeConflicts = SYNAPSE_SEED_DATA.conflicts.filter((conflict) => conflict.status === "active");

    expect(analytics.activeSessions).toBe(activeSessions.length);
    expect(analytics.activeConflicts).toBe(activeConflicts.length);
    expect(analytics.kpiMetrics.unresolvedConflicts.count).toBe(activeConflicts.length);
    expect(analytics.kpiMetrics.unresolvedConflicts.criticalCount).toBe(
      activeConflicts.filter((conflict) => conflict.severity === "critical").length
    );
    expect(analytics.roomUtilizationRows.reduce((sum, room) => sum + room.weeklyHours, 0)).toBe(
      analytics.weeklyBookedRoomHours
    );
    expect(analytics.kpiMetrics.roomUtilisation.rate).toBe(analytics.roomUtilizationRate);
  });

  it("uses real room and slot capacity and counts only dated, approved reservations", () => {
    const analytics = calculateScheduleAnalytics(SYNAPSE_SEED_DATA, new Date(2026, 9, 19));
    const thursday = analytics.dailyRoomSlots.find((item) => item.fullDay === "Thursday");
    const thursdaySlots = SYNAPSE_SEED_DATA.timeSlots.filter((slot) => slot.dayOfWeek === "Thursday").length;

    expect(thursday).toBeDefined();
    expect(thursday!.available + thursday!.occupied + thursday!.reserved).toBe(
      SYNAPSE_SEED_DATA.classrooms.length * thursdaySlots
    );
    expect(thursday!.reserved).toBe(2);
  });

  it("returns zero values for a successful empty dataset instead of fallback numbers", () => {
    const emptyDataset = {
      ...SYNAPSE_SEED_DATA,
      classrooms: [],
      timeSlots: [],
      timetableSessions: [],
      conflicts: [],
      faculty: [],
      reservations: [],
      extraClassRequests: [],
      teacherExchangeRequests: [],
    };
    const analytics = calculateScheduleAnalytics(emptyDataset, new Date(2026, 9, 19));

    expect(analytics.kpiMetrics.unresolvedConflicts.count).toBe(0);
    expect(analytics.kpiMetrics.availableRooms).toMatchObject({ available: 0, total: 0, occupied: 0 });
    expect(analytics.kpiMetrics.roomUtilisation.rate).toBe(0);
    expect(analytics.peakTimeBand).toEqual({ label: "No scheduled sessions", rate: 0 });
    expect(analytics.workloadComplianceRate).toBe(0);
  });
});
