// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { answerDailySchedule } from "../daily-schedule";
import type { CopilotActor } from "../actions";

const faculty: CopilotActor = { id: "USER-VANCE", name: "Dr. Eleanor Vance", role: "faculty_instructor" };
const student: CopilotActor = { id: "USER-STUDENT", name: "Student Account", role: "student_viewer" };
const morning = new Date("2026-10-28T03:00:00Z"); // Wednesday 08:30 in India
const ask = (message: string, actor = faculty, history: Array<{ role: "user" | "assistant"; content: string }> = [], now = morning) =>
  answerDailySchedule({ message, conversationHistory: history }, actor, SYNAPSE_SEED_DATA, now);

describe("grounded daily companion", () => {
  it("finds the signed-in instructor's next future class in institution time", () => {
    const result = ask("Which is my next class?");
    expect(result?.reply).toContain("Wednesday, 2026-10-28");
    expect(result?.reply).toContain("CS-401");
    expect(result?.sources?.[0]?.id).toBe("SESS-CS401-WED");
    expect(ask("Which is my next class?", faculty, [], new Date("2026-10-28T07:00:00Z"))?.sources?.[0]?.id).not.toBe("SESS-CS401-WED");
  });

  it("asks a student for their section and uses it in follow-ups", () => {
    expect(ask("Download today's timetable", student)?.reply).toContain("Which section");
    const result = ask("Download today's timetable", student, [{ role: "user", content: "I am in CSE-5A" }]);
    expect(result?.download?.filename).toContain("cse-5a");
    expect(result?.download?.content).toContain("CS-401");
    expect(result?.download?.content).not.toContain("ECE-305");
    expect(result?.download?.content).not.toContain("Classroom Double-Booking");
    const continued = ask("CSE-5A", student, [
      { role: "user", content: "Download today's timetable" },
      { role: "assistant", content: "Which section are you in?" },
    ]);
    expect(continued?.download?.filename).toContain("cse-5a");
  });

  it("respects one-off dates, cancellation, and effective dates", () => {
    const data = structuredClone(SYNAPSE_SEED_DATA);
    data.timetableSessions = data.timetableSessions.filter((item) => item.id === "SESS-CS401-WED");
    data.timetableSessions[0].isRecurringWeekly = false;
    data.timetableSessions[0].effectiveFrom = "2026-10-28";
    data.timetableSessions[0].effectiveUntil = "2026-10-28";
    expect(answerDailySchedule({ message: "Show my classes today", conversationHistory: [] }, faculty, data, morning)?.sources).toHaveLength(1);
    expect(answerDailySchedule({ message: "Show my classes next Wednesday", conversationHistory: [] }, faculty, data, morning)?.sources).toBeUndefined();
    data.timetableSessions[0].status = "cancelled";
    expect(answerDailySchedule({ message: "Show my classes today", conversationHistory: [] }, faculty, data, morning)?.reply).toContain("No classes");
  });
});
