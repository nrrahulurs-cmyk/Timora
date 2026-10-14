"use client";

import * as React from "react";
import {
  CalendarDays,
  AlertTriangle,
  Building2,
  PieChart,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { KpiMetrics } from "@/lib/repository/scheduling-repository";

interface KpiRowProps {
  metrics: KpiMetrics;
  onConflictClick?: () => void;
  onApprovalClick?: () => void;
  onRoomClick?: () => void;
  onScheduledClassesClick?: () => void;
}

export function KpiRow({
  metrics,
  onConflictClick,
  onApprovalClick,
  onRoomClick,
  onScheduledClassesClick,
}: KpiRowProps) {
  const hasConflicts = metrics.unresolvedConflicts.count > 0;
  const completionRate = metrics.scheduledClasses.percentage || 97.4;
  const availableCount = metrics.availableRooms.available;
  const totalRooms = metrics.availableRooms.total || 15;
  const vacantPct = Math.round((availableCount / totalRooms) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
      {/* 1. Scheduled Classes */}
      <Card
        onClick={onScheduledClassesClick}
        className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-indigo-50/20 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-3xl cursor-pointer min-h-[136px] hover:border-indigo-300"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {metrics.scheduledClasses.count.toLocaleString()}
            </div>
            <div className="text-xs font-semibold text-slate-600 tracking-tight mt-1">
              Scheduled Classes
            </div>
          </div>
          <div className="w-8 h-8 rounded-2xl border border-indigo-100 bg-indigo-50/60 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2.5 space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
            <span className="text-emerald-700 font-semibold">{completionRate}% filled</span>
            <span>of {metrics.scheduledClasses.total.toLocaleString()} slots</span>
          </div>
        </div>
      </Card>

      {/* 2. Unresolved Conflicts (Actionable Alert State) */}
      <Card
        onClick={onConflictClick}
        className={`p-4.5 flex flex-col justify-between bg-gradient-to-br from-amber-50/25 via-white/95 to-white/90 backdrop-blur-xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-3xl cursor-pointer min-h-[136px] border ${
          hasConflicts
            ? "border-amber-200/90 hover:border-amber-400"
            : "border-slate-200/70 hover:border-slate-300"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div
              className={`text-[26px] leading-none font-bold tracking-tight font-sans ${
                hasConflicts ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {metrics.unresolvedConflicts.count}
            </div>
            <div className="text-xs font-semibold text-slate-600 tracking-tight mt-1">
              Active Conflicts
            </div>
          </div>
          <div
            className={`w-8 h-8 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs ${
              hasConflicts
                ? "border-amber-200/80 bg-amber-50/70 text-amber-600"
                : "border-emerald-200/80 bg-emerald-50/70 text-emerald-600"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border shadow-2xs ${
              hasConflicts
                ? "bg-amber-50/80 text-amber-800 border-amber-200/70"
                : "bg-emerald-50/80 text-emerald-700 border-emerald-200/70"
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
          <span className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5 hover:underline">
            Resolve <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </Card>

      {/* 3. Available Rooms */}
      <Card
        onClick={onRoomClick}
        className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-blue-50/20 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-3xl cursor-pointer min-h-[136px] hover:border-blue-300"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {availableCount}
            </div>
            <div className="text-xs font-semibold text-slate-600 tracking-tight mt-1">
              Available Rooms
            </div>
          </div>
          <div className="w-8 h-8 rounded-2xl border border-blue-100 bg-blue-50/60 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50/80 text-blue-700 font-semibold border border-blue-200/50 shadow-2xs">
            <span>{vacantPct}% Vacant</span>
          </div>
          <span className="text-slate-400 font-medium">
            {availableCount} of {totalRooms} free
          </span>
        </div>
      </Card>

      {/* 4. Room Utilisation */}
      <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-emerald-50/20 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-3xl cursor-default min-h-[136px]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {metrics.roomUtilisation.rate}%
            </div>
            <div className="text-xs font-semibold text-slate-600 tracking-tight mt-1">
              Room Utilisation
            </div>
          </div>
          <div className="w-8 h-8 rounded-2xl border border-emerald-100 bg-emerald-50/60 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
            <PieChart className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 font-semibold border border-emerald-200/50 shadow-2xs">
            <span>Optimal (+1.2%)</span>
          </div>
          <span className="text-slate-400 font-medium">
            85.0% baseline
          </span>
        </div>
      </Card>

      {/* 5. Pending Approvals */}
      <Card
        onClick={onApprovalClick}
        className="col-span-2 md:col-span-1 xl:col-span-1 p-4.5 flex flex-col justify-between bg-gradient-to-br from-purple-50/20 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-3xl cursor-pointer min-h-[136px] hover:border-purple-300"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {metrics.pendingApprovals.count}
            </div>
            <div className="text-xs font-semibold text-slate-600 tracking-tight mt-1">
              Pending Approvals
            </div>
          </div>
          <div className="w-8 h-8 rounded-2xl border border-purple-100 bg-purple-50/60 flex items-center justify-center text-purple-600 shrink-0 shadow-2xs">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50/80 text-purple-700 font-semibold border border-purple-200/60 shadow-2xs">
            <span>Review Queue</span>
          </div>
          <span className="text-purple-700 font-medium flex items-center gap-0.5 hover:underline">
            4 swaps · 3 extra <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </Card>
    </div>
  );
}
