"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Save,
  CalendarCheck,
  AlertTriangle,
  GitBranch,
  Plus,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface StudioHeaderProps {
  scheduleVersion: string;
  isDraft: boolean;
  conflictCount: number;
  stagedChangesCount: number;
  onUndo: () => void;
  onSave: () => void;
  onPublish: () => void;
  onReset: () => void;
  onNewSession?: () => void;
  isSaving?: boolean;
}

export function StudioHeader({
  scheduleVersion,
  isDraft,
  conflictCount,
  stagedChangesCount,
  onUndo,
  onSave,
  onPublish,
  onReset,
  onNewSession,
  isSaving = false,
}: StudioHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100/90 mb-4 shrink-0">
      {/* ── Breadcrumb & Title ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
          <span>Academic Operations</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-700 font-semibold">Weekly Schedule</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Timetable Studio
          </h1>

          {/* Schedule Version Badge */}
          <Badge
            variant="outline"
            size="sm"
            className="bg-slate-50 border-slate-200/80 text-slate-600 font-medium gap-1 rounded-full text-[11px]"
          >
            <GitBranch className="h-3 w-3 text-slate-400" />
            <span>{scheduleVersion}</span>
          </Badge>

          {/* Draft Status Badge */}
          <Badge
            variant={isDraft ? "warning" : "success"}
            size="sm"
            dot
            className="rounded-full text-[11px] font-semibold"
          >
            {isDraft ? "Draft Mode" : "Published"}
          </Badge>

          {/* Conflict Count Pill */}
          {conflictCount > 0 ? (
            <Badge
              variant="critical"
              size="sm"
              className="gap-1 font-semibold rounded-full text-[11px] bg-rose-50 text-rose-700 border-rose-200"
            >
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              <span>{conflictCount} Conflicts Flagged</span>
            </Badge>
          ) : (
            <Badge variant="success" size="sm" className="rounded-full text-[11px]">
              All Constraints Clean
            </Badge>
          )}

          {/* Unsaved Changes Staged Pill */}
          {stagedChangesCount > 0 && (
            <Badge
              variant="info"
              size="sm"
              className="bg-amber-50 text-amber-800 border-amber-300 animate-pulse font-medium rounded-full text-[11px]"
            >
              ● {stagedChangesCount} Uncommitted {stagedChangesCount === 1 ? "Change" : "Changes"}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Header Actions ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Undo button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={stagedChangesCount === 0 || isSaving}
          className="gap-1.5 border-slate-200/80 h-8 text-xs text-slate-700 rounded-full px-3 hover:bg-slate-50 disabled:opacity-40"
          title="Revert last staged change"
        >
          <RotateCcw className="h-3 w-3 text-slate-500" />
          <span>Undo</span>
        </Button>

        {/* Save Changes button */}
        <Button
          variant={stagedChangesCount > 0 ? "default" : "outline"}
          size="sm"
          onClick={onSave}
          disabled={stagedChangesCount === 0 || isSaving}
          className={`gap-1.5 h-8 text-xs rounded-full px-3.5 transition-all ${
            stagedChangesCount > 0
              ? "bg-[#FF6B4A] hover:bg-[#e05b3d] text-white font-semibold shadow-xs"
              : "border-slate-200/80 text-slate-400 disabled:opacity-40"
          }`}
        >
          <Save className="h-3 w-3" />
          <span>{isSaving ? "Saving..." : "Save Changes"}</span>
        </Button>

        {/* Publish Timetable button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPublish}
          className="gap-1.5 h-8 text-xs border-slate-200/80 hover:border-slate-300 font-medium rounded-full px-3 text-slate-700 hover:bg-slate-50"
        >
          <CalendarCheck className="h-3 w-3 text-slate-600" />
          <span>Publish Schedule</span>
        </Button>

        {/* New Session button */}
        <Button
          variant="default"
          size="sm"
          onClick={onNewSession}
          className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Session</span>
        </Button>
      </div>
    </header>
  );
}
