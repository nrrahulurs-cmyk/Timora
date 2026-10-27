import { describe, it, expect } from "vitest";
import { askTimoraCopilot } from "@/lib/gemini/assistant";

describe("Timo — The Brain of Timora", () => {
  it("delivers an Executive Strategic Diagnosis when asked how to optimize or analyze bottlenecks", async () => {
    const res = await askTimoraCopilot("How can I optimize the schedule and what are the biggest bottlenecks?", [], "academic_admin");

    expect(res.reply).toContain("Brain of Timora: Strategic Operations Diagnosis");
    expect(res.reply).toContain("Peak Congestion Window");
    expect(res.reply).toContain("Critical Conflict Clearance");
    expect(res.reply).toContain("Faculty Workload Balance");
    expect(res.provider).toBe("deterministic-copilot");
  });

  it("provides in-depth root cause diagnostics and remediation plans for active conflicts", async () => {
    const res = await askTimoraCopilot("Tell me about active conflicts and how to resolve them", [], "academic_admin");

    expect(res.reply).toContain("Conflict Diagnostics & Remediation");
    expect(res.reply).toContain("Root Cause");
    expect(res.reply).toContain("Resolution Plan");
    expect(res.toolResults?.[0]?.toolName).toBe("findTimetableConflicts");
    expect(res.sources?.length).toBeGreaterThan(0);
  });

  it("performs comprehensive faculty burnout and workload ceiling analysis", async () => {
    const res = await askTimoraCopilot("Who is overloaded or near burnout among the faculty?", [], "academic_admin");

    expect(res.reply).toContain("Workload Distribution & Burnout Analysis");
    expect(res.reply).toContain("Near Statutory Limit");
    expect(res.reply).toContain("Available Capacity");
    expect(res.sources?.some((s) => s.type === "faculty")).toBe(true);
  });

  it("answers natural entity queries for courses with assigned faculty, rooms, and schedule slots", async () => {
    const res = await askTimoraCopilot("Tell me about CS-401", [], "academic_admin");

    expect(res.reply).toContain("matching timetable session");
    expect(res.toolResults?.[0]?.toolName).toBe("searchTimetable");
    expect(res.sources?.some((s) => s.type === "session")).toBe(true);
  });

  it("responds warmly with real institutional stats when asked conversational or introductory questions", async () => {
    const res = await askTimoraCopilot("Hello! What can you help me with?", [], "academic_admin");

    expect(res.reply).toContain("Timo");
    expect(res.reply).toContain("Timora academic operations AI companion");
    expect(res.reply).not.toContain("I can answer questions grounded in the current schedule");
  });
});

