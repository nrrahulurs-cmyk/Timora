"use client";

import * as React from "react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  User,
  Users,
  Move,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  TimetableSession,
  Subject,
  Classroom,
  FacultyMember,
  StudentSection,
  ConflictRecord,
} from "@/types/domain";

export interface EnrichedSession {
  session: TimetableSession;
  subject?: Subject;
  classroom?: Classroom;
  faculty?: FacultyMember;
  section?: StudentSection;
  conflict?: ConflictRecord;
  isStaged?: boolean;
  stagedNote?: string;
}

interface ClassCardProps {
  data: EnrichedSession;
  isSelected?: boolean;
  onClick?: () => void;
  onMoveClick?: (e: React.MouseEvent) => void;
  isCompact?: boolean;
}

export function ClassCard({
  data,
  isSelected = false,
  onClick,
  onMoveClick,
  isCompact = false,
}: ClassCardProps) {
  const { session, subject, classroom, faculty, section, conflict, isStaged, stagedNote } = data;

  const isConflicted = Boolean(conflict && conflict.status === "active");

  // Conflict badge color and label
  const conflictLabel = React.useMemo(() => {
    if (!conflict) return null;
    switch (conflict.type) {
      case "room_clash":
        return "Room Clash";
      case "faculty_overlap":
        return "Faculty Overlap";
      case "capacity_deficit":
        return "Capacity Deficit";
      case "maintenance_block":
        return "Maintenance Block";
      case "equipment_mismatch":
        return conflict.hasFeasibleAlternative ? "Equipment Mismatch" : "No Feasible Alt";
      default:
        return "Schedule Conflict";
    }
  }, [conflict]);

  // Stitch pastel theme mapping by subject type or code
  const colorTheme = React.useMemo(() => {
    if (isConflicted) {
      return {
        bg: "bg-gradient-to-br from-rose-50/95 via-rose-50/70 to-white/90 backdrop-blur-xs hover:from-rose-50 hover:to-rose-100/50",
        border: "border-rose-200/90 border-l-[3.5px] border-l-rose-500",
        textTitle: "text-rose-950",
        textSub: "text-rose-700",
        dot: "bg-rose-500",
        badge: "bg-rose-100/90 text-rose-700 border border-rose-200/60",
      };
    }
    if (isStaged) {
      return {
        bg: "bg-gradient-to-br from-amber-50/95 via-amber-50/70 to-white/90 backdrop-blur-xs",
        border: "border-amber-300 border-dashed border-l-[3.5px] border-l-amber-500",
        textTitle: "text-amber-950",
        textSub: "text-amber-800",
        dot: "bg-amber-500",
        badge: "bg-amber-100/90 text-amber-800 border border-amber-200/60",
      };
    }
    const code = subject?.code?.toUpperCase() || "";
    const type = subject?.type || "";

    if (code.includes("MATH") || code.includes("ALG") || type === "Lecture") {
      return {
        bg: "bg-gradient-to-br from-[#E8F8F0]/95 via-[#E8F8F0]/70 to-white/90 backdrop-blur-xs hover:from-[#E8F8F0] hover:to-[#DCF5E8]",
        border: "border-[#D1F2E2] border-l-[3.5px] border-l-emerald-500",
        textTitle: "text-emerald-950",
        textSub: "text-emerald-700",
        dot: "bg-emerald-500",
        badge: "bg-white/90 text-emerald-800 border border-emerald-200/60",
      };
    }
    if (code.includes("OS") || code.includes("CS") || code.includes("SOFT")) {
      return {
        bg: "bg-gradient-to-br from-[#F0EEFF]/95 via-[#F0EEFF]/70 to-white/90 backdrop-blur-xs hover:from-[#F0EEFF] hover:to-[#E5E1FF]",
        border: "border-[#E1DEFF] border-l-[3.5px] border-l-indigo-500",
        textTitle: "text-[#1E1B4B]",
        textSub: "text-[#4338CA]",
        dot: "bg-[#5B4DF5]",
        badge: "bg-white/90 text-[#4338CA] border border-indigo-200/60",
      };
    }
    if (code.includes("DB") || code.includes("NET") || code.includes("ARCH")) {
      return {
        bg: "bg-gradient-to-br from-[#EBF5FF]/95 via-[#EBF5FF]/70 to-white/90 backdrop-blur-xs hover:from-[#EBF5FF] hover:to-[#DCEDFF]",
        border: "border-[#D6EBFF] border-l-[3.5px] border-l-sky-500",
        textTitle: "text-sky-950",
        textSub: "text-sky-700",
        dot: "bg-sky-500",
        badge: "bg-white/90 text-sky-800 border border-sky-200/60",
      };
    }
    if (code.includes("AI") || code.includes("ML") || type === "Laboratory") {
      return {
        bg: "bg-gradient-to-br from-[#FEF8E7]/95 via-[#FEF8E7]/70 to-white/90 backdrop-blur-xs hover:from-[#FEF8E7] hover:to-[#FDF0CC]",
        border: "border-[#FDEFC9] border-l-[3.5px] border-l-amber-500",
        textTitle: "text-amber-950",
        textSub: "text-amber-800",
        dot: "bg-amber-500",
        badge: "bg-white/90 text-amber-800 border border-amber-200/60",
      };
    }
    return {
      bg: "bg-gradient-to-br from-slate-50/95 via-slate-50/70 to-white/90 backdrop-blur-xs hover:bg-slate-100/70",
      border: "border-slate-200/80 border-l-[3.5px] border-l-slate-400",
      textTitle: "text-slate-900",
      textSub: "text-slate-600",
      dot: "bg-slate-400",
      badge: "bg-white/90 text-slate-700 border border-slate-200/60",
    };
  }, [isConflicted, isStaged, subject?.code, subject?.type]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group relative rounded-2xl p-3 text-left transition-all duration-200 cursor-pointer select-none border flex flex-col justify-between min-h-[105px] shadow-2xs ${
        isSelected
          ? "ring-2 ring-primary-coral shadow-md -translate-y-0.5"
          : "hover:shadow-md hover:-translate-y-0.5"
      } ${colorTheme.bg} ${colorTheme.border}`}
    >
      {/* ── Top Block: Subject Title, Code & Room ────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {subject?.code && (
              <span className={`text-[10px] font-mono font-bold tracking-tight block ${colorTheme.textSub}`}>
                {subject.code}
              </span>
            )}
            <h4 className={`text-xs font-bold leading-snug block line-clamp-2 mt-0.5 ${colorTheme.textTitle}`} title={subject?.title}>
              {subject?.title || subject?.code || "Academic Session"}
            </h4>
          </div>
          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${colorTheme.dot}`} />
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`text-[11px] font-semibold ${colorTheme.textSub}`}>
            {classroom?.code || "TBD Room"}
          </span>
          {section && (
            <span className="text-[10px] text-slate-500 font-medium inline-flex items-center gap-1">
              <span>•</span>
              <span>{section.sectionCode}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Lecturer & Type Pill ────────────────────────────── */}
      <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-black/5">
        <span className={`truncate text-[11px] font-medium max-w-[110px] ${colorTheme.textSub}`}>
          {faculty?.name || "Unassigned"}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shadow-2xs ${colorTheme.badge}`}>
          {subject?.type === "Laboratory" ? "Practical" : subject?.type || "Lecture"}
        </span>
      </div>

      {/* ── Conflict Alert Banner (If Conflicted) ───────────────────────── */}
      {isConflicted && (
        <div className="mt-1.5 pt-1 border-t border-rose-200/80 flex items-center justify-between text-[10px] text-rose-700 font-semibold">
          <div className="flex items-center gap-1 truncate">
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" />
            <span className="truncate">{conflictLabel}</span>
          </div>
          {!conflict?.hasFeasibleAlternative && (
            <span className="text-[9px] bg-rose-200 text-rose-800 px-1 py-0.2 rounded font-bold uppercase">
              No Alt
            </span>
          )}
        </div>
      )}

      {/* ── Staged Move Banner (Uncommitted Change) ─────────────────────── */}
      {isStaged && (
        <div className="mt-1.5 pt-1 border-t border-amber-300 flex items-center justify-between text-[10px] text-amber-800 font-medium">
          <span className="font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Staged Move (Unsaved)
          </span>
          {stagedNote && <span className="text-[9px] text-amber-700 truncate">{stagedNote}</span>}
        </div>
      )}

      {/* ── Quick Move Trigger on Hover ─────────────────────────────────── */}
      {onMoveClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveClick(e);
          }}
          className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white/95 border border-slate-200 text-slate-600 hover:text-[rgb(var(--color-primary))] hover:border-blue-300 shadow-2xs"
          title="Reschedule or Move Session"
        >
          <Move className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
