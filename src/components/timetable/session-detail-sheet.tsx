"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
  Sparkles,
} from "lucide-react";
import type { EnrichedSession } from "./class-card";
import type {
  Classroom,
  TimeSlot,
  FacultyMember,
  SynapseCollegeDataset,
} from "@/types/domain";
import { validateSessionMove, type MoveValidationResult } from "@/lib/scheduling/schedule-engine";

interface SessionDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: EnrichedSession | null;
  dataset: SynapseCollegeDataset;
  onApplyAlternative: (conflictId: string, solutionId: string) => void;
  onStageMove: (sessionId: string, targetTimeSlotId: string, targetClassroomId?: string) => void;
}

export function SessionDetailSheet({
  isOpen,
  onClose,
  sessionData,
  dataset,
  onApplyAlternative,
  onStageMove,
}: SessionDetailSheetProps) {
  const session = sessionData?.session;

  // Rescheduling Form State
  const [targetSlotId, setTargetSlotId] = React.useState(session?.timeSlotId || "");
  const [targetRoomId, setTargetRoomId] = React.useState(session?.classroomId || "");
  const [validationResult, setValidationResult] = React.useState<MoveValidationResult | null>(null);

  // Synchronize initial targets when sessionData changes
  React.useEffect(() => {
    if (session) {
      setTargetSlotId(session.timeSlotId);
      setTargetRoomId(session.classroomId);
      setValidationResult(null);
    }
  }, [session?.id, session?.timeSlotId, session?.classroomId]);

  // Run live validation whenever target slot or room changes
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
  const { subject, classroom, faculty, section, conflict, isStaged } = sessionData;

  const currentSlot = dataset.timeSlots.find((t) => t.id === session.timeSlotId);
  const isConflicted = Boolean(conflict && conflict.status === "active");

  const handleStageMoveSubmit = () => {
    onStageMove(session.id, targetSlotId, targetRoomId);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col">
        {/* ── Sheet Header ────────────────────────────────────────────────── */}
        <div className="p-6 pb-4 border-b border-[rgb(var(--color-border-default))] bg-slate-50/70">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono font-bold text-sm text-[rgb(var(--color-primary))] bg-blue-100/70 px-2 py-0.5 rounded">
              {subject?.code}
            </span>
            <Badge variant="outline" size="sm" className="bg-white text-slate-700">
              {subject?.type || "Lecture"}
            </Badge>
            {isStaged && (
              <Badge variant="warning" size="sm">
                Staged Move
              </Badge>
            )}
            {isConflicted && (
              <Badge variant="critical" size="sm" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Conflicted</span>
              </Badge>
            )}
          </div>

          <SheetTitle className="text-lg font-bold text-[rgb(var(--color-text-heading))] leading-snug">
            {subject?.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">
            {section?.name} • Curriculum Credits: {subject?.credits}
          </SheetDescription>
        </div>

        {/* ── Sheet Content Body ─────────────────────────────────────────── */}
        <div className="p-6 space-y-6 flex-1">
          {/* Active Conflict Banner & Recommendations */}
          {isConflicted && conflict && (
            <div className="rounded-lg border border-rose-300 bg-rose-50/80 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">{conflict.title}</h4>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    {conflict.description}
                  </p>
                </div>
              </div>

              {/* Alternatives List */}
              {conflict.alternatives.length > 0 ? (
                <div className="mt-3 pt-3 border-t border-rose-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-rose-950 uppercase tracking-wider block">
                    Feasible Solutions ({conflict.alternatives.length}):
                  </span>
                  {conflict.alternatives.map((alt) => (
                    <div
                      key={alt.solutionId}
                      className="p-2.5 rounded-md bg-white border border-rose-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 leading-tight">
                          {alt.description}
                        </span>
                        {alt.isRecommended && (
                          <Badge variant="success" size="sm" className="text-[10px] shrink-0">
                            Recommended
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Feasibility: {alt.feasibilityScore}%</span>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1 bg-[rgb(var(--color-primary))] text-white"
                          onClick={() => {
                            onApplyAlternative(conflict.id, alt.solutionId);
                            onClose();
                          }}
                        >
                          <Zap className="h-3 w-3" />
                          <span>Apply Solution</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-rose-200/80 text-xs text-rose-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span>No Feasible On-Campus Alternative</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Federal containment mandates prohibit transferring pathogen agents to standard BSL-2 rooms. Institutional administrative review or schedule shift to post-overhaul period is required.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Metadata Cards Grid ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Time Slot */}
            <div className="p-3 rounded-lg border border-[rgb(var(--color-border-default))] bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>Time Slot</span>
              </span>
              <div className="font-mono font-bold text-xs text-slate-800">
                {currentSlot?.label || session.timeSlotId}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentSlot?.dayOfWeek} • {currentSlot?.isMorning ? "Morning" : "Afternoon"}
              </div>
            </div>

            {/* Room */}
            <div className="p-3 rounded-lg border border-[rgb(var(--color-border-default))] bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>Classroom</span>
              </span>
              <div className="font-mono font-bold text-xs text-slate-800">
                {classroom?.code} ({classroom?.capacity} seats)
              </div>
              <div className="text-[10px] text-slate-400 truncate" title={classroom?.name}>
                {classroom?.name}
              </div>
            </div>

            {/* Faculty Instructor */}
            <div className="p-3 rounded-lg border border-[rgb(var(--color-border-default))] bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <User className="h-3 w-3 text-slate-400" />
                <span>Instructor</span>
              </span>
              <div className="font-semibold text-xs text-slate-800 truncate" title={faculty?.name}>
                {faculty?.name}
              </div>
              <div className="text-[10px] text-slate-400">
                {faculty?.designation} • {faculty?.currentAssignedHours}/{faculty?.maxCreditHours}h
              </div>
            </div>

            {/* Student Section */}
            <div className="p-3 rounded-lg border border-[rgb(var(--color-border-default))] bg-slate-50/50 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Users className="h-3 w-3 text-slate-400" />
                <span>Student Group</span>
              </span>
              <div className="font-semibold text-xs text-slate-800">
                {section?.sectionCode}
              </div>
              <div className="text-[10px] text-slate-400">
                {section?.studentCount} enrolled students
              </div>
            </div>
          </div>

          {/* ── Equipment Requirements ────────────────────────────────────── */}
          {subject?.requiredEquipment && subject.requiredEquipment.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Required Room Equipment:</span>
              <div className="flex flex-wrap gap-1.5">
                {subject.requiredEquipment.map((eq) => {
                  const hasIt = classroom?.equipment.includes(eq);
                  return (
                    <Badge
                      key={eq}
                      variant={hasIt ? "success" : "critical"}
                      size="sm"
                      className="text-[10px]"
                    >
                      {hasIt ? "✓" : "✗"} {eq.replace(/_/g, " ")}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Reallocation & Move Workflow ───────────────────────────────── */}
          <div className="pt-4 border-t border-[rgb(var(--color-border-default))] space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
              <span>Reschedule or Reallocate Space</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target Slot Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Destination Time Slot</label>
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

              {/* Target Room Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600">Destination Room</label>
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

            {/* Validation Feedback Banner */}
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

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs border-slate-200">
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleStageMoveSubmit}
                disabled={
                  (targetSlotId === session.timeSlotId && targetRoomId === session.classroomId) ||
                  (validationResult !== null && !validationResult.canStage)
                }
                className="h-8 text-xs bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))]"
              >
                Stage Reassignment
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
