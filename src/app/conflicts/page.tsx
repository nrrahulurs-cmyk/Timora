"use client";

import * as React from "react";
import Link from "next/link";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card } from "@/components/ui/card";
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
  MapPin,
  Clock,
  User,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  Search,
  X,
  Calendar,
  RotateCcw,
  Building2,
  ExternalLink,
} from "lucide-react";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type {
  ConflictRecord,
  ConstraintType,
  ConflictSeverity,
  SynapseCollegeDataset,
} from "@/types/domain";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import { ConflictResolutionDrawer } from "@/components/conflicts/conflict-resolution-drawer";
import { validateSchedule } from "@/lib/scheduling/constraint-engine";
import { useToast } from "@/components/feedback/use-toast";

type FilterStatus = "active" | "resolved" | "all";
type FilterCategory = "all" | ConstraintType;
type FilterSeverity = "all" | ConflictSeverity;

const CONSTRAINT_LABELS: Record<ConstraintType, string> = {
  room_clash: "Room Clash",
  faculty_overlap: "Faculty Overlap",
  section_clash: "Section Clash",
  capacity_deficit: "Capacity Deficit",
  equipment_mismatch: "Equipment Mismatch",
  maintenance_block: "Maintenance Block",
  consecutive_hours_exceeded: "Consecutive Hours",
};

