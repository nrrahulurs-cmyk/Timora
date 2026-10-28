// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalDemoSchedulingRepository } from "@/lib/repository/scheduling-repository";
import { executeSchedulingTool } from "@/lib/gemini/tools";
import { reasonWithOpenRouter } from "../openrouter-brain";
import { applyExtraClassAction, applyScheduleAction } from "../actions";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";

const role = "timetable_coordinator" as const;
const actor = { id: "USER-VANCE", name: "Coordinator", role };
const reply = (message: unknown) => new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("OpenRouter Copilot tool boundary", () => {
  it("uses the request repository and removes an invented room category", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const repository = new LocalDemoSchedulingRepository();
    const calls: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)); calls.push(request);
      return calls.length === 1
        ? reply({ content: null, tool_calls: [{ id: "read-1", function: { name: "searchAvailableRooms", arguments: JSON.stringify({ dayOfWeek: "Friday", startTime: "10:00", endTime: "11:30", minCapacity: 60, roomType: "Lecture Hall" }) } }] })
        : reply({ content: "These are the rooms verified by Timora." });
    }));
    const result = await reasonWithOpenRouter("Find available rooms Friday 10:00-11:30 for 60 students", [], actor, repository);
    const expected = await executeSchedulingTool("searchAvailableRooms", { dayOfWeek: "Friday", startTime: "10:00", endTime: "11:30", minCapacity: 60 }, role, repository);
    expect(result?.provider).toBe("openrouter-ai");
    expect(result?.toolResults?.[0].data.count).toBe(expected.data.count);
    expect(calls[1].messages).toEqual(expect.arrayContaining([expect.objectContaining({ role: "tool", content: expect.stringContaining(`\"count\":${expected.data.count}`) })]));
  });

  it("never exposes mutation tools and does not execute a forged mutation call", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const repository = new LocalDemoSchedulingRepository();
    const before = await repository.getDataset();
    const calls: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)); calls.push(request);
      return calls.length === 1
        ? reply({ content: null, tool_calls: [{ id: "write-1", function: { name: "proposeExtraClass", arguments: "{}" } }] })
        : reply({ content: "I cannot do that from this read-only tool." });
    }));
    const result = await reasonWithOpenRouter("Create an extra class for me", [], actor, repository);
    expect((calls[0].tools as { function: { name: string } }[]).some((tool) => tool.function.name === "proposeExtraClass")).toBe(false);
    expect(result?.toolResults?.[0].success).toBe(false);
    expect(result?.actionPreview).toBeUndefined();
    expect(await repository.getDataset()).toEqual(before);
  });

  it("asks for a time range rather than inventing availability", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const result = await reasonWithOpenRouter("Which rooms are available?", [], actor, new LocalDemoSchedulingRepository());
    expect(result?.reply).toContain("weekday and exact time range");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a signed move preview but saves only after a separate confirmation", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const data = structuredClone(SYNAPSE_SEED_DATA); data.timetableSessions = [data.timetableSessions[0]]; data.conflicts = []; data.reservations = [];
    const repository = new LocalDemoSchedulingRepository(data);
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ++count === 1
      ? reply({ content: null, tool_calls: [{ id: "preview-1", function: { name: "previewScheduleMove", arguments: JSON.stringify({ sessionId: "SESS-CS401-MON", targetDay: "Friday", targetStartTime: "08:30", targetRoomCode: "LH-201" }) } }] })
      : reply({ content: "The move is valid. Please review and confirm it." })));
    const result = await reasonWithOpenRouter("Put SESS-CS401-MON on Friday 08:30 in LH-201", [], actor, repository);
    expect(result?.actionPreview?.isValid).toBe(true);
    expect((await repository.getDataset()).timetableSessions[0].timeSlotId).toBe("SLOT-MON-2");
    expect((await applyScheduleAction(result!.actionPreview!.confirmationToken, actor, repository)).success).toBe(true);
    expect((await repository.getDataset()).timetableSessions[0].timeSlotId).toBe("SLOT-FRI-1");
  });

  it("submits a validated extra-class request only after signed confirmation", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const data = structuredClone(SYNAPSE_SEED_DATA); data.timetableSessions = [data.timetableSessions[0]]; data.conflicts = []; data.reservations = []; data.extraClassRequests = [];
    const repository = new LocalDemoSchedulingRepository(data);
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ++count === 1
      ? reply({ content: null, tool_calls: [{ id: "extra-1", function: { name: "previewExtraClassRequest", arguments: JSON.stringify({ courseCode: "CS-401", sectionCode: "CSE-5A", date: "2026-11-06", startTime: "08:30", roomCode: "LH-201", reason: "Make up a missed lecture" }) } }] })
      : reply({ content: "I saved the extra class and reserved the room." })));
    const result = await reasonWithOpenRouter("Create an extra class for CS-401 section CSE-5A on 2026-11-06 at 08:30 in LH-201 because we missed a lecture", [], actor, repository);
    expect(result?.actionPreview?.actionType).toBe("EXTRA_CLASS");
    expect(result?.actionPreview?.isValid).toBe(true);
    expect(result?.reply).toContain("room is not reserved yet");
    expect((await repository.getExtraClassRequests())).toHaveLength(0);
    const saved = await applyExtraClassAction(result!.actionPreview!.confirmationToken, actor, repository);
    expect(saved.success).toBe(true);
    expect((await repository.getExtraClassRequests())[0].status).toBe("pending_hod");
    expect((await repository.getDataset()).timetableSessions).toHaveLength(1);
    await expect(applyExtraClassAction(result!.actionPreview!.confirmationToken, actor, repository)).rejects.toThrow("already");
  });

  it("suppresses a model's false claim that an unsupported request was saved", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const repository = new LocalDemoSchedulingRepository();
    const before = await repository.getDataset();
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ++count === 1
      ? reply({ content: null, tool_calls: [{ id: "read-1", function: { name: "getScheduleSnapshot", arguments: "{}" } }] })
      : reply({ content: "I have saved and submitted the extra class request." })));
    const result = await reasonWithOpenRouter("Create an extra class request", [], actor, repository);
    expect(result?.reply).toContain("not changed any records");
    expect(result?.actionPreview).toBeUndefined();
    expect(await repository.getDataset()).toEqual(before);
  });

  it("shows a faculty member only their own academic request records", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const repository = new LocalDemoSchedulingRepository();
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ++count === 1
      ? reply({ content: null, tool_calls: [{ id: "ops-1", function: { name: "getAcademicOperations", arguments: "{}" } }] })
      : reply({ content: "Here are your requests." })));
    const result = await reasonWithOpenRouter("What is the status of my extra class requests?", [], { id: "USER-LIN", name: "Dr. Sarah Lin", role: "faculty_instructor" }, repository);
    const own = result?.toolResults?.[0].data.extraClassRequests as { id: string }[];
    const dataset = await repository.getDataset();
    expect(own.map((item) => item.id)).toEqual(dataset.extraClassRequests.filter((item) => item.facultyId === "FAC-LIN").map((item) => item.id));
    expect(result?.toolResults?.[0].data.facultyExchangeRequests.every((item: { requesterSessionId: string; targetSessionId: string }) => {
      const ids = [item.requesterSessionId, item.targetSessionId];
      return dataset.timetableSessions.some((session) => ids.includes(session.id) && session.facultyId === "FAC-LIN");
    })).toBe(true);
  });

  it("does not expose staff operations tools to student viewers", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const calls: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body)); calls.push(request);
      return calls.length === 1
        ? reply({ content: null, tool_calls: [{ id: "ops-1", function: { name: "getAcademicOperations", arguments: "{}" } }] })
        : reply({ content: "I cannot access that information." });
    }));
    const result = await reasonWithOpenRouter("Show pending extra class requests", [], { id: "STUDENT", name: "Student", role: "student_viewer" }, new LocalDemoSchedulingRepository());
    expect((calls[0].tools as { function: { name: string } }[]).some((tool) => tool.function.name === "getAcademicOperations")).toBe(false);
    expect(result?.toolResults?.[0].success).toBe(false);
    expect(result?.sources).toBeUndefined();
  });

  it("compares current allocations with a real published snapshot", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const data = structuredClone(SYNAPSE_SEED_DATA);
    const published = data.scheduleVersions.find((item) => item.status === "published")!;
    published.sessionSnapshot = structuredClone(data.timetableSessions);
    data.timetableSessions[0].classroomId = "ROOM-LH-201";
    const repository = new LocalDemoSchedulingRepository(data);
    let count = 0;
    vi.stubGlobal("fetch", vi.fn(async () => ++count === 1
      ? reply({ content: null, tool_calls: [{ id: "compare-1", function: { name: "compareScheduleVersions", arguments: "{}" } }] })
      : reply({ content: "One session differs from the published version." })));
    const result = await reasonWithOpenRouter("Compare the current draft with the published version", [], actor, repository);
    expect(result?.toolResults?.[0].data.changedCount).toBe(1);
    expect(result?.toolResults?.[0].data.changedSessionIds).toEqual([data.timetableSessions[0].id]);
    expect(result?.sources?.some((item) => item.id === data.timetableSessions[0].id)).toBe(true);
  });
});
