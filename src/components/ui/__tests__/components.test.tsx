import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { Users } from "lucide-react";

describe("CIIRC-Style Component System", () => {
  describe("Button", () => {
    it("renders default variant with accessible text", () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole("button", { name: /click me/i });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain("bg-[rgb(var(--color-primary))]");
    });

    it("renders secondary and subtle variants", () => {
      const { rerender } = render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button", { name: /secondary/i })).toBeInTheDocument();

      rerender(<Button variant="subtle">Subtle</Button>);
      const subtleBtn = screen.getByRole("button", { name: /subtle/i });
      expect(subtleBtn.className).toContain("bg-[rgb(var(--color-primary-light))]");
    });

    it("handles click events", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole("button", { name: /click/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("respects disabled state", () => {
      render(<Button disabled>Disabled</Button>);
      const btn = screen.getByRole("button", { name: /disabled/i });
      expect(btn).toBeDisabled();
    });
  });

  describe("Badge", () => {
    it("renders status badges with semantic classes and dot indicator", () => {
      render(
        <Badge variant="success" dot>
          Active Status
        </Badge>
      );
      const badge = screen.getByText(/active status/i);
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("bg-[rgb(var(--color-success-light))]");
    });

    it("renders warning and error variants", () => {
      const { rerender } = render(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText(/warning/i)).toBeInTheDocument();

      rerender(<Badge variant="error">Error</Badge>);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe("KpiCard", () => {
    it("renders title, value, subtitle and trend indicator", () => {
      render(
        <KpiCard
          title="Total Sections"
          value="1,420"
          subtitle="97% allocated"
          trend={{ value: "4.2%", direction: "up", isPositive: true }}
          icon={Users}
        />
      );
      expect(screen.getByText("Total Sections")).toBeInTheDocument();
      expect(screen.getByText("1,420")).toBeInTheDocument();
      expect(screen.getByText("97% allocated")).toBeInTheDocument();
      expect(screen.getByText("4.2%")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("navigates through pages correctly", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={50}
          pageSize={10}
          onPageChange={onPageChange}
        />
      );

      const nextBtn = screen.getByLabelText("Next page");
      fireEvent.click(nextBtn);
      expect(onPageChange).toHaveBeenCalledWith(3);

      const prevBtn = screen.getByLabelText("Previous page");
      fireEvent.click(prevBtn);
      expect(onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe("ConfirmDialog", () => {
    it("renders dialog and triggers confirm handler", () => {
      const onConfirm = vi.fn();
      const onOpenChange = vi.fn();

      render(
        <ConfirmDialog
          open={true}
          onOpenChange={onOpenChange}
          title="Confirm Publish"
          description="Are you sure you want to publish the timetable?"
          confirmLabel="Publish Now"
          onConfirm={onConfirm}
        />
      );

      expect(screen.getByText("Confirm Publish")).toBeInTheDocument();
      expect(
        screen.getByText("Are you sure you want to publish the timetable?")
      ).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /publish now/i });
      fireEvent.click(confirmBtn);
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  describe("Application States", () => {
    it("renders EmptyState with action", () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No Conflicts Found"
          description="All sections have valid room assignments."
          action={{ label: "Add Section", onClick: handleAction }}
        />
      );

      expect(screen.getByText("No Conflicts Found")).toBeInTheDocument();
      const actionBtn = screen.getByRole("button", { name: /add section/i });
      fireEvent.click(actionBtn);
      expect(handleAction).toHaveBeenCalled();
    });

    it("renders ErrorState with retry button", () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Connection Error"
          description="Failed to connect to timetable solver."
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText("Connection Error")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /try again/i });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalled();
    });
  });
});
