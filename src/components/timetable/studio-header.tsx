"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Save,
  CalendarCheck,
  AlertTriangle,
  RotateCw,
  GitBranch,
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
  isSaving = false,
}: StudioHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[rgb(var(--color-border-default))]">
      {/* ── Title, Description & Status Badges ──────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[rgb(var(--color-text-heading))]">
            Timetable Studio
          </h1>

          {/* Schedule Version Badge */}
          <Badge
            variant="outline"
            size="sm"
            className="bg-slate-50 border-slate-200 text-slate-700 font-medium gap-1"
          >
            <GitBranch className="h-3 w-3 text-slate-500" />
            <span>{scheduleVersion}</span>
          </Badge>

          {/* Status Badge */}
          <Badge variant={isDraft ? "warning" : "success"} size="sm" dot>
            {isDraft ? "Draft Mode" : "Published"}
          </Badge>

          {/* Conflict Count Pill */}
          {conflictCount > 0 ? (
            <Badge
              variant="critical"
              size="sm"
              className="gap-1 font-semibold"
            >
              <AlertTriangle className="h-3 w-3" />
              <span>{conflictCount} Conflicts Flagged</span>
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              All Constraints Clean
            </Badge>
          )}

          {/* Unsaved Changes Staged Pill */}
          {stagedChangesCount > 0 && (
            <Badge
              variant="info"
              size="sm"
              className="bg-amber-50 text-amber-800 border-amber-300 animate-pulse font-medium"
            >
              ● {stagedChangesCount} Uncommitted {stagedChangesCount === 1 ? "Change" : "Changes"}
            </Badge>
          )}
        </div>

        <p className="text-xs sm:text-sm text-[rgb(var(--color-text-secondary))] max-w-2xl">
          Visual matrix & tabular allocation engine. Reassign lecture slots, inspect facility capacities, and resolve schedule collisions in real time.
        </p>
      </div>

      {/* ── Actions Group (Undo, Save, Publish) ─────────────────────────── */}
      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
        {/* Undo button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={stagedChangesCount === 0 || isSaving}
          className="gap-1.5 border-slate-200 h-8.5 text-xs text-slate-700 hover:bg-slate-50"
          title="Revert last staged change"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span>Undo</span>
        </Button>

        {/* Reset All Staged Changes */}
        {stagedChangesCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
            className="text-xs text-slate-500 hover:text-red-600 h-8.5 px-2"
            title="Discard all uncommitted staged moves"
          >
            Reset
          </Button>
        )}

        {/* Save Changes button */}
        <Button
          variant={stagedChangesCount > 0 ? "default" : "outline"}
          size="sm"
          onClick={onSave}
          disabled={stagedChangesCount === 0 || isSaving}
          className={`gap-1.5 h-8.5 text-xs ${
            stagedChangesCount > 0
              ? "bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))]"
              : "border-slate-200 text-slate-400"
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          <span>{isSaving ? "Saving..." : "Save Changes"}</span>
        </Button>

        {/* Publish Timetable button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPublish}
          className="gap-1.5 h-8.5 text-xs border-slate-200 hover:border-slate-300 font-medium"
        >
          <CalendarCheck className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
          <span>Publish Schedule</span>
        </Button>
      </div>
    </div>
  );
}
