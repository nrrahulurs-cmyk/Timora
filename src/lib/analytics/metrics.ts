import type { DayOfWeek, SynapseCollegeDataset } from "@/types/domain";
import type { AttentionItem, ChartDataPoint, KpiMetrics } from "@/lib/repository/scheduling-repository";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface RoomUtilizationRow {
  roomId: string;
  code: string;
  type: string;
  building: string;
  capacity: number;
  bookedSessions: number;
  weeklyHours: number;
  utilizationRate: number;
}

export interface DailyRoomSlotRow {
  day: string;
  fullDay: DayOfWeek;
  occupied: number;
  available: number;
  reserved: number;
  utilizationRate: number;
  activeConflicts: number;
}

export interface FacultyWorkloadRow {
  name: string;
  fullName: string;
  department: string;
  assignedHours: number;
  maxHours: number;
  loadPercentage: number;
  isNearCeiling: boolean;
}

export interface ScheduleAnalytics {
  activeSessions: number;
  activeConflicts: number;
  weeklyRoomSlotCapacity: number;
  weeklyRoomHourCapacity: number;
  weeklyBookedRoomHours: number;
  roomUtilizationRate: number;
  peakTimeBand: { label: string; rate: number };
  activeLearningRooms: number;
  workloadComplianceRate: number;
  roomUtilizationRows: RoomUtilizationRow[];
  dailyRoomSlots: DailyRoomSlotRow[];
  facultyWorkload: FacultyWorkloadRow[];
  conflictCategories: Array<{ name: string; value: number }>;
  chartData: ChartDataPoint[];
  attentionItems: AttentionItem[];
  kpiMetrics: KpiMetrics;
}

