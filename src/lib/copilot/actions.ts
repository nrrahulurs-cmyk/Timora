import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { schedulePlanSchema, type SchedulePlan } from "@/lib/scheduling/plan";
import type { SchedulingRepository } from "@/lib/repository/scheduling-repository";
import type { UserRole } from "@/types/domain";
import { extraClassSchema } from "@/lib/scheduling/extra-class";

export type CopilotActor = { id: string; name: string; role: UserRole };
export const canEditSchedule = (role: UserRole) => ["academic_admin", "dean", "timetable_coordinator"].includes(role);
export const canRequestExtraClass = (role: UserRole) => canEditSchedule(role) || role === "faculty_instructor";
const runtime = globalThis as typeof globalThis & { timoraActionKey?: string; timoraConsumedActions?: Map<string, number> };
function secret() {
  if (process.env.TIMORA_ACTION_SECRET && process.env.TIMORA_ACTION_SECRET.length >= 32) return process.env.TIMORA_ACTION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("Action signing is not configured.");
  return runtime.timoraActionKey ??= randomBytes(32).toString("hex");
}
const payloadSchema = z.object({ actorId: z.string(), role: z.string(), expires: z.number(), nonce: z.string(), plan: schedulePlanSchema }).strict();
const extraPayloadSchema = z.object({ kind: z.literal("EXTRA_CLASS"), actorId: z.string(), role: z.string(), expires: z.number(), nonce: z.string(), request: extraClassSchema }).strict();

export function signExtraClassAction(input: z.infer<typeof extraClassSchema>, actor: CopilotActor, now = Date.now()) {
  if (!canRequestExtraClass(actor.role)) throw new Error("Your role cannot request an extra class.");
  const body = Buffer.from(JSON.stringify({ kind: "EXTRA_CLASS", actorId: actor.id, role: actor.role, expires: now + 300_000, nonce: crypto.randomUUID(), request: extraClassSchema.parse(input) })).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

export async function applyExtraClassAction(token: string, actor: CopilotActor, repository: SchedulingRepository, now = Date.now()) {
  if (!canRequestExtraClass(actor.role)) throw new Error("Your role cannot request an extra class.");
  if (token.length > 100_000) throw new Error("Invalid action preview.");
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) throw new Error("Invalid action preview. Create a new preview.");
  const expected = createHmac("sha256", secret()).update(body).digest();
  const provided = Buffer.from(signature, "base64url");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new Error("This preview is not authentic. Create a new preview.");
  const payload = extraPayloadSchema.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  if (payload.actorId !== actor.id || payload.role !== actor.role) throw new Error("This preview belongs to a different identity or role.");
  if (payload.expires <= now) throw new Error("This preview expired. Ask for a fresh preview.");
  if (actor.role === "faculty_instructor") {
    const data = await repository.getDataset();
    if (!data.faculty.some((item) => item.id === payload.request.facultyId && item.userId === actor.id)) throw new Error("You can request extra classes only for your own teaching assignments.");
  }
  const consumed = runtime.timoraConsumedActions ??= new Map();
  for (const [nonce, expires] of consumed) if (expires < now) consumed.delete(nonce);
  if (consumed.has(payload.nonce)) throw new Error("This preview has already been applied or is being applied.");
  consumed.set(payload.nonce, payload.expires);
  try {
    const created = await repository.createExtraClassRequest({ ...payload.request, status: "pending_hod" });
    const persisted = await repository.getExtraClassRequests();
    if (!persisted.some((item) => item.id === created.id && item.status === "pending_hod")) throw new Error("The request write could not be verified. Refresh extra classes before retrying.");
    return { success: true, message: `Extra-class request ${created.id} was submitted for department review. The room is not reserved until approval.`, recordId: created.id };
  } catch (error) { consumed.delete(payload.nonce); throw error; }
}

export function actionKind(token: string): "EXTRA_CLASS" | "SCHEDULE_CHANGE" {
  if (token.length > 100_000) throw new Error("Invalid action preview.");
  const body = token.split(".")[0];
  if (!body) throw new Error("Invalid action preview.");
  const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return decoded?.kind === "EXTRA_CLASS" ? "EXTRA_CLASS" : "SCHEDULE_CHANGE";
}
export function signScheduleAction(plan: SchedulePlan, actor: CopilotActor, now = Date.now()) {
  if (!canEditSchedule(actor.role)) throw new Error("Your role cannot apply schedule changes.");
  const body = Buffer.from(JSON.stringify({ actorId: actor.id, role: actor.role, expires: now + 300_000, nonce: crypto.randomUUID(), plan })).toString("base64url");
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}
export async function applyScheduleAction(token: string, actor: CopilotActor, repository: SchedulingRepository, now = Date.now()) {
  if (!canEditSchedule(actor.role)) throw new Error("Your role cannot apply schedule changes.");
  if (token.length > 100_000) throw new Error("Invalid action preview.");
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) throw new Error("Invalid action preview. Create a new preview.");
  const expected = createHmac("sha256", secret()).update(body).digest();
  const provided = Buffer.from(signature, "base64url");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new Error("This preview is not authentic. Create a new preview.");
  const payload = payloadSchema.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  if (payload.actorId !== actor.id || payload.role !== actor.role) throw new Error("This preview belongs to a different identity or role.");
  if (payload.expires <= now) throw new Error("This preview expired. Ask for a fresh preview.");
  const consumed = runtime.timoraConsumedActions ??= new Map();
  for (const [nonce, expires] of consumed) if (expires < now) consumed.delete(nonce);
  if (consumed.has(payload.nonce)) throw new Error("This preview has already been applied or is being applied.");
  consumed.set(payload.nonce, payload.expires);
  try {
    const result = await repository.saveTimetableChanges(payload.plan);
    if (!result.success) throw new Error(result.message);
    const current = await repository.getDataset();
    for (const update of payload.plan.updates) {
      const record = current.timetableSessions.find((session) => session.id === update.id);
      if (!record || Object.entries(update.changes).some(([key, value]) => record[key as keyof typeof record] !== value)) throw new Error("The write returned but its result could not be verified. Refresh the timetable before retrying.");
    }
    return result;
  } catch (error) { consumed.delete(payload.nonce); throw error; }
}
