"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import type { ChartDataPoint } from "@/lib/repository/scheduling-repository";
import { ProgressBar } from "@/components/ui/metric-indicator";

interface AnalyticsChartProps {
  data: ChartDataPoint[];
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const [metric, setMetric] = React.useState<"utilisation" | "sessions" | "conflicts">("utilisation");

  return (
    <Card className="flex flex-col justify-between bg-white border-[rgb(var(--color-border-default))] shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-[rgb(var(--color-text-heading))]">
            Timetable Allocation & Room Utilisation
          </CardTitle>
          <CardDescription className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
            Temporal distribution of academic sessions and facility load for Fall 2026.
          </CardDescription>
        </div>

        <Tabs value={metric} onValueChange={(val) => setMetric(val as any)}>
          <TabsList className="h-8 p-1">
            <TabsTrigger value="utilisation" className="text-xs">
              Utilisation %
            </TabsTrigger>
            <TabsTrigger value="sessions" className="text-xs">
              Sessions
            </TabsTrigger>
            <TabsTrigger value="conflicts" className="text-xs">
              Clashes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metric === "utilisation" ? (
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  unit="%"
                />
                <RechartsTooltip
                  cursor={{ fill: "rgba(237, 242, 254, 0.4)" }}
                  formatter={(value: any) => [`${value}%`, "Room Utilisation"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="roomUtilisation"
                  fill="rgb(0, 102, 204)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            ) : metric === "sessions" ? (
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(0, 102, 204)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="rgb(0, 102, 204)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <RechartsTooltip
                  formatter={(value: any) => [`${value} classes`, "Scheduled Sessions"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="scheduledSessions"
                  stroke="rgb(0, 102, 204)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sessionGrad)"
                />
              </AreaChart>
            ) : (
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <RechartsTooltip
                  formatter={(value: any) => [`${value} conflicts`, "Active Clashes"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="activeConflicts"
                  fill="rgb(239, 68, 68)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Facility Category Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-100">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Lecture Halls (150+ seats)</span>
              <span className="font-semibold text-slate-800 text-[11px]">91.4%</span>
            </div>
            <ProgressBar value={91.4} variant="primary" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Computing & Tech Labs</span>
              <span className="font-semibold text-slate-800 text-[11px]">86.2%</span>
            </div>
            <ProgressBar value={86.2} variant="success" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Seminar & Tutorial Rooms</span>
              <span className="font-semibold text-slate-800 text-[11px]">67.5%</span>
            </div>
            <ProgressBar value={67.5} variant="warning" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
