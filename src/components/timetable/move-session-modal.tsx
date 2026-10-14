"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, MapPin, Move } from "lucide-react";
import type { EnrichedSession } from "./class-card";
import type { SynapseCollegeDataset } from "@/types/domain";
import { validateSessionMove, type MoveValidationResult } from "@/lib/scheduling/schedule-engine";

interface MoveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: EnrichedSession | null;
  dataset: SynapseCollegeDataset;
  onConfirmMove: (sessionId: string, targetTimeSlotId: string, targetClassroomId?: string) => void;
}

export function MoveSessionModal({
  isOpen,
  onClose,
  sessionData,
  dataset,
  onConfirmMove,
}: MoveSessionModalProps) {
  const session = sessionData?.session;

  const [targetSlotId, setTargetSlotId] = React.useState(session?.timeSlotId || "");
  const [targetRoomId, setTargetRoomId] = React.useState(session?.classroomId || "");
  const [validationResult, setValidationResult] = React.useState<MoveValidationResult | null>(null);

  React.useEffect(() => {
    if (session) {
      setTargetSlotId(session.timeSlotId);
      setTargetRoomId(session.classroomId);
      setValidationResult(null);
    }
  }, [session?.id, session?.timeSlotId, session?.classroomId]);

  React.useEffect(() => {
    if (!session) return;
    if (targetSlotId === session.timeSlotId && targetRoomId === session.classroomId) {
      setValidationResult(null);
      return;
    }
    const res = validateSessionMove(
      dataset,
      session.id,
      targetSlotId,
      targetRoomId,
      session.facultyId
    );
    setValidationResult(res);
  }, [targetSlotId, targetRoomId, dataset, session?.id, session?.timeSlotId, session?.classroomId, session?.facultyId]);

  if (!sessionData || !session) return null;
  const { subject, classroom, section } = sessionData;

  const currentSlot = dataset.timeSlots.find((t) => t.id === session.timeSlotId);
  const targetSlot = dataset.timeSlots.find((t) => t.id === targetSlotId);
  const targetRoom = dataset.classrooms.find((c) => c.id === targetRoomId);

  const handleConfirm = () => {
    onConfirmMove(session.id, targetSlotId, targetRoomId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-full bg-blue-100 text-[rgb(var(--color-primary))]">
              <Move className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold">
              Move & Reschedule Session
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Propose a new day, time slot, or classroom. Timora validates space capacity and schedule conflicts before staging.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4 text-xs">
          {/* Target Course Banner */}
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-mono font-bold text-xs text-[rgb(var(--color-primary))] mr-2">
                {subject?.code}
              </span>
              <span className="font-semibold text-slate-800">{subject?.title}</span>
            </div>
            <Badge variant="outline" size="sm">
              {section?.sectionCode} ({section?.studentCount} stds)
            </Badge>
          </div>

          {/* Before & After Comparison Preview */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
            {/* Current Position */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Allocation
              </span>
              <div className="font-mono text-xs font-semibold text-slate-700">
                {currentSlot?.label}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{classroom?.code} ({classroom?.capacity}s)</span>
              </div>
            </div>

            {/* Target Destination */}
            <div className="space-y-1 border-l border-slate-200 pl-3">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block flex items-center gap-1">
                <span>Proposed Target</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </span>
              <div className="font-mono text-xs font-semibold text-slate-800">
                {targetSlot?.label}
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-blue-500" />
                <span>{targetRoom?.code} ({targetRoom?.capacity}s)</span>
              </div>
            </div>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Select Time Slot</label>
              <select
                value={targetSlotId}
                onChange={(e) => setTargetSlotId(e.target.value)}
                className="w-full h-8.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
              >
                {dataset.timeSlots.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600">Select Classroom</label>
              <select
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
                className="w-full h-8.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
              >
                {dataset.classrooms.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.code} ({cr.capacity} seats • {cr.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Validation Report Banner */}
          {validationResult && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                validationResult.isValid
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : validationResult.canStage
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {validationResult.isValid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span>{validationResult.summary}</span>
              </div>

              {validationResult.issues.map((iss, i) => (
                <p key={i} className="text-[11px] text-slate-700 leading-snug pl-5">
                  • {iss.description}
                </p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs border-slate-200">
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={
              (targetSlotId === session.timeSlotId && targetRoomId === session.classroomId) ||
              (validationResult !== null && !validationResult.canStage)
            }
            className="h-8 text-xs bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))]"
          >
            Stage Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
