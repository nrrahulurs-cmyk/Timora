"use client";

import * as React from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";

interface ScheduleExtraClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

export function ScheduleExtraClassModal({
  open,
  onOpenChange,
  onScheduled,
}: ScheduleExtraClassModalProps) {
  const { toast } = useToast();
  const [courseCode, setCourseCode] = React.useState("CS-401");
  const [roomCode, setRoomCode] = React.useState("LH-101");
  const [date, setDate] = React.useState("2026-10-18");
  const [timeSlot, setTimeSlot] = React.useState("10:00 - 11:30 AM");
  const [reason, setReason] = React.useState("Mid-term exam review session");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await schedulingRepository.scheduleExtraClass({
      courseCode,
      roomCode,
      date,
      timeSlot,
    });
    setSubmitting(false);

    toast({
      title: "Extra Class Scheduled",
      description: `${courseCode} session confirmed for ${date} at ${timeSlot} in ${roomCode}.`,
      variant: "success",
    });

    if (onScheduled) onScheduled();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-purple-600" />
            <DialogTitle className="text-base font-semibold">
              Schedule Extra Class
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Book an ad-hoc tutorial, review lecture, or makeup session with automated conflict pre-flight.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Course Code</label>
            <select
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="w-full h-9 rounded-[var(--radius-md)] border border-[rgb(var(--color-border-default))] px-3 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))]"
            >
              <option value="CS-401">CS-401: Distributed Systems</option>
              <option value="MATH-202">MATH-202: Multivariable Calculus</option>
              <option value="PHY-301">PHY-301: Quantum Mechanics</option>
              <option value="ME-202">ME-202: Fluid Mechanics</option>
              <option value="BIO-110">BIO-110: Cellular Biology</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full h-9 rounded-[var(--radius-md)] border border-[rgb(var(--color-border-default))] px-3 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))]"
              >
                <option value="09:00 - 10:30 AM">09:00 - 10:30 AM</option>
                <option value="10:00 - 11:30 AM">10:00 - 11:30 AM</option>
                <option value="02:00 - 03:30 PM">02:00 - 03:30 PM</option>
                <option value="04:00 - 05:30 PM">04:00 - 05:30 PM</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Assigned Facility</label>
            <select
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full h-9 rounded-[var(--radius-md)] border border-[rgb(var(--color-border-default))] px-3 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))]"
            >
              <option value="LH-101">LH-101 (Main Wing • 220 Seats) — Free</option>
              <option value="HALL-C">HALL-C (Amphitheatre • 150 Seats) — Free</option>
              <option value="LAB-CS-02">LAB-CS-02 (Computing • 60 Seats) — Free</option>
              <option value="SEM-302">SEM-302 (Seminar • 50 Seats) — Free</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Purpose / Reason</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Makeup lecture, revision tutorial"
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Booking..." : "Schedule & Lock Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
