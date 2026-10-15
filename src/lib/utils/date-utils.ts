import type { DayOfWeek } from "@/types/domain";

export interface WeekDayDetail {
  day: DayOfWeek;
  shortDay: string;
  dayNum: number;
  monthName: string;
  year: number;
  dateString: string;
  isToday: boolean;
}

export interface WeekScheduleDetails {
  weekNumber: number;
  baseMonday: Date;
  saturdayDate: Date;
  formattedRange: string;
  days: WeekDayDetail[];
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Calculates accurate academic week dates based on Fall 2026 academic calendar.
 * Anchor: Fall 2026 Week 9 begins on Monday, October 19, 2026.
 * Anchor today: Tuesday, October 20, 2026.
 */
export function getWeekScheduleDetails(weekOffset: number = 0): WeekScheduleDetails {
  const weekNumber = 9 + weekOffset;

  // Anchor Monday: October 19, 2026 (Month is 0-indexed, so 9 = October)
  const baseMonday = new Date(2026, 9, 19, 0, 0, 0, 0);
  baseMonday.setDate(baseMonday.getDate() + weekOffset * 7);

  const days: WeekDayDetail[] = DAYS_OF_WEEK.map((dayName, idx) => {
    const dayDate = new Date(baseMonday);
    dayDate.setDate(baseMonday.getDate() + idx);

    const dayNum = dayDate.getDate();
    const monthName = dayDate.toLocaleDateString("en-US", { month: "short" });
    const year = dayDate.getFullYear();
    const dateString = `${monthName} ${dayNum}, ${year}`;

    // Anchor reference today is Tuesday Oct 20, 2026
    const isAnchorToday =
      dayDate.getFullYear() === 2026 &&
      dayDate.getMonth() === 9 &&
      dayDate.getDate() === 20;

    return {
      day: dayName,
      shortDay: SHORT_DAYS[idx],
      dayNum,
      monthName,
      year,
      dateString,
      isToday: isAnchorToday,
    };
  });

  const saturdayDate = new Date(baseMonday);
  saturdayDate.setDate(baseMonday.getDate() + 5);

  const startMonth = baseMonday.toLocaleDateString("en-US", { month: "short" });
  const startDay = baseMonday.getDate();
  const endMonth = saturdayDate.toLocaleDateString("en-US", { month: "short" });
  const endDay = saturdayDate.getDate();
  const endYear = saturdayDate.getFullYear();

  const formattedRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${endYear}`;

  return {
    weekNumber,
    baseMonday,
    saturdayDate,
    formattedRange,
    days,
  };
}
