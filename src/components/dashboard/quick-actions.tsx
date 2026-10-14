"use client";

import * as React from "react";
import {
  CalendarDays,
  AlertTriangle,
  Building2,
  CalendarPlus,
  Sparkles,
  Download,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuickActionsProps {
  onOpenTimetableStudio: () => void;
  onOpenResolveConflicts: () => void;
  onOpenFindRoom: () => void;
  onOpenScheduleExtraClass: () => void;
  onOpenAskSynapse: () => void;
  onOpenExportTimetable?: () => void;
  activeConflictsCount?: number;
  availableRoomsCount?: number;
}

export function QuickActions({
  onOpenTimetableStudio,
  onOpenResolveConflicts,
  onOpenFindRoom,
  onOpenScheduleExtraClass,
  onOpenAskSynapse,
  onOpenExportTimetable,
  activeConflictsCount = 5,
  availableRoomsCount = 11,
}: QuickActionsProps) {
  const actions = [
    {
      title: "Timetable Studio",
      description: "Visual grid editor",
      icon: CalendarDays,
      badge: "Matrix",
      onClick: onOpenTimetableStudio,
    },
    {
      title: "Export Timetable",
      description: "PDF, XLSX, CSV",
      icon: Download,
      badge: "Export",
      onClick: onOpenExportTimetable || onOpenTimetableStudio,
    },
    {
      title: "Resolve Conflicts",
      description: `${activeConflictsCount} pending clashes`,
      icon: AlertTriangle,
      badge: `${activeConflictsCount} Clashes`,
      badgeVariant: "error" as const,
      onClick: onOpenResolveConflicts,
    },
    {
      title: "Find a Room",
      description: `${availableRoomsCount} facilities vacant`,
      icon: Building2,
      badge: `${availableRoomsCount} Free`,
      badgeVariant: "success" as const,
      onClick: onOpenFindRoom,
    },
    {
      title: "Schedule Extra Class",
      description: "Ad-hoc lecture booking",
      icon: CalendarPlus,
      badge: "Booking",
      onClick: onOpenScheduleExtraClass,
    },
    {
      title: "Ask Timora",
      description: "Timo AI companion",
      icon: Sparkles,
      badge: "Timo AI",
      badgeVariant: "default" as const,
      onClick: onOpenAskSynapse,
    },
  ];

  return (
    <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-3xl overflow-hidden">
      <CardHeader className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px] font-semibold text-slate-900 tracking-[-0.01em]">
            Quick Actions
          </CardTitle>
          <span className="text-[11px] text-slate-400 font-medium">6 Operational Shortcuts</span>
        </div>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Direct navigation and scheduling workflows.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2.5">
          {actions.map((act) => {
            const Icon = act.icon;
            const isAlert = act.badgeVariant === "error";

            return (
              <button
                key={act.title}
                type="button"
                onClick={act.onClick}
                className="group p-3 rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:bg-white hover:shadow-2xs transition-all flex flex-col justify-between text-left gap-2 min-h-[82px] bg-slate-50/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))]/40 cursor-pointer"
              >
                <div className="flex items-start justify-between w-full">
                  <div
                    className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                      isAlert
                        ? "bg-amber-50 border-amber-200/80 text-amber-600"
                        : "bg-blue-50/80 border-blue-200/60 text-[rgb(var(--color-primary))]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {act.badge && (
                    <Badge
                      variant={act.badgeVariant || "secondary"}
                      size="sm"
                      className="text-[9px] py-0.5 px-2 font-medium tracking-tight rounded-full shadow-2xs"
                    >
                      {act.badge}
                    </Badge>
                  )}
                </div>

                <div className="min-w-0 w-full">
                  <div className="font-semibold text-xs text-slate-900 group-hover:text-[rgb(var(--color-primary))] transition-colors truncate">
                    {act.title}
                  </div>
                  <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                    {act.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
