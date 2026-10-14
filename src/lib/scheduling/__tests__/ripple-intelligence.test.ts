import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateScheduleDiff,
  searchChainResolutions,
  explainNoFeasibleSolution,
} from "../ripple-engine";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import type { SynapseCollegeDataset, ConflictRecord } from "@/types/domain";

describe("SYNAPSE Ripple Intelligence Engine", () => {
  let dataset: SynapseCollegeDataset;

  beforeEach(() => {
    dataset = JSON.parse(JSON.stringify(SYNAPSE_SEED_DATA));
  });

  // ── 1. Schedule Difference Calculation (Clean Proposal) ────────────────────
  describe("calculateScheduleDiff — Clean Conflict Resolution", () => {
    it("reports isSafeToApply === true, conflictsRemoved, and 0 new conflicts for LH-102 reallocation", () => {
      // Reallocate SESS-ECE305-WED from LH-201 to vacant LH-102 at SLOT-WED-2
      const diff = calculateScheduleDiff(dataset, [
        {
          sessionId: "SESS-ECE305-WED",
          targetClassroomId: "ROOM-LH-102",
          targetTimeSlotId: "SLOT-WED-2",
        },
      ]);

      expect(diff.isSafeToApply).toBe(true);
      expect(diff.changedSessions).toHaveLength(1);

      // Verify before and after snapshots
      const sessionDiff = diff.changedSessions[0];
      expect(sessionDiff.subjectCode).toBe("ECE-305");
      expect(sessionDiff.before.classroomCode).toBe("LH-201");
      expect(sessionDiff.after.classroomCode).toBe("LH-102");

      // Verify conflict removal
      expect(diff.conflictsRemoved.some((c) => c.id === "CONF-01")).toBe(true);
      expect(diff.newConflictsCreated).toHaveLength(0);

      // Verify net improvement
      expect(diff.netClashDelta).toBeLessThan(0);
      expect(diff.explanation).toContain("SAFE NET IMPROVEMENT");
      expect(diff.hardConstraintsSatisfied.length).toBeGreaterThan(0);
    });
  });

  // ── 2. Schedule Difference Calculation (Unsafe Proposal) ───────────────────
  describe("calculateScheduleDiff — Unsafe Proposal Detection", () => {
    it("reports isSafeToApply === false and flags newly created hard conflicts", () => {
      // Intentionally propose moving SESS-ECE305-WED into LH-101 at SLOT-MON-1
      // (LH-101 is already occupied by SESS-CS301-MON at SLOT-MON-1)
      const diff = calculateScheduleDiff(dataset, [
        {
          sessionId: "SESS-ECE305-WED",
          targetClassroomId: "ROOM-LH-101",
          targetTimeSlotId: "SLOT-MON-1",
        },
      ]);

      expect(diff.isSafeToApply).toBe(false);
      expect(diff.newConflictsCreated.length).toBeGreaterThan(0);
      expect(diff.newConflictsCreated.some((v) => v.rule === "room_double_booking")).toBe(true);
      expect(diff.explanation).toContain("UNSAFE PROPOSAL");
    });
  });

  // ── 3. Bounded Chain Reallocation Search ────────────────────────────────────
  describe("searchChainResolutions — Bounded Multi-Hop Search", () => {
    it("returns ranked clean solutions for CONF-01 with 0 cascade clashes", () => {
      const conf01 = dataset.conflicts.find((c) => c.id === "CONF-01")!;
      expect(conf01).toBeDefined();

      const chainAlts = searchChainResolutions(conf01, dataset, 2);
      expect(chainAlts.length).toBeGreaterThan(0);

      const topSolution = chainAlts[0];
      expect(topSolution.downstreamClashCount).toBe(0);
      expect(topSolution.feasibilityScore).toBeGreaterThanOrEqual(90);
    });

    it("returns strictly empty array for CONF-05 (BSL-3 shutdown)", () => {
      const conf05 = dataset.conflicts.find((c) => c.id === "CONF-05")!;
      expect(conf05).toBeDefined();

      const chainAlts = searchChainResolutions(conf05, dataset, 2);
      // Strictly NO chain solution can bypass statutory BSL-3 absence
      expect(chainAlts).toHaveLength(0);
    });
  });

  // ── 4. No Feasible Solution Explanation (CONF-05) ───────────────────────────
  describe("explainNoFeasibleSolution — Diagnostic Explanation & Anti-Hallucination", () => {
    it("generates comprehensive diagnostic report for CONF-05 with zero silent relaxation", () => {
      const conf05 = dataset.conflicts.find((c) => c.id === "CONF-05")!;
      const report = explainNoFeasibleSolution(conf05, dataset);

      expect(report.conflictId).toBe("CONF-05");
      expect(report.hasFeasibleAlternative).toBe(false);

      // Must identify federal biosafety compliance
      expect(report.hardBlockers.some((b) => b.includes("Biosafety"))).toBe(true);

      // Must state that LAB-BIO-BSL3 is the sole facility
      expect(report.reasons.some((r) => r.includes("SOLE certified BSL-3"))).toBe(true);

      // Must explicitly prohibit moving to BSL-2 lab
      expect(
        report.prohibitedRelaxations.some((p) => p.includes("standard BSL-2 laboratories"))
      ).toBe(true);

      // Must recommend realistic administrative actions
      expect(report.recommendedAdministrativeActions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
