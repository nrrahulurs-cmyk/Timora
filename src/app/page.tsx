"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/feedback/use-toast";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TimoWorkspaceModal } from "@/components/companion/timo-workspace-modal";
import {
  schedulingRepository,
  type KpiMetrics,
  type ChartDataPoint,
  type AttentionItem,
  type ActivityItem,
} from "@/lib/repository/scheduling-repository";
import type { SynapseCollegeDataset } from "@/types/domain";
import { calculateScheduleAnalytics } from "@/lib/analytics/metrics";
import { getCurrentAcademicWeekOffset, getWeekScheduleDetails } from "@/lib/utils/date-utils";
import { Skeleton, CardSkeleton } from "@/components/feedback/states";
import { validateSchedule } from "@/lib/scheduling/constraint-engine";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Render metrics only after the active repository returns them.
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<KpiMetrics | null>(null);
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([]);
  const [attentionItems, setAttentionItems] = React.useState<AttentionItem[]>([]);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [dashboardDataset, setDashboardDataset] = React.useState<SynapseCollegeDataset | null>(null);
  const [activityFilter, setActivityFilter] = React.useState("All");

  const [askSynapseOpen, setAskSynapseOpen] = React.useState(false);

  // Load repository data
  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dataset, act] = await Promise.all([
        schedulingRepository.getDataset(),
        schedulingRepository.getActivityLog(activityFilter),
      ]);
      const now = new Date();
      const weekStart = getWeekScheduleDetails(getCurrentAcademicWeekOffset(now), now).baseMonday;
      const analytics = calculateScheduleAnalytics(dataset, weekStart);
      setDashboardDataset(dataset);
      setMetrics(analytics.kpiMetrics);
      setChartData(analytics.chartData);
      setAttentionItems(analytics.attentionItems);
      setActivities(act);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Dashboard data could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [activityFilter]);

  React.useEffect(() => {
    loadDashboardData();
    const reload = () => { void loadDashboardData(); };
    window.addEventListener("timora:data-changed", reload);
    return () => window.removeEventListener("timora:data-changed", reload);
  }, [loadDashboardData]);

  // Handle activity filter change
  const handleFilterChange = (cat: string) => setActivityFilter(cat);

  const handleSelectAttentionItem = (item: AttentionItem) => {
    router.push(item.targetUrl);
  };

  const handleRunScan = async () => {
    try {
      const dataset = await schedulingRepository.getDataset();
      const report = validateSchedule(dataset);
      toast({
        title: "Constraint Pre-flight Complete",
        description: `Checked ${report.totalSessionsEvaluated} sessions; ${report.conflictedSessionsCount} have hard-constraint violations.`,
        variant: report.isValid ? "success" : "info",
      });
    } catch (err) {
      console.error("Schedule validation failed:", err);
      toast({
        title: "Pre-flight Scan Failed",
        description: "Schedule data could not be validated. Try again when the connection is available.",
        variant: "destructive",
      });
    }
  };

  if (!metrics && loading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-12">
        <WorkspaceHeader section="Overview" title="Academic Operations Overview" />
        <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-10 text-center">
          <AlertCircle className="mx-auto mb-3 h-7 w-7 text-rose-500" />
          <p className="text-sm font-semibold text-slate-900">Dashboard unavailable</p>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={loadDashboardData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6 pb-24">
      {/* ── A. Page Heading (Concise Workspace Header) ── */}
      <WorkspaceHeader
        section="Overview"
        title="Academic Operations Overview"
        subtitle={`${metrics.scheduledClasses.percentage}% of weekly room slots have active sessions • ${metrics.unresolvedConflicts.count} active conflicts • ${metrics.availableRooms.available} rooms marked available`}
        badge={
          <Badge variant="success" size="sm" dot className="font-semibold text-[11px] rounded-full px-2.5 py-0.5">
            {dashboardDataset?.academicTerms.find(term => term.isCurrent)?.name || "Academic workspace"} · {dashboardDataset?.scheduleVersions.find(version => version.status === "draft")?.versionNumber || "No draft"}
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunScan}
              className="gap-1.5 border-slate-200/80 bg-white hover:bg-slate-50 text-xs h-8 rounded-full px-3.5 shadow-2xs font-semibold text-slate-700 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Run Pre-flight Scan</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => router.push("/history")}
              className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Publish Timetable</span>
            </Button>
          </>
        }
      />

      {/* ── B. KPI Row (Five Cards with Dominant Values & Visual Progress) ── */}
      {metrics && (
        <KpiRow
          metrics={metrics}
          onScheduledClassesClick={() => router.push("/timetable")}
          onConflictClick={() => router.push("/conflicts")}
          onApprovalClick={() => router.push("/exchanges")}
          onRoomClick={() => router.push("/rooms")}
        />
      )}

      {/* ── C. Main Middle Row (Large Chart + Attention Panel) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Large Allocation & Utilisation Chart (2 cols) */}
        <div className="xl:col-span-2">
          {dashboardDataset && <AnalyticsChart data={chartData} dataset={dashboardDataset} />}
        </div>

        {/* Right: Requires Attention Panel (1 col) */}
        <div className="xl:col-span-1">
          <AttentionPanel
            items={attentionItems}
            onSelectItem={handleSelectAttentionItem}
            onViewAll={() => router.push("/conflicts")}
          />
        </div>
      </div>

      {/* ── D. Bottom Row (Recent Activity + Quick Actions) ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Recent Scheduling Activity (2 cols) */}
        <div className="xl:col-span-2">
          <RecentActivity
            activities={activities}
            onFilterChange={handleFilterChange}
            selectedCategory={activityFilter}
          />
        </div>

        {/* Right: Quick Actions Shortcuts (1 col) */}
        <div className="xl:col-span-1">
          <QuickActions
            activeConflictsCount={metrics.unresolvedConflicts.count}
            availableRoomsCount={metrics.availableRooms.available}
            onOpenTimetableStudio={() => router.push("/timetable")}
            onOpenExportTimetable={() => router.push("/timetable")}
            onOpenResolveConflicts={() => {
              router.push("/conflicts");
            }}
            onOpenFindRoom={() => router.push("/rooms")}
            onOpenScheduleExtraClass={() => router.push("/extra-classes")}
            onOpenAskSynapse={() => setAskSynapseOpen(true)}
          />
        </div>
      </div>

      {/* ── Interactive Modals & Sheets ───────────────────────── */}
      <TimoWorkspaceModal
        open={askSynapseOpen}
        onOpenChange={setAskSynapseOpen}
      />

    </div>
  );
}
