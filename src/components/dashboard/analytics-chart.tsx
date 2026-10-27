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
import type { SynapseCollegeDataset } from "@/types/domain";
import { ProgressBar } from "@/components/ui/metric-indicator";
import { WeeklyScheduleOverview } from "./weekly-schedule-overview";

interface AnalyticsChartProps {
  data: ChartDataPoint[];
  dataset: SynapseCollegeDataset;
}

export function AnalyticsChart({ data, dataset }: AnalyticsChartProps) {
  const [metric, setMetric] = React.useState<"utilisation" | "sessions" | "conflicts" | "schedule">("utilisation");
  const categoryRates = React.useMemo(() => {
    const average = (key: "lectureHalls" | "labs" | "seminarRooms") =>
      data.length ? Math.round(data.reduce((sum, point) => sum + point[key], 0) / data.length) : 0;
    return {
      lectureHalls: average("lectureHalls"),
      labs: average("labs"),
      seminarRooms: average("seminarRooms"),
    };
  }, [data]);

  return (
    <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-3xl overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 gap-3">
        <div>
          <CardTitle className="text-[14.5px] font-semibold text-slate-900 tracking-tight">
            {metric === "schedule"
              ? "Weekly Academic Schedule"
              : "Timetable Allocation & Room Utilisation"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            {metric === "schedule"
              ? "Day-by-day active lecture timetable and room assignments for Fall 2026."
              : metric === "sessions"
              ? "Total number of scheduled classes allocated across weekly lecture slots."
              : metric === "conflicts"
              ? "Active constraint violations and room overlaps flagged across schedule slots."
              : "Temporal distribution of academic sessions and facility load for Fall 2026."}
          </CardDescription>
        </div>

        <Tabs value={metric} onValueChange={(val) => setMetric(val as any)}>
          <TabsList className="h-8 p-1 rounded-full bg-slate-100/90 border border-slate-200/60 gap-0.5 shrink-0">
            <TabsTrigger
              value="utilisation"
              className="text-xs px-2.5 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Utilisation
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="text-xs px-2.5 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Sessions
            </TabsTrigger>
            <TabsTrigger
              value="conflicts"
              className="text-xs px-2.5 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Clashes
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="text-xs px-2.5 py-1 rounded-full font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs transition-all cursor-pointer"
            >
              Weekly Schedule
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="pt-3 px-5 pb-4">
        {metric === "schedule" ? (
          <WeeklyScheduleOverview dataset={dataset} />
        ) : (
          <>
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
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      unit="%"
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(237, 242, 254, 0.4)" }}
                      formatter={(value: any) => [`${value}%`, "Room Utilisation"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="roomUtilisation"
                      fill="rgb(0, 102, 204)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
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
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [`${value} sessions`, "Scheduled Sessions"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="scheduledSessions"
                      stroke="rgb(0, 102, 204)"
                      strokeWidth={2.5}
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
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [`${value} conflicts`, "Active Clashes"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px -2px rgba(0,0,0,0.08)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="activeConflicts"
                      fill="rgb(239, 68, 68)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Facility Category Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 mt-3 border-t border-slate-100">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Lecture Halls (150+ seats)</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{categoryRates.lectureHalls}%</span>
                </div>
                <ProgressBar value={categoryRates.lectureHalls} variant="primary" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Computing & Tech Labs</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{categoryRates.labs}%</span>
                </div>
                <ProgressBar value={categoryRates.labs} variant="success" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Seminar & Tutorial Rooms</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{categoryRates.seminarRooms}%</span>
                </div>
                <ProgressBar value={categoryRates.seminarRooms} variant="warning" />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
