// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { LocalDemoSchedulingRepository } from "@/lib/repository/scheduling-repository";
import { allocation, previewSchedulePlan, type SchedulePlan } from "@/lib/scheduling/plan";
import { parseTimetableCsv, rowsFromMatrix, previewTimetableImport, IMPORT_COLUMNS } from "@/lib/scheduling/import";
import { actionKind, signExtraClassAction, applyExtraClassAction, signScheduleAction, applyScheduleAction, type CopilotActor } from "../actions";
import { answerCopilot } from "../service";
import { identityFromAuth } from "@/lib/auth/identity";
import type { User } from "@supabase/supabase-js";
import { validateSession } from "@/lib/scheduling/constraint-engine";

function cleanData() { const data = structuredClone(SYNAPSE_SEED_DATA); data.timetableSessions = [data.timetableSessions[0]]; data.conflicts = []; data.reservations = []; data.extraClassRequests = []; return data; }
const actor: CopilotActor = { id: "USER-VANCE", name: "Coordinator", role: "timetable_coordinator" };
function planFor(data = cleanData()): SchedulePlan { return { updates: [{ id: data.timetableSessions[0].id, expected: allocation(data.timetableSessions[0]), changes: { classroomId: "ROOM-LH-201", status: "moved" } }], inserts: [], reason: "Reviewed room change" }; }

describe("Atomic scheduling plans", () => {
  it("saves and audits a validated change, then rejects a stale retry", async () => {
    const repository = new LocalDemoSchedulingRepository(cleanData()); const plan = planFor();
    expect((await repository.saveTimetableChanges(plan)).success).toBe(true);
    const saved = await repository.getDataset(); expect(saved.timetableSessions[0].classroomId).toBe("ROOM-LH-201");
    expect(saved.changeHistory[0].previousValue).toContain("ROOM-LH-102"); expect(saved.changeHistory[0].newValue).toContain("ROOM-LH-201");
    expect((await repository.saveTimetableChanges(plan)).success).toBe(false);
  });
  it("rejects the entire batch when any row fails", async () => {
    const repository = new LocalDemoSchedulingRepository(cleanData()); const before = await repository.getDataset(); const plan = planFor();
    plan.updates.push({ id: "missing", expected: allocation(before.timetableSessions[0]), changes: { classroomId: "ROOM-LH-102" } });
    expect((await repository.saveTimetableChanges(plan)).success).toBe(false); expect(await repository.getDataset()).toEqual(before);
  });
  it("rejects duplicate edits, impossible dates and unassigned instructors", () => {
    const data = cleanData(); const plan = planFor(); plan.updates.push(plan.updates[0]); expect(previewSchedulePlan(data, plan).isValid).toBe(false);
    expect(() => previewSchedulePlan(data, { updates: [], inserts: [{ ...data.timetableSessions[0], id: "NEW", effectiveFrom: "2026-02-30" }], reason: "Invalid date" })).toThrow();
    const other = planFor(); other.updates[0].changes.facultyId = "FAC-TURING"; expect(previewSchedulePlan(data,other).errors.join(" ")).toContain("not assigned");
  });
  it("does not block on cancelled sessions or reservations on a different date", () => {
    const data = cleanData(); const session = { ...data.timetableSessions[0], isRecurringWeekly: false, effectiveFrom: "2026-11-02", effectiveUntil: "2026-11-02" };
    data.timetableSessions.push({ ...session, id: "CANCELLED", status: "cancelled" });
    const reservation = structuredClone(SYNAPSE_SEED_DATA.reservations[0]); reservation.classroomId = session.classroomId; reservation.date = "2026-11-09"; reservation.timeSlotIds = [session.timeSlotId]; reservation.status = "approved"; reservation.blocksRegularClasses = true; data.reservations = [reservation];
    expect(validateSession(session,data).isValid).toBe(true);
    data.reservations[0].date = "2026-11-02"; expect(validateSession(session,data).hardViolations.some(item => item.rule === "reservation_collision")).toBe(true);
  });
  it("returns defensive snapshots instead of exposing mutable workspace data", async () => {
    const repo = new LocalDemoSchedulingRepository(cleanData()); const data = await repo.getDataset(); data.timetableSessions.length = 0;
    expect((await repo.getDataset()).timetableSessions).toHaveLength(1);
  });
});

