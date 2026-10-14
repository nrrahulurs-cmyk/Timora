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
        bg: "bg-rose-50/80 hover:bg-rose-50",
        border: "border-rose-200/80",
        textTitle: "text-rose-900",
        textSub: "text-rose-600",
        dot: "bg-rose-500",
        badge: "bg-rose-100 text-rose-700",
      };
    }
    if (isStaged) {
      return {
        bg: "bg-amber-50/80",
        border: "border-amber-300 border-dashed",
        textTitle: "text-amber-950",
        textSub: "text-amber-700",
        dot: "bg-amber-500",
        badge: "bg-amber-100 text-amber-800",
      };
    }
    const code = subject?.code?.toUpperCase() || "";
    const type = subject?.type || "";

    if (code.includes("MATH") || code.includes("ALG") || type === "Lecture") {
      return {
        bg: "bg-[#E8F8F0]/80 hover:bg-[#E8F8F0]",
        border: "border-[#D1F2E2]",
        textTitle: "text-emerald-900",
        textSub: "text-emerald-700",
        dot: "bg-emerald-500",
        badge: "bg-emerald-100/70 text-emerald-700",
      };
    }
    if (code.includes("OS") || code.includes("CS") || code.includes("SOFT")) {
      return {
        bg: "bg-[#F0EEFF]/80 hover:bg-[#F0EEFF]",
        border: "border-[#E1DEFF]",
        textTitle: "text-[#312E81]",
        textSub: "text-[#4F46E5]",
        dot: "bg-[#5B4DF5]",
        badge: "bg-white/80 text-[#4F46E5]",
      };
    }
    if (code.includes("DB") || code.includes("NET") || code.includes("ARCH")) {
      return {
        bg: "bg-[#EBF5FF]/80 hover:bg-[#EBF5FF]",
        border: "border-[#D6EBFF]",
        textTitle: "text-sky-900",
        textSub: "text-sky-700",
        dot: "bg-sky-500",
        badge: "bg-white/80 text-sky-700",
      };
    }
    if (code.includes("AI") || code.includes("ML") || type === "Laboratory") {
      return {
        bg: "bg-[#FEF8E7]/80 hover:bg-[#FEF8E7]",
        border: "border-[#FDEFC9]",
        textTitle: "text-amber-950",
        textSub: "text-amber-800",
        dot: "bg-amber-500",
        badge: "bg-amber-100 text-amber-800",
      };
    }
    return {
      bg: "bg-slate-50/80 hover:bg-slate-50",
      border: "border-slate-200/80",
      textTitle: "text-slate-900",
      textSub: "text-slate-600",
      dot: "bg-slate-400",
      badge: "bg-white text-slate-600",
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
      className={`group relative rounded-2xl p-3 text-left transition-all duration-150 cursor-pointer select-none border flex flex-col justify-between min-h-[105px] ${
        isSelected
          ? "ring-2 ring-[rgb(var(--color-primary))] shadow-card-soft"
          : "hover:shadow-card-soft"
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
