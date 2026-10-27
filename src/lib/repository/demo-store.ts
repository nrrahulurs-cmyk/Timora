import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { LocalDemoSchedulingRepository } from "./scheduling-repository";
import type { SynapseCollegeDataset } from "@/types/domain";

type State = { repository?: LocalDemoSchedulingRepository; queue: Promise<unknown> };
const globalStore = globalThis as typeof globalThis & { timoraDemoStore?: State };
const state = globalStore.timoraDemoStore ??= { queue: Promise.resolve() };
const file = () => process.env.TIMORA_DEMO_STORE_PATH || path.join(process.cwd(), ".timora", "demo-state.json");

export function withDemoRepository<T>(operation: (repository: LocalDemoSchedulingRepository) => Promise<T>, mutation = false): Promise<T> {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") throw new Error("The local demo store is unavailable outside explicit development demo mode.");
  const pending = state.queue.then(async () => {
    if (!state.repository) {
      try {
        const saved = JSON.parse(await readFile(file(), "utf8")) as { format: number; dataset: SynapseCollegeDataset };
        if (saved.format !== 1 || !Array.isArray(saved.dataset?.timetableSessions)) throw new Error("The saved demo workspace has an unsupported format.");
        state.repository = new LocalDemoSchedulingRepository(saved.dataset);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        state.repository = new LocalDemoSchedulingRepository();
      }
    }
    const before = mutation ? await state.repository.getDataset() : undefined;
    try {
      const result = await operation(state.repository);
      if (mutation) {
        const target = file();
        await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
        const temporary = `${target}.${crypto.randomUUID()}.tmp`;
        await writeFile(temporary, JSON.stringify({ format: 1, dataset: await state.repository.getDataset() }), { mode: 0o600 });
        await rename(temporary, target);
      }
      return result;
    } catch (error) {
      if (before) state.repository = new LocalDemoSchedulingRepository(before);
      throw error;
    }
  });
  state.queue = pending.catch(() => undefined);
  return pending;
}