describe("Actor-bound Copilot confirmations", () => {
  it("validates a signed preview, verifies the save, and rejects replay", async () => {
    const repo = new LocalDemoSchedulingRepository(cleanData()); const token = signScheduleAction(planFor(),actor);
    expect((await applyScheduleAction(token,actor,repo)).success).toBe(true);
    await expect(applyScheduleAction(token,actor,repo)).rejects.toThrow("already");
  });
  it("rejects tampering, expiry, another user and a viewer", async () => {
    const repo = new LocalDemoSchedulingRepository(cleanData()); const token = signScheduleAction(planFor(),actor,1000);
    const [body,signature] = token.split("."); const payload = JSON.parse(Buffer.from(body,"base64url").toString()); payload.plan.updates[0].changes.classroomId = "ROOM-SEM-302";
    await expect(applyScheduleAction(`${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`,actor,repo,2000)).rejects.toThrow("not authentic");
    await expect(applyScheduleAction(token,actor,repo,302000)).rejects.toThrow("expired");
    await expect(applyScheduleAction(token,{ ...actor, id: "OTHER" },repo,2000)).rejects.toThrow("different identity");
    await expect(applyScheduleAction(token,{ ...actor, role: "student_viewer" },repo,2000)).rejects.toThrow("cannot apply");
    expect((await repo.getDataset()).timetableSessions[0].classroomId).toBe("ROOM-LH-102");
  });
  it("does not claim success if validation rejects the saved proposal", async () => {
    const data = cleanData(); const plan = planFor(); data.classrooms.find(room => room.id === "ROOM-LH-201")!.status = "Maintenance";
    const repo = new LocalDemoSchedulingRepository(data);
    await expect(applyScheduleAction(signScheduleAction(plan,actor),actor,repo)).rejects.toThrow("maintenance");
  });
  it("binds extra-class confirmation to the actor and rejects tampering or a faculty request for another instructor", async () => {
    const input = { facultyId: "FAC-VANCE", subjectId: "SUB-CS401", sectionId: "SEC-CSE-S5-A", classroomId: "ROOM-LH-201", timeSlotId: "SLOT-FRI-1", scheduledDate: "2026-11-06", reason: "Make up a missed lecture" };
    const token = signExtraClassAction(input, actor, 1000);
    expect(actionKind(token)).toBe("EXTRA_CLASS");
    const [body, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()); payload.request.classroomId = "ROOM-LH-102";
    const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
    const repository = new LocalDemoSchedulingRepository(cleanData());
    await expect(applyExtraClassAction(forged, actor, repository, 2000)).rejects.toThrow("not authentic");
    await expect(applyExtraClassAction(token, { ...actor, id: "OTHER" }, repository, 2000)).rejects.toThrow("different identity");
    await expect(applyExtraClassAction(token, actor, repository, 302000)).rejects.toThrow("expired");
    const faculty = { id: "USER-LIN", name: "Dr. Sarah Lin", role: "faculty_instructor" as const };
    await expect(applyExtraClassAction(signExtraClassAction(input, faculty), faculty, repository)).rejects.toThrow("only for your own");
    expect(() => signExtraClassAction(input, { ...actor, role: "student_viewer" })).toThrow("cannot request");
    expect(await repository.getExtraClassRequests()).toHaveLength(0);
  });
});

