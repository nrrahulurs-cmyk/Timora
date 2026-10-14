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
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/feedback/use-toast";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { FindRoomModal } from "@/components/dashboard/modals/find-room-modal";
import { ScheduleExtraClassModal } from "@/components/dashboard/modals/schedule-extra-class-modal";
import { ResolveConflictModal } from "@/components/dashboard/modals/resolve-conflict-modal";
import { AskSynapseSheet } from "@/components/dashboard/modals/ask-synapse-sheet";
import {
  schedulingRepository,
  type KpiMetrics,
  type ChartDataPoint,
  type AttentionItem,
  type ActivityItem,
  STABLE_KPI_METRICS,
  STABLE_CHART_WEEKLY,
  STABLE_ATTENTION_ITEMS,
  STABLE_ACTIVITY_LOG,
} from "@/lib/repository/scheduling-repository";
import { Skeleton, CardSkeleton } from "@/components/feedback/states";

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Repository data states initialized with stable demo baseline
  const [loading, setLoading] = React.useState(false);
  const [metrics, setMetrics] = React.useState<KpiMetrics>(STABLE_KPI_METRICS);
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>(STABLE_CHART_WEEKLY);
  const [attentionItems, setAttentionItems] = React.useState<AttentionItem[]>(STABLE_ATTENTION_ITEMS);
  const [activities, setActivities] = React.useState<ActivityItem[]>(STABLE_ACTIVITY_LOG);
  const [activityFilter, setActivityFilter] = React.useState("All");

  // Interactive modal states
  const [findRoomOpen, setFindRoomOpen] = React.useState(false);
  const [extraClassOpen, setExtraClassOpen] = React.useState(false);
  const [resolveModalOpen, setResolveModalOpen] = React.useState(false);
  const [selectedAttentionItem, setSelectedAttentionItem] = React.useState<AttentionItem | null>(null);
  const [askSynapseOpen, setAskSynapseOpen] = React.useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);

  // Load repository data
  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [m, c, att, act] = await Promise.all([
        schedulingRepository.getKpiMetrics(),
        schedulingRepository.getChartData("utilisation", "week"),
        schedulingRepository.getAttentionItems(),
        schedulingRepository.getActivityLog(activityFilter),
      ]);
      setMetrics(m);
      setChartData(c);
      setAttentionItems(att);
      setActivities(act);
    } finally {
      setLoading(false);
    }
  }, [activityFilter]);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle activity filter change
  const handleFilterChange = async (cat: string) => {
    setActivityFilter(cat);
    const filtered = await schedulingRepository.getActivityLog(cat);
    setActivities(filtered);
  };

  // Handle attention item selection (opens clash resolver or route)
  const handleSelectAttentionItem = (item: AttentionItem) => {
    if (item.type === "clash") {
      setSelectedAttentionItem(item);
      setResolveModalOpen(true);
    } else {
      router.push(item.targetUrl);
    }
  };

  const handleConflictResolved = (id: string) => {
    setAttentionItems((prev) => prev.filter((i) => i.id !== id));
    if (metrics) {
      setMetrics({
        ...metrics,
        unresolvedConflicts: {
          ...metrics.unresolvedConflicts,
          count: Math.max(0, metrics.unresolvedConflicts.count - 1),
          supportingText: `${Math.max(0, metrics.unresolvedConflicts.count - 1)} active clashes remaining`,
        },
      });
    }
  };

  const handlePublishConfirm = () => {
    toast({
      title: "Schedule Published Successfully",
      description: "Fall 2026 Academic Timetable is now locked and live for all university departments.",
      variant: "success",
    });
  };

  const handleRunScan = () => {
    toast({
      title: "Constraint Pre-Flight Completed",
      description: "Zero fatal scheduling blocks detected. 3 minor clashes flagged in Attention Panel.",
      variant: "info",
    });
  };

  if (loading && !metrics) {
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

  return (
    <div className="space-y-6 pb-12">
      {/* ── A. Page Heading (Clear Greeting & Scheduling Status) ── */}
      <PageHeader
        title="Welcome back, Dr. Eleanor Vance"
        description="Fall 2026 academic timetable is 97.4% allocated. 3 unresolved room conflicts require coordinator review before final publishing."
        breadcrumbs={[
          { label: "Timora" },
          { label: "Academic Operations" },
          { label: "Dashboard" },
        ]}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-600 font-normal">
              Demo Dataset: Timora Institute of Technology
            </Badge>
            <Badge variant="success" size="sm" dot>
              Term Active
            </Badge>
          </div>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunScan}
              className="gap-1.5 border-slate-200"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Run Pre-flight Scan</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setPublishDialogOpen(true)}
              className="gap-1.5"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Publish Timetable</span>
            </Button>
          </>
        }
      />

      {/* ── B. KPI Row (Five Cards with Restrained Indicators) ── */}
      {metrics && (
        <KpiRow
          metrics={metrics}
          onConflictClick={() => {
            setSelectedAttentionItem(attentionItems[0] || null);
            setResolveModalOpen(true);
          }}
          onApprovalClick={() => router.push("/exchanges")}
          onRoomClick={() => setFindRoomOpen(true)}
        />
      )}

      {/* ── C. Main Middle Row (Large Chart + Attention Panel) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Large Allocation & Utilisation Chart (2 cols) */}
        <div className="lg:col-span-2">
          <AnalyticsChart data={chartData} />
        </div>

        {/* Right: Requires Attention Panel (1 col) */}
        <div className="lg:col-span-1">
          <AttentionPanel
            items={attentionItems}
            onSelectItem={handleSelectAttentionItem}
            onViewAll={() => router.push("/conflicts")}
          />
        </div>
      </div>

      {/* ── D. Bottom Row (Recent Activity + Quick Actions) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Recent Scheduling Activity (2 cols) */}
        <div className="lg:col-span-2">
          <RecentActivity
            activities={activities}
            onFilterChange={handleFilterChange}
            selectedCategory={activityFilter}
          />
        </div>

        {/* Right: Quick Actions Shortcuts (1 col) */}
        <div className="lg:col-span-1">
          <QuickActions
            onOpenTimetableStudio={() => router.push("/timetable")}
            onOpenResolveConflicts={() => {
              setSelectedAttentionItem(attentionItems[0] || null);
              setResolveModalOpen(true);
            }}
            onOpenFindRoom={() => setFindRoomOpen(true)}
            onOpenScheduleExtraClass={() => setExtraClassOpen(true)}
            onOpenAskSynapse={() => setAskSynapseOpen(true)}
          />
        </div>
      </div>

      {/* ── Interactive Modals & Sheets ───────────────────────── */}
      <FindRoomModal
        open={findRoomOpen}
        onOpenChange={setFindRoomOpen}
        onSelectRoom={(room) => {
          toast({
            title: `Room ${room.code} selected`,
            description: `${room.capacity} seats in ${room.building}. Ready for allocation.`,
            variant: "info",
          });
        }}
      />

      <ScheduleExtraClassModal
        open={extraClassOpen}
        onOpenChange={setExtraClassOpen}
        onScheduled={loadDashboardData}
      />

      <ResolveConflictModal
        open={resolveModalOpen}
        onOpenChange={setResolveModalOpen}
        item={selectedAttentionItem}
        onResolved={handleConflictResolved}
      />

      <AskSynapseSheet
        open={askSynapseOpen}
        onOpenChange={setAskSynapseOpen}
      />

      <ConfirmDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title="Publish Fall 2026 Academic Timetable?"
        description="Publishing will lock room allocations and notify faculty, department heads, and students. There are currently 3 unresolved room conflicts that will be flagged as pending."
        confirmLabel="Confirm & Publish Timetable"
        cancelLabel="Keep as Draft"
        variant="warning"
        onConfirm={handlePublishConfirm}
      />
    </div>
  );
}