export default function ConflictsPage() {
  const { toast } = useToast();
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset | null>(null);
  const [conflicts, setConflicts] = React.useState<ConflictRecord[]>([]);
  const [selectedConflict, setSelectedConflict] = React.useState<ConflictRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("active");
  const [categoryFilter, setCategoryFilter] = React.useState<FilterCategory>("all");
  const [severityFilter, setSeverityFilter] = React.useState<FilterSeverity>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      const [data, allConflicts] = await Promise.all([
        schedulingRepository.getDataset().catch(() => SYNAPSE_SEED_DATA),
        schedulingRepository.getConflicts().catch(() => []),
      ]);
      setDataset(data || SYNAPSE_SEED_DATA);

      if (allConflicts && allConflicts.length > 0) {
        setConflicts(allConflicts);
      } else if (data?.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
      } else {
        setConflicts(SYNAPSE_SEED_DATA.conflicts);
      }
    } catch (err) {
      console.error("Failed to load conflicts data:", err);
      setHasError(true);
      setDataset(SYNAPSE_SEED_DATA);
      setConflicts(SYNAPSE_SEED_DATA.conflicts);
    } finally {
      setIsLoading(false);
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
      await loadData();
    } finally {
      setIsAuditing(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter("active");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    statusFilter !== "active" ||
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    searchQuery.trim() !== "";

  // Precise authoritative metrics
  const activeConflicts = conflicts.filter((c) => c.status === "active");
  const resolvedConflicts = conflicts.filter((c) => c.status === "resolved");
  const criticalActiveCount = activeConflicts.filter((c) => c.severity === "critical").length;
  const warningActiveCount = activeConflicts.filter((c) => c.severity === "warning").length;
  const autoResolvableCount = activeConflicts.filter((c) => c.hasFeasibleAlternative).length;
  const noAlternativeCount = activeConflicts.filter((c) => !c.hasFeasibleAlternative).length;

  // Filtered conflicts list
  const filteredConflicts = conflicts.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (categoryFilter !== "all" && c.type !== categoryFilter) return false;
    if (severityFilter !== "all" && c.severity !== severityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = c.id.toLowerCase().includes(q);
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchType = c.type.toLowerCase().includes(q);
      const matchRoom = c.classroomId?.toLowerCase().includes(q) ?? false;
      const matchFaculty = c.facultyId?.toLowerCase().includes(q) ?? false;
      return matchId || matchTitle || matchDesc || matchType || matchRoom || matchFaculty;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      <WorkspaceHeader
        section="Conflict Resolution Center"
        title="Conflict Resolution & Ripple Intelligence"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="error" dot className="rounded-full text-xs font-semibold">
              {activeConflicts.length} Active {activeConflicts.length === 1 ? "Clash" : "Clashes"}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">
              Fall 2026 • Schedule v2.4 (Active Draft)
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/timetable">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 rounded-full px-3.5 border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
              >
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Timetable Studio</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunScheduleAudit}
              disabled={isAuditing}
              className="gap-1.5 text-xs h-8 rounded-full px-3.5 border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span>{isAuditing ? "Auditing..." : "Run Schedule Audit"}</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (activeConflicts.length > 0) {
                  handleOpenResolve(activeConflicts[0]);
                } else if (conflicts.length > 0) {
                  handleOpenResolve(conflicts[0]);
                }
              }}
              disabled={conflicts.length === 0}
              className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Resolve Primary Clash</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Summary Row (Restrained Enterprise Hierarchy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-2xl min-h-[110px] transition-all hover:border-slate-300">
          <div className="flex items-start justify-between">
            <span className="text-2xl leading-none font-bold text-slate-900 tracking-tight font-sans">
              {activeConflicts.length}
            </span>
            <div className="w-7 h-7 rounded-lg border border-rose-100 bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600">
              Active Conflicts
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium mt-0.5">
              <span>{criticalActiveCount} Critical</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{warningActiveCount} Warning</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-2xl min-h-[110px] transition-all hover:border-slate-300">
          <div className="flex items-start justify-between">
            <span className="text-2xl leading-none font-bold text-emerald-600 tracking-tight font-sans">
              {autoResolvableCount}
            </span>
            <div className="w-7 h-7 rounded-lg border border-emerald-100 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600">
              Ripple-Resolvable
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-0.5">
              Verified deterministic alternatives ready
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-2xl min-h-[110px] transition-all hover:border-slate-300">
          <div className="flex items-start justify-between">
            <span className="text-2xl leading-none font-bold text-amber-600 tracking-tight font-sans">
              {noAlternativeCount}
            </span>
            <div className="w-7 h-7 rounded-lg border border-amber-100 bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600">
              Escalation Required
            </div>
            <div className="text-xs text-amber-700 font-medium mt-0.5">
              Zero feasible substitutes (Dean escalation)
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-2xl min-h-[110px] transition-all hover:border-slate-300">
          <div className="flex items-start justify-between">
            <span className="text-2xl leading-none font-bold text-indigo-600 tracking-tight font-sans">
              {resolvedConflicts.length}
            </span>
            <div className="w-7 h-7 rounded-lg border border-indigo-100 bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600">
              Resolved Conflicts
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              Audited in version history with undo support
            </div>
          </div>
        </Card>
      </div>

      {/* Multi-Dimensional Filter Toolbar */}
      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs: Active, Resolved, All */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({activeConflicts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "resolved"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Resolved ({resolvedConflicts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Records ({conflicts.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, title, classroom, or faculty..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Layout Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Category & Severity Filter Pills */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Type:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              All Types
            </button>
            {(Object.keys(CONSTRAINT_LABELS) as ConstraintType[]).map((type) => {
              const countInType = conflicts.filter((c) => c.type === type).length;
              if (countInType === 0 && categoryFilter !== type) return null;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCategoryFilter(type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    categoryFilter === type
                      ? "bg-slate-900 text-white font-semibold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {CONSTRAINT_LABELS[type]} ({countInType})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-500 mr-1">Severity:</span>
              <button
                type="button"
                onClick={() => setSeverityFilter("all")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                  severityFilter === "all"
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter("critical")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                  severityFilter === "critical"
                    ? "bg-rose-600 text-white font-semibold"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                Critical
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter("warning")}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                  severityFilter === "warning"
                    ? "bg-amber-600 text-white font-semibold"
                    : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                Warning
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 flex items-center gap-1 ml-2 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
          <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
          <div className="text-xs font-medium text-slate-600">Loading conflict records...</div>
        </div>
      ) : hasError ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-rose-200 space-y-3">
          <XCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-900">Failed to load conflict queue</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Unable to connect to the scheduling service. Please check database permissions and try again.
          </p>
          <Button variant="outline" size="sm" onClick={loadData} className="mt-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <span>Retry Connection</span>
          </Button>
        </div>
      ) : filteredConflicts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
          {hasActiveFilters ? (
            <>
              <Filter className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">No matching conflict records</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No conflicts match the selected status, category, severity, or search query.
              </p>
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Clear All Filters</span>
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-900">Zero Schedule Conflicts</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All scheduled timetable sessions strictly satisfy hard room, faculty, and section constraints.
              </p>
            </>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* Orbitask Table View */
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-2.5">Status</th>
                  <th className="py-2.5 px-2.5">Severity</th>
                  <th className="py-2.5 px-2.5">Category</th>
                  <th className="py-2.5 px-3">Conflict Title & Constraint Failure</th>
                  <th className="py-2.5 px-3">Venue & Time</th>
                  <th className="py-2.5 px-3">Ripple Feasibility</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConflicts.map((c) => {
                  const isResolved = c.status === "resolved";
                  const recSolution = c.alternatives.find((a) => a.isRecommended) || c.alternatives[0];
                  const classroom = c.classroomId
                    ? dataset?.classrooms.find((r) => r.id === c.classroomId)
                    : undefined;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                        isResolved ? "opacity-75 bg-slate-50/30" : ""
                      }`}
                      onClick={() => handleOpenResolve(c)}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 shrink-0">
                        {c.id}
                      </td>
                      <td className="py-2.5 px-2.5 shrink-0">
                        <Badge
                          variant={isResolved ? "success" : "neutral"}
                          size="sm"
                          className="uppercase text-xs font-semibold"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2.5 shrink-0">
                        <Badge
                          variant={
                            c.severity === "critical"
                              ? "critical"
                              : c.severity === "warning"
                              ? "warning"
                              : "info"
                          }
                          size="sm"
                          className="uppercase text-xs font-semibold"
                        >
                          {c.severity}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-600 font-medium whitespace-nowrap">
                        {CONSTRAINT_LABELS[c.type] || c.type.replace(/_/g, " ")}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">{c.title}</div>
                        <div className="text-xs text-slate-500 truncate">{c.description}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{classroom ? `${classroom.code}` : c.classroomId || "Venue"}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {c.timeSlotId || "Active Slot"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isResolved ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Resolved</span>
                          </div>
                        ) : c.hasFeasibleAlternative && recSolution ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            <span>Feasible ({recSolution.feasibilityScore}/100)</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                            <ShieldAlert className="h-3 w-3 text-rose-600" />
                            <span>No Alternative</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Button
                          variant={isResolved ? "outline" : c.hasFeasibleAlternative ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenResolve(c);
                          }}
                          className="h-7 px-2.5 text-xs gap-1 font-semibold"
                        >
                          <span>{isResolved ? "View" : c.hasFeasibleAlternative ? "Resolve" : "Inspect"}</span>
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
        /* Cards View */
        <div className="space-y-3.5">
          {filteredConflicts.map((c) => {
            const isResolved = c.status === "resolved";
            const recSolution = c.alternatives.find((a) => a.isRecommended) || c.alternatives[0];
            const classroom = c.classroomId
              ? dataset?.classrooms.find((r) => r.id === c.classroomId)
              : undefined;
            const faculty = c.facultyId
              ? dataset?.faculty.find((f) => f.id === c.facultyId)
              : undefined;

            return (
              <Card
                key={c.id}
                className={`p-5 transition-all duration-200 border rounded-2xl shadow-2xs hover:shadow-card-soft ${
                  isResolved
                    ? "border-emerald-200 bg-emerald-50/15"
                    : !c.hasFeasibleAlternative
                    ? "border-rose-300 bg-rose-50/20"
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left Section: Description, Tags & Context */}
                  <div className="space-y-2.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {c.id}
                      </span>
                      <Badge
                        variant={isResolved ? "success" : "neutral"}
                        size="sm"
                        className="rounded-full px-2.5 py-0.5 font-semibold text-xs"
                      >
                        {c.status.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          c.severity === "critical"
                            ? "critical"
                            : c.severity === "warning"
                            ? "warning"
                            : "info"
                        }
                        size="sm"
                        className="rounded-full px-2.5 py-0.5 font-semibold text-xs"
                      >
                        {c.severity.toUpperCase()}
                      </Badge>
                      <Badge
                        variant="neutral"
                        size="sm"
                        className="rounded-full px-2.5 py-0.5 font-medium text-xs text-slate-700"
                      >
                        {CONSTRAINT_LABELS[c.type] || c.type.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                      {!c.hasFeasibleAlternative && !isResolved && (
                        <Badge
                          variant="critical"
                          size="sm"
                          className="font-mono rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        >
                          NO CAMPUS ALTERNATIVE
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

                    {/* Metadata entities pills */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      {classroom && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{classroom.code} ({classroom.name})</span>
                        </div>
                      )}
                      {faculty && (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{faculty.name}</span>
                        </div>
                      )}
                      {c.timeSlotId && (
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{c.timeSlotId}</span>
                        </div>
                      )}
                    </div>

                    {/* Banner: Resolved State / Ripple Suggestion / No Feasible Alternative */}
                    {isResolved ? (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-950 font-medium">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>Resolution applied to timetable. Schedule integrity verified.</span>
                        </div>
                        <span className="text-emerald-700 text-xs font-mono">
                          {c.resolutionNotes || "Audited"}
                        </span>
                      </div>
                    ) : c.hasFeasibleAlternative && recSolution ? (
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-blue-950">Ripple Suggestion:</span>
                          <span className="text-xs text-slate-600 truncate max-w-xl">
                            {recSolution.description}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-emerald-600 shrink-0">
                          Score {recSolution.feasibilityScore}/100
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs flex items-center gap-2 text-rose-900 font-medium">
                        <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>
                          Statutory biosafety containment cannot be relaxed. Requires Dean escalation.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Section: Action Button */}
                  <div className="shrink-0 flex items-center lg:flex-col lg:items-end gap-2">
                    <Button
                      variant={
                        isResolved
                          ? "outline"
                          : c.hasFeasibleAlternative
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleOpenResolve(c)}
                      className="gap-1.5 text-xs rounded-full px-4 h-8 font-semibold shadow-xs"
                    >
                      {isResolved ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>View / Undo Resolution</span>
                        </>
                      ) : c.hasFeasibleAlternative ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>Resolve with Ripple</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                          <span>Inspect Clash</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
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
