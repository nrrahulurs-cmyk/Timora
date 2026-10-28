import type { SynapseCollegeDataset, TimetableSession, DayOfWeek } from "@/types/domain";
import type { AssistantResponse } from "@/lib/gemini/assistant";
import type { CopilotActor } from "./actions";
import type { CopilotRequest } from "./service";
import { buildExportRows, generateTimetableCsv } from "@/lib/export/timetable-export-service";

const zone = "Asia/Kolkata";
const weekdays: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const isoDate = (date: Date) => dateFormat.format(date);
const dayOf = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const response = (reply: string, extras: Partial<AssistantResponse> = {}): AssistantResponse => ({ reply, provider: "deterministic-copilot", ...extras });

function activeOn(session: TimetableSession, date: string, data: SynapseCollegeDataset) {
  const slot = data.timeSlots.find((item) => item.id === session.timeSlotId);
  return session.status !== "cancelled" && !!slot && slot.dayOfWeek === dayOf(date)
    && session.effectiveFrom <= date && session.effectiveUntil >= date
    && (session.isRecurringWeekly || session.effectiveFrom === date);
}

function describe(session: TimetableSession, data: SynapseCollegeDataset) {
  const slot = data.timeSlots.find((item) => item.id === session.timeSlotId);
  const subject = data.subjects.find((item) => item.id === session.subjectId);
  const room = data.classrooms.find((item) => item.id === session.classroomId);
  const faculty = data.faculty.find((item) => item.id === session.facultyId);
  const section = data.sections.find((item) => item.id === session.sectionId);
  return `**${slot?.startTime}–${slot?.endTime}** · ${subject?.code || session.subjectId} ${subject?.title || ""} · ${room?.code || "room unassigned"} · ${faculty?.name || "instructor unassigned"} · ${section?.sectionCode || "section unassigned"}`;
}

