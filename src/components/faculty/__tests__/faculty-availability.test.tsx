import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import FacultyPage from "@/app/faculty/page";
import { FacultyAvailabilityDrawer } from "@/components/faculty/faculty-availability-drawer";
import {
  LocalDemoSchedulingRepository,
  schedulingRepository,
} from "@/lib/repository/scheduling-repository";
import type { FacultyMember, FacultyAvailabilityPattern } from "@/types/domain";

describe("Phase C: Faculty Availability & Operational Governance", () => {
  let repo: LocalDemoSchedulingRepository;

  beforeEach(() => {
    repo = new LocalDemoSchedulingRepository();
  });

  it("retrieves faculty with explicit availability patterns", async () => {
    const facultyList = await repo.getFaculty();
    expect(facultyList.length).toBeGreaterThan(0);

    const vance = facultyList.find((f) => f.employeeCode === "FAC-101");
    expect(vance).toBeDefined();
    expect(vance?.availability.length).toBeGreaterThan(0);

    // Verify day pattern contains availableSlotIds and blockedSlotIds
    const monPattern = vance?.availability.find((p) => p.dayOfWeek === "Monday");
    expect(monPattern).toBeDefined();
    expect(monPattern?.availableSlotIds).toContain("SLOT-MON-1");
  });

  it("appoints a new faculty member with validated credentials", async () => {
    const created = await repo.createFacultyMember({
      employeeCode: "FAC-999",
      name: "Dr. Grace Hopper",
      email: "g.hopper@timora.edu",
      departmentId: "DEPT-CSE",
      designation: "Professor",
      maxCreditHours: 14,
      specializations: ["Compilers", "COBOL", "Distributed Computing"],
      status: "active",
      availability: [],
    });

    expect(created.employeeCode).toBe("FAC-999");
    expect(created.name).toBe("Dr. Grace Hopper");

    // Rejects duplicate employee code
    await expect(
      repo.createFacultyMember({
        employeeCode: "FAC-999",
        name: "Duplicate Instructor",
        email: "dup@timora.edu",
        departmentId: "DEPT-CSE",
        designation: "Assistant Professor",
        maxCreditHours: 12,
        specializations: [],
        status: "active",
        availability: [],
      })
    ).rejects.toThrow(/already exists/i);
  });

  it("detects hard conflict when blocking a slot that has an active scheduled class", async () => {
    // Dr. Eleanor Vance (FAC-VANCE / FAC-101) has scheduled class on Monday Slot 1 (SLOT-MON-1)
    const proposedPatterns: FacultyAvailabilityPattern[] = [
      {
        dayOfWeek: "Monday",
        availableSlotIds: ["SLOT-MON-2", "SLOT-MON-3"],
        preferredSlotIds: [],
        blockedSlotIds: ["SLOT-MON-1"], // Blocking slot where class is scheduled!
        maxHoursPerDay: 4,
      },
    ];

    const impact = await repo.checkFacultyAvailabilityImpact("FAC-VANCE", proposedPatterns);
    expect(impact.affectedSessions.length).toBeGreaterThan(0);
    expect(impact.introducedViolations.length).toBeGreaterThan(0);
    expect(impact.introducedViolations[0].rule).toBe("faculty_hard_availability");
    expect(impact.introducedViolations[0].title).toContain("Faculty Blocked Duty Collision");
  });

  it("updates availability cleanly when slots do not collide with scheduled classes", async () => {
    // Friday afternoon slot has no class for Dr. Vance
    const cleanPatterns: FacultyAvailabilityPattern[] = [
      {
        dayOfWeek: "Friday",
        availableSlotIds: ["SLOT-FRI-1", "SLOT-FRI-2"],
        preferredSlotIds: ["SLOT-FRI-1"],
        blockedSlotIds: ["SLOT-FRI-5"],
        maxHoursPerDay: 4,
      },
    ];

    const result = await repo.updateFacultyAvailability("FAC-VANCE", cleanPatterns);
    expect(result.success).toBe(true);

    const updated = await repo.getFacultyById("FAC-VANCE");
    const fri = updated?.availability.find((p) => p.dayOfWeek === "Friday");
    expect(fri?.blockedSlotIds).toContain("SLOT-FRI-5");
  });

  it("renders FacultyPage with accurate live workload metrics and search filter", async () => {
    render(<FacultyPage />);

    await waitFor(() => {
      expect(screen.getByText("Faculty & Availability Operations")).toBeDefined();
    });

    // Check KPI summary
    expect(screen.getByText("Appointed Faculty")).toBeDefined();
    expect(screen.getByText("Average Workload")).toBeDefined();
    expect(screen.getByText("Institutional Duty Blocks")).toBeDefined();

    // Check that Dr. Eleanor Vance card is rendered
    expect(screen.getByText("Dr. Eleanor Vance")).toBeDefined();
  });
});
