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
      className={`group relative rounded-md p-2 text-left transition-all cursor-pointer shadow-2xs select-none ${
        isStaged
          ? "bg-amber-50/70 border-2 border-dashed border-amber-400 hover:border-amber-500"
          : isConflicted
          ? "bg-rose-50/60 border border-rose-300 hover:border-rose-400 hover:shadow-xs"
          : isSelected
          ? "bg-blue-50/80 border-2 border-[rgb(var(--color-primary))] shadow-xs"
          : "bg-white border border-[rgb(var(--color-border-default))] hover:border-blue-300 hover:shadow-xs"
      }`}
    >
      {/* ── Top Row: Subject Code, Session Type & Status Tag ─────────────── */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-bold text-xs text-[rgb(var(--color-primary))] truncate">
            {subject?.code || "SUB-N/A"}
          </span>
          {subject?.type && (
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                subject.type === "Laboratory"
                  ? "bg-purple-100 text-purple-700"
                  : subject.type === "Seminar"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {subject.type === "Laboratory" ? "LAB" : subject.type === "Seminar" ? "SEM" : "LEC"}
            </span>
          )}
        </div>

        {/* Section Badge */}
        {section && (
          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
            {section.sectionCode}
          </span>
        )}
      </div>

      {/* ── Subject Title ───────────────────────────────────────────────── */}
      <h4
        className="text-xs font-semibold text-[rgb(var(--color-text-heading))] leading-snug line-clamp-1 mb-1.5"
        title={subject?.title}
      >
        {subject?.title || "Academic Session"}
      </h4>

      {/* ── Meta: Room & Faculty ────────────────────────────────────────── */}
      <div className="space-y-0.5 text-[10px] text-slate-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 truncate" title={classroom?.name}>
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="font-mono font-medium text-slate-700 truncate">
              {classroom?.code || "TBD"}
            </span>
            {classroom?.capacity && (
              <span className="text-slate-400 font-mono">({classroom.capacity}s)</span>
            )}
          </div>

          {section && (
            <div className="flex items-center gap-0.5 text-slate-400 shrink-0" title={`${section.studentCount} students`}>
              <Users className="h-2.5 w-2.5" />
              <span>{section.studentCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 truncate" title={faculty?.name}>
          <User className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{faculty?.name || "Unassigned"}</span>
        </div>
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
