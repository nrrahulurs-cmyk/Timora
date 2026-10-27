"use client";

import * as React from "react";
import { ArrowRight, CheckCircle2, LayoutGrid, ListFilter, RefreshCw, RotateCcw, Search, ShieldAlert, Table2 } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConflictResolutionDrawer } from "@/components/conflicts/conflict-resolution-drawer";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { validateSchedule } from "@/lib/scheduling/constraint-engine";
import type { ConflictRecord, ConflictSeverity, ConstraintType, SynapseCollegeDataset } from "@/types/domain";

type FilterStatus = "active" | "resolved" | "all";
type FilterCategory = "all" | ConstraintType;
type FilterSeverity = "all" | ConflictSeverity;

const constraintLabels: Record<ConstraintType, string> = {
  room_clash: "Room clash",
  faculty_overlap: "Faculty overlap",
  section_clash: "Section clash",
  capacity_deficit: "Capacity deficit",
  equipment_mismatch: "Equipment mismatch",
  maintenance_block: "Maintenance block",
  consecutive_hours_exceeded: "Consecutive hours",
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
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [isAuditing, setIsAuditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setHasError(false);
    try {
      const [data, allConflicts] = await Promise.all([
        schedulingRepository.getDataset(),
        schedulingRepository.getConflicts(),
      ]);
      setDataset(data);
      setConflicts(allConflicts);
    } catch (error) {
      console.error("Failed to load conflicts:", error);
      setDataset(null);
      setConflicts([]);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { void loadData(); }, [loadData]);

  async function refreshSelected(conflictId: string) {
    await loadData();
    const updated = await schedulingRepository.getConflictById(conflictId);
    if (updated) setSelectedConflict(updated);
  }

  async function runAudit() {
    if (!dataset) return;
    setIsAuditing(true);
    try {
      const report = validateSchedule(dataset);
      toast({
        title: "Schedule check complete",
        description: `${report.totalSessionsEvaluated} sessions checked; ${report.conflictedSessionsCount} have hard-constraint violations.`,
        variant: report.isValid ? "success" : "default",
      });
      await loadData();
    } catch {
      toast({ title: "Could not check schedule", description: "Refresh the data and try again.", variant: "destructive" });
    } finally {
      setIsAuditing(false);
    }
  }

  function resetFilters() {
    setStatusFilter("active");
    setCategoryFilter("all");
    setSeverityFilter("all");
    setSearchQuery("");
  }

  const active = conflicts.filter((item) => item.status === "active");
  const resolved = conflicts.filter((item) => item.status === "resolved");
  const criticalCount = active.filter((item) => item.severity === "critical").length;
  const noAlternativeCount = active.filter((item) => !item.hasFeasibleAlternative).length;
  const hasFilters = statusFilter !== "active" || categoryFilter !== "all" || severityFilter !== "all" || searchQuery.trim() !== "";
  const filtered = conflicts.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (categoryFilter !== "all" && item.type !== categoryFilter) return false;
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || [item.id, item.title, item.description, item.type, item.classroomId, item.facultyId].some((value) => value?.toLowerCase().includes(query));
  });

  function openConflict(conflict: ConflictRecord) {
    setSelectedConflict(conflict);
    setDrawerOpen(true);
  }

  function contextFor(conflict: ConflictRecord) {
    const room = dataset?.classrooms.find((item) => item.id === conflict.classroomId);
    const faculty = dataset?.faculty.find((item) => item.id === conflict.facultyId);
    const slot = dataset?.timeSlots.find((item) => item.id === conflict.timeSlotId);
    return [room?.code || conflict.classroomId, faculty?.name, slot ? `${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}` : conflict.timeSlotId].filter(Boolean).join(" · ");
  }

  function actionLabel(conflict: ConflictRecord) {
    return conflict.status === "resolved" ? "View / Undo Resolution" : conflict.hasFeasibleAlternative ? "Resolve with Ripple" : "Inspect Clash";
  }

  if (isLoading) return <div className="space-y-7"><WorkspaceHeader title="Schedule conflicts" /><div role="status" className="rounded-2xl bg-white p-14 text-center text-sm text-slate-600"><RefreshCw size={22} className="mx-auto mb-4 animate-spin" />Loading conflicts…</div></div>;
  if (hasError || !dataset) return <div className="space-y-7"><WorkspaceHeader title="Schedule conflicts" /><div role="alert" className="rounded-2xl bg-white p-10 text-center"><h2 className="text-lg font-semibold">Conflicts could not be loaded</h2><p className="mt-2 text-sm text-slate-600">Check the connection and try again.</p><Button className="mt-5" variant="outline" onClick={() => { setIsLoading(true); void loadData(); }}>Try again</Button></div></div>;

  return (
    <div className="space-y-8 pb-16">
      <WorkspaceHeader
        title="Schedule conflicts"
        subtitle="Review clashes before publishing."
        actions={<Button variant="outline" size="sm" disabled={isAuditing} onClick={() => void runAudit()} className="h-10 rounded-xl px-4"><RefreshCw size={15} className={isAuditing ? "mr-2 animate-spin" : "mr-2"} />{isAuditing ? "Checking…" : "Run audit"}</Button>}
      />

      <section aria-label="Conflict summary" className="flex flex-wrap items-center gap-x-10 gap-y-5 rounded-2xl bg-white/80 px-6 py-5 ring-1 ring-slate-200/70 sm:px-8">
        <div className="flex items-baseline gap-2"><strong className="text-[30px] leading-none tracking-tight text-slate-900">{active.length}</strong><span className="text-sm text-slate-600">Active Conflicts</span></div>
        <div className="flex items-baseline gap-2"><strong className="text-[24px] leading-none tracking-tight text-rose-700">{criticalCount}</strong><span className="text-sm text-slate-600">critical</span></div>
        <div className="flex items-baseline gap-2"><strong className="text-[24px] leading-none tracking-tight text-amber-700">{noAlternativeCount}</strong><span className="text-sm text-slate-600">without an alternative</span></div>
      </section>

      <section aria-label="Find conflicts" className="space-y-4 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-[#f3f4f7] p-1" role="group" aria-label="Conflict status">
            {([ ["active", `Active ${active.length}`], ["resolved", `Resolved ${resolved.length}`], ["all", `All ${conflicts.length}`] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setStatusFilter(value)} aria-pressed={statusFilter === value} className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${statusFilter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>)}
          </div>
          <div className="relative min-w-[180px] flex-1 sm:ml-auto sm:max-w-xs"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input aria-label="Search conflicts" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search conflicts" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#b7442d] focus:ring-2 focus:ring-[#f7d8cf]" />{searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">Clear</button>}</div>
          <button type="button" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium ${filtersOpen || categoryFilter !== "all" || severityFilter !== "all" ? "border-[#e7b4a6] bg-[#fff6f2] text-[#9e3f29]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><ListFilter size={16} />Filters</button>
          <div className="hidden h-10 items-center rounded-xl border border-slate-200 p-1 sm:flex" role="group" aria-label="Conflict view"><button type="button" aria-label="Card view" aria-pressed={viewMode === "cards"} onClick={() => setViewMode("cards")} className={`grid h-8 w-8 place-items-center rounded-lg ${viewMode === "cards" ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}><LayoutGrid size={16} /></button><button type="button" aria-label="Table view" aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")} className={`grid h-8 w-8 place-items-center rounded-lg ${viewMode === "table" ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}><Table2 size={16} /></button></div>
        </div>
        {filtersOpen && <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"><label className="space-y-1.5 text-xs font-medium text-slate-600"><span className="block">Type</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as FilterCategory)} className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"><option value="all">All types</option>{(Object.keys(constraintLabels) as ConstraintType[]).filter((type) => conflicts.some((item) => item.type === type)).map((type) => <option key={type} value={type}>{constraintLabels[type]}</option>)}</select></label><label className="space-y-1.5 text-xs font-medium text-slate-600"><span className="block">Severity</span><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as FilterSeverity)} className="h-10 min-w-36 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="advisory">Advisory</option></select></label>{hasFilters && <button type="button" onClick={resetFilters} className="flex h-10 items-center gap-2 px-2 text-sm font-medium text-slate-600 hover:text-slate-900"><RotateCcw size={15} />Clear filters</button>}</div>}
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/70"><CheckCircle2 size={28} className="mx-auto text-slate-400" /><h2 className="mt-4 text-lg font-semibold">{hasFilters ? "No matching conflicts" : "No active conflicts"}</h2><p className="mt-2 text-sm text-slate-600">{hasFilters ? "Try another search or clear the filters." : "There is nothing to review right now."}</p>{hasFilters && <Button variant="outline" onClick={resetFilters} className="mt-5">Clear filters</Button>}</div>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Filtered schedule conflicts</caption><thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-medium text-slate-600"><tr><th className="px-5 py-4">Conflict</th><th className="px-4 py-4">Severity</th><th className="px-4 py-4">Where</th><th className="px-4 py-4">Next step</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((item) => <tr key={item.id}><td className="px-5 py-4"><span className="block font-semibold text-slate-900">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.id} · {constraintLabels[item.type]}</span></td><td className="px-4 py-4 capitalize text-slate-700">{item.severity}</td><td className="px-4 py-4 text-slate-600">{contextFor(item) || "See details"}</td><td className="px-4 py-4 text-slate-600">{item.status === "resolved" ? "Resolved" : item.hasFeasibleAlternative ? "Alternative ready" : "Manual review"}</td><td className="px-5 py-4 text-right"><Button variant="outline" size="sm" onClick={() => openConflict(item)}>{item.status === "resolved" ? "View" : item.hasFeasibleAlternative ? "Resolve" : "Inspect"}<ArrowRight size={14} /></Button></td></tr>)}</tbody></table></div>
      ) : (
        <div className="space-y-4">{filtered.map((item) => {
          const isResolved = item.status === "resolved";
          return <article key={item.id} className="rounded-2xl bg-white px-5 py-5 ring-1 ring-slate-200/80 transition-shadow hover:shadow-[0_12px_28px_-18px_rgba(30,41,59,0.24)] sm:px-7 sm:py-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={isResolved ? "success" : item.severity === "critical" ? "critical" : item.severity === "warning" ? "warning" : "info"} size="sm" className="capitalize">{isResolved ? "Resolved" : item.severity}</Badge><span className="text-xs text-slate-500">{constraintLabels[item.type]} · {item.id}</span></div><h2 className="mt-3 text-base font-semibold leading-snug text-slate-900 sm:text-[17px]">{item.title}</h2><p className="mt-2 line-clamp-2 max-w-[75ch] text-sm leading-relaxed text-slate-600">{item.description}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600"><span>{contextFor(item) || "Open for record details"}</span><span className={`inline-flex items-center gap-1 font-medium ${isResolved ? "text-emerald-700" : item.hasFeasibleAlternative ? "text-[#9e3f29]" : "text-amber-700"}`}>{isResolved ? <CheckCircle2 size={14} /> : !item.hasFeasibleAlternative ? <ShieldAlert size={14} /> : null}{isResolved ? "Resolution recorded" : item.hasFeasibleAlternative ? "Alternative ready for review" : "No feasible alternative"}</span></div></div><Button variant={isResolved || !item.hasFeasibleAlternative ? "outline" : "default"} onClick={() => openConflict(item)} className="h-10 shrink-0 justify-center rounded-xl px-4 text-sm lg:self-center">{actionLabel(item)}<ArrowRight size={15} /></Button></div></article>;
        })}</div>
      )}

      <ConflictResolutionDrawer open={drawerOpen} onOpenChange={setDrawerOpen} conflict={selectedConflict} dataset={dataset} onResolved={refreshSelected} onUndone={refreshSelected} />
    </div>
  );
}
