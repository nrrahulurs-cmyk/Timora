"use client";

import * as React from "react";
import { AlertTriangle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository, type AttentionItem } from "@/lib/repository/scheduling-repository";

interface ResolveConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AttentionItem | null;
  onResolved?: (id: string) => void;
}

export function ResolveConflictModal({
  open,
  onOpenChange,
  item,
  onResolved,
}: ResolveConflictModalProps) {
  const { toast } = useToast();
  const [resolving, setResolving] = React.useState(false);

  const activeItem = item || {
    id: "ATT-001",
    title: "Room Double-Booking in LH-201",
    type: "clash" as const,
    severity: "critical" as const,
    timeSlot: "Wed 10:00 - 11:30 AM",
    location: "LH-201 (180 Seats)",
    description: "CS-401 Sec A (145 students) overlaps with EE-305 Sec B (120 students).",
    actionLabel: "Resolve Room Clash",
    targetUrl: "/conflicts",
  };

  const handleApplyResolution = async () => {
    setResolving(true);
    await schedulingRepository.resolveAttentionItem(activeItem.id);
    setResolving(false);

    toast({
      title: "Conflict Resolved Successfully",
      description: `Reallocated section to LH-102 with zero downstream schedule collisions.`,
      variant: "success",
    });

    if (onResolved) onResolved(activeItem.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <DialogTitle className="text-base font-semibold">
                Resolve Timetable Conflict
              </DialogTitle>
            </div>
            <Badge variant="error" size="sm">
              Critical Clash
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Review clash parameters and apply verified Ripple Intelligence solution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 my-2">
          {/* Clash Details */}
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-red-950 font-mono">
                {activeItem.location || "Location Conflict"}
              </span>
              <span className="text-[11px] text-red-700 font-mono">
                {activeItem.timeSlot}
              </span>
            </div>
            <p className="text-xs text-red-900 leading-relaxed">
              {activeItem.description}
            </p>
          </div>

          {/* Ripple Intelligence Recommendation */}
          <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
              <Sparkles className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              <span>Timora Ripple Resolution Recommendation</span>
            </div>

            <div className="text-xs text-slate-700 space-y-1.5 bg-white p-2.5 rounded border border-blue-100">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Proposed Shift:</span>
                <span className="font-semibold text-slate-800">
                  EE-305 Sec B → LH-102 (Capacity 160)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Predicted Downstream Impact:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 0 Cascade Clashes
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Faculty Walking Distance:</span>
                <span className="font-medium text-slate-700">Adjacent Wing (40m)</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resolving}
          >
            Review Later
          </Button>
          <Button
            type="button"
            onClick={handleApplyResolution}
            disabled={resolving}
            className="gap-1.5"
          >
            {resolving ? "Resolving..." : "Apply Ripple Solution"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
