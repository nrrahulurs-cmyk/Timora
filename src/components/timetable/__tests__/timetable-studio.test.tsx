import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { validateSessionMove } from "@/lib/scheduling/schedule-engine";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { StudioHeader } from "../studio-header";
import { StudioToolbar, type StudioFilters } from "../studio-toolbar";
import { ClassCard, type EnrichedSession } from "../class-card";
import { GridView } from "../grid-view";
import { TableView } from "../table-view";

describe("PHASE 4 — Timetable Studio Engine & Components", () => {
  describe("Schedule Engine: validateSessionMove", () => {
    it("validates a safe, conflict-free session movement", () => {
      // SESS-CS301-MON moved to Friday Slot 2 in LH-101
      const result = validateSessionMove(
        SYNAPSE_SEED_DATA,
        "SESS-CS301-MON",
        "SLOT-FRI-2",
        "ROOM-LH-101"
      );
      expect(result.isValid).toBe(true);
      expect(result.canStage).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it("detects room double-booking clash when target room is already booked", () => {
      // Trying to move CS-301 to Wednesday Slot 2 in LH-201 (occupied by CS-401/ECE-305)
      const result = validateSessionMove(
        SYNAPSE_SEED_DATA,
        "SESS-CS301-MON",
        "SLOT-WED-2",
        "ROOM-LH-201"
      );
      expect(result.isValid).toBe(false);
      expect(result.canStage).toBe(false);
      const clash = result.issues.find((i) => i.type === "room_clash");
      expect(clash).toBeDefined();
      expect(clash?.title).toContain("Double-Booking");
      expect(clash?.suggestedAlternatives.length).toBeGreaterThan(0);
    });

    it("detects faculty schedule overlap when instructor is already teaching", () => {
      // Trying to move SESS-CS401-MON to Wednesday Slot 2 where Dr. Vance already has SESS-CS401-WED
      const result = validateSessionMove(
        SYNAPSE_SEED_DATA,
        "SESS-CS401-MON",
        "SLOT-WED-2",
        "ROOM-LH-102"
      );
      expect(result.isValid).toBe(false);
      const overlap = result.issues.find((i) => i.type === "faculty_overlap");
      expect(overlap).toBeDefined();
    });

    it("detects room capacity deficit when section headcount exceeds room capacity", () => {
      // SEC-CSE-S5-A (65 students) moved to ROOM-SEM-303 (capacity 40)
      const result = validateSessionMove(
        SYNAPSE_SEED_DATA,
        "SESS-CS401-MON",
        "SLOT-FRI-3",
        "ROOM-SEM-303"
      );
      expect(result.isValid).toBe(false);
      const capIssue = result.issues.find((i) => i.type === "capacity_deficit");
      expect(capIssue).toBeDefined();
      expect(capIssue?.description).toContain("Deficit: -25 seats");
    });

    it("detects facility maintenance block collision", () => {
      // ROOM-LAB-CS-02 is under maintenance at SLOT-THU-4
      const result = validateSessionMove(
        SYNAPSE_SEED_DATA,
        "SESS-CS301-MON",
        "SLOT-THU-4",
        "ROOM-LAB-CS-02"
      );
      expect(result.isValid).toBe(false);
      expect(result.canStage).toBe(false);
      const maint = result.issues.find((i) => i.type === "maintenance_block");
      expect(maint).toBeDefined();
    });

    it("flags no-feasible-alternative when sole BSL-3 facility is down", () => {
      // SESS-BIO901-WED requires BSL-3 containment. LAB-BIO-BSL3 is down at SLOT-WED-2
      const result = validateSessionMove(
        SYNAPSE_SEED_DATA,
        "SESS-BIO901-WED",
        "SLOT-WED-2",
        "ROOM-LAB-BIO-BSL3"
      );
      expect(result.isValid).toBe(false);
      const bsl3Issue = result.issues.find((i) => i.type === "equipment_mismatch");
      expect(bsl3Issue).toBeDefined();
      expect(bsl3Issue?.title).toContain("BSL-3 Facility");
      expect(bsl3Issue?.suggestedAlternatives.length).toBe(0);
    });
  });

  describe("StudioHeader Component", () => {
    it("renders page title, version, draft status, and conflict count", () => {
      render(
        <StudioHeader
          scheduleVersion="v2.4-preview"
          isDraft={true}
          conflictCount={5}
          stagedChangesCount={0}
          onUndo={vi.fn()}
          onSave={vi.fn()}
          onPublish={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByText("Timetable Studio")).toBeInTheDocument();
      expect(screen.getByText("v2.4-preview")).toBeInTheDocument();
      expect(screen.getByText("Draft Mode")).toBeInTheDocument();
      expect(screen.getByText("5 Conflicts Flagged")).toBeInTheDocument();
    });

    it("disables Undo and Save buttons when staged changes are 0", () => {
      render(
        <StudioHeader
          scheduleVersion="v2.4-preview"
          isDraft={true}
          conflictCount={5}
          stagedChangesCount={0}
          onUndo={vi.fn()}
          onSave={vi.fn()}
          onPublish={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    });

    it("enables Undo and Save buttons and displays staged badge when staged changes > 0", () => {
      const onUndo = vi.fn();
      const onSave = vi.fn();

      render(
        <StudioHeader
          scheduleVersion="v2.4-preview"
          isDraft={true}
          conflictCount={5}
          stagedChangesCount={2}
          onUndo={onUndo}
          onSave={onSave}
          onPublish={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByText(/2 Uncommitted Changes/i)).toBeInTheDocument();
      const undoBtn = screen.getByRole("button", { name: /undo/i });
      expect(undoBtn).not.toBeDisabled();
      fireEvent.click(undoBtn);
      expect(onUndo).toHaveBeenCalledTimes(1);

      const saveBtn = screen.getByRole("button", { name: /save changes/i });
      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe("ClassCard Component", () => {
    const mockSession: EnrichedSession = {
      session: {
        id: "SESS-101",
        academicTermId: "TERM-FALL-2026",
        versionId: "VER-2.4",
        subjectId: "SUB-CS401",
        sectionId: "SEC-CSE-S5-A",
        facultyId: "FAC-VANCE",
        classroomId: "ROOM-LH-201",
        timeSlotId: "SLOT-WED-2",
        status: "scheduled",
        isRecurringWeekly: true,
        effectiveFrom: "2026-08-17",
        effectiveUntil: "2026-12-18",
      },
      subject: {
        id: "SUB-CS401",
        departmentId: "DEPT-CSE",
        code: "CS-401",
        title: "Distributed Systems & Cloud Architecture",
        credits: 4,
        semester: 5,
        type: "Lecture",
        lectureHoursWeekly: 3,
        labHoursWeekly: 0,
        tutorialHoursWeekly: 1,
        requiredRoomType: "Lecture Hall",
        requiredEquipment: ["smart_projector"],
        isElective: false,
      },
      classroom: {
        id: "ROOM-LH-201",
        code: "LH-201",
        name: "Maxwell Lecture Theatre",
        building: "Maxwell Physics Wing",
        floor: 2,
        capacity: 180,
        type: "Lecture Hall",
        equipment: ["smart_projector"],
        isAccessible: true,
        status: "Available",
      },
      faculty: {
        id: "FAC-VANCE",
        userId: "USER-VANCE",
        employeeCode: "FAC-101",
        name: "Dr. Eleanor Vance",
        email: "e.vance@timora.edu",
        departmentId: "DEPT-CSE",
        designation: "Professor",
        maxCreditHours: 14,
        currentAssignedHours: 12,
        specializations: ["Distributed Systems"],
        availability: [],
        status: "active",
      },
      section: {
        id: "SEC-CSE-S5-A",
        departmentId: "DEPT-CSE",
        academicTermId: "TERM-FALL-2026",
        semester: 5,
        sectionCode: "CSE-5A",
        name: "B.Tech Computer Science (Sem 5, Section A)",
        studentCount: 65,
        academicAdvisorId: "FAC-VANCE",
        curriculumCredits: 22,
        allocatedCredits: 22,
      },
      conflict: {
        id: "CONF-01",
        type: "room_clash",
        severity: "critical",
        title: "Classroom Double-Booking",
        description: "Room clash in LH-201",
        sessionIds: ["SESS-101"],
        detectedAt: "2026-10-14T08:00:00Z",
        status: "active",
        hasFeasibleAlternative: true,
        alternatives: [],
      },
    };

    it("renders class card details with conflict banner", () => {
      const onClick = vi.fn();
      render(<ClassCard data={mockSession} onClick={onClick} />);

      expect(screen.getByText("CS-401")).toBeInTheDocument();
      expect(screen.getByText("Distributed Systems & Cloud Architecture")).toBeInTheDocument();
      expect(screen.getByText("CSE-5A")).toBeInTheDocument();
      expect(screen.getByText("LH-201")).toBeInTheDocument();
      expect(screen.getByText("Dr. Eleanor Vance")).toBeInTheDocument();
      expect(screen.getByText("Room Clash")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("renders uncommitted staged move badge when isStaged is true", () => {
      const stagedSession: EnrichedSession = {
        ...mockSession,
        conflict: undefined,
        isStaged: true,
        stagedNote: "Moved from Slot 1",
      };

      render(<ClassCard data={stagedSession} />);
      expect(screen.getByText(/Staged Move \(Unsaved\)/i)).toBeInTheDocument();
      expect(screen.getByText("Moved from Slot 1")).toBeInTheDocument();
    });
  });

  describe("GridView & TableView Components", () => {
    const mockSessions: EnrichedSession[] = [
      {
        session: {
          id: "SESS-101",
          academicTermId: "TERM-FALL-2026",
          versionId: "VER-2.4",
          subjectId: "SUB-CS401",
          sectionId: "SEC-CSE-S5-A",
          facultyId: "FAC-VANCE",
          classroomId: "ROOM-LH-102",
          timeSlotId: "SLOT-MON-2",
          status: "scheduled",
          isRecurringWeekly: true,
          effectiveFrom: "2026-08-17",
          effectiveUntil: "2026-12-18",
        },
        subject: {
          id: "SUB-CS401",
          departmentId: "DEPT-CSE",
          code: "CS-401",
          title: "Distributed Systems",
          credits: 4,
          semester: 5,
          type: "Lecture",
          lectureHoursWeekly: 3,
          labHoursWeekly: 0,
          tutorialHoursWeekly: 1,
          requiredRoomType: "Lecture Hall",
          requiredEquipment: [],
          isElective: false,
        },
        classroom: {
          id: "ROOM-LH-102",
          code: "LH-102",
          name: "Turing Amphitheatre",
          building: "Turing Block",
          floor: 1,
          capacity: 160,
          type: "Lecture Hall",
          equipment: [],
          isAccessible: true,
          status: "Available",
        },
        faculty: {
          id: "FAC-VANCE",
          userId: "USER-VANCE",
          employeeCode: "FAC-101",
          name: "Dr. Eleanor Vance",
          email: "e.vance@timora.edu",
          departmentId: "DEPT-CSE",
          designation: "Professor",
          maxCreditHours: 14,
          currentAssignedHours: 12,
          specializations: [],
          availability: [],
          status: "active",
        },
        section: {
          id: "SEC-CSE-S5-A",
          departmentId: "DEPT-CSE",
          academicTermId: "TERM-FALL-2026",
          semester: 5,
          sectionCode: "CSE-5A",
          name: "Computer Science 5A",
          studentCount: 65,
          academicAdvisorId: "FAC-VANCE",
          curriculumCredits: 22,
          allocatedCredits: 22,
        },
      },
    ];

    it("GridView renders days and slots with session cards", () => {
      render(
        <GridView
          timeSlots={SYNAPSE_SEED_DATA.timeSlots}
          sessions={mockSessions}
          onSelectSession={vi.fn()}
          onMoveSession={vi.fn()}
        />
      );

      expect(screen.getByText("Monday")).toBeInTheDocument();
      expect(screen.getByText("Wednesday")).toBeInTheDocument();
      expect(screen.getByText("CS-401")).toBeInTheDocument();
    });

    it("TableView renders structured columns and rows", () => {
      render(
        <TableView
          sessions={mockSessions}
          onSelectSession={vi.fn()}
          onMoveSession={vi.fn()}
        />
      );

      expect(screen.getByText("Subject")).toBeInTheDocument();
      expect(screen.getByText("Section")).toBeInTheDocument();
      expect(screen.getByText("Day & Time Slot")).toBeInTheDocument();
      expect(screen.getByText("Classroom")).toBeInTheDocument();
      expect(screen.getByText("Instructor")).toBeInTheDocument();
      expect(screen.getByText("Validation Status")).toBeInTheDocument();
      expect(screen.getByText("Conflict-Free")).toBeInTheDocument();
    });
  });
});
