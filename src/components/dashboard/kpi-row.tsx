"use client";

import * as React from "react";
import {
  CalendarDays,
  AlertTriangle,
  Building2,
  PieChart,
  Clock,
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
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Scheduled Classes */}
      <Card className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all duration-150 rounded-xl cursor-default min-h-[112px]">
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[27px] leading-none font-bold text-slate-900 tracking-[-0.025em]">
              {metrics.scheduledClasses.count.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              /{metrics.scheduledClasses.total.toLocaleString()}
            </span>
          </div>
          <div className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/60 flex items-center justify-center text-slate-500 shrink-0">
            <CalendarDays className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
            Scheduled Classes
          </div>
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-semibold mt-1 border border-emerald-200/50">
            <span>↑</span>
            <span>97.4%</span>
          </div>
        </div>
      </Card>

      {/* 2. Unresolved Conflicts (Actionable Alert State) */}
      <Card
        onClick={onConflictClick}
        className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all duration-150 rounded-xl cursor-pointer min-h-[112px] hover:border-amber-300"
      >
        <div className="flex items-start justify-between">
          <span className="text-[27px] leading-none font-bold text-amber-600 tracking-[-0.025em]">
            {metrics.unresolvedConflicts.count}
          </span>
          <div className="w-6 h-6 rounded-md border border-amber-200/80 bg-amber-50/60 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
            Unresolved Conflicts
          </div>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold mt-1 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Action Required</span>
          </div>
        </div>
      </Card>

      {/* 3. Available Rooms */}
      <Card
        onClick={onRoomClick}
        className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all duration-150 rounded-xl cursor-pointer min-h-[112px] hover:border-blue-300"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[27px] leading-none font-bold text-slate-900 tracking-[-0.025em]">
              {metrics.availableRooms.available}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              /{metrics.availableRooms.total}
            </span>
          </div>
          <div className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/60 flex items-center justify-center text-slate-500 shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
            Available Rooms
          </div>
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold mt-1 border border-blue-200/50">
            <span>Free Now</span>
          </div>
        </div>
      </Card>

      {/* 4. Room Utilisation */}
      <Card className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all duration-150 rounded-xl cursor-default min-h-[112px]">
        <div className="flex items-start justify-between">
          <span className="text-[27px] leading-none font-bold text-slate-900 tracking-[-0.025em]">
            {metrics.roomUtilisation.rate}%
          </span>
          <div className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/60 flex items-center justify-center text-slate-500 shrink-0">
            <PieChart className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
            Room Utilisation
          </div>
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-semibold mt-1 border border-emerald-200/50">
            <span>Optimal</span>
          </div>
        </div>
      </Card>

      {/* 5. Pending Approvals */}
      <Card
        onClick={onApprovalClick}
        className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs hover:-translate-y-0.5 transition-all duration-150 rounded-xl cursor-pointer min-h-[112px] hover:border-blue-300"
      >
        <div className="flex items-start justify-between">
          <span className="text-[27px] leading-none font-bold text-slate-900 tracking-[-0.025em]">
            {metrics.pendingApprovals.count}
          </span>
          <div className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/60 flex items-center justify-center text-slate-500 shrink-0">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
            Pending Approvals
          </div>
          <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold mt-1 border border-amber-200/60">
            <span>Review Queue</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
