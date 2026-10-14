import type { SynapseCollegeDataset } from "@/types/domain";

import { SEED_DEPARTMENTS } from "./departments";
import { SEED_ACADEMIC_TERMS } from "./academic-terms";
import { SEED_USERS } from "./users";
import { SEED_FACULTY } from "./faculty";
import { SEED_SECTIONS } from "./sections";
import { SEED_SUBJECTS } from "./subjects";
import { SEED_TEACHING_ASSIGNMENTS } from "./teaching-assignments";
import { SEED_CLASSROOMS } from "./classrooms";
import { SEED_ROOM_EQUIPMENT } from "./equipment";
import { SEED_TIME_SLOTS } from "./time-slots";
import { SEED_TIMETABLE_SESSIONS } from "./timetable-sessions";
import { SEED_ROOM_RESERVATIONS } from "./reservations";
import { SEED_CONFLICTS } from "./conflicts";
import { SEED_SCHEDULE_VERSIONS, SEED_CHANGE_HISTORY } from "./history";
import { SEED_SYLLABUS_MODULES, SEED_SYLLABUS_PROGRESS } from "./syllabus";
import { SEED_EXTRA_CLASSES } from "./extra-classes";
import { SEED_TEACHER_EXCHANGES } from "./exchanges";

export * from "./departments";
export * from "./academic-terms";
export * from "./users";
export * from "./faculty";
export * from "./sections";
export * from "./subjects";
export * from "./teaching-assignments";
export * from "./classrooms";
export * from "./equipment";
export * from "./time-slots";
export * from "./timetable-sessions";
export * from "./reservations";
export * from "./conflicts";
export * from "./history";
export * from "./syllabus";
export * from "./extra-classes";
export * from "./exchanges";

/**
 * Timora OS — Plausible Institutional Demonstration Dataset
 * "Timora Institute of Technology" (Campus: TIT-NORTH).
 * Cleanly decoupled and validated single source of truth for scheduling operations.
 */
export const SYNAPSE_SEED_DATA: SynapseCollegeDataset = {
  institutionName: "Timora Institute of Technology",
  campusCode: "SIT-NORTH",
  academicTerms: SEED_ACADEMIC_TERMS,
  departments: SEED_DEPARTMENTS,
  users: SEED_USERS,
  faculty: SEED_FACULTY,
  sections: SEED_SECTIONS,
  subjects: SEED_SUBJECTS,
  teachingAssignments: SEED_TEACHING_ASSIGNMENTS,
  classrooms: SEED_CLASSROOMS,
  equipment: SEED_ROOM_EQUIPMENT,
  timeSlots: SEED_TIME_SLOTS,
  timetableSessions: SEED_TIMETABLE_SESSIONS,
  reservations: SEED_ROOM_RESERVATIONS,
  conflicts: SEED_CONFLICTS,
  scheduleVersions: SEED_SCHEDULE_VERSIONS,
  changeHistory: SEED_CHANGE_HISTORY,
  syllabusModules: SEED_SYLLABUS_MODULES,
  syllabusProgress: SEED_SYLLABUS_PROGRESS,
  extraClassRequests: SEED_EXTRA_CLASSES,
  teacherExchangeRequests: SEED_TEACHER_EXCHANGES,
};
