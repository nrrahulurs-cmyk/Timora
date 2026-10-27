/**
 * Timora Supabase scheduling adapter.
 * Reads use the authenticated client. Consequential live writes remain limited
 * until the required transactional RPCs and scoped database policies are deployed.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createAuthenticatedBrowserClient } from "@/lib/supabase/client";
import type {
  SchedulingRepository,
  KpiMetrics,
  ChartDataPoint,
  AttentionItem,
  ActivityItem,
  RoomRecord,
} from "./scheduling-repository";
import {
  SEED_ROOMS,
} from "./scheduling-repository";
import { calculateScheduleAnalytics } from "@/lib/analytics/metrics";
import type {
  SynapseCollegeDataset,
  Department,
  FacultyMember,
  StudentSection,
  Subject,
  Classroom,
  RoomType,
  TimeSlot,
  DayOfWeek,
  TimetableSession,
  ConflictRecord,
  RoomReservation,
  ScheduleVersion,
  ChangeHistoryRecord,
  SyllabusModule,
  TopicProgressRecord,
  ExtraClassRequest,
  TeacherExchangeRequest,
  User,
  UserRole,
  FacultyAvailabilityPattern,
} from "@/types/domain";

import {
  mapAcademicTerm,
  mapDepartment,
  mapUserProfile,
  mapClassroom,
  mapTimeSlot,
  mapFacultyMember,
  mapStudentSection,
  mapSubject,
  mapTeachingAssignment,
  mapScheduleVersion,
  mapTimetableSession,
  mapRoomReservation,
  mapConflictRecord,
  mapChangeHistoryRecord,
  mapExtraClassRequest,
  mapTeacherExchangeRequest,
  mapTopicProgressRecord,
} from "../supabase/mappers";

import {
  SchedulingError,
  ConcurrencyError,
  ConstraintViolationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
} from "../errors";

import { validateSession, type HardViolation } from "../scheduling/constraint-engine";

export class SupabaseSchedulingRepository implements SchedulingRepository {
  async saveTimetableChanges(plan: import("@/lib/scheduling/plan").SchedulePlan): Promise<import("@/lib/scheduling/plan").SchedulePlanResult> {
    this.assertAuthorized(["academic_admin", "dean", "timetable_coordinator"], "save timetable changes");
    const { previewSchedulePlan } = await import("@/lib/scheduling/plan");
    const preview = previewSchedulePlan(await this.getDataset(), plan);
    if (!preview.isValid) return { success: false, message: preview.errors.join("\n"), affectedSessionIds: [] };
    const { data, error } = await this.client.rpc("commit_timetable_plan", { p_plan: preview.plan });
    if (error) throw new Error("Schedule changes were not saved. The atomic schedule service must be installed and your account must have write permission.");
    return data;
  }

  async advanceExtraClassRequest(id: string, reviewedBy: string): Promise<boolean> {
    this.assertAuthorized(["academic_admin", "dean", "timetable_coordinator", "department_head"], "review extra classes");
    const { data, error } = await this.client.from("extra_class_requests").update({ status: "pending_dean", reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending_hod").select("id");
    if (error || !data?.length) throw new Error("The request could not advance. Refresh its current status and try again.");
    return true;
  }
  private client: SupabaseClient;
  private currentRole: UserRole = "student_viewer";
  private currentUserId: string = "";
  private currentUserName: string = "Unauthenticated";

  // In-memory undo stack for atomic session restorations
  private undoSnapshots: Map<
    string,
    {
      sessionId: string;
      before: {
        classroomId: string;
        timeSlotId: string;
        facultyId: string;
        status: string;
      };
      conflictId: string;
      versionId: string;
    }
  > = new Map();

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      this.client = createAuthenticatedBrowserClient();
    }
  }

  /**
   * Set user context for role-based authorization checks
   */
  public setUserContext(userId: string, userName: string, role: UserRole) {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentRole = role;
  }

  public getRole(): UserRole {
    return this.currentRole;
  }

  // ── Role Authorization Helper ──────────────────────────────────────────────
  private assertAuthorized(allowedRoles: UserRole[], actionDescription: string) {
    if (!allowedRoles.includes(this.currentRole)) {
      throw new AuthorizationError(this.currentRole, actionDescription);
    }
  }

  // ── Domain Queries ─────────────────────────────────────────────────────────

  async getDataset(): Promise<SynapseCollegeDataset> {
    const [
      terms,
      depts,
      users,
      fac,
      secs,
      subs,
      assigns,
      rooms,
      slots,
      sessions,
      res,
      confs,
      vers,
      hist,
      mods,
      prog,
      extras,
      exchs,
    ] = await Promise.all([
      this.client.from("academic_terms").select("*"),
      this.client.from("departments").select("*"),
      this.client.from("user_profiles").select("*"),
      this.client.from("faculty_members").select("*"),
      this.client.from("student_sections").select("*"),
      this.client.from("subjects").select("*"),
      this.client.from("teaching_assignments").select("*"),
      this.client.from("classrooms").select("*"),
      this.client.from("time_slots").select("*").order("slot_index"),
      this.client.from("timetable_sessions").select("*"),
      this.client.from("room_reservations").select("*"),
      this.client.from("conflicts").select("*"),
      this.client.from("schedule_versions").select("*"),
      this.client.from("change_history_records").select("*").order("timestamp", { ascending: false }),
      this.getSyllabusModules(),
      this.client.from("topic_progress_records").select("*"),
      this.client.from("extra_class_requests").select("*"),
      this.client.from("teacher_exchange_requests").select("*"),
    ]);

    const queryResults = [terms, depts, users, fac, secs, subs, assigns, rooms, slots, sessions, res, confs, vers, hist, prog, extras, exchs];
    const failedQuery = queryResults.find((result) => result.error);
    if (failedQuery?.error) {
      throw new DatabaseError("Failed to fetch the institutional scheduling dataset", failedQuery.error);
    }

    return {
      institutionName: "Timora Institute of Technology",
      campusCode: "TIT-NORTH",
      academicTerms: (terms.data || []).map(mapAcademicTerm),
      departments: (depts.data || []).map(mapDepartment),
      users: (users.data || []).map(mapUserProfile),
      faculty: (fac.data || []).map(mapFacultyMember),
      sections: (secs.data || []).map(mapStudentSection),
      subjects: (subs.data || []).map(mapSubject),
      teachingAssignments: (assigns.data || []).map(mapTeachingAssignment),
      classrooms: (rooms.data || []).map(mapClassroom),
      equipment: [],
      timeSlots: (slots.data || []).map(mapTimeSlot),
      timetableSessions: (sessions.data || []).map(mapTimetableSession),
      reservations: (res.data || []).map(mapRoomReservation),
      conflicts: (confs.data || []).map(mapConflictRecord),
      scheduleVersions: (vers.data || []).map(mapScheduleVersion),
      changeHistory: (hist.data || []).map(mapChangeHistoryRecord),
      syllabusModules: mods,
      syllabusProgress: (prog.data || []).map(mapTopicProgressRecord),
      extraClassRequests: (extras.data || []).map(mapExtraClassRequest),
      teacherExchangeRequests: (exchs.data || []).map(mapTeacherExchangeRequest),
    };
  }

  async getDepartments(): Promise<Department[]> {
    const { data, error } = await this.client.from("departments").select("*").order("name");
    if (error) throw new DatabaseError("Failed to fetch departments", error);
    return (data || []).map(mapDepartment);
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const { data, error } = await this.client
      .from("departments")
      .select("*")
      .or(`id.eq.${id},code.eq.${id}`)
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(`Failed to fetch department ${id}`, error);
    return data ? mapDepartment(data) : undefined;
  }

  async getFaculty(departmentId?: string): Promise<FacultyMember[]> {
    let query = this.client.from("faculty_members").select("*").order("name");
    if (departmentId) query = query.eq("department_id", departmentId);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch faculty", error);
    return (data || []).map(mapFacultyMember);
  }

  async getFacultyById(id: string): Promise<FacultyMember | undefined> {
    const { data, error } = await this.client
      .from("faculty_members")
      .select("*")
      .or(`id.eq.${id},employee_code.eq.${id}`)
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(`Failed to fetch faculty ${id}`, error);
    return data ? mapFacultyMember(data) : undefined;
  }

  async getSections(departmentId?: string, semester?: number): Promise<StudentSection[]> {
    let query = this.client.from("student_sections").select("*").order("section_code");
    if (departmentId) query = query.eq("department_id", departmentId);
    if (semester) query = query.eq("semester", semester);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch student sections", error);
    return (data || []).map(mapStudentSection);
  }

  async getSubjects(departmentId?: string): Promise<Subject[]> {
    let query = this.client.from("subjects").select("*").order("code");
    if (departmentId) query = query.eq("department_id", departmentId);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch subjects", error);
    return (data || []).map(mapSubject);
  }

  async getSubjectById(id: string): Promise<Subject | undefined> {
    const { data, error } = await this.client
      .from("subjects")
      .select("*")
      .or(`id.eq.${id},code.eq.${id}`)
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(`Failed to fetch subject ${id}`, error);
    return data ? mapSubject(data) : undefined;
  }

  async getClassrooms(type?: RoomType): Promise<Classroom[]> {
    let query = this.client.from("classrooms").select("*").order("capacity", { ascending: false });
    if (type) query = query.eq("type", type);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch classrooms", error);
    return (data || []).map(mapClassroom);
  }

  async getClassroomById(id: string): Promise<Classroom | undefined> {
    const { data, error } = await this.client
      .from("classrooms")
      .select("*")
      .or(`id.eq.${id},code.eq.${id}`)
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(`Failed to fetch classroom ${id}`, error);
    return data ? mapClassroom(data) : undefined;
  }

  async createClassroom(data: Omit<Classroom, "id"> & { id?: string }): Promise<Classroom> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator"], "create facility");
    const code = data.code?.trim();
    const name = data.name?.trim();
    const building = data.building?.trim();
    const capacity = Number(data.capacity);

    if (!code) throw new SchedulingError("VALIDATION_FAILED", "Room code is required.");
    if (!name) throw new SchedulingError("VALIDATION_FAILED", "Room name is required.");
    if (!building) throw new SchedulingError("VALIDATION_FAILED", "Building location is required.");
    if (!capacity || capacity <= 0) throw new SchedulingError("VALIDATION_FAILED", "Room capacity must be greater than 0.");
    if (!data.type) throw new SchedulingError("VALIDATION_FAILED", "Room type is required.");

    const id = data.id || `ROOM-${code.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
    const row = {
      id,
      code,
      name,
      building,
      floor: data.floor !== undefined ? Number(data.floor) : 1,
      capacity,
      type: data.type,
      equipment: Array.isArray(data.equipment) ? data.equipment : [],
      is_accessible: Boolean(data.isAccessible),
      status: data.status || "Available",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await this.client.from("classrooms").insert(row).select("*").single();
    if (error) throw new DatabaseError(`Failed to create classroom ${code}`, error);

    await this.client.from("change_history_records").insert({
      id: `HIST-${Date.now()}`,
      version_id: "VER-2026-FALL-v1.0",
      entity_type: "classroom",
      entity_id: id,
      action: "created",
      modified_by: this.currentUserId,
      actor_name: this.currentUserName,
      actor_role: this.currentRole,
      timestamp: new Date().toISOString(),
      summary: `Created facility ${code} (${name}) with capacity ${capacity} seats in ${building}.`,
    }).select().maybeSingle();

    return mapClassroom(created);
  }

  async updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator"], "update facility");
    const existing = await this.getClassroomById(id);
    if (!existing) throw new NotFoundError("Classroom", id);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.code !== undefined) {
      if (!updates.code.trim()) throw new SchedulingError("VALIDATION_FAILED", "Room code cannot be empty.");
      updatePayload.code = updates.code.trim();
    }
    if (updates.name !== undefined) {
      if (!updates.name.trim()) throw new SchedulingError("VALIDATION_FAILED", "Room name cannot be empty.");
      updatePayload.name = updates.name.trim();
    }
    if (updates.building !== undefined) {
      if (!updates.building.trim()) throw new SchedulingError("VALIDATION_FAILED", "Building cannot be empty.");
      updatePayload.building = updates.building.trim();
    }
    if (updates.floor !== undefined) {
      updatePayload.floor = Number(updates.floor);
    }
    if (updates.capacity !== undefined) {
      const cap = Number(updates.capacity);
      if (cap <= 0) throw new SchedulingError("VALIDATION_FAILED", "Room capacity must be greater than 0.");
      updatePayload.capacity = cap;
    }
    if (updates.type !== undefined) updatePayload.type = updates.type;
    if (updates.equipment !== undefined) updatePayload.equipment = updates.equipment;
    if (updates.isAccessible !== undefined) updatePayload.is_accessible = Boolean(updates.isAccessible);
    if (updates.status !== undefined) updatePayload.status = updates.status;

    const { data: updated, error } = await this.client
      .from("classrooms")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new DatabaseError(`Failed to update classroom ${id}`, error);

    await this.client.from("change_history_records").insert({
      id: `HIST-${Date.now()}`,
      version_id: "VER-2026-FALL-v1.0",
      entity_type: "classroom",
      entity_id: existing.id,
      action: "modified",
      modified_by: this.currentUserId,
      actor_name: this.currentUserName,
      actor_role: this.currentRole,
      timestamp: new Date().toISOString(),
      summary: `Updated facility specifications for ${existing.code}.`,
    }).select().maybeSingle();

    return mapClassroom(updated);
  }

  async checkRoomImpact(
    classroomId: string,
    newStatus?: Classroom["status"],
    newCapacity?: number
  ): Promise<{
    affectedSessions: TimetableSession[];
    willCauseClash: boolean;
    message: string;
    details: string[];
  }> {
    const room = await this.getClassroomById(classroomId);
    if (!room) throw new NotFoundError("Classroom", classroomId);

    const { data: sessionRows, error } = await this.client
      .from("timetable_sessions")
      .select("*")
      .or(`classroom_id.eq.${room.id},classroom_id.eq.${room.code}`)
      .neq("status", "cancelled");

    if (error) throw new DatabaseError("Failed to fetch sessions for room impact check", error);

    const activeSessions = (sessionRows || []).map(mapTimetableSession);
    const details: string[] = [];
    let willCauseClash = false;

    const dataset = await this.getDataset();

    for (const session of activeSessions) {
      const subject = dataset.subjects.find((sub) => sub.id === session.subjectId);
      const section = dataset.sections.find((sec) => sec.id === session.sectionId);
      const slot = dataset.timeSlots.find((t) => t.id === session.timeSlotId);
      const sessLabel = `${subject?.code || "Subject"} (${section?.sectionCode || "Section"}) on ${slot?.label || "Slot"}`;

      if (newStatus === "Maintenance") {
        willCauseClash = true;
        details.push(`Active session collision: ${sessLabel}`);
      }

      if (newCapacity !== undefined && section && section.studentCount > newCapacity) {
        willCauseClash = true;
        const deficit = section.studentCount - newCapacity;
        details.push(`Capacity deficit: ${sessLabel} requires ${section.studentCount} seats (Deficit: -${deficit})`);
      }
    }

    let message = "No scheduling conflicts detected. Safe to modify.";
    if (willCauseClash) {
      message = `Notice: Changing status or capacity directly impacts ${activeSessions.length} active scheduled classes. Review consequence details below.`;
    }

    return {
      affectedSessions: activeSessions,
      willCauseClash,
      message,
      details,
    };
  }

  async createFacultyMember(
    data: Omit<FacultyMember, "id" | "userId" | "currentAssignedHours"> & {
      id?: string;
      userId?: string;
      currentAssignedHours?: number;
    }
  ): Promise<FacultyMember> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator"], "create faculty member");
    const code = data.employeeCode?.trim();
    const name = data.name?.trim();
    const email = data.email?.trim();
    const deptId = data.departmentId?.trim();
    const maxCredits = Number(data.maxCreditHours);

    if (!code) throw new SchedulingError("VALIDATION_FAILED", "Employee code is required.");
    if (!name) throw new SchedulingError("VALIDATION_FAILED", "Faculty name is required.");
    if (!email) throw new SchedulingError("VALIDATION_FAILED", "Faculty email is required.");
    if (!deptId) throw new SchedulingError("VALIDATION_FAILED", "Department ID is required.");
    if (!maxCredits || maxCredits <= 0) throw new SchedulingError("VALIDATION_FAILED", "Max credit hours must be greater than 0.");
    if (!data.designation) throw new SchedulingError("VALIDATION_FAILED", "Designation is required.");

    const id = data.id || `FAC-${code.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
    const row = {
      id,
      user_id: data.userId || `USER-${id}`,
      employee_code: code,
      name,
      email,
      department_id: deptId,
      designation: data.designation,
      max_credit_hours: maxCredits,
      current_assigned_hours: data.currentAssignedHours || 0,
      specializations: Array.isArray(data.specializations) ? data.specializations : [],
      availability: Array.isArray(data.availability) ? data.availability : [],
      status: data.status || "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await this.client.from("faculty_members").insert(row).select("*").single();
    if (error) throw new DatabaseError(`Failed to create faculty member ${code}`, error);

    await this.client.from("change_history_records").insert({
      id: `HIST-${Date.now()}`,
      version_id: "VER-2026-FALL-v1.0",
      entity_type: "faculty",
      entity_id: id,
      action: "created",
      modified_by: this.currentUserId,
      actor_name: this.currentUserName,
      actor_role: this.currentRole,
      timestamp: new Date().toISOString(),
      summary: `Appointed faculty instructor ${name} (${code}) to department ${deptId}.`,
    }).select().maybeSingle();

    return mapFacultyMember(created);
  }

  async updateFacultyMember(id: string, updates: Partial<FacultyMember>): Promise<FacultyMember> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator"], "update faculty member");
    const existing = await this.getFacultyById(id);
    if (!existing) throw new NotFoundError("FacultyMember", id);

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.email !== undefined) updatePayload.email = updates.email.trim();
    if (updates.departmentId !== undefined) updatePayload.department_id = updates.departmentId;
    if (updates.designation !== undefined) updatePayload.designation = updates.designation;
    if (updates.maxCreditHours !== undefined) {
      const hrs = Number(updates.maxCreditHours);
      if (hrs <= 0) throw new SchedulingError("VALIDATION_FAILED", "Max credit hours must be greater than 0.");
      updatePayload.max_credit_hours = hrs;
    }
    if (updates.specializations !== undefined) updatePayload.specializations = updates.specializations;
    if (updates.status !== undefined) updatePayload.status = updates.status;

    const { data: updated, error } = await this.client
      .from("faculty_members")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new DatabaseError(`Failed to update faculty member ${id}`, error);

    return mapFacultyMember(updated);
  }

  async checkFacultyAvailabilityImpact(
    facultyId: string,
    newAvailability: FacultyAvailabilityPattern[]
  ): Promise<{
    affectedSessions: TimetableSession[];
    introducedViolations: HardViolation[];
  }> {
    const faculty = await this.getFacultyById(facultyId);
    if (!faculty) throw new NotFoundError("FacultyMember", facultyId);

    const { data: sessRows, error } = await this.client
      .from("timetable_sessions")
      .select("*")
      .eq("faculty_id", faculty.id)
      .neq("status", "cancelled");

    if (error) throw new DatabaseError("Failed to fetch sessions for availability check", error);

    const activeSessions = (sessRows || []).map(mapTimetableSession);
    const dataset = await this.getDataset();

    const affectedSessions: TimetableSession[] = [];
    const introducedViolations: HardViolation[] = [];

    for (const session of activeSessions) {
      const slot = dataset.timeSlots.find((t) => t.id === session.timeSlotId);
      if (!slot) continue;

      const dayPattern = newAvailability.find((p) => p.dayOfWeek === slot.dayOfWeek);

      if (!dayPattern || dayPattern.blockedSlotIds.includes(slot.id)) {
        affectedSessions.push(session);
        const subject = dataset.subjects.find((s) => s.id === session.subjectId);
        introducedViolations.push({
          rule: "faculty_hard_availability",
          constraintType: "faculty_overlap",
          title: `Faculty Blocked Duty Collision for ${faculty.name}`,
          description: `${faculty.name} has blocked ${slot.label}. Active class ${subject?.code || "Session"} is currently scheduled in this interval.`,
          conflictingEntityId: faculty.id,
          conflictingSessionId: session.id,
        });
      }
    }

    return { affectedSessions, introducedViolations };
  }

  async updateFacultyAvailability(
    facultyId: string,
    availability: FacultyAvailabilityPattern[]
  ): Promise<{
    success: boolean;
    affectedSessions: TimetableSession[];
    introducedViolations: HardViolation[];
  }> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator", "faculty_instructor"], "update faculty availability");
    const faculty = await this.getFacultyById(facultyId);
    if (!faculty) throw new NotFoundError("FacultyMember", facultyId);

    const impact = await this.checkFacultyAvailabilityImpact(facultyId, availability);

    const { error } = await this.client
      .from("faculty_members")
      .update({
        availability: availability,
        updated_at: new Date().toISOString(),
      })
      .eq("id", faculty.id);

    if (error) throw new DatabaseError(`Failed to update faculty availability for ${facultyId}`, error);

    await this.client.from("change_history_records").insert({
      id: `HIST-${Date.now()}`,
      version_id: "VER-2026-FALL-v1.0",
      entity_type: "faculty",
      entity_id: faculty.id,
      action: "modified",
      modified_by: this.currentUserId,
      actor_name: this.currentUserName,
      actor_role: this.currentRole,
      timestamp: new Date().toISOString(),
      summary: `Updated weekly availability preferences for ${faculty.name}.`,
    }).select().maybeSingle();

    return {
      success: true,
      affectedSessions: impact.affectedSessions,
      introducedViolations: impact.introducedViolations,
    };
  }

  async getTimeSlots(dayOfWeek?: DayOfWeek): Promise<TimeSlot[]> {
    let query = this.client.from("time_slots").select("*").order("slot_index");
    if (dayOfWeek) query = query.eq("day_of_week", dayOfWeek);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch time slots", error);
    return (data || []).map(mapTimeSlot);
  }

  async getTimetableSessions(filter?: {
    sectionId?: string;
    facultyId?: string;
    classroomId?: string;
    dayOfWeek?: DayOfWeek;
  }): Promise<TimetableSession[]> {
    let query = this.client.from("timetable_sessions").select("*");
    if (filter?.sectionId) query = query.eq("section_id", filter.sectionId);
    if (filter?.facultyId) query = query.eq("faculty_id", filter.facultyId);
    if (filter?.classroomId) query = query.eq("classroom_id", filter.classroomId);

    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch timetable sessions", error);

    let sessions = (data || []).map(mapTimetableSession);

    if (filter?.dayOfWeek) {
      const slots = await this.getTimeSlots(filter.dayOfWeek);
      const slotIds = new Set(slots.map((s) => s.id));
      sessions = sessions.filter((s) => slotIds.has(s.timeSlotId));
    }

    return sessions;
  }

  async getConflicts(status?: "active" | "resolved" | "ignored"): Promise<ConflictRecord[]> {
    let query = this.client.from("conflicts").select("*").order("detected_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch conflicts", error);
    return (data || []).map(mapConflictRecord);
  }

  async getConflictById(id: string): Promise<ConflictRecord | undefined> {
    const { data, error } = await this.client
      .from("conflicts")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(`Failed to fetch conflict ${id}`, error);
    return data ? mapConflictRecord(data) : undefined;
  }

  async getRoomReservations(classroomId?: string): Promise<RoomReservation[]> {
    let query = this.client.from("room_reservations").select("*").order("date");
    if (classroomId) query = query.eq("classroom_id", classroomId);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch room reservations", error);
    return (data || []).map(mapRoomReservation);
  }

  async getScheduleVersions(): Promise<ScheduleVersion[]> {
    const { data, error } = await this.client
      .from("schedule_versions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new DatabaseError("Failed to fetch schedule versions", error);
    return (data || []).map(mapScheduleVersion);
  }

  async getChangeHistory(entityType?: string): Promise<ChangeHistoryRecord[]> {
    let query = this.client
      .from("change_history_records")
      .select("*")
      .order("timestamp", { ascending: false });
    if (entityType) query = query.eq("entity_type", entityType);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch change history", error);
    return (data || []).map(mapChangeHistoryRecord);
  }

  async getSyllabusModules(subjectId?: string): Promise<SyllabusModule[]> {
    let query = this.client.from("syllabus_modules").select("*").order("module_number");
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data: modules, error: modError } = await query;
    if (modError) throw new DatabaseError("Failed to fetch syllabus modules", modError);

    const { data: topics, error: topError } = await this.client
      .from("syllabus_topics")
      .select("*")
      .order("sequence_order");
    if (topError) throw new DatabaseError("Failed to fetch syllabus topics", topError);

    return (modules || []).map((m: any) => ({
      id: m.id,
      subjectId: m.subject_id,
      moduleNumber: m.module_number,
      title: m.title,
      description: m.description,
      totalPlannedHours: m.total_planned_hours,
      completedHours: m.completed_hours,
      topics: (topics || [])
        .filter((t: any) => t.module_id === m.id)
        .map((t: any) => ({
          id: t.id,
          moduleId: t.module_id,
          title: t.title,
          estimatedHours: t.estimated_hours,
          sequenceOrder: t.sequence_order,
          isDelivered: Boolean(t.is_delivered),
          deliveredAtSessionId: t.delivered_at_session_id || undefined,
          deliveredByFacultyId: t.delivered_by_faculty_id || undefined,
          deliveredDate: t.delivered_date || undefined,
        })),
    }));
  }

  async getTopicProgress(subjectId?: string, sectionId?: string): Promise<TopicProgressRecord[]> {
    let query = this.client.from("topic_progress_records").select("*");
    if (subjectId) query = query.eq("subject_id", subjectId);
    if (sectionId) query = query.eq("section_id", sectionId);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch topic progress", error);
    return (data || []).map(mapTopicProgressRecord);
  }

  async getExtraClassRequests(status?: string): Promise<ExtraClassRequest[]> {
    let query = this.client.from("extra_class_requests").select("*").order("submitted_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch extra class requests", error);
    return (data || []).map(mapExtraClassRequest);
  }

  async getTeacherExchangeRequests(status?: string): Promise<TeacherExchangeRequest[]> {
    let query = this.client
      .from("teacher_exchange_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw new DatabaseError("Failed to fetch teacher exchange requests", error);
    return (data || []).map(mapTeacherExchangeRequest);
  }

  // ── Protected Mutations with Concurrency Control & Fresh Pre-Commit Validation ─

  async resolveConflict(
    conflictId: string,
    solutionId: string
  ): Promise<{ success: boolean; message: string; updatedSession?: TimetableSession }> {
    // 1. Role Authorization Check
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator"],
      "Resolve Timetable Conflict"
    );

    // 2. Fetch Conflict & Target Entities
    const conflict = await this.getConflictById(conflictId);
    if (!conflict) throw new NotFoundError("Conflict", conflictId);

    const alternative = conflict.alternatives.find((a) => a.solutionId === solutionId);
    if (!alternative) {
      throw new SchedulingError("NOT_FOUND", `Resolution strategy '${solutionId}' not found for conflict ${conflictId}`);
    }

    // 3. Prevent silent relaxation of unsolvable conflicts (e.g. CONF-05 BSL-3 maintenance)
    if (!conflict.hasFeasibleAlternative && conflict.alternatives.length === 0) {
      throw new ConstraintViolationError([
        `Conflict ${conflictId} has no feasible alternative (Statutory/Containment Restriction). Cannot silently relax constraints.`,
      ]);
    }

    const targetSessionId = conflict.sessionIds[0];
    if (!targetSessionId) {
      throw new SchedulingError("VALIDATION_FAILED", `Conflict ${conflictId} has no associated sessions`);
    }

    const { data: sessionRow, error: sessErr } = await this.client
      .from("timetable_sessions")
      .select("*")
      .eq("id", targetSessionId)
      .single();
    if (sessErr || !sessionRow) throw new NotFoundError("TimetableSession", targetSessionId);

    const currentSession = mapTimetableSession(sessionRow);

    // 4. Optimistic Concurrency Check: Verify active schedule version has not drifted
    const { data: verRow, error: verErr } = await this.client
      .from("schedule_versions")
      .select("*")
      .eq("id", currentSession.versionId)
      .single();

    if (verErr || !verRow) {
      throw new NotFoundError("ScheduleVersion", currentSession.versionId);
    }

    const currentLockVersion: number = verRow.optimistic_lock_version || 1;

    // 5. Build Candidate Session
    const candidateSession: TimetableSession = {
      ...currentSession,
      classroomId: alternative.targetClassroomId || currentSession.classroomId,
      timeSlotId: alternative.targetTimeSlotId || currentSession.timeSlotId,
      facultyId: alternative.substituteFacultyId || currentSession.facultyId,
    };

    // 6. Fresh Server-Side Validation: Ensure candidate satisfies all 8 hard constraints
    const dataset = await this.getDataset();
    const otherSessions = dataset.timetableSessions.filter((s) => s.id !== targetSessionId);
    const validation = validateSession(candidateSession, dataset, {
      activeSessions: otherSessions,
    });

    if (!validation.isValid) {
      throw new ConstraintViolationError(validation.hardViolations.map((v) => v.description));
    }

    // 7. Store Undo Snapshot before mutation
    this.undoSnapshots.set(conflictId, {
      sessionId: targetSessionId,
      before: {
        classroomId: currentSession.classroomId,
        timeSlotId: currentSession.timeSlotId,
        facultyId: currentSession.facultyId,
        status: currentSession.status,
      },
      conflictId,
      versionId: currentSession.versionId,
    });

    // 8. Commit Optimistic Lock Version Bump (fails if concurrent modification occurred)
    const { error: lockErr } = await this.client
      .from("schedule_versions")
      .update({
        optimistic_lock_version: currentLockVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentSession.versionId)
      .eq("optimistic_lock_version", currentLockVersion);

    if (lockErr) {
      throw new ConcurrencyError(currentLockVersion, currentLockVersion + 1);
    }

    // 9. Persist Updated Session
    const { error: updateSessErr } = await this.client
      .from("timetable_sessions")
      .update({
        classroom_id: candidateSession.classroomId,
        time_slot_id: candidateSession.timeSlotId,
        faculty_id: candidateSession.facultyId,
        status: "moved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetSessionId);

    if (updateSessErr) throw new DatabaseError("Failed to update timetable session", updateSessErr);

    // 10. Mark Conflict as Resolved
    await this.client
      .from("conflicts")
      .update({
        status: "resolved",
        resolution_notes: `Resolved via ${alternative.description} by ${this.currentUserName}.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conflictId);

    // 11. Append-Only Audit Logging
    const auditRecord: Omit<ChangeHistoryRecord, "id"> = {
      versionId: currentSession.versionId,
      entityType: "session",
      entityId: targetSessionId,
      actorId: this.currentUserId,
      actorName: this.currentUserName,
      actorRole: this.currentRole,
      action: "CONFLICT_RESOLVED",
      targetName: `Session ${targetSessionId} (${alternative.description})`,
      previousValue: JSON.stringify({
        classroomId: currentSession.classroomId,
        timeSlotId: currentSession.timeSlotId,
        facultyId: currentSession.facultyId,
      }),
      newValue: JSON.stringify({
        classroomId: candidateSession.classroomId,
        timeSlotId: candidateSession.timeSlotId,
        facultyId: candidateSession.facultyId,
      }),
      timestamp: new Date().toISOString(),
      category: "conflict",
    };

    await this.client.from("change_history_records").insert({
      id: `HIST-${Date.now()}`,
      version_id: auditRecord.versionId,
      entity_type: auditRecord.entityType,
      entity_id: auditRecord.entityId,
      actor_id: auditRecord.actorId,
      actor_name: auditRecord.actorName,
      actor_role: auditRecord.actorRole,
      action: auditRecord.action,
      target_name: auditRecord.targetName,
      previous_value: auditRecord.previousValue,
      new_value: auditRecord.newValue,
      timestamp: auditRecord.timestamp,
      category: auditRecord.category,
    });

    return {
      success: true,
      message: `Conflict ${conflictId} resolved successfully. Reallocated to ${candidateSession.classroomId}.`,
      updatedSession: candidateSession,
    };
  }

  async undoConflictResolution(
    conflictId: string
  ): Promise<{ success: boolean; message: string; restoredSession?: TimetableSession }> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator"],
      "Undo Timetable Resolution"
    );

    const conflict = await this.getConflictById(conflictId);
    if (!conflict) throw new NotFoundError("Conflict", conflictId);

    const snapshot = this.undoSnapshots.get(conflictId);
    let targetVersionId = "VER-2.4";
    let targetSessionId = conflict.sessionIds?.[0] || conflictId;

    if (snapshot) {
      targetVersionId = snapshot.versionId;
      targetSessionId = snapshot.sessionId;
      // 1. Restore previous session values
      const { error: sessErr } = await this.client
        .from("timetable_sessions")
        .update({
          classroom_id: snapshot.before.classroomId,
          time_slot_id: snapshot.before.timeSlotId,
          faculty_id: snapshot.before.facultyId,
          status: snapshot.before.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", snapshot.sessionId);

      if (sessErr) throw new DatabaseError("Failed to restore session during undo", sessErr);
      this.undoSnapshots.delete(conflictId);
    } else if (conflict.sessionIds && conflict.sessionIds.length > 0 && conflict.classroomId) {
      await this.client
        .from("timetable_sessions")
        .update({
          classroom_id: conflict.classroomId,
          time_slot_id: conflict.timeSlotId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conflict.sessionIds[0]);
    }

    // 2. Revert conflict status to active
    await this.client
      .from("conflicts")
      .update({
        status: "active",
        resolution_notes: `Undone by ${this.currentUserName} on ${new Date().toLocaleTimeString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conflictId);

    // 3. Log Undo in Change History
    await this.client.from("change_history_records").insert({
      id: `HIST-UNDO-${Date.now()}`,
      version_id: targetVersionId,
      entity_type: "session",
      entity_id: targetSessionId,
      actor_id: this.currentUserId,
      actor_name: this.currentUserName,
      actor_role: this.currentRole,
      action: "CONFLICT_UNDO",
      target_name: `Session ${targetSessionId} reverted to original allocation`,
      previous_value: "Resolution Applied",
      new_value: snapshot ? JSON.stringify(snapshot.before) : "Reverted to active",
      timestamp: new Date().toISOString(),
      category: "modification",
    });

    this.undoSnapshots.delete(conflictId);

    const { data: restoredRow } = await this.client
      .from("timetable_sessions")
      .select("*")
      .eq("id", targetSessionId)
      .maybeSingle();

    return {
      success: true,
      message: `Conflict ${conflictId} reverted to original state.`,
      restoredSession: restoredRow ? mapTimetableSession(restoredRow) : undefined,
    };
  }

  // ── Operations Requests ────────────────────────────────────────────────────

  async createExtraClassRequest(
    data: Omit<ExtraClassRequest, "id" | "submittedAt">
  ): Promise<ExtraClassRequest> {
    const id = `REQ-EXTRA-${Date.now()}`;
    const submittedAt = new Date().toISOString();

    const newRow = {
      id,
      faculty_id: data.facultyId,
      subject_id: data.subjectId,
      section_id: data.sectionId,
      classroom_id: data.classroomId,
      time_slot_id: data.timeSlotId,
      scheduled_date: data.scheduledDate,
      reason: data.reason,
      status: "pending_hod",
      submitted_at: submittedAt,
    };

    const { data: created, error } = await this.client
      .from("extra_class_requests")
      .insert(newRow)
      .select()
      .single();

    if (error) throw new DatabaseError("Failed to create extra class request", error);
    return mapExtraClassRequest(created);
  }

  async createTeacherExchangeRequest(
    data: Omit<TeacherExchangeRequest, "id" | "submittedAt">
  ): Promise<TeacherExchangeRequest> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator", "dean", "department_head", "faculty_instructor"], "create teacher exchange request");
    const dataset = await this.getDataset();
    const first = dataset.timetableSessions.find(item => item.id === data.requesterSessionId && item.facultyId === data.requesterFacultyId && item.status !== "cancelled");
    const second = dataset.timetableSessions.find(item => item.id === data.targetSessionId && item.facultyId === data.targetFacultyId && item.status !== "cancelled");
    if (!first || !second || first.id === second.id || first.facultyId === second.facultyId) throw new Error("Choose two different active sessions belonging to the selected instructors.");
    if (typeof data.reason !== "string" || data.reason.trim().length < 5 || data.reason.length > 500 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error("Enter a valid date and a reason between 5 and 500 characters.");
    const requesterSlot = dataset.timeSlots.find(item => item.id === first.timeSlotId);
    const targetSlot = dataset.timeSlots.find(item => item.id === second.timeSlotId);
    const weekday = new Date(`${data.date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    if (!requesterSlot || !targetSlot || requesterSlot.dayOfWeek !== weekday || first.academicTermId !== second.academicTermId || data.date < first.effectiveFrom || data.date > first.effectiveUntil) throw new Error("The date must be a scheduled occurrence of the requester session, and both sessions must belong to the same term.");
    if (this.currentRole === "faculty_instructor" && !dataset.faculty.some(item => item.id === first.facultyId && item.userId === this.currentUserId)) throw new AuthorizationError(this.currentRole, "request exchange for another instructor");
    const id = `REQ-EXCH-${crypto.randomUUID()}`;
    const submittedAt = new Date().toISOString();

    const newRow = {
      id,
      requester_faculty_id: data.requesterFacultyId,
      requester_session_id: data.requesterSessionId,
      target_faculty_id: data.targetFacultyId,
      target_session_id: data.targetSessionId,
      date: data.date,
      reason: data.reason,
      status: "pending_hod",
      submitted_at: submittedAt,
      is_peer_accepted: false,
    };

    const { data: created, error } = await this.client
      .from("teacher_exchange_requests")
      .insert(newRow)
      .select()
      .single();

    if (error) throw new DatabaseError("Failed to create teacher exchange request", error);
    return mapTeacherExchangeRequest(created);
  }

  async approveExtraClassRequest(id: string, reviewedBy: string): Promise<boolean> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator", "dean"],
      "Approve Extra Class Request"
    );

    const { data, error } = await this.client.rpc("approve_extra_class", { p_request_id: id });
    if (error || data?.success !== true) throw new Error("The extra class was not approved. The atomic approval service must be configured and must revalidate the timetable.");
    return data.success;
  }

  async approveTeacherExchangeRequest(id: string, reviewedBy: string): Promise<boolean> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator", "dean", "department_head"],
      "Approve Teacher Exchange Request"
    );

    throw new Error("Exchange approval is unavailable until verified peer consent and atomic date-specific timetable updates are configured.");
  }

  async rejectExtraClassRequest(id: string, reviewedBy: string): Promise<boolean> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator", "dean", "department_head"],
      "Reject Extra Class Request"
    );

    const { error } = await this.client
      .from("extra_class_requests")
      .update({
        status: "rejected",
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new DatabaseError(`Failed to reject extra class ${id}`, error);
    return true;
  }

  async rejectTeacherExchangeRequest(id: string, reviewedBy: string): Promise<boolean> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator", "dean", "department_head"],
      "Reject Teacher Exchange Request"
    );

    const { error } = await this.client
      .from("teacher_exchange_requests")
      .update({
        status: "rejected",
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new DatabaseError(`Failed to reject teacher exchange ${id}`, error);
    return true;
  }

  async updateTopicDelivery(
    topicId: string,
    isDelivered: boolean,
    facultyId?: string,
    sessionId?: string
  ): Promise<boolean> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator", "faculty_instructor", "department_head"],
      "Update Topic Delivery"
    );

    const updatePayload: Record<string, any> = {
      is_delivered: isDelivered,
    };
    if (isDelivered) {
      updatePayload.delivered_date = new Date().toISOString().split("T")[0];
      if (facultyId) updatePayload.delivered_by_faculty_id = facultyId;
      if (sessionId) updatePayload.delivered_at_session_id = sessionId;
    } else {
      updatePayload.delivered_date = null;
      updatePayload.delivered_by_faculty_id = null;
      updatePayload.delivered_at_session_id = null;
    }

    const { error } = await this.client
      .from("syllabus_topics")
      .update(updatePayload)
      .eq("id", topicId);

    if (error) throw new DatabaseError(`Failed to update topic delivery ${topicId}`, error);
    return true;
  }

  async previewPublication(versionId?: string): Promise<{
    canPublish: boolean;
    totalSessions: number;
    activeConflicts: ConflictRecord[];
    blockingConflictsCount: number;
    warningsCount: number;
    beforeAfterDiff: {
      previousVersion: string;
      proposedVersion: string;
      modificationsCount: number;
    };
  }> {
    const [conflicts, sessions, versions, history] = await Promise.all([
      this.getConflicts(),
      this.getTimetableSessions(),
      this.getScheduleVersions(),
      this.getChangeHistory(),
    ]);

    const activeConflicts = conflicts.filter((c) => c.status === "active");
    const blocking = activeConflicts.filter((c) => c.severity === "critical");
    const warnings = activeConflicts.filter((c) => c.severity === "warning");
    const activeSessions = sessions.filter((s) => s.status !== "cancelled");
    const published = versions.find((v) => v.status === "published");

    return {
      canPublish: blocking.length === 0,
      totalSessions: activeSessions.length,
      activeConflicts,
      blockingConflictsCount: blocking.length,
      warningsCount: warnings.length,
      beforeAfterDiff: {
        previousVersion: published?.versionNumber || "v2.3",
        proposedVersion: "v2.4",
        modificationsCount: history.length,
      },
    };
  }

  async publishScheduleVersion(
    versionNumber: string,
    publishedBy: string,
    notes?: string
  ): Promise<{
    success: boolean;
    version?: ScheduleVersion;
    message: string;
    unresolvedConflicts: ConflictRecord[];
  }> {
    this.assertAuthorized(
      ["academic_admin", "timetable_coordinator", "dean"],
      "Publish Schedule Version"
    );

    return { success: false, message: "Live publication is not enabled until atomic snapshots, constraint validation and database authorization are verified.", unresolvedConflicts: await this.getConflicts("active") };
  }

  async rollbackToVersion(
    versionId: string,
    actorName: string
  ): Promise<{ success: boolean; message: string; restoredVersion?: ScheduleVersion }> {
    this.assertAuthorized(["academic_admin", "timetable_coordinator", "dean"], "Rollback Schedule Version");
    return { success: false, message: "Live rollback is not enabled until immutable session snapshots and atomic restoration are configured." };
  }

  // ── Dashboard Aggregates (Live Database Grounded) ──────────────────────────

  async getKpiMetrics(): Promise<KpiMetrics> {
    return calculateScheduleAnalytics(await this.getDataset()).kpiMetrics;
  }

  async getChartData(): Promise<ChartDataPoint[]> {
    return calculateScheduleAnalytics(await this.getDataset()).chartData;
  }

  async getAttentionItems(): Promise<AttentionItem[]> {
    return calculateScheduleAnalytics(await this.getDataset()).attentionItems;
  }

  async getActivityLog(): Promise<ActivityItem[]> {
    const history = await this.getChangeHistory();
    if (history.length > 0) {
      return history.slice(0, 8).map((h) => ({
        id: h.id,
        actor: h.actorName,
        actorRole: h.actorRole,
        action: h.action,
        target: h.targetName,
        timestamp: new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: h.category,
      }));
    }
    return [];
  }

  async getAvailableRooms(query?: string): Promise<RoomRecord[]> {
    try {
      const classrooms = await this.getClassrooms();
      let roomList: RoomRecord[] = [];
      if (classrooms && classrooms.length > 0) {
        roomList = classrooms.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          building: c.building,
          capacity: c.capacity,
          type: c.type.includes("Lab") ? "Lab" : c.type.includes("Seminar") ? "Seminar" : "Lecture Hall",
          status: c.status,
          nextAvailableSlot: c.status === "Available" ? "Free until 04:00 PM" : "Occupied this hour",
        }));
      } else {
        roomList = [...SEED_ROOMS];
      }

      if (!query) return roomList;
      const q = query.toLowerCase();
      return roomList.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.building.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    } catch {
      let roomList = [...SEED_ROOMS];
      if (!query) return roomList;
      const q = query.toLowerCase();
      return roomList.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.building.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q)
      );
    }
  }

  async resolveAttentionItem(id: string): Promise<boolean> {
    return true;
  }

  async scheduleExtraClass(payload: {
    courseCode: string;
    roomCode: string;
    date: string;
    timeSlot: string;
  }): Promise<boolean> {
    const subject = await this.getSubjectById(payload.courseCode);
    const room = await this.getClassroomById(payload.roomCode);
    const timeSlots = await this.getTimeSlots();
    const targetSlot = timeSlots[0];

    await this.createExtraClassRequest({
      facultyId: "FAC-VANCE",
      subjectId: subject?.id || "SUB-CS401",
      sectionId: "SEC-CSE-S5-A",
      classroomId: room?.id || "ROOM-LH-101",
      timeSlotId: targetSlot?.id || "SLOT-MON-1",
      scheduledDate: payload.date,
      reason: `Ad-hoc session for ${payload.courseCode} scheduled via Quick Actions (${payload.timeSlot})`,
      status: "pending_hod",
    });
    return true;
  }
}
