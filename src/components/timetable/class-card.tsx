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
        return conflict.hasFeasibleAlternative ? "Equipment Mismatch" : "No Alt (BSL-3)";
      default:
        return "Constraint Clash";
    }
  }, [conflict]);

  // Clean, high-contrast, accessible color palette
  const cardStyles = React.useMemo(() => {
    if (isConflicted) {
      return {
        cardBg: "bg-white",
        border: "border-rose-300 border-l-4 border-l-rose-500",
        codeText: "text-rose-700",
        titleText: "text-slate-900",
        subText: "text-slate-600",
        dot: "bg-rose-500",
        typeBadge: "bg-rose-50 text-rose-700 border-rose-200",
      };
    }
    if (isStaged) {
      return {
        cardBg: "bg-amber-50/30",
        border: "border-amber-400 border-dashed border-l-4 border-l-amber-500",
        codeText: "text-amber-800",
        titleText: "text-slate-900",
        subText: "text-slate-600",
        dot: "bg-amber-500",
        typeBadge: "bg-amber-100/80 text-amber-900 border-amber-300",
      };
    }

    const code = subject?.code?.toUpperCase() || "";
    const type = subject?.type || "";

    if (code.includes("MATH") || code.includes("ALG") || type === "Lecture") {
      return {
        cardBg: "bg-white",
        border: "border-slate-200/90 border-l-4 border-l-emerald-500",
        codeText: "text-emerald-700",
        titleText: "text-slate-900",
        subText: "text-slate-600",
        dot: "bg-emerald-500",
        typeBadge: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
      };
    }
    if (code.includes("OS") || code.includes("CS") || code.includes("SOFT")) {
      return {
        cardBg: "bg-white",
        border: "border-slate-200/90 border-l-4 border-l-indigo-500",
        codeText: "text-indigo-700",
        titleText: "text-slate-900",
        subText: "text-slate-600",
        dot: "bg-indigo-500",
        typeBadge: "bg-indigo-50 text-indigo-800 border-indigo-200/60",
      };
    }
    if (code.includes("AI") || code.includes("ML") || type === "Laboratory") {
      return {
        cardBg: "bg-white",
        border: "border-slate-200/90 border-l-4 border-l-amber-500",
        codeText: "text-amber-700",
        titleText: "text-slate-900",
        subText: "text-slate-600",
        dot: "bg-amber-500",
        typeBadge: "bg-amber-50 text-amber-800 border-amber-200/60",
      };
    }

    return {
      cardBg: "bg-white",
      border: "border-slate-200/90 border-l-4 border-l-sky-500",
      codeText: "text-sky-700",
      titleText: "text-slate-900",
      subText: "text-slate-600",
      dot: "bg-sky-500",
      typeBadge: "bg-sky-50 text-sky-800 border-sky-200/60",
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
      className={`group relative rounded-2xl p-3 text-left transition-all duration-200 cursor-pointer select-none border flex flex-col justify-between shadow-2xs ${
        isSelected
          ? "ring-2 ring-[rgb(var(--color-primary))] shadow-md -translate-y-0.5"
          : "hover:shadow-md hover:-translate-y-0.5"
      } ${cardStyles.cardBg} ${cardStyles.border}`}
    >
      {/* ── Top Section: Subject Code, Type Badge, Dot ───────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {subject?.code && (
                <span className={`text-xs font-mono font-bold tracking-tight ${cardStyles.codeText}`}>
                  {subject.code}
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold border shrink-0 ${cardStyles.typeBadge}`}
              >
                {subject?.type === "Laboratory" ? "Practical" : subject?.type || "Lecture"}
              </span>
            </div>
            <h3
              className="text-xs font-semibold leading-snug block line-clamp-2 mt-0.5 text-slate-900"
              title={subject?.title}
            >
              {subject?.title || subject?.code || "Academic Session"}
            </h3>
          </div>
          <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${cardStyles.dot}`} />
        </div>

        {/* ── Room & Section ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mt-2 text-xs flex-wrap">
          <span className="font-semibold text-slate-800 flex items-center gap-1 whitespace-nowrap">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-mono text-xs">{classroom?.code || "TBD"}</span>
          </span>
          {section && (
            <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1 whitespace-nowrap">
              <span>•</span>
              <span className="bg-slate-100/90 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold">
                {section.sectionCode}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* ── Bottom Section: Faculty ───────────────────────── */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <span
          className="text-xs font-medium text-slate-700 flex items-center gap-1.5 min-w-0 flex-1"
          title={faculty?.name}
        >
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{faculty?.name || "Unassigned"}</span>
        </span>
      </div>

      {/* ── Conflict Alert Banner ─────────────────────────────────────── */}
      {isConflicted && (
        <div className="mt-2 pt-1.5 border-t border-rose-200 flex items-center justify-between text-[10px] text-rose-700 font-semibold bg-rose-50/60 -mx-3 -mb-3 p-2 rounded-b-2xl">
          <div className="flex items-center gap-1 truncate">
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" />
            <span className="truncate">{conflictLabel}</span>
          </div>
          {!conflict?.hasFeasibleAlternative && (
            <span className="text-[9px] bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
              No Alt
            </span>
          )}
        </div>
      )}

      {/* ── Staged Move Banner ───────────────────────────────────────── */}
      {isStaged && (
        <div className="mt-2 pt-1.5 border-t border-amber-300 flex items-center justify-between text-[10px] text-amber-800 font-medium bg-amber-50 -mx-3 -mb-3 p-2 rounded-b-2xl">
          <span className="font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Staged Move (Unsaved)
          </span>
          {stagedNote && <span className="text-[9px] text-amber-700 truncate">{stagedNote}</span>}
        </div>
      )}

      {/* ── Quick Move Hover Trigger ──────────────────────────────────── */}
      {onMoveClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveClick(e);
          }}
          className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 shadow-2xs"
          title="Reschedule session"
          aria-label="Reschedule session"
        >
          <Move className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
