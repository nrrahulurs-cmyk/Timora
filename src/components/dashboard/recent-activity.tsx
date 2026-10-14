"use client";

import * as React from "react";
import { History, User, Bot, CheckCircle, FileText, ArrowUpRight } from "lucide-react";
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
    <Card className="flex flex-col justify-between bg-white border-[rgb(var(--color-border-default))] shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[rgb(var(--color-primary))]" />
            <CardTitle className="text-base font-semibold text-[rgb(var(--color-text-heading))]">
              Recent Scheduling Activity
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
            Audit trail of room assignments, faculty swaps, and automated solver actions.
          </CardDescription>
        </div>

        <Tabs value={selectedCategory} onValueChange={onFilterChange}>
          <TabsList className="h-7.5 p-0.5">
            <TabsTrigger value="All" className="text-xs px-2.5 py-0.5">
              All
            </TabsTrigger>
            <TabsTrigger value="modification" className="text-xs px-2.5 py-0.5">
              Changes
            </TabsTrigger>
            <TabsTrigger value="approval" className="text-xs px-2.5 py-0.5">
              Approvals
            </TabsTrigger>
            <TabsTrigger value="conflict" className="text-xs px-2.5 py-0.5">
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
          activities.map((item) => {
            const isBot =
              item.actor.includes("Timora") ||
              item.actor.includes("SYNAPSE") ||
              item.category === "conflict" ||
              item.category === "automated";
            const isApproval = item.category === "approval";

            return (
              <div
                key={item.id}
                className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold ${
                      isBot
                        ? "bg-purple-100 text-purple-700"
                        : isApproval
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-slate-800">
                        {item.actor}
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        • {item.actorRole}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 leading-snug">
                      <span>{item.action}: </span>
                      <span className="font-medium text-slate-900 font-mono text-[11px]">
                        {item.target}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-[11px] text-slate-400 font-mono">
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
                    className="text-[10px] py-0"
                  >
                    {item.category}
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
