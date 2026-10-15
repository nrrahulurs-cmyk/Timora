import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConflictResolutionDrawer } from "../conflict-resolution-drawer";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import type { ConflictRecord, ConstraintType } from "@/types/domain";

describe("PHASE 3 — Conflict Resolution Center & Ripple Intelligence UI", () => {
  const mockDataset = JSON.parse(JSON.stringify(SYNAPSE_SEED_DATA));

  const sampleActiveConflict: ConflictRecord = SYNAPSE_SEED_DATA.conflicts.find(
    (c) => c.id === "CONF-01"
  )!;

  const sampleUnresolvableConflict: ConflictRecord = SYNAPSE_SEED_DATA.conflicts.find(
    (c) => c.id === "CONF-05"
  )!;

  const sampleResolvedConflict: ConflictRecord = {
    ...SYNAPSE_SEED_DATA.conflicts.find((c) => c.id === "CONF-04")!,
    status: "resolved",
  };

  it("renders conflict details, verified constraint failure and timetable studio link", () => {
    render(
      <ConflictResolutionDrawer
        open={true}
        onOpenChange={() => {}}
        conflict={sampleActiveConflict}
        dataset={mockDataset}
      />
    );

    // Title and Code
    expect(screen.getByText("Classroom Double-Booking in LH-201")).toBeDefined();
    expect(screen.getByText("CONF-01")).toBeDefined();

    // Verified constraint failure explanation
    expect(
      screen.getByText(/CS-401 Sec A \(145 students\) and ECE-305 Sec A \(120 students\)/)
    ).toBeDefined();

    // Studio link
    const studioLink = screen.getByRole("link", { name: /Inspect in Studio/i });
    expect(studioLink).toBeDefined();
    expect(studioLink.getAttribute("href")).toBe("/timetable");
  });

  it("enforces Ripple workflow: must preview diff before confirming resolution", async () => {
    const handleResolved = vi.fn();

    render(
      <ConflictResolutionDrawer
        open={true}
        onOpenChange={() => {}}
        conflict={sampleActiveConflict}
        dataset={mockDataset}
        onResolved={handleResolved}
      />
    );

    // Step 1: On alternatives tab, the button must be "Preview Ripple Impact"
    const previewBtn = screen.getByRole("button", { name: /Preview Ripple Impact/i });
    expect(previewBtn).toBeDefined();

    // Clicking it moves to the diff tab
    fireEvent.click(previewBtn);

    // Step 2: Now on diff tab, button becomes "Confirm & Commit Resolution"
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm & Commit Resolution/i })).toBeDefined();
    });

    // Verification: applying triggers resolution
    const commitBtn = screen.getByRole("button", { name: /Confirm & Commit Resolution/i });
    fireEvent.click(commitBtn);

    await waitFor(() => {
      expect(handleResolved).toHaveBeenCalledWith("CONF-01");
    });
  });

  it("handles unresolvable statutory conflict (CONF-05) honestly without hallucinating alternatives", () => {
    render(
      <ConflictResolutionDrawer
        open={true}
        onOpenChange={() => {}}
        conflict={sampleUnresolvableConflict}
        dataset={mockDataset}
      />
    );

    // Badge showing No Alternative on Campus
    expect(screen.getAllByText(/NO ALTERNATIVE ON CAMPUS/i).length).toBeGreaterThan(0);

    // Hard constraints relaxed must strictly be 0
    expect(screen.getByText("0 (Strictly Prohibited)")).toBeDefined();

    // Action button must be Dean escalation
    const escalateBtn = screen.getByRole("button", { name: /Escalate to Dean/i });
    expect(escalateBtn).toBeDefined();
  });

  it("handles resolved conflicts and provides undo capability", async () => {
    const handleUndone = vi.fn();

    render(
      <ConflictResolutionDrawer
        open={true}
        onOpenChange={() => {}}
        conflict={sampleResolvedConflict}
        dataset={mockDataset}
        onUndone={handleUndone}
      />
    );

    // Shows resolved banner in footer
    expect(screen.getByText(/Resolution Persisted in Schedule/i)).toBeDefined();

    // Undo button is present
    const undoBtn = screen.getByRole("button", { name: /Undo Conflict Resolution/i });
    expect(undoBtn).toBeDefined();

    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(handleUndone).toHaveBeenCalledWith("CONF-04");
    });
  });

  it("supports all seven Phase 0 constraint types", () => {
    const allSevenTypes: ConstraintType[] = [
      "room_clash",
      "faculty_overlap",
      "section_clash",
      "capacity_deficit",
      "equipment_mismatch",
      "maintenance_block",
      "consecutive_hours_exceeded",
    ];

    allSevenTypes.forEach((type, index) => {
      const testConflict: ConflictRecord = {
        id: `CONF-TEST-${index}`,
        type,
        severity: "warning",
        title: `Test conflict for ${type}`,
        description: `Detailed description for ${type} constraint check.`,
        sessionIds: ["SESS-01"],
        detectedAt: "2026-10-14T08:00:00Z",
        status: "active",
        hasFeasibleAlternative: true,
        alternatives: [],
      };

      const { unmount } = render(
        <ConflictResolutionDrawer
          open={true}
          onOpenChange={() => {}}
          conflict={testConflict}
          dataset={mockDataset}
        />
      );

      expect(screen.getByText(`Test conflict for ${type}`)).toBeDefined();
      unmount();
    });
  });
});