describe("Grounded local conversation", () => {
  it("uses repository records and carries the course into a follow-up without contacting a provider", async () => {
    const fetch = vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("Network must not be used"));
    try { const repo = new LocalDemoSchedulingRepository(); const result = await answerCopilot({ message: "What about Wednesday?", conversationHistory: [{ role: "user", content: "Find timetable sessions for CS-401 on Monday" }] },actor,repo);
      expect(result.sources?.some(source => source.id === "SESS-CS401-WED")).toBe(true); expect(result.sources?.some(source => source.id === "SESS-CS401-MON")).toBe(false); expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
  it("requires disambiguation for a course with multiple sessions", async () => {
    const result = await answerCopilot({ message: "Move CS-401 to Friday 09:00", conversationHistory: [] },actor,new LocalDemoSchedulingRepository());
    expect(result.reply).toContain("Choose the session"); expect(result.actionPreview).toBeUndefined();
  });
  it("rejects a viewer's naturally phrased move before a model can misread it as a lookup", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network must not be used"));
    try {
      const result = await answerCopilot({ message: "Put SESS-CS401-MON on Friday 08:30 in LH-201", conversationHistory: [] }, { ...actor, role: "student_viewer" }, new LocalDemoSchedulingRepository());
      expect(result.reply).toContain("cannot apply timetable changes");
      expect(result.actionPreview).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
  it("previews a real move without mutating, then commits the confirmed allocation", async () => {
    const repo = new LocalDemoSchedulingRepository(cleanData());
    const result = await answerCopilot({ message: "Move SESS-CS401-MON to Friday 08:30 in LH-201", conversationHistory: [] },actor,repo);
    expect(result.actionPreview?.isValid).toBe(true); expect((await repo.getDataset()).timetableSessions[0].timeSlotId).toBe("SLOT-MON-2");
    expect((await applyScheduleAction(result.actionPreview!.confirmationToken,actor,repo)).success).toBe(true);
    expect((await repo.getDataset()).timetableSessions[0].timeSlotId).toBe("SLOT-FRI-1");
  });
  it("does not derive authorisation from user-editable profile metadata", () => {
    const identity = identityFromAuth({ id: "student", app_metadata: {}, user_metadata: { role: "academic_admin", full_name: "Student" }, created_at: "2026-01-01" } as User);
    expect(identity.role).toBe("student_viewer");
  });
});

describe("Timetable file imports", () => {
  it("parses quoted commas, escaped quotes, BOM and CRLF", () => {
    expect(parseTimetableCsv('a,b\r\n"one,two","a ""quote"""\r\n')).toEqual([["a","b"],["one,two",'a "quote"']]);
    expect(rowsFromMatrix(parseTimetableCsv("\uFEFF"+IMPORT_COLUMNS.join(",")+"\nCS-401,CSE-S5-A,FAC-101,LH-201,Friday,09:00,10:30,"))).toHaveLength(1);
  });
  it("rejects malformed quotes, missing columns and oversize input", () => {
    expect(() => parseTimetableCsv('a,b\n"unterminated')).toThrow("not closed"); expect(() => rowsFromMatrix([["course"],["CS-401"]])).toThrow("Missing columns"); expect(() => parseTimetableCsv("x".repeat(1_000_001))).toThrow("1 MB");
  });
  it("validates real references, persists once, and rejects duplicate imports", async () => {
    const data = cleanData(); const rows = rowsFromMatrix([ [...IMPORT_COLUMNS], ["CS-401","SEC-CSE-S5-A","FAC-101","LH-201","Friday","08:30","10:00",""] ]);
    const preview = previewTimetableImport(rows,data); expect(preview.errors).toEqual([]); expect(preview.plan).not.toBeNull();
    const repo = new LocalDemoSchedulingRepository(data); expect((await repo.saveTimetableChanges(preview.plan!)).success).toBe(true); expect(previewTimetableImport(rows,await repo.getDataset()).plan).toBeNull();
    rows[0].room = '=HYPERLINK("external")'; expect(previewTimetableImport(rows,data).errors.join()).toContain("plain text");
  });
  it("refuses unsupported historical rollback and publishing of real hard conflicts", async () => {
    const repo = new LocalDemoSchedulingRepository(); const historical = (await repo.getScheduleVersions()).at(-1)!;
    expect((await repo.rollbackToVersion(historical.id,"Coordinator")).success).toBe(false); expect((await repo.publishScheduleVersion("v2.4","Coordinator")).success).toBe(false);
  });
});
