import type { SynapseCollegeDataset, TimetableSession } from "@/types/domain";
import { previewSchedulePlan, type SchedulePlan } from "./plan";

export const IMPORT_COLUMNS = ["course", "section", "faculty", "room", "day", "start_time", "end_time", "date"] as const;
export type ImportRow = Record<typeof IMPORT_COLUMNS[number], string>;
const normalize = (value: string) => value.trim().toLowerCase();

/** RFC-style quoted CSV, bounded before any record matching or schedule writes. */
export function parseTimetableCsv(text: string): string[][] {
  if (text.length > 1_000_000) throw new Error("Use a file smaller than 1 MB.");
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false; let closed = false;
  const pushField = () => { row.push(field.trim()); field = ""; closed = false; if (row.length > 30) throw new Error("Too many columns."); };
  const pushRow = () => { pushField(); if (row.some(Boolean)) rows.push(row); row = []; if (rows.length > 201) throw new Error("Import up to 200 sessions at a time."); };
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) { if (character === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } } else field += character; }
    else if (character === '"' && !field && !closed) quoted = true;
    else if (character === ",") pushField();
    else if (character === "\n" || character === "\r") { if (character === "\r" && text[i + 1] === "\n") i++; pushRow(); }
    else if (closed && character.trim()) throw new Error("Unexpected text after a quoted CSV field.");
    else if (character === '"') throw new Error("Quote the entire field when it contains quotation marks.");
    else field += character;
  }
  if (quoted) throw new Error("A quoted CSV field was not closed.");
  if (field || row.length || closed) pushRow();
  return rows;
}

export function rowsFromMatrix(matrix: string[][]): ImportRow[] {
  if (matrix.length < 2) throw new Error("The file needs a header and at least one session.");
  if (matrix.length > 201) throw new Error("Import up to 200 sessions at a time.");
  const headers = matrix[0].map(value => normalize(value.replace(/^\uFEFF/, "")));
  if (new Set(headers).size !== headers.length) throw new Error("Column headers must be unique.");
  const missing = IMPORT_COLUMNS.filter(column => column !== "date" && !headers.includes(column));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}. Download the template for the supported format.`);
  return matrix.slice(1).filter(row => row.some(value => value.trim())).map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(IMPORT_COLUMNS.map(column => [column, values[headers.indexOf(column)]?.trim() || ""])) as ImportRow;
  });
}

function match<T>(records: T[], value: string, keys: (record: T) => string[], label: string) {
  const found = records.filter(record => keys(record).some(key => normalize(key) === normalize(value)));
  if (found.length !== 1) throw new Error(`${label} “${value || "(empty)"}” ${found.length ? "is ambiguous" : "was not found"}. Use its exact code or ID.`);
  return found[0];
}
function stableId(value: string) { let hash = 2166136261; for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619); return `IMPORT-${(hash >>> 0).toString(16)}`; }
export function previewTimetableImport(rows: ImportRow[], dataset: SynapseCollegeDataset) {
  const errors: string[] = []; const inserts: TimetableSession[] = [];
  const draft = dataset.scheduleVersions.find(version => version.status === "draft");
  const term = dataset.academicTerms.find(item => item.id === draft?.academicTermId);
  if (!draft || !term) return { errors: ["Create a draft academic schedule before importing."], plan: null };
  if (!rows.length || rows.length > 200) return { errors: ["Import between 1 and 200 sessions."], plan: null };
  rows.forEach((row, index) => {
    try {
      if (Object.values(row).some(value => value.length > 200 || /^[=+@]/.test(value))) throw new Error("Use plain text values; formulas and oversized cells are not supported.");
      const subject = match(dataset.subjects, row.course, item => [item.id, item.code, item.title], "Course");
      const section = match(dataset.sections, row.section, item => [item.id, item.sectionCode], "Section");
      const faculty = match(dataset.faculty, row.faculty, item => [item.id, item.employeeCode, item.name], "Faculty");
      const room = match(dataset.classrooms, row.room, item => [item.id, item.code, item.name], "Room");
      const slot = dataset.timeSlots.filter(item => normalize(item.dayOfWeek) === normalize(row.day) && item.startTime === row.start_time && item.endTime === row.end_time);
      if (slot.length !== 1) throw new Error("Use an exact institutional weekday and time range in HH:MM format.");
      const dates = row.date ? [row.date, row.date] : [term.startDate, term.endDate];
      const id = stableId([term.id, subject.id, section.id, faculty.id, room.id, slot[0].id, ...dates].join("|"));
      inserts.push({ id, academicTermId: term.id, versionId: draft.id, subjectId: subject.id, sectionId: section.id, facultyId: faculty.id, classroomId: room.id, timeSlotId: slot[0].id, status: row.date ? "extra_session" : "scheduled", isRecurringWeekly: !row.date, effectiveFrom: dates[0], effectiveUntil: dates[1] });
    } catch (error) { errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : "Invalid record."}`); }
  });
  const plan: SchedulePlan = { updates: [], inserts, reason: "Reviewed timetable import" };
  if (!errors.length) {
    try { errors.push(...previewSchedulePlan(dataset, plan).errors); }
    catch (error) { errors.push(error instanceof Error ? error.message : "Invalid schedule values."); }
  }
  return { errors, plan: errors.length ? null : plan };
}