/** Answers date-sensitive schedule questions from records, before any model can guess. */
export function answerDailySchedule(request: CopilotRequest, actor: CopilotActor, data: SynapseCollegeDataset, now = new Date()): AssistantResponse | null {
  const original = request.message.trim();
  const previousQuestion = request.conversationHistory.filter((item) => item.role === "user").at(-1)?.content || "";
  const sectionReply = data.sections.some((item) => original.toLowerCase().includes(item.sectionCode.toLowerCase()))
    && /^(?:i(?:'m| am) (?:in )?|my section is |section )?[a-z0-9-]+[.!]?$/i.test(original);
  const question = sectionReply && /\b(next|upcoming|today|tomorrow|week|timetable|schedule|classes)\b/i.test(previousQuestion)
    ? `${previousQuestion} ${original}` : original;
  const wantsDownload = /\b(download|export|save)\b/i.test(question) && /\b(timetable|schedule|classes|class)\b/i.test(question);
  const wantsNext = /\b(next|upcoming)\s+(?:scheduled\s+)?(?:class|lecture|lab|session)\b/i.test(question);
  const wantsWeek = /\b(this week|weekly timetable|weekly schedule|my week|week's classes|week’s classes)\b/i.test(question);
  const wantsDay = /\b(today|tomorrow|daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday|20\d{2}-\d{2}-\d{2})\b/i.test(question)
    && /\b(timetable|schedule|classes|class|lectures|sessions)\b/i.test(question);
  if (!wantsDownload && !wantsNext && !wantsDay && !wantsWeek) return null;
  // Actions and proposals still go through the existing validated action pipeline.
  if (/\b(move|reschedule|create|book|add|request|change|shift|cancel)\b/i.test(question)) return null;

  const userHistory = request.conversationHistory.filter((item) => item.role === "user").slice(-6).map((item) => item.content).reverse();
  const namedSection = data.sections.find((item) => question.toLowerCase().includes(item.sectionCode.toLowerCase()));
  const previousSection = userHistory.map((text) => data.sections.find((item) => text.toLowerCase().includes(item.sectionCode.toLowerCase()))).find(Boolean);
  const section = namedSection || previousSection;
  const namedFaculty = data.faculty.find((item) => question.toLowerCase().includes(item.name.toLowerCase()) || question.toLowerCase().includes(item.employeeCode.toLowerCase()));
  const ownFaculty = data.faculty.find((item) => item.userId === actor.id);
  const namedCourse = data.subjects.find((item) => question.toLowerCase().includes(item.code.toLowerCase()) || question.toLowerCase().includes(item.title.toLowerCase()));
  const personal = /\b(my|mine|i|me)\b/i.test(question);
  const faculty = namedFaculty || (!namedSection && !namedCourse && actor.role === "faculty_instructor" ? ownFaculty : undefined);
  if (personal && !section && !faculty && !namedCourse) {
    return response(actor.role === "student_viewer"
      ? "Which section are you in? Give me its code (for example, **CSE-5A**) and I’ll use it for this conversation. Your account does not have an enrollment record yet."
      : "Which section, course, or instructor should I use? I can’t determine a personal timetable from this account.");
  }
  if (!section && !faculty && !namedCourse) return response("Which section, course, or instructor should I check? Give me a section code such as **CSE-5A**.");

  const today = isoDate(now);
  const explicitDate = question.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  const weekday = weekdays.find((day) => new RegExp(`\\b${day}\\b`, "i").test(question));
  let date = explicitDate && !Number.isNaN(Date.parse(`${explicitDate}T12:00:00Z`)) ? explicitDate : /\btomorrow\b/i.test(question) ? addDays(today, 1) : today;
  if (weekday && !explicitDate && !/\b(today|tomorrow)\b/i.test(question)) {
    const current = new Date(`${today}T12:00:00Z`).getUTCDay();
    const target = weekdays.indexOf(weekday) + 1;
    const distance = (target - current + 7) % 7;
    date = addDays(today, /\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(question) && distance === 0 ? 7 : distance);
  }
  const scope = (session: TimetableSession) => (!section || session.sectionId === section.id)
    && (!faculty || session.facultyId === faculty.id)
    && (!namedCourse || session.subjectId === namedCourse.id);
  const scoped = data.timetableSessions.filter(scope);
  const sort = (sessions: TimetableSession[]) => sessions.sort((a, b) =>
    (data.timeSlots.find((item) => item.id === a.timeSlotId)?.startTime || "").localeCompare(data.timeSlots.find((item) => item.id === b.timeSlotId)?.startTime || ""));
  const label = section?.sectionCode || faculty?.name || namedCourse?.code || "schedule";
  const exportCsv = (sessions: TimetableSession[], period: string) => {
    const rows = buildExportRows(sessions, data.subjects, data.classrooms, data.faculty, data.sections, data.timeSlots,
      actor.role === "student_viewer" ? [] : data.conflicts);
    const term = data.academicTerms.find((item) => item.isCurrent);
    const version = data.scheduleVersions.find((item) => item.id === sessions[0].versionId);
    return { filename: `timora-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${period}.csv`,
      mimeType: "text/csv;charset=utf-8" as const,
      content: generateTimetableCsv(rows, { institutionName: data.institutionName, academicTerm: term?.name || "Current term", weekLabel: period,
        sectionCode: section?.sectionCode, generatedAt: now.toISOString(), generatedBy: actor.name, isDraft: version?.status !== "published", version: version?.versionNumber || "current timetable" }),
      label: `Download timetable (CSV)` };
  };

  if (wantsWeek) {
    const monday = addDays(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
    const dates = Array.from({ length: 6 }, (_, index) => addDays(monday, index));
    const days = dates.map((item) => ({ date: item, sessions: sort(scoped.filter((session) => activeOn(session, item, data))) }));
    const all = days.flatMap((item) => item.sessions);
    const reply = all.length
      ? `**This week · ${label}** (${monday} to ${dates[5]})\n\n${days.map((item) => `- **${dayOf(item.date)}:** ${item.sessions.length ? item.sessions.map((session) => `${data.timeSlots.find((slot) => slot.id === session.timeSlotId)?.startTime} ${data.subjects.find((subject) => subject.id === session.subjectId)?.code}`).join(", ") : "No classes"}`).join("\n")}\n\n${all.length} scheduled classes across ${days.filter((item) => item.sessions.length).length} days.`
      : `No classes are scheduled this week for **${label}** in the current timetable.`;
    return response(reply + (wantsDownload && all.length ? "\n\nYour CSV timetable is ready to download." : ""), {
      sources: all.map((session) => ({ type: "session", id: session.id, label: describe(session, data).replaceAll("**", "") })),
      ...(wantsDownload && all.length ? { download: exportCsv(all, `${monday}-week`) } : {}),
    });
  }

  if (wantsNext) {
    const currentTime = timeFormat.format(now);
    for (let offset = 0; offset < 8; offset++) {
      const candidateDate = addDays(today, offset);
      const candidate = sort(scoped.filter((item) => activeOn(item, candidateDate, data)))
        .find((item) => offset > 0 || (data.timeSlots.find((slot) => slot.id === item.timeSlotId)?.startTime || "") > currentTime);
      if (candidate) return response(`Your next class for **${label}** is **${dayOf(candidateDate)}, ${candidateDate}**:\n\n${describe(candidate, data)}`, {
        sources: [{ type: "session", id: candidate.id, label: `${label} · ${candidateDate}` }],
      });
    }
    return response(`I found no upcoming class for **${label}** in the next seven days of the current timetable.`);
  }

  const sessions = sort(scoped.filter((item) => activeOn(item, date, data)));
  const heading = `**${dayOf(date)}, ${date}** · ${label}`;
  const sources = sessions.map((item) => ({ type: "session", id: item.id, label: describe(item, data).replaceAll("**", "") }));
  if (!sessions.length) return response(`No classes are scheduled for ${heading} in the current timetable.`);
  const reply = `${heading}\n\n${sessions.map((item) => `- ${describe(item, data)}`).join("\n")}`;
  if (!wantsDownload) return response(reply, { sources });
  return response(`${reply}\n\nYour CSV timetable is ready to download.`, { sources, download: {
    ...exportCsv(sessions, date), label: `Download ${dayOf(date)} timetable (CSV)`,
  } });
}
