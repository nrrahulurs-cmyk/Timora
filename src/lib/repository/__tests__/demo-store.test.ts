// @vitest-environment node
import { afterEach, describe, it, expect, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { allocation } from "@/lib/scheduling/plan";
let directory = "";
const runtime = globalThis as typeof globalThis & { timoraDemoStore?: unknown };
afterEach(async () => { delete runtime.timoraDemoStore; vi.unstubAllEnvs(); vi.resetModules(); if (directory) await rm(directory, { recursive: true, force: true }); });
describe("Durable local demo workspace", () => {
  async function open() { directory = await mkdtemp(path.join(tmpdir(),"timora-store-test-")); vi.stubEnv("NEXT_PUBLIC_DEMO_MODE","true"); vi.stubEnv("TIMORA_DEMO_STORE_PATH",path.join(directory,"state.json")); delete runtime.timoraDemoStore; vi.resetModules(); return (await import("../demo-store")).withDemoRepository; }
  it("persists an atomic mutation and reloads it after the runtime is recreated", async () => {
    const useStore = await open(); const original = await useStore(repo => repo.getDataset()); const session = original.timetableSessions[0];
    await useStore(repo => repo.saveTimetableChanges({ updates: [{ id: session.id, expected: allocation(session), changes: { status: "cancelled" } }], inserts: [], reason: "Persistence verification" }), true);
    expect(JSON.parse(await readFile(path.join(directory,"state.json"),"utf8")).dataset.timetableSessions[0].status).toBe("cancelled");
    delete runtime.timoraDemoStore; vi.resetModules(); const reloaded = (await import("../demo-store")).withDemoRepository;
    expect((await reloaded(repo => repo.getDataset())).timetableSessions[0].status).toBe("cancelled");
  });
  it("rolls back in-memory changes on failure without creating a saved partial workspace", async () => {
    const useStore = await open(); const before = await useStore(repo => repo.getDataset()); const session = before.timetableSessions[0];
    await expect(useStore(async repo => { await repo.saveTimetableChanges({ updates: [{ id: session.id, expected: allocation(session), changes: { status: "cancelled" } }], inserts: [], reason: "Simulated interrupted transaction" }); throw new Error("interrupted"); },true)).rejects.toThrow("interrupted");
    expect(await useStore(repo => repo.getDataset())).toEqual(before); await expect(readFile(path.join(directory,"state.json"))).rejects.toThrow();
  });
  it("does not replace corrupted saved data with seed records", async () => {
    const useStore = await open(); await writeFile(path.join(directory,"state.json"),"invalid-json");
    await expect(useStore(repo => repo.getDataset())).rejects.toThrow(); expect(await readFile(path.join(directory,"state.json"),"utf8")).toBe("invalid-json");
  });
  it("refuses the demo store in production even with the demo flag", async () => {
    const useStore = await open(); vi.stubEnv("NODE_ENV","production"); expect(() => useStore(repo => repo.getDataset())).toThrow("unavailable");
  });
});
