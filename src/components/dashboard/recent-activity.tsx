"use client";

import * as React from "react";
import { History, User, Bot, CheckCircle, FileText, ArrowUpRight, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
            <CardTitle className="text-[14px] font-semibold text-slate-900 tracking-[-0.01em]">
              Recent Scheduling Activity
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Immutable audit log of room assignments, faculty swaps, and automated solver actions.
          </CardDescription>
        </div>

        <Tabs value={selectedCategory} onValueChange={onFilterChange}>
          <TabsList className="h-7 p-0.5 rounded-full bg-slate-100/90 border border-slate-200/60 gap-0.5">
            <TabsTrigger value="All" className="text-[11px] px-3 py-0.5 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
              All
            </TabsTrigger>
            <TabsTrigger value="modification" className="text-[11px] px-3 py-0.5 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
              Changes
            </TabsTrigger>
            <TabsTrigger value="approval" className="text-[11px] px-3 py-0.5 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
              Approvals
            </TabsTrigger>
            <TabsTrigger value="conflict" className="text-[11px] px-3 py-0.5 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs">
              Solver
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No activity records match the selected filter.
          </div>
        ) : (
          activities.slice(0, 6).map((item) => {
            const isBot =
              item.actor.includes("Timora") ||
              item.actor.includes("SYNAPSE") ||
              item.category === "conflict" ||
              item.category === "automated";
            const isApproval = item.category === "approval";

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
                        : "bg-blue-50 border-blue-200/60 text-[rgb(var(--color-primary))]"
                    }`}
                  >
                    {isBot ? <Zap className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
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
                      <span className="font-medium text-slate-900 font-mono text-[11px]">
                        {item.target}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center shrink-0 gap-2.5">
                  <span className="text-[10.5px] text-slate-400 font-mono">
                    {item.timestamp}
                  </span>
                  <Badge
                    variant={
                      item.category === "conflict"
                        ? "error"
                        : item.category === "approval"
                        ? "success"
                        : "secondary"
                    }
                    size="sm"
                    className="text-[9.5px] py-0.5 px-2 uppercase font-medium tracking-wide rounded-full shadow-2xs"
                  >
                    {item.category === "conflict" ? "Solver" : item.category}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
