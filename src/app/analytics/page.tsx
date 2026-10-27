"use client";

import * as React from "react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Building,
  Users,
  AlertTriangle,
  Clock,
  BookOpen,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from "recharts";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { calculateScheduleAnalytics } from "@/lib/analytics/metrics";
import type { ScheduleAnalytics } from "@/lib/analytics/metrics";
import { getCurrentAcademicWeekOffset, getWeekScheduleDetails } from "@/lib/utils/date-utils";
import type {
  SynapseCollegeDataset,
  ExtraClassRequest,
  TeacherExchangeRequest,
} from "@/types/domain";

export default function AnalyticsPage() {
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset | null>(null);
  const [analytics, setAnalytics] = React.useState<ScheduleAnalytics | null>(null);
  const [currentDate, setCurrentDate] = React.useState<Date | null>(null);
  const [extraRequests, setExtraRequests] = React.useState<ExtraClassRequest[]>([]);
  const [exchangeRequests, setExchangeRequests] = React.useState<TeacherExchangeRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const now = new Date();
    const weekStart = getWeekScheduleDetails(getCurrentAcademicWeekOffset(now), now).baseMonday;
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Analytics request timed out")), 15_000);
    });
    Promise.race([schedulingRepository.getDataset(), timeout])
      .then((data) => {
        setCurrentDate(now);
        setDataset(data);
        setAnalytics(calculateScheduleAnalytics(data, weekStart));
        setExtraRequests(data.extraClassRequests);
        setExchangeRequests(data.teacherExchangeRequests);
      })
      .catch((err) => {
        console.error("Failed to load analytics data:", err);
        setLoadError("Analytics could not be loaded. Check the connection and try again.");
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, []);

  if (loadError || (!loading && !dataset)) {
    return (
      <div className="space-y-6 pb-12">
        <WorkspaceHeader section="Performance & Metrics" title="Scheduling Analytics & Insights" />
        <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">Analytics unavailable</p>
          <p className="mt-1 text-xs text-slate-500">{loadError || "No analytics dataset was returned."}</p>
          <button type="button" className="mt-4 rounded-lg border px-3 py-2 text-xs" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (loading || !dataset || !currentDate || !analytics) {
    return (
      <div className="space-y-6 pb-12">
        <WorkspaceHeader section="Performance & Metrics" title="Scheduling Analytics & Insights" />
        <div className="p-12 text-center text-xs text-slate-400">Loading institutional analytics metrics...</div>
      </div>
    );
  }

  const currentTerm = dataset.academicTerms.find((term) => term.isCurrent);
  const termProgress = currentTerm
    ? Math.min(1, Math.max(0, (currentDate.getTime() - new Date(currentTerm.startDate).getTime()) /
        (new Date(currentTerm.endDate).getTime() - new Date(currentTerm.startDate).getTime())))
    : 0;
  const roomSlotsByDay = analytics.dailyRoomSlots;
  const facultyWorkloadData = analytics.facultyWorkload;
  const conflictPieData = analytics.conflictCategories;

  const CONFLICT_COLORS = ["#E11D48", "#F59E0B", "#2563EB", "#8B5CF6", "#64748B"];

  // 4. Syllabus Completion Against Targets
  const syllabusChartData = dataset.subjects.map((sub) => {
    const modules = dataset.syllabusModules.filter((m) => m.subjectId === sub.id);
    const planned = modules.reduce((s, m) => s + m.totalPlannedHours, 0);
    const completed = modules.reduce((s, m) => s + m.completedHours, 0);
    const targetProgress = Math.round(planned * termProgress);

    return {
      code: sub.code,
      title: sub.title,
      planned,
      completed,
      target: targetProgress,
      completionRate: planned > 0 ? Math.round((completed / planned) * 100) : 0,
      isBehind: completed < targetProgress,
    };
  });

  // 5. Pending Requests Counts
  const pendingExtraHOD = extraRequests.filter((r) => r.status === "pending_hod").length;
  const pendingExtraDean = extraRequests.filter((r) => r.status === "pending_dean").length;
  const approvedExtra = extraRequests.filter((r) => r.status === "approved").length;

  const pendingExchHOD = exchangeRequests.filter((r) => r.status === "pending_hod").length;
  const pendingExchDean = exchangeRequests.filter((r) => r.status === "pending_dean").length;
  const approvedExch = exchangeRequests.filter((r) => r.status === "approved").length;

  const requestStatusData = [
    { stage: "Pending HOD Sign-off", ExtraClasses: pendingExtraHOD, TeacherExchanges: pendingExchHOD },
    { stage: "Pending Dean Review", ExtraClasses: pendingExtraDean, TeacherExchanges: pendingExchDean },
    { stage: "Approved & Synchronized", ExtraClasses: approvedExtra, TeacherExchanges: approvedExch },
  ];

  return (
    <div className="space-y-6 pb-12">
      <WorkspaceHeader
        section="Performance & Metrics"
        title="Institutional Scheduling Analytics & Insights"
        badge={
          <Badge variant="outline" size="sm" className="font-mono bg-blue-50/50 border-blue-200 text-blue-800 rounded-full">
            {currentTerm?.name || "No current academic term"}
          </Badge>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiCard
          title="Facility Occupancy Index"
          value={`${analytics.roomUtilizationRate}%`}
          subtitle={`${analytics.weeklyBookedRoomHours} of ${analytics.weeklyRoomHourCapacity} room-hours booked per week`}
          icon={BarChart3}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="Peak Time Band Saturation"
          value={`${analytics.peakTimeBand.rate}%`}
          subtitle={analytics.peakTimeBand.label}
          icon={TrendingUp}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <KpiCard
          title="Active Learning Rooms"
          value={`${analytics.activeLearningRooms} Facilities`}
          subtitle="Lecture halls and specialized laboratories"
          icon={Building}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <KpiCard
          title="Workload Compliance Rate"
          value={`${analytics.workloadComplianceRate}%`}
          subtitle={`${dataset.faculty.filter((faculty) => faculty.status === "active").length} active faculty evaluated against assigned weekly limits`}
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* ── Chart 1: Room Utilisation & Occupied vs Available Eligible Room-Slots ── */}
      <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              Occupied vs. Available Eligible Room-Slots by Day
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Comparison of active sessions and approved room reservations against the actual room and time-slot capacity for the selected week.
            </CardDescription>
          </div>
          <Badge variant="neutral" size="sm" className="text-[10px] font-mono">
            {dataset.classrooms.length} rooms · {dataset.timeSlots.length} weekly slots
          </Badge>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roomSlotsByDay} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="occupied" name="Occupied Room-Slots" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="available" name="Available Headroom" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reserved" name="Reserved / Maintenance" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Row: Faculty Workload & Conflicts Breakdown ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Faculty Workload Distribution */}
        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-3xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              Faculty Workload Distribution vs. Statutory Ceilings
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Assigned weekly teaching hours compared against institutional policy limits (12 & 16 hrs).
            </CardDescription>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={facultyWorkloadData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} domain={[0, 18]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#334155" }}
                  width={75}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val} hrs (${item.payload.loadPercentage}% of ${item.payload.maxHours}h limit)`,
                    item.payload.fullName,
                  ]}
                  contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                />
                <ReferenceLine x={16} stroke="#EF4444" strokeDasharray="3 3" label={{ value: "Policy Max (16h)", fontSize: 10, fill: "#EF4444" }} />
                <Bar dataKey="assignedHours" name="Assigned Teaching Hours" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Conflicts by Category and Status */}
        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-3xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Schedule Conflicts by Category & Severity
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Distribution of current timetable collisions ({dataset.conflicts.length} active exceptions tracked).
            </CardDescription>
          </div>

          <div className="h-64 w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conflictPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {conflictPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CONFLICT_COLORS[index % CONFLICT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Row: Syllabus Completion & Pending Scheduling Requests ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Syllabus Completion Against Targets */}
        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-3xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              Syllabus Delivery Progress vs. Target Benchmarks
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Delivered lecture hours compared against approved syllabus curriculum plans.
            </CardDescription>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={syllabusChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} domain={[0, 45]} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="completed" name="Delivered Hours" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Mid-Sem Benchmark" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="planned" name="Total Planned" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pending Scheduling Requests Pipeline */}
        <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-3xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              Academic Operations Request Pipeline
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Status breakdown of Extra Class proposals and Teacher Exchange slot swaps.
            </CardDescription>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestStatusData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="ExtraClasses" name="Extra Classes" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="TeacherExchanges" name="Teacher Exchanges" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ── Detailed Institutional Facility Benchmark Table ─────────────────── */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-3xl overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Classroom & Facility Utilization Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Facility Code</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Building</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Booked Sessions</th>
                  <th className="p-3">Weekly Hours</th>
                  <th className="p-3">Utilization Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dataset.classrooms.map((room) => {
                  const sessions = dataset.timetableSessions.filter(
                    (s) => s.classroomId === room.id && s.status !== "cancelled"
                  );
                  const roomMetrics = analytics.roomUtilizationRows.find((item) => item.roomId === room.id);
                  const bookedHours = roomMetrics?.weeklyHours ?? 0;
                  const rate = roomMetrics?.utilizationRate ?? 0;

                  return (
                    <tr key={room.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{room.code}</td>
                      <td className="p-3">{room.type}</td>
                      <td className="p-3">{room.building}</td>
                      <td className="p-3 font-mono">{room.capacity} seats</td>
                      <td className="p-3 font-mono">{sessions.length} sessions</td>
                      <td className="p-3 font-mono">{bookedHours} hrs/wk</td>
                      <td className="p-3">
                        <Badge
                          variant={rate >= 80 ? "success" : rate >= 50 ? "info" : "neutral"}
                          size="sm"
                          className="font-mono text-[10px]"
                        >
                          {rate}% Occupied
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
