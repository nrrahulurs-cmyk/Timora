"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Filter,
  Layers,
  MapPin,
  Clock,
  User,
  Users,
  LayoutGrid,
  Table,
  Zap,
} from "lucide-react";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type { ConflictRecord, SynapseCollegeDataset } from "@/types/domain";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { ConflictResolutionDrawer } from "@/components/conflicts/conflict-resolution-drawer";
import { validateSchedule } from "@/lib/scheduling/constraint-engine";
import { useToast } from "@/components/feedback/use-toast";

type FilterCategory = "all" | "room_clash" | "faculty_overlap" | "capacity_deficit" | "maintenance_block" | "no_alternative";

export default function ConflictsPage() {
  const { toast } = useToast();
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset | null>(null);
  const [conflicts, setConflicts] = React.useState<ConflictRecord[]>([]);
  const [selectedConflict, setSelectedConflict] = React.useState<ConflictRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState<FilterCategory>("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [isAuditing, setIsAuditing] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const [data, activeConflicts] = await Promise.all([
        schedulingRepository.getDataset().catch(() => SYNAPSE_SEED_DATA),
        schedulingRepository.getConflicts("active").catch(() => []),
      ]);
      setDataset(data || SYNAPSE_SEED_DATA);
      if (activeConflicts && activeConflicts.length > 0) {
        setConflicts(activeConflicts);
      } else if (data?.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts.filter((c) => c.status === "active"));
      } else {
        setConflicts(SYNAPSE_SEED_DATA.conflicts.filter((c) => c.status === "active"));
      }
    } catch (err) {
      console.error("Failed to load conflicts data:", err);
      setDataset(SYNAPSE_SEED_DATA);
      setConflicts(SYNAPSE_SEED_DATA.conflicts.filter((c) => c.status === "active"));
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenResolve = (conflict: ConflictRecord) => {
    setSelectedConflict(conflict);
    setDrawerOpen(true);
  };

  const handleResolved = async (conflictId: string) => {
    await loadData();
    // Update currently opened conflict in drawer
    const updated = await schedulingRepository.getConflictById(conflictId);
    if (updated) setSelectedConflict(updated);
  };

  const handleUndone = async (conflictId: string) => {
    await loadData();
    const updated = await schedulingRepository.getConflictById(conflictId);
    if (updated) setSelectedConflict(updated);
  };

  const handleRunScheduleAudit = async () => {
    if (!dataset) return;
    setIsAuditing(true);
    try {
      const report = validateSchedule(dataset);
      toast({
        title: "Deterministic Schedule Audit Complete",
        description: `Evaluated ${report.totalSessionsEvaluated} sessions across 15 rooms. Found ${report.conflictedSessionsCount} sessions with conflicts.`,
        variant: report.isValid ? "success" : "default",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  // Filtered conflicts list
  const filteredConflicts = conflicts.filter((c) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "no_alternative") return !c.hasFeasibleAlternative;
    return c.type === categoryFilter;
  });

  const criticalCount = conflicts.filter((c) => c.severity === "critical").length;
  const autoResolvableCount = conflicts.filter((c) => c.hasFeasibleAlternative).length;
  const noAlternativeCount = conflicts.filter((c) => !c.hasFeasibleAlternative).length;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Conflict Resolution Center"
        description="Deterministic constraint validation, cascade ripple impact analysis, and safe schedule reallocations."
        breadcrumbs={[{ label: "Scheduling" }, { label: "Conflicts" }]}
        badge={
          <Badge variant="error" dot>
            {conflicts.length} Active Clashes
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunScheduleAudit}
              disabled={isAuditing}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span>Validate Full Schedule</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (conflicts.length > 0) {
                  handleOpenResolve(conflicts[0]);
                }
              }}
              className="gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Resolve Primary Clash</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Summary Row (Stitch-Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {conflicts.length}
            </span>
            <div className="w-7 h-7 rounded-full border border-rose-200/80 bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Active Conflicts
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10.5px] font-semibold mt-1 border border-rose-200/60 shadow-2xs">
              <span>{criticalCount} Critical • {conflicts.length - criticalCount} Warning</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-emerald-600 tracking-tight font-sans">
              {autoResolvableCount}
            </span>
            <div className="w-7 h-7 rounded-full border border-emerald-200/80 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Ripple-Resolvable
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold mt-1 border border-emerald-200/50 shadow-2xs">
              <span>0-cascade alternatives ready</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-amber-600 tracking-tight font-sans">
              {noAlternativeCount}
            </span>
            <div className="w-7 h-7 rounded-full border border-amber-200/80 bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Escalation Required
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-semibold mt-1 border border-amber-200/60 shadow-2xs">
              <span>Zero feasible campus substitutes</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Deterministic [start, end)</span>
            </div>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Constraint Engine Mode
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10.5px] font-semibold mt-1 border border-slate-200/60 shadow-2xs">
              <span>Strict hard separation • 0 silent relaxation</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Filter Tabs & Orbitask View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Category:</span>
          </div>

          <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/60 gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({conflicts.length})
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("room_clash")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "room_clash"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Room Clashes
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("faculty_overlap")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "faculty_overlap"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Faculty Overlaps
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("capacity_deficit")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "capacity_deficit"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Capacity Deficits
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("maintenance_block")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "maintenance_block"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Maintenance Blocks
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter("no_alternative")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === "no_alternative"
                  ? "bg-rose-100 text-rose-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              No Feasible Alternative ({noAlternativeCount})
            </button>
          </div>
        </div>

        {/* Orbitask Table vs Cards Switcher */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/60 gap-1">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
              viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
            title="Card View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
              viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
            title="Orbitask Table View"
          >
            <Table className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Cards View or Orbitask Table View */}
      {viewMode === "table" ? (
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-3.5">Code</th>
                  <th className="py-3 px-3.5">Severity</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Conflict Title & Entities</th>
                  <th className="py-3 px-3.5">Time & Venue</th>
                  <th className="py-3 px-3.5">Ripple Feasibility</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConflicts.map((c) => {
                  const recSolution = c.alternatives.find((a) => a.isRecommended) || c.alternatives[0];
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => handleOpenResolve(c)}
                    >
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800 shrink-0">
                        {c.id}
                      </td>
                      <td className="py-2.5 px-3.5 shrink-0">
                        <Badge
                          variant={
                            c.severity === "critical"
                              ? "critical"
                              : c.severity === "warning"
                              ? "warning"
                              : "info"
                          }
                          size="sm"
                          className="uppercase text-[9.5px]"
                        >
                          {c.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                        {c.type.replace(/_/g, " ")}
                      </td>
                      <td className="py-2.5 px-3.5 max-w-sm">
                        <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">{c.description}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                        {c.timeSlotId || (c.sessionIds && c.sessionIds.length > 0 ? c.sessionIds[0] : "Active Slot")}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {c.hasFeasibleAlternative && recSolution ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/50">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            <span>Score {recSolution.feasibilityScore}/100</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200/50">
                            <ShieldAlert className="h-3 w-3 text-rose-600" />
                            <span>No Alternative</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <Button
                          variant={c.hasFeasibleAlternative ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenResolve(c);
                          }}
                          className="h-7 px-2.5 text-xs gap-1"
                        >
                          <span>{c.hasFeasibleAlternative ? "Resolve" : "Inspect"}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filteredConflicts.map((c) => {
            const recSolution = c.alternatives.find((a) => a.isRecommended) || c.alternatives[0];

            return (
              <Card
                key={c.id}
                className={`p-5 transition-all duration-200 border rounded-2xl shadow-2xs hover:shadow-card-soft ${
                  !c.hasFeasibleAlternative
                    ? "border-rose-300 bg-rose-50/20"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Section: Conflict Description & Badges */}
                  <div className="space-y-2.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {c.id}
                      </span>
                      <Badge
                        variant={
                          c.severity === "critical"
                            ? "critical"
                            : c.severity === "warning"
                            ? "warning"
                            : "info"
                        }
                        size="sm"
                        className="rounded-full px-2.5 py-0.5 font-semibold text-[10px]"
                      >
                        {c.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="neutral" size="sm" className="rounded-full px-2.5 py-0.5 font-medium text-[10px]">
                        {c.type.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      {!c.hasFeasibleAlternative && (
                        <Badge variant="critical" size="sm" className="font-mono rounded-full px-2.5 py-0.5 text-[10px]">
                          NO ALTERNATIVE ON CAMPUS
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

                    {/* Recommended Alternative Teaser */}
                    {c.hasFeasibleAlternative && recSolution && (
                      <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
                          <span className="font-semibold text-blue-950">Ripple Suggestion:</span>
                          <span className="text-[11px] text-slate-600 truncate max-w-xl">
                            {recSolution.description}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-emerald-600 shrink-0">
                          Score {recSolution.feasibilityScore}/100
                        </span>
                      </div>
                    )}

                    {!c.hasFeasibleAlternative && (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs flex items-center gap-2 text-rose-900 font-medium">
                        <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>
                          Statutory containment requirement cannot be relaxed. Requires Dean escalation.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Action Trigger */}
                  <div className="shrink-0 flex items-center lg:flex-col lg:items-end gap-2">
                    <Button
                      variant={c.hasFeasibleAlternative ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleOpenResolve(c)}
                      className="gap-1.5 text-xs rounded-full px-4 h-8 font-semibold shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{c.hasFeasibleAlternative ? "Resolve with Ripple" : "Inspect Clash"}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredConflicts.length === 0 && (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">Zero Conflicts in Category</h4>
              <p className="text-xs text-slate-500">
                All schedule assignments in this category satisfy hard constraints and soft preferences.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drawer Component */}
      <ConflictResolutionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        conflict={selectedConflict}
        dataset={dataset}
        onResolved={handleResolved}
        onUndone={handleUndone}
      />
    </div>
  );
}
