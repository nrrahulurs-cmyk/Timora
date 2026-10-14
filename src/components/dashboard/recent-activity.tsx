"use client";

import * as React from "react";
import { History, User, Zap, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActivityItem } from "@/lib/repository/scheduling-repository";

interface RecentActivityProps {
  activities: ActivityItem[];
  onFilterChange: (category: string) => void;
  selectedCategory: string;
}

export function RecentActivity({
  activities,
  onFilterChange,
  selectedCategory,
}: RecentActivityProps) {
  return (
    <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-3xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 gap-2 border-b border-slate-100 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[rgb(var(--color-primary))]" />
            <CardTitle className="text-[14.5px] font-semibold text-slate-900 tracking-tight">
              Recent Scheduling Activity
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Immutable audit log of room assignments, faculty swaps, and automated solver actions.
          </CardDescription>
        </div>

        <Tabs value={selectedCategory} onValueChange={onFilterChange}>
          <TabsList className="h-7.5 p-0.5 rounded-full bg-slate-100/90 border border-slate-200/60 gap-0.5 shrink-0">
            <TabsTrigger
              value="All"
              className="text-xs px-3 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="modification"
              className="text-xs px-3 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Changes
            </TabsTrigger>
            <TabsTrigger
              value="approval"
              className="text-xs px-3 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Approvals
            </TabsTrigger>
            <TabsTrigger
              value="conflict"
              className="text-xs px-3 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Solver
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No activity records match the selected category filter.
          </div>
        ) : (
          activities.slice(0, 6).map((item) => {
            const isBot =
              item.actor.includes("Timora") ||
              item.actor.includes("SYNAPSE") ||
              item.category === "conflict" ||
              item.category === "automated";
            const isApproval = item.category === "approval";
            const isModification = item.category === "modification";

            return (
              <div
                key={item.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 text-xs font-semibold ${
                      isBot
                        ? "bg-slate-100 border-slate-200 text-slate-600"
                        : isApproval
                        ? "bg-emerald-50 border-emerald-200/60 text-emerald-700"
                        : "bg-blue-50 border-blue-200/60 text-blue-700"
                    }`}
                  >
                    {isBot ? (
                      <Zap className="h-3.5 w-3.5" />
                    ) : isApproval ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-slate-900">
                        {item.actor}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        • {item.actorRole}
                      </span>
                    </div>

                    <div className="text-[11.5px] text-slate-600 leading-snug truncate">
                      <span>{item.action}: </span>
                      <span className="font-medium text-slate-900 font-mono text-[11px] bg-slate-50 px-1 py-0.2 rounded border border-slate-200/60">
                        {item.target}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  <span className="text-[10.5px] text-slate-400 font-medium whitespace-nowrap">
                    {item.timestamp}
                  </span>
                  <span
                    className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      isApproval
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        : isBot
                        ? "bg-amber-50 text-amber-700 border-amber-200/60"
                        : "bg-slate-50 text-slate-600 border-slate-200/60"
                    }`}
                  >
                    {item.category === "conflict" || item.category === "automated"
                      ? "Solver"
                      : item.category}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
