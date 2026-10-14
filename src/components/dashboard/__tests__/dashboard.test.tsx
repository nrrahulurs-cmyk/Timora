import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  schedulingRepository,
  type KpiMetrics,
  type AttentionItem,
  type ActivityItem,
} from "@/lib/repository/scheduling-repository";

const mockMetrics: KpiMetrics = {
  scheduledClasses: {
    count: 1284,
    total: 1318,
    percentage: 97.4,
    supportingText: "97.4% of curriculum scheduled",
  },
  unresolvedConflicts: {
    count: 3,
    roomClashes: 2,
    facultyClashes: 1,
    supportingText: "2 room overlaps • 1 faculty clash",
  },
  availableRooms: {
    available: 42,
    total: 160,
    occupied: 118,
    supportingText: "42 of 160 free this hour",
  },
  roomUtilisation: {
    rate: 86.2,
    targetBaseline: 85.0,
    supportingText: "1.2% above target baseline (85.0%)",
  },
  pendingApprovals: {
    count: 7,
    classExchanges: 4,
    extraClasses: 3,
    supportingText: "4 class exchanges • 3 extra classes",
  },
};

const mockAttentionItems: AttentionItem[] = [
  {
    id: "ATT-001",
    title: "Room Double-Booking in LH-201",
    type: "clash",
    severity: "critical",
    timeSlot: "Wed 10:00 - 11:30 AM",
    location: "LH-201",
    description: "CS-401 overlaps with EE-305.",
    actionLabel: "Resolve Room Clash",
    targetUrl: "/conflicts",
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: "ACT-01",
    actor: "Dr. Eleanor Vance",
    actorRole: "Timetable Coordinator",
    action: "Reallocated section from LH-102 to LH-201",
    target: "CS-401 Sec A",
    timestamp: "12m ago",
    category: "modification",
  },
];

describe("PHASE 2 Dashboard Components", () => {
  describe("Scheduling Repository", () => {
    it("provides stable demo KPI metrics without invented growth percentages", async () => {
      const m = await schedulingRepository.getKpiMetrics();
      expect(m.scheduledClasses.count).toBe(1284);
      expect(m.unresolvedConflicts.count).toBe(5);
      expect(m.availableRooms.available).toBe(11);
      expect(m.roomUtilisation.rate).toBe(86.2);
      expect(m.pendingApprovals.count).toBe(7);
    });

    it("fetches chart data points for weekly timeline", async () => {
      const chart = await schedulingRepository.getChartData("utilisation", "week");
      expect(chart.length).toBeGreaterThanOrEqual(5);
      expect(chart[0].period).toBe("Mon");
    });

    it("filters available rooms by search query", async () => {
      const allRooms = await schedulingRepository.getAvailableRooms();
      expect(allRooms.length).toBeGreaterThan(0);

      const filtered = await schedulingRepository.getAvailableRooms("LH-101");
      expect(filtered.length).toBe(1);
      expect(filtered[0].code).toBe("LH-101");
    });
  });

  describe("KpiRow (5 Cards)", () => {
    it("renders all 5 cards with values and concise labels", () => {
      render(<KpiRow metrics={mockMetrics} />);

      expect(screen.getByText("Scheduled Classes")).toBeInTheDocument();
      expect(screen.getByText("1,284")).toBeInTheDocument();

      expect(screen.getByText("Active Conflicts")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();

      expect(screen.getByText("Available Rooms")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();

      expect(screen.getByText("Room Utilisation")).toBeInTheDocument();
      expect(screen.getByText("86.2%")).toBeInTheDocument();

      expect(screen.getByText("Pending Approvals")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("fires onConflictClick when clicking unresolved conflicts card", () => {
      const handleConflictClick = vi.fn();
      render(<KpiRow metrics={mockMetrics} onConflictClick={handleConflictClick} />);

      const conflictCard = screen.getByText("Active Conflicts").closest("div");
      if (conflictCard) fireEvent.click(conflictCard);
      expect(handleConflictClick).toHaveBeenCalled();
    });
  });

  describe("AttentionPanel", () => {
    it("renders list of actionable clashes and invokes selection handler", () => {
      const handleSelect = vi.fn();
      render(<AttentionPanel items={mockAttentionItems} onSelectItem={handleSelect} />);

      expect(screen.getByText("Room Double-Booking in LH-201")).toBeInTheDocument();
      expect(screen.getByText("CS-401 overlaps with EE-305.")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Room Double-Booking in LH-201"));
      expect(handleSelect).toHaveBeenCalledWith(mockAttentionItems[0]);
    });
  });

  describe("QuickActions (5 Shortcuts)", () => {
    it("renders all 5 required shortcuts and executes clicks", () => {
      const onStudio = vi.fn();
      const onConflicts = vi.fn();
      const onRoom = vi.fn();
      const onExtra = vi.fn();
      const onSynapse = vi.fn();

      render(
        <QuickActions
          onOpenTimetableStudio={onStudio}
          onOpenResolveConflicts={onConflicts}
          onOpenFindRoom={onRoom}
          onOpenScheduleExtraClass={onExtra}
          onOpenAskSynapse={onSynapse}
        />
      );

      expect(screen.getByText("Timetable Studio")).toBeInTheDocument();
      expect(screen.getByText("Resolve Conflicts")).toBeInTheDocument();
      expect(screen.getByText("Find a Room")).toBeInTheDocument();
      expect(screen.getByText("Schedule Extra Class")).toBeInTheDocument();
      expect(screen.getByText("Ask Timora")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Find a Room"));
      expect(onRoom).toHaveBeenCalled();

      fireEvent.click(screen.getByText("Ask Timora"));
      expect(onSynapse).toHaveBeenCalled();
    });
  });

  describe("RecentActivity", () => {
    it("renders activity logs with actor, action, and category badge", () => {
      const handleFilter = vi.fn();
      render(
        <RecentActivity
          activities={mockActivities}
          onFilterChange={handleFilter}
          selectedCategory="All"
        />
      );

      expect(screen.getByText("Dr. Eleanor Vance")).toBeInTheDocument();
      expect(screen.getByText("CS-401 Sec A")).toBeInTheDocument();
      expect(screen.getByText("12m ago")).toBeInTheDocument();
    });
  });
});
