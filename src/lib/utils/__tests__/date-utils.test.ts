import { describe, expect, it } from "vitest";
import { getCurrentAcademicWeekOffset, getWeekScheduleDetails } from "@/lib/utils/date-utils";

describe("academic timetable dates", () => {
  it("selects the week containing the current date", () => {
    const tuesday = new Date(2026, 9, 27, 12);
    expect(getCurrentAcademicWeekOffset(tuesday)).toBe(1);
    expect(getWeekScheduleDetails(1, tuesday)).toMatchObject({
      weekNumber: 10,
      formattedRange: "Oct 26 – Oct 31, 2026",
    });
  });

  it("marks today inside the displayed week and keeps the range aligned", () => {
    const week = getWeekScheduleDetails(1, new Date(2026, 9, 27, 12));

    expect(week.days.filter((day) => day.isToday).map((day) => day.dateString)).toEqual(["Oct 27, 2026"]);
    expect(week.formattedRange).toContain(`${week.days[0].monthName} ${week.days[0].dayNum}`);
    expect(week.formattedRange).toContain(`${week.days[5].monthName} ${week.days[5].dayNum}`);
  });
});
