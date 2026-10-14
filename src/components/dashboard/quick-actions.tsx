"use client";

import * as React from "react";
import {
  CalendarDays,
  AlertTriangle,
  Building2,
  CalendarPlus,
  Sparkles,
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
}

export function QuickActions({
  onOpenTimetableStudio,
  onOpenResolveConflicts,
  onOpenFindRoom,
  onOpenScheduleExtraClass,
  onOpenAskSynapse,
}: QuickActionsProps) {
  const actions = [
    {
      title: "Timetable Studio",
      description: "Visual grid editor for section scheduling and room assignments",
      icon: CalendarDays,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50 border-blue-200/60",
      onClick: onOpenTimetableStudio,
      badge: "Core",
    },
    {
      title: "Resolve Conflicts",
      description: "Step-by-step resolution for 3 active classroom clashes",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50 border-amber-200/60",
      onClick: onOpenResolveConflicts,
      badge: "3 Pending",
      badgeVariant: "error" as const,
    },
    {
      title: "Find a Room",
      description: "Instantly locate vacant lecture theatres, labs, and seminar rooms",
      icon: Building2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50 border-emerald-200/60",
      onClick: onOpenFindRoom,
      badge: "42 Free",
      badgeVariant: "success" as const,
    },
    {
      title: "Schedule Extra Class",
      description: "Book an ad-hoc revision lecture, tutorial, or makeup session",
      icon: CalendarPlus,
      iconColor: "text-purple-600",
      iconBg: "bg-purple-50 border-purple-200/60",
      onClick: onOpenScheduleExtraClass,
    },
    {
      title: "Ask Timora",
      description: "AI-assisted constraint solver, schedule optimization & queries",
      icon: Sparkles,
      iconColor: "text-[rgb(var(--color-primary))]",
      iconBg: "bg-blue-50 border-blue-200/60",
      onClick: onOpenAskSynapse,
      badge: "Gemini AI",
      badgeVariant: "default" as const,
    },
  ];

  return (
    <Card className="flex flex-col justify-between bg-white border-[rgb(var(--color-border-default))] shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[rgb(var(--color-text-heading))]">
            Quick Actions
          </CardTitle>
          <span className="text-[11px] text-slate-400 font-mono">5 Shortcuts</span>
        </div>
        <CardDescription className="text-xs text-[rgb(var(--color-text-secondary))]">
          Immediate shortcuts for daily academic scheduling operations.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-3 space-y-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              type="button"
              onClick={act.onClick}
              className="w-full group p-2.5 rounded-[var(--radius-md)] border border-slate-200/80 hover:border-[rgb(var(--color-primary))] hover:bg-blue-50/20 transition-all flex items-center justify-between text-left gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-focus-ring))]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`h-9 w-9 rounded-[var(--radius-md)] border flex items-center justify-center shrink-0 ${act.iconBg}`}
                >
                  <Icon className={`h-4.5 w-4.5 ${act.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-800 group-hover:text-[rgb(var(--color-primary))] transition-colors">
                      {act.title}
                    </span>
                    {act.badge && (
                      <Badge
                        variant={act.badgeVariant || "secondary"}
                        size="sm"
                        className="text-[10px] py-0"
                      >
                        {act.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {act.description}
                  </p>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[rgb(var(--color-primary))] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
