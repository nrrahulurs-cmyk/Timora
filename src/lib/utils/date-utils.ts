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
 * Calculates academic week dates based on the Fall 2026 calendar.
 * Anchor: Week 9 begins on Monday, October 19, 2026.
 */
export function getCurrentAcademicWeekOffset(today: Date): number {
  const dayNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  const todayIndex = dayNumber(today);
  const todayWeekday = new Date(todayIndex * 86_400_000).getUTCDay();
  const todayMonday = todayIndex - ((todayWeekday + 6) % 7);
  const anchorMonday = Math.floor(Date.UTC(2026, 9, 19) / 86_400_000);
  return Math.floor((todayMonday - anchorMonday) / 7);
}

export function getWeekScheduleDetails(
  weekOffset: number,
  today: Date
): WeekScheduleDetails {
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

    const isCurrentDay = dayDate.getFullYear() === today.getFullYear()
      && dayDate.getMonth() === today.getMonth()
      && dayDate.getDate() === today.getDate();

    return {
      day: dayName,
      shortDay: SHORT_DAYS[idx],
      dayNum,
      monthName,
      year,
      dateString,
      isToday: isCurrentDay,
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