function hoursForSlot(startTime: string, endTime: string): number {
  const parse = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : NaN;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? (end - start) / 60 : 0;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function roomCategory(type: string): "lectureHalls" | "labs" | "seminarRooms" {
  if (type === "Lecture Hall" || type === "Auditorium") return "lectureHalls";
  if (type === "Specialized Laboratory") return "labs";
  return "seminarRooms";
}

function conflictCategory(type: string): string {
  if (type === "room_clash") return "Room Double-Booking";
  if (type === "faculty_overlap") return "Faculty Overlap";
  if (type === "section_clash") return "Student Cohort";
  if (type === "capacity_deficit") return "Capacity Deficit";
  return "Safety / Maintenance";
}

export function calculateScheduleAnalytics(
  dataset: SynapseCollegeDataset,
  weekStart: Date = new Date(2026, 9, 19)
): ScheduleAnalytics {
  const slotsById = new Map(dataset.timeSlots.map((slot) => [slot.id, slot]));
  const roomsById = new Map(dataset.classrooms.map((room) => [room.id, room]));
  const activeSessions = dataset.timetableSessions.filter(
    (session) => session.status !== "cancelled" && slotsById.has(session.timeSlotId) && roomsById.has(session.classroomId)
  );
  const activeConflicts = dataset.conflicts.filter((conflict) => conflict.status === "active");
  const totalSlotHours = dataset.timeSlots.reduce(
    (total, slot) => total + hoursForSlot(slot.startTime, slot.endTime),
    0
  );
  const weeklyRoomSlotCapacity = dataset.classrooms.length * dataset.timeSlots.length;
  const weeklyRoomHourCapacity = dataset.classrooms.length * totalSlotHours;
  const weeklyBookedRoomHours = activeSessions.reduce((total, session) => {
    const slot = slotsById.get(session.timeSlotId);
    return total + (slot ? hoursForSlot(slot.startTime, slot.endTime) : 0);
  }, 0);
  const roomUtilizationRate = weeklyRoomHourCapacity > 0
    ? round((weeklyBookedRoomHours / weeklyRoomHourCapacity) * 100)
    : 0;

  const sessionsByRoom = new Map(dataset.classrooms.map((room) => [room.id, [] as typeof activeSessions]));
  const facultyHours = new Map(dataset.faculty.map((faculty) => [faculty.id, 0]));
  for (const session of activeSessions) {
    sessionsByRoom.get(session.classroomId)?.push(session);
    const slot = slotsById.get(session.timeSlotId);
    if (slot) facultyHours.set(session.facultyId, (facultyHours.get(session.facultyId) || 0) + hoursForSlot(slot.startTime, slot.endTime));
  }

  const roomUtilizationRows = dataset.classrooms.map((room) => {
    const sessions = sessionsByRoom.get(room.id) || [];
    const weeklyHours = sessions.reduce((total, session) => {
      const slot = slotsById.get(session.timeSlotId);
      return total + (slot ? hoursForSlot(slot.startTime, slot.endTime) : 0);
    }, 0);
    const utilizationRate = totalSlotHours > 0 ? round((weeklyHours / totalSlotHours) * 100) : 0;
    return {
      roomId: room.id,
      code: room.code,
      type: room.type,
      building: room.building,
      capacity: room.capacity,
      bookedSessions: sessions.length,
      weeklyHours: round(weeklyHours),
      utilizationRate,
    };
  });

  const dayDates = new Map<DayOfWeek, string>();
  DAYS.forEach((day, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
    dayDates.set(day, toDateKey(date));
  });

  const dailyRoomSlots = DAYS.map((day) => {
    const daySlots = dataset.timeSlots.filter((slot) => slot.dayOfWeek === day);
    const daySlotIds = new Set(daySlots.map((slot) => slot.id));
    const daySessions = activeSessions.filter((session) => daySlotIds.has(session.timeSlotId));
    const dateKey = dayDates.get(day);
    const reserved = dataset.reservations.reduce((count, reservation) => {
      if (reservation.status !== "approved" || !reservation.blocksRegularClasses || reservation.date !== dateKey) return count;
      return count + reservation.timeSlotIds.filter((id) => daySlotIds.has(id)).length;
    }, 0);
    const totalPossibleSlots = dataset.classrooms.length * daySlots.length;
    const activeConflictCount = activeConflicts.filter((conflict) => {
      const slot = conflict.timeSlotId ? slotsById.get(conflict.timeSlotId) : undefined;
      return slot?.dayOfWeek === day;
    }).length;
    const available = Math.max(0, totalPossibleSlots - daySessions.length - reserved);
    return {
      day: day.slice(0, 3),
      fullDay: day,
      occupied: daySessions.length,
      available,
      reserved,
      utilizationRate: totalPossibleSlots > 0 ? round((daySessions.length / totalPossibleSlots) * 100) : 0,
      activeConflicts: activeConflictCount,
    };
  });

  const facultyWorkload: FacultyWorkloadRow[] = dataset.faculty.map((faculty) => {
    const assignedHours = round(facultyHours.get(faculty.id) || 0);
    const maxHours = faculty.maxCreditHours;
    return {
      name: faculty.name.replace("Dr. ", "").replace("Prof. ", ""),
      fullName: faculty.name,
      department: faculty.departmentId.replace("DEPT-", ""),
      assignedHours,
      maxHours,
      loadPercentage: maxHours > 0 ? Math.round((assignedHours / maxHours) * 100) : 0,
      isNearCeiling: maxHours > 0 && assignedHours >= maxHours - 2,
    };
  });
  const activeFaculty = dataset.faculty.filter((faculty) => faculty.status === "active");
  const compliantFaculty = activeFaculty.filter((faculty) => (facultyHours.get(faculty.id) || 0) <= faculty.maxCreditHours).length;
  const workloadComplianceRate = activeFaculty.length > 0 ? Math.round((compliantFaculty / activeFaculty.length) * 100) : 0;

  const peak = dataset.timeSlots
    .map((slot) => {
      const occupied = activeSessions.filter((session) => session.timeSlotId === slot.id).length;
      return { label: `${slot.dayOfWeek} · ${slot.label}`, rate: dataset.classrooms.length > 0 ? round((occupied / dataset.classrooms.length) * 100) : 0 };
    })
    .sort((a, b) => b.rate - a.rate)[0] || { label: "No scheduled sessions", rate: 0 };
  if (activeSessions.length === 0) peak.label = "No scheduled sessions";

  const conflictCounts = activeConflicts.reduce<Record<string, number>>((counts, conflict) => {
    const label = conflictCategory(conflict.type);
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const conflictCategories = Object.entries(conflictCounts).map(([name, value]) => ({ name, value }));

  const chartData: ChartDataPoint[] = dailyRoomSlots.map((day) => {
    const daySlots = dataset.timeSlots.filter((slot) => slot.dayOfWeek === day.fullDay);
    const capacityByCategory = dataset.classrooms.reduce<Record<string, number>>((counts, room) => {
      const category = roomCategory(room.type);
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
    const sessionsOnDay = activeSessions.filter((session) => slotsById.get(session.timeSlotId)?.dayOfWeek === day.fullDay);
    const categoryRate = (category: string) => {
      const occupied = sessionsOnDay.filter((session) => roomCategory(roomsById.get(session.classroomId)?.type || "") === category).length;
      const capacity = (capacityByCategory[category] || 0) * daySlots.length;
      return capacity > 0 ? round((occupied / capacity) * 100) : 0;
    };
    return {
      period: day.day,
      roomUtilisation: day.utilizationRate,
      scheduledSessions: day.occupied,
      activeConflicts: day.activeConflicts,
      lectureHalls: categoryRate("lectureHalls"),
      labs: categoryRate("labs"),
      seminarRooms: categoryRate("seminarRooms"),
    };
  });

  const attentionItems: AttentionItem[] = activeConflicts.map((conflict) => {
    const room = conflict.classroomId ? roomsById.get(conflict.classroomId) : undefined;
    const slot = conflict.timeSlotId ? slotsById.get(conflict.timeSlotId) : undefined;
    return {
      id: conflict.id,
      title: conflict.title,
      type: conflict.type === "capacity_deficit" ? "capacity" : "clash",
      severity: conflict.severity === "advisory" ? "info" : conflict.severity,
      timeSlot: slot?.label || "Time not specified",
      location: room ? `${room.code} (${room.capacity} seats)` : undefined,
      description: conflict.description,
      actionLabel: conflict.hasFeasibleAlternative ? "Resolve conflict" : "Review escalation",
      targetUrl: "/conflicts",
    };
  });

  const availableRooms = dataset.classrooms.filter((room) => room.status === "Available").length;
  const pendingExtraClasses = dataset.extraClassRequests.filter((request) => request.status.startsWith("pending")).length;
  const pendingExchanges = dataset.teacherExchangeRequests.filter((request) => request.status.startsWith("pending")).length;
  const utilizationText = `${round(weeklyBookedRoomHours)} of ${round(weeklyRoomHourCapacity)} weekly room-hours booked`;
  const totalScheduleSlots = dataset.classrooms.length * dataset.timeSlots.length;
  const scheduleSlotFillRate = totalScheduleSlots > 0
    ? round((activeSessions.length / totalScheduleSlots) * 100)
    : 0;
  const kpiMetrics: KpiMetrics = {
    scheduledClasses: {
      count: activeSessions.length,
      total: totalScheduleSlots,
      percentage: scheduleSlotFillRate,
      supportingText: `${activeSessions.length} active sessions across ${totalScheduleSlots} weekly room slots`,
    },
    unresolvedConflicts: {
      count: activeConflicts.length,
      roomClashes: activeConflicts.filter((conflict) => conflict.type === "room_clash").length,
      facultyClashes: activeConflicts.filter((conflict) => conflict.type === "faculty_overlap").length,
      criticalCount: activeConflicts.filter((conflict) => conflict.severity === "critical").length,
      warningCount: activeConflicts.filter((conflict) => conflict.severity === "warning").length,
      supportingText: `${activeConflicts.filter((conflict) => conflict.severity === "critical").length} critical • ${activeConflicts.filter((conflict) => conflict.severity === "warning").length} warnings`,
    },
    availableRooms: {
      available: availableRooms,
      total: dataset.classrooms.length,
      occupied: dataset.classrooms.length - availableRooms,
      supportingText: `${availableRooms} of ${dataset.classrooms.length} rooms marked available`,
    },
    roomUtilisation: {
      rate: roomUtilizationRate,
      supportingText: utilizationText,
    },
    pendingApprovals: {
      count: pendingExtraClasses + pendingExchanges,
      classExchanges: pendingExchanges,
      extraClasses: pendingExtraClasses,
      supportingText: `${pendingExchanges} exchanges • ${pendingExtraClasses} extra classes`,
    },
  };

  return {
    activeSessions: activeSessions.length,
    activeConflicts: activeConflicts.length,
    weeklyRoomSlotCapacity,
    weeklyRoomHourCapacity: round(weeklyRoomHourCapacity),
    weeklyBookedRoomHours: round(weeklyBookedRoomHours),
    roomUtilizationRate,
    peakTimeBand: peak,
    activeLearningRooms: dataset.classrooms.filter((room) => room.type === "Lecture Hall" || room.type === "Specialized Laboratory").length,
    workloadComplianceRate,
    roomUtilizationRows,
    dailyRoomSlots,
    facultyWorkload,
    conflictCategories,
    chartData,
    attentionItems,
    kpiMetrics,
  };
}
