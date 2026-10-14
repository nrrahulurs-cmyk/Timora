"use client";

import * as React from "react";
import {
  CalendarDays,
  AlertTriangle,
  Building2,
  PieChart,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { KpiMetrics } from "@/lib/repository/scheduling-repository";

interface KpiRowProps {
  metrics: KpiMetrics;
  onConflictClick?: () => void;
  onApprovalClick?: () => void;
  onRoomClick?: () => void;
}

export function KpiRow({
  metrics,
  onConflictClick,
  onApprovalClick,
  onRoomClick,
}: KpiRowProps) {
  const hasConflicts = metrics.unresolvedConflicts.count > 0;
  const completionRate = metrics.scheduledClasses.percentage || 97.4;
  const availableCount = metrics.availableRooms.available;
  const totalRooms = metrics.availableRooms.total || 15;
  const vacantPct = Math.round((availableCount / totalRooms) * 100);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
      {/* 1. Scheduled Classes */}
      <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft hover:-translate-y-0.5 transition-all duration-200 rounded-2xl cursor-default min-h-[116px]">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {metrics.scheduledClasses.count.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              /{metrics.scheduledClasses.total.toLocaleString()}
            </span>
          </div>
          <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
            <CalendarDays className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-xs font-semibold text-slate-600 tracking-tight truncate">
            Scheduled Classes
          </div>
          <div className="mt-1.5 flex items-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold border border-emerald-200/60 shadow-2xs">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
              <span>{completionRate}% Allocated</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Unresolved Conflicts (Actionable Alert State) */}
      <Card
        onClick={onConflictClick}
        className={`p-4 flex flex-col justify-between bg-white shadow-2xs hover:shadow-card-soft hover:-translate-y-0.5 transition-all duration-200 rounded-2xl cursor-pointer min-h-[116px] border ${
          hasConflicts
            ? "border-amber-200/90 hover:border-amber-400"
            : "border-slate-200/80 hover:border-slate-300"
        }`}
      >
        <div className="flex items-start justify-between">
          <span
            className={`text-[26px] leading-none font-bold tracking-tight font-sans ${
              hasConflicts ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {metrics.unresolvedConflicts.count}
          </span>
          <div
            className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
              hasConflicts
                ? "border-amber-200/80 bg-amber-50/70 text-amber-600"
                : "border-emerald-200/80 bg-emerald-50/70 text-emerald-600"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-xs font-semibold text-slate-600 tracking-tight truncate">
            Active Conflicts
          </div>
          <div className="mt-1.5 flex items-center">
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border shadow-2xs ${
                hasConflicts
                  ? "bg-amber-50 text-amber-700 border-amber-200/70"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/70"
              }`}
            >
              {hasConflicts ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>3 Crit • 2 Warn</span>
                </>
              ) : (
                <span>All Clear</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Available Rooms */}
      <Card
        onClick={onRoomClick}
        className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft hover:-translate-y-0.5 transition-all duration-200 rounded-2xl cursor-pointer min-h-[116px] hover:border-blue-300"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {availableCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              /{totalRooms}
            </span>
          </div>
          <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-xs font-semibold text-slate-600 tracking-tight truncate">
            Available Rooms
          </div>
          <div className="mt-1.5 flex items-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-semibold border border-blue-200/50 shadow-2xs">
              <span>{vacantPct}% Vacant</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Room Utilisation */}
      <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft hover:-translate-y-0.5 transition-all duration-200 rounded-2xl cursor-default min-h-[116px]">
        <div className="flex items-start justify-between">
          <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
            {metrics.roomUtilisation.rate}%
          </span>
          <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
            <PieChart className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-xs font-semibold text-slate-600 tracking-tight truncate">
            Room Utilisation
          </div>
          <div className="mt-1.5 flex items-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold border border-emerald-200/50 shadow-2xs">
              <span>Optimal (+1.2%)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Pending Approvals */}
      <Card
        onClick={onApprovalClick}
        className="col-span-2 sm:col-span-1 md:col-span-1 p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft hover:-translate-y-0.5 transition-all duration-200 rounded-2xl cursor-pointer min-h-[116px] hover:border-blue-300"
      >
        <div className="flex items-start justify-between">
          <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
            {metrics.pendingApprovals.count}
          </span>
          <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="mt-2.5">
          <div className="text-xs font-semibold text-slate-600 tracking-tight truncate">
            Pending Approvals
          </div>
          <div className="mt-1.5 flex items-center">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-semibold border border-amber-200/60 shadow-2xs">
              <span>Review Queue</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
