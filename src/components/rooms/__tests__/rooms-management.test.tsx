import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import RoomsPage from "@/app/rooms/page";
import { RoomDrawer } from "@/components/rooms/room-drawer";
import { RoomCreateModal } from "@/components/rooms/room-create-modal";
import {
  LocalDemoSchedulingRepository,
  schedulingRepository,
} from "@/lib/repository/scheduling-repository";
import type { Classroom } from "@/types/domain";

describe("Phase B: Rooms & Resources Management", () => {
  let repo: LocalDemoSchedulingRepository;

  beforeEach(() => {
    repo = new LocalDemoSchedulingRepository();
  });

  it("calculates accurate inventory counts from real domain entities", async () => {
    const rooms = await repo.getClassrooms();
    const available = rooms.filter((r) => r.status === "Available");
    const occupied = rooms.filter((r) => r.status === "Occupied");
    const maintenance = rooms.filter((r) => r.status === "Maintenance");

    expect(rooms.length).toBeGreaterThan(0);
    expect(available.length + occupied.length + maintenance.length).toBe(rooms.length);
  });

  it("creates a new room with validated capacity and unique code", async () => {
    const newRoom = await repo.createClassroom({
      code: "TEST-CR-999",
      name: "Quantum Computing Lab",
      building: "Maxwell Physics Wing",
      floor: 3,
      capacity: 45,
      type: "Specialized Laboratory",
      equipment: ["high_spec_workstations", "air_conditioning"],
      isAccessible: true,
      status: "Available",
    });

    expect(newRoom.id).toContain("TEST-CR-999");
    expect(newRoom.capacity).toBe(45);

    // Verify it is queryable
    const fetched = await repo.getClassroomById("TEST-CR-999");
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe("Quantum Computing Lab");

    // Reject duplicate room code
    await expect(
      repo.createClassroom({
        code: "TEST-CR-999",
        name: "Another Room",
        building: "Turing Block",
        capacity: 30,
        type: "Standard Classroom",
        equipment: [],
        isAccessible: true,
        status: "Available",
      })
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects non-positive room capacity and missing required fields", async () => {
    await expect(
      repo.createClassroom({
        code: "BAD-CAP-01",
        name: "Invalid Room",
        building: "Turing Block",
        capacity: 0,
        type: "Standard Classroom",
        equipment: [],
        isAccessible: true,
        status: "Available",
      })
    ).rejects.toThrow(/capacity must be greater than 0/i);

    await expect(
      repo.createClassroom({
        code: "",
        name: "Missing Code",
        building: "Turing Block",
        capacity: 50,
        type: "Standard Classroom",
        equipment: [],
        isAccessible: true,
        status: "Available",
      })
    ).rejects.toThrow(/code is required/i);
  });

  it("detects safety impact when moving occupied room to maintenance", async () => {
    // LH-201 has scheduled classes in seed data
    const impact = await repo.checkRoomImpact("ROOM-LH-201", "Maintenance");
    expect(impact.willCauseClash).toBe(true);
    expect(impact.affectedSessions.length).toBeGreaterThan(0);
    expect(impact.details.some((d) => d.includes("collision"))).toBe(true);
  });

  it("detects capacity deficit when reducing capacity below assigned section size", async () => {
    // LH-201 has sections with ~60+ students. Lowering capacity to 20 should flag deficit.
    const impact = await repo.checkRoomImpact("ROOM-LH-201", "Available", 20);
    expect(impact.willCauseClash).toBe(true);
    expect(impact.details.some((d) => d.includes("Capacity deficit"))).toBe(true);
  });

  it("renders RoomsPage and allows switching between cards and Orbitask table view", async () => {
    render(<RoomsPage />);

    await waitFor(() => {
      expect(screen.getByText("Rooms & Resource Inventory")).toBeDefined();
    });

    // Check KPI cards
    expect(screen.getByText("Total Facilities")).toBeDefined();
    expect(screen.getByText("Available Now")).toBeDefined();
    expect(screen.getByText("In Session / Occupied")).toBeDefined();
    expect(screen.getByText("Maintenance & Blocks")).toBeDefined();

    // Switch to Orbitask Table
    const tableToggle = screen.getByTitle("Orbitask Table View");
    fireEvent.click(tableToggle);

    await waitFor(() => {
      expect(screen.getByText("Venue Code")).toBeDefined();
      expect(screen.getByText("Facility Type")).toBeDefined();
    });
  });
});
