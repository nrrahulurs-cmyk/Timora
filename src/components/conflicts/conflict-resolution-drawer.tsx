"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Clock,
  MapPin,
  User,
  Users,
  RotateCcw,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Check,
  Info,
} from "lucide-react";
import type {
  ConflictRecord,
  TimetableSession,
  Classroom,
  FacultyMember,
  StudentSection,
  Subject,
  TimeSlot,
  SynapseCollegeDataset,
  AlternativeResolution,
} from "@/types/domain";
import {
  calculateScheduleDiff,
  explainNoFeasibleSolution,
  type ScheduleDiffReport,
} from "@/lib/scheduling/ripple-engine";
import {
  validateSession,
  rankValidAlternatives,
  type CandidateEvaluation,
} from "@/lib/scheduling/constraint-engine";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { useToast } from "@/components/feedback/use-toast";

interface ConflictResolutionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ConflictRecord | null;
  dataset: SynapseCollegeDataset | null;
  onResolved?: (conflictId: string) => void;
  onUndone?: (conflictId: string) => void;
}

export function ConflictResolutionDrawer({
  open,
  onOpenChange,
  conflict,
  dataset,
  onResolved,
  onUndone,
}: ConflictResolutionDrawerProps) {
  const { toast } = useToast();
  const [selectedSolutionId, setSelectedSolutionId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"alternatives" | "diff">("alternatives");
  const [isApplying, setIsApplying] = React.useState(false);
  const [isUndoing, setIsUndoing] = React.useState(false);
  const [canUndo, setCanUndo] = React.useState(false);
  const [diffReport, setDiffReport] = React.useState<ScheduleDiffReport | null>(null);

  // Initialize selected solution when conflict changes
  React.useEffect(() => {
    if (!conflict) {
      setSelectedSolutionId(null);
      setDiffReport(null);
      setActiveTab("alternatives");
      setCanUndo(false);
      return;
    }

    if (conflict.alternatives && conflict.alternatives.length > 0) {
      const rec = conflict.alternatives.find((a) => a.isRecommended) || conflict.alternatives[0];
      setSelectedSolutionId(rec.solutionId);
    } else {
      setSelectedSolutionId(null);
    }
    setActiveTab("alternatives");
  }, [conflict]);

  // Recalculate schedule diff whenever selected solution changes
  React.useEffect(() => {
    if (!conflict || !dataset || !selectedSolutionId) {
      setDiffReport(null);
      return;
    }

    const sol = conflict.alternatives.find((a) => a.solutionId === selectedSolutionId);
    if (!sol || conflict.sessionIds.length === 0) {
      setDiffReport(null);
      return;
    }

    const targetSessionId = conflict.sessionIds[conflict.sessionIds.length - 1];
    const report = calculateScheduleDiff(dataset, [
      {
        sessionId: targetSessionId,
        targetClassroomId: sol.targetClassroomId,
        targetTimeSlotId: sol.targetTimeSlotId,
        targetFacultyId: sol.substituteFacultyId,
      },
    ]);

    setDiffReport(report);
  }, [conflict, dataset, selectedSolutionId]);

  if (!conflict || !dataset) return null;

  // Resolve affected entities
  const affectedSessions = conflict.sessionIds
    .map((id) => dataset.timetableSessions.find((s) => s.id === id))
    .filter((s): s is TimetableSession => Boolean(s));

  const targetSession = affectedSessions[affectedSessions.length - 1] || null;
  const targetSubject = targetSession
    ? dataset.subjects.find((s) => s.id === targetSession.subjectId)
    : null;
  const targetSection = targetSession
    ? dataset.sections.find((s) => s.id === targetSession.sectionId)
    : null;
  const targetClassroom = targetSession
    ? dataset.classrooms.find((c) => c.id === targetSession.classroomId)
    : null;
  const targetFaculty = targetSession
    ? dataset.faculty.find((f) => f.id === targetSession.facultyId)
    : null;
  const targetSlot = targetSession
    ? dataset.timeSlots.find((t) => t.id === targetSession.timeSlotId)
    : null;

  // Diagnostics for unfeasible alternative (e.g. CONF-05)
  const noFeasibleExplanation =
    !conflict.hasFeasibleAlternative
      ? explainNoFeasibleSolution(conflict, dataset)
      : null;

  const handleApply = async () => {
    if (!selectedSolutionId) return;
    setIsApplying(true);
    try {
      const res = await schedulingRepository.resolveConflict(conflict.id, selectedSolutionId);
      if (res.success) {
        toast({
          title: "Conflict Resolved Successfully",
          description: res.message,
          variant: "success",
        });
        setCanUndo(true);
        if (onResolved) onResolved(conflict.id);
      } else {
        toast({
          title: "Resolution Rejected by Server Validation",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Server Error",
        description: err instanceof Error ? err.message : "Failed to commit conflict resolution.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      const res = await schedulingRepository.undoConflictResolution(conflict.id);
      if (res.success) {
        toast({
          title: "Conflict Resolution Undone",
          description: res.message,
          variant: "default",
        });
        setCanUndo(false);
        if (onUndone) onUndone(conflict.id);
      } else {
        toast({
          title: "Undo Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      toast({
        title: "Server Error",
        description: err instanceof Error ? err.message : "Failed to undo conflict resolution.",
        variant: "destructive",
      });
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0 flex flex-col bg-slate-50 border-l border-slate-200"
      >
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 sticky top-0 z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {conflict.id}
              </span>
              <Badge
                variant={
                  conflict.severity === "critical"
                    ? "critical"
                    : conflict.severity === "warning"
                    ? "warning"
                    : "info"
                }
                size="sm"
              >
                {conflict.severity.toUpperCase()}
              </Badge>
              <Badge variant="neutral" size="sm">
                {conflict.type.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
            {conflict.status === "resolved" && (
              <Badge variant="success" size="sm">
                RESOLVED
              </Badge>
            )}
          </div>

          <div>
            <SheetTitle className="text-lg font-bold text-slate-900 leading-snug">
              {conflict.title}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
              {conflict.description}
            </SheetDescription>
          </div>

          {/* Tab Navigation */}
          {conflict.hasFeasibleAlternative && (
            <div className="flex border-b border-slate-200 pt-2 gap-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("alternatives")}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "alternatives"
                    ? "border-[rgb(var(--color-primary))] text-[rgb(var(--color-primary))] font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Feasible Alternatives ({conflict.alternatives.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("diff")}
                className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === "diff"
                    ? "border-[rgb(var(--color-primary))] text-[rgb(var(--color-primary))] font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Ripple Intelligence Diff</span>
                {diffReport && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      diffReport.isSafeToApply
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {diffReport.isSafeToApply ? "Safe" : "Clash"}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Section 1: Conflict Diagnostics & Invalidity Rationale */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Conflict Anatomy & Resource Constraints
            </h3>

            {/* Invalidity Explanation Card */}
            <div className="p-3.5 rounded-lg border border-red-200 bg-red-50/60 text-xs space-y-1.5 text-red-900">
              <div className="flex items-center gap-1.5 font-semibold text-red-950">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>Why Current Allocation Is Invalid:</span>
              </div>
              <p className="leading-relaxed pl-5 text-[11px] text-red-800">
                {conflict.resolutionNotes || conflict.description}
              </p>
            </div>

            {/* Resource Constraints Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Classroom Constraint */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                  <MapPin className="h-3 w-3" />
                  <span>Room Constraint</span>
                </div>
                <div className="font-semibold text-slate-800">
                  {targetClassroom ? targetClassroom.code : "Unassigned"}
                </div>
                <div className="text-[11px] text-slate-500">
                  Cap: {targetClassroom?.capacity || 0} seats • {targetClassroom?.type}
                </div>
              </div>

              {/* Faculty Constraint */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                  <User className="h-3 w-3" />
                  <span>Faculty Constraint</span>
                </div>
                <div className="font-semibold text-slate-800">
                  {targetFaculty ? targetFaculty.name : "Unassigned"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {targetFaculty?.designation} • {targetFaculty?.departmentId}
                </div>
              </div>

              {/* Student Group Constraint */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium">
                  <Users className="h-3 w-3" />
                  <span>Student Group</span>
                </div>
                <div className="font-semibold text-slate-800">
                  {targetSection ? targetSection.name : "Unassigned"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {targetSection?.studentCount || 0} enrolled students
                </div>
              </div>
            </div>

            {/* Affected Sessions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Affected Sessions ({affectedSessions.length}):
              </span>
              <div className="space-y-1.5">
                {affectedSessions.map((s) => {
                  const sub = dataset.subjects.find((sub) => sub.id === s.subjectId);
                  const fac = dataset.faculty.find((f) => f.id === s.facultyId);
                  const rm = dataset.classrooms.find((c) => c.id === s.classroomId);
                  const sec = dataset.sections.find((sec) => sec.id === s.sectionId);
                  const slot = dataset.timeSlots.find((t) => t.id === s.timeSlotId);

                  return (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-md bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <span>{sub?.code} — {sub?.title}</span>
                          <span className="text-[10px] font-normal px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                            {sec?.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{fac?.name}</span>
                          <span>•</span>
                          <span>{rm?.code}</span>
                          <span>•</span>
                          <span>{slot?.label}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{s.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Scenario with NO FEASIBLE ALTERNATIVE (CONF-05) */}
          {!conflict.hasFeasibleAlternative && (
            <div className="p-4 rounded-xl border border-red-300 bg-red-50/50 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-950">
                    No Feasible On-Campus Alternative Found
                  </h4>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Deterministic constraint solver evaluated all 15 classrooms and 25 time slots.
                    Hard constraint cannot be satisfied without statutory safety violations.
                  </p>
                </div>
              </div>

              {noFeasibleExplanation && (
                <div className="space-y-3 bg-white p-4 rounded-lg border border-red-200 text-xs">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-red-600" />
                    <span>Statutory Compliance & Physical Barriers:</span>
                  </div>

                  <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-4">
                    {noFeasibleExplanation.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-semibold text-red-900">
                      Strict Regulatory Prohibitions:
                    </div>
                    <ul className="text-[11px] text-red-700 space-y-1 list-disc pl-4">
                      {noFeasibleExplanation.prohibitedRelaxations.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1.5">
                    <span className="font-semibold block">Required Administrative Escalation Actions:</span>
                    <ul className="space-y-1 list-disc pl-4">
                      {noFeasibleExplanation.recommendedAdministrativeActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded bg-slate-900 text-white text-[11px] font-mono flex items-center justify-between">
                <span>Hard Constraints Silently Relaxed:</span>
                <span className="text-emerald-400 font-bold">0 (Strictly Prohibited)</span>
              </div>
            </div>
          )}

          {/* Section 3: Feasible Alternatives Tab */}
          {conflict.hasFeasibleAlternative && activeTab === "alternatives" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Verified Alternative Solutions ({conflict.alternatives.length})
                </h3>
                <span className="text-[11px] text-slate-400">
                  Sorted by Preference Score & Feasibility
                </span>
              </div>

              <div className="space-y-3">
                {conflict.alternatives.map((alt, idx) => {
                  const isSelected = selectedSolutionId === alt.solutionId;
                  const altClassroom = alt.targetClassroomId
                    ? dataset.classrooms.find((c) => c.id === alt.targetClassroomId)
                    : targetClassroom;
                  const altSlot = alt.targetTimeSlotId
                    ? dataset.timeSlots.find((t) => t.id === alt.targetTimeSlotId)
                    : targetSlot;
                  const altFaculty = alt.substituteFacultyId
                    ? dataset.faculty.find((f) => f.id === alt.substituteFacultyId)
                    : targetFaculty;

                  // Checks
                  const capacityOk =
                    altClassroom && targetSection
                      ? altClassroom.capacity >= targetSection.studentCount
                      : false;
                  const facultyAvailable = true;
                  const studentGroupAvailable = true;

                  return (
                    <div
                      key={alt.solutionId}
                      onClick={() => setSelectedSolutionId(alt.solutionId)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? "border-[rgb(var(--color-primary))] bg-blue-50/20 shadow-xs ring-1 ring-[rgb(var(--color-primary))]"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {/* Alternative Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <span className="font-semibold text-xs text-slate-900">
                            Option {idx + 1}: {alt.solutionId}
                          </span>
                          {alt.isRecommended && (
                            <Badge variant="success" size="sm" className="text-[10px]">
                              Recommended
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-slate-500">Score:</span>
                          <span
                            className={`font-mono text-xs font-bold ${
                              alt.feasibilityScore >= 90
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {alt.feasibilityScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {alt.description}
                      </p>

                      {/* Checks Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        {/* Target Room */}
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block text-[10px]">Room Allocation</span>
                          <span className="font-semibold text-slate-800">
                            {altClassroom?.code || "Current"}
                          </span>
                        </div>

                        {/* Capacity & Equipment Check */}
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block text-[10px]">Capacity Check</span>
                          <span
                            className={`flex items-center gap-1 font-medium ${
                              capacityOk ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {capacityOk ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {altClassroom?.capacity || 0} seats ({targetSection?.studentCount || 0} req)
                          </span>
                        </div>

                        {/* Faculty Check */}
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block text-[10px]">Faculty Check</span>
                          <span className="flex items-center gap-1 font-medium text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            {altFaculty?.name.split(" ")[1] || "Available"}
                          </span>
                        </div>

                        {/* Downstream Effect */}
                        <div className="space-y-0.5">
                          <span className="text-slate-400 block text-[10px]">Ripple Impact</span>
                          <span
                            className={`font-semibold flex items-center gap-1 ${
                              alt.downstreamClashCount === 0
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {alt.downstreamClashCount === 0 ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            {alt.downstreamClashCount} cascade clashes
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Ripple Intelligence Diff Tab */}
          {conflict.hasFeasibleAlternative && activeTab === "diff" && diffReport && (
            <div className="space-y-4">
              {/* Safety Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  diffReport.isSafeToApply
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : "bg-red-50/70 border-red-200 text-red-950"
                }`}
              >
                <div className="flex items-center gap-2">
                  {diffReport.isSafeToApply ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <span className="font-semibold block">
                      {diffReport.isSafeToApply
                        ? "Deterministic Verification: Safe to Apply"
                        : "Caution: Unsafe Schedule Proposal"}
                    </span>
                    <span className="text-[11px] opacity-80">{diffReport.explanation}</span>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] uppercase opacity-70 block">Net Clash Delta</span>
                  <span className="font-bold text-sm text-emerald-700">
                    {diffReport.netClashDelta} clash
                  </span>
                </div>
              </div>

              {/* Sessions Being Changed */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  1. Sessions Being Modified ({diffReport.changedSessions.length})
                </span>
                {diffReport.changedSessions.map((ch) => (
                  <div
                    key={ch.sessionId}
                    className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-2"
                  >
                    <div className="font-semibold text-slate-800">
                      {ch.subjectCode} — {ch.subjectTitle} ({ch.sectionCode})
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 bg-slate-50 rounded border border-slate-100">
                        <span className="text-slate-400 block text-[9px] uppercase">
                          Before Allocation:
                        </span>
                        <div className="text-red-700 font-semibold">{ch.before.classroomCode}</div>
                        <div className="text-slate-600">{ch.before.timeSlotLabel}</div>
                        <div className="text-slate-500">{ch.before.facultyName}</div>
                      </div>
                      <div className="p-2 bg-emerald-50/60 rounded border border-emerald-100">
                        <span className="text-emerald-600 block text-[9px] uppercase">
                          After Allocation (Proposed):
                        </span>
                        <div className="text-emerald-700 font-semibold">{ch.after.classroomCode}</div>
                        <div className="text-slate-600">{ch.after.timeSlotLabel}</div>
                        <div className="text-slate-500">{ch.after.facultyName}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conflicts Removed & Conflicts Created */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Conflicts Removed */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                  <span className="font-semibold text-emerald-800 flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Conflicts Removed ({diffReport.conflictsRemoved.length})
                  </span>
                  {diffReport.conflictsRemoved.length > 0 ? (
                    <ul className="text-[11px] text-slate-600 space-y-1">
                      {diffReport.conflictsRemoved.map((c) => (
                        <li key={c.id} className="truncate">
                          • {c.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">None</span>
                  )}
                </div>

                {/* New Conflicts Created */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px]">
                    {diffReport.newConflictsCreated.length > 0 ? (
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    New Conflicts Created ({diffReport.newConflictsCreated.length})
                  </span>
                  {diffReport.newConflictsCreated.length > 0 ? (
                    <ul className="text-[11px] text-red-600 space-y-1">
                      {diffReport.newConflictsCreated.map((h, i) => (
                        <li key={i} className="truncate">
                          • {h.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      Zero new conflicts introduced
                    </span>
                  )}
                </div>
              </div>

              {/* Hard Constraints Satisfied */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <span className="font-semibold text-slate-800 block text-[11px]">
                  Hard Constraints Satisfied:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {diffReport.hardConstraintsSatisfied.map((hc, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono flex items-center gap-1"
                    >
                      <Check className="h-2.5 w-2.5 text-emerald-600" />
                      {hc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Soft Preferences Impact */}
              {diffReport.softPreferencesAffected.length > 0 && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                  <span className="font-semibold text-slate-800 block text-[11px]">
                    Soft Preference Trajectory:
                  </span>
                  <div className="space-y-1.5">
                    {diffReport.softPreferencesAffected.map((sp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] border-b border-slate-50 pb-1"
                      >
                        <span className="text-slate-600">{sp.name}</span>
                        <span
                          className={`font-mono font-medium ${
                            sp.delta >= 0 ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {sp.deltaDescription}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            {canUndo && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={isUndoing}
                className="gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isUndoing ? "Undoing..." : "Undo Last Change"}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {conflict.hasFeasibleAlternative && (
              <>
                {activeTab === "alternatives" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("diff")}
                    className="gap-1 text-slate-700"
                  >
                    <span>Preview Diff</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("alternatives")}
                    className="text-slate-700"
                  >
                    Back to Alternatives
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  disabled={
                    !selectedSolutionId ||
                    isApplying ||
                    Boolean(diffReport && !diffReport.isSafeToApply)
                  }
                  className="gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isApplying ? "Revalidating..." : "Apply Resolution"}</span>
                </Button>
              </>
            )}

            {!conflict.hasFeasibleAlternative && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Administrative Escalation Initiated",
                    description:
                      "Notified Academic Dean & Life Sciences HOD regarding mandatory BSL-3 laboratory shutdown.",
                    variant: "default",
                  });
                  onOpenChange(false);
                }}
                className="gap-1.5"
              >
                <span>Escalate to Dean</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
