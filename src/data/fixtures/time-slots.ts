import type { TimeSlot, DayOfWeek } from "@/types/domain";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const WEEKDAY_SLOT_DEFS = [
  { index: 1, start: "08:30", end: "10:00", label: "08:30 - 10:00 AM", isMorning: true, isPeak: false },
  { index: 2, start: "10:00", end: "11:30", label: "10:00 - 11:30 AM", isMorning: true, isPeak: true },
  { index: 3, start: "11:30", end: "13:00", label: "11:30 AM - 01:00 PM", isMorning: true, isPeak: true },
  { index: 4, start: "14:00", end: "15:30", label: "02:00 - 03:30 PM", isMorning: false, isPeak: false },
  { index: 5, start: "15:30", end: "17:00", label: "03:30 - 05:00 PM", isMorning: false, isPeak: false },
];

export const SEED_TIME_SLOTS: TimeSlot[] = [
  ...DAYS.flatMap((day) =>
    WEEKDAY_SLOT_DEFS.map((def) => ({
      id: `SLOT-${day.slice(0, 3).toUpperCase()}-${def.index}`,
      dayOfWeek: day,
      slotIndex: def.index,
      startTime: def.start,
      endTime: def.end,
      label: `${day} ${def.label}`,
      isMorning: def.isMorning,
      isPeakHour: def.isPeak,
    }))
  ),
  {
    id: "SLOT-SAT-1",
    dayOfWeek: "Saturday" as DayOfWeek,
    slotIndex: 1,
    startTime: "09:00",
    endTime: "10:30",
    label: "Saturday 09:00 - 10:30 AM",
    isMorning: true,
    isPeakHour: false,
  },
  {
    id: "SLOT-SAT-2",
    dayOfWeek: "Saturday" as DayOfWeek,
    slotIndex: 2,
    startTime: "10:30",
    endTime: "12:00",
    label: "Saturday 10:30 AM - 12:00 PM",
    isMorning: true,
    isPeakHour: false,
  },
];
