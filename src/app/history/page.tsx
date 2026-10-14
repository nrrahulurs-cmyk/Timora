"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Clock,
  User,
  ShieldCheck,
  Filter,
  ArrowRight,
  Eye,
  FileCheck2,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { useToast } from "@/components/feedback/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type { ScheduleVersion, ChangeHistoryRecord, ConflictRecord } from "@/types/domain";

export default function HistoryPage() {
  const { toast } = useToast();

  const [versions, setVersions] = React.useState<ScheduleVersion[]>([]);
  const [history, setHistory] = React.useState<ChangeHistoryRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  // Publication Preview Modal State
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<{
    canPublish: boolean;
    totalSessions: number;
    activeConflicts: ConflictRecord[];
    blockingConflictsCount: number;
    warningsCount: number;
    beforeAfterDiff: {
      previousVersion: string;
      proposedVersion: string;
      modificationsCount: number;
    };
  } | null>(null);

  const [publishing, setPublishing] = React.useState(false);
  const [publishNotes, setPublishNotes] = React.useState("");

  // Rollback Modal State
  const [rollbackTarget, setRollbackTarget] = React.useState<ScheduleVersion | null>(null);
  const [rollingBack, setRollingBack] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [allVersions, allHistory] = await Promise.all([
      schedulingRepository.getScheduleVersions(),
      schedulingRepository.getChangeHistory(),
    ]);
    setVersions(allVersions);
    setHistory(allHistory);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const activePublished = versions.find((v) => v.status === "published");
  const currentDraft = versions.find((v) => v.status === "draft");

  // Open Publication Pre-flight Preview
  const handleOpenPublicationPreview = async () => {
    const data = await schedulingRepository.previewPublication();
    setPreviewData(data);
    setPreviewOpen(true);
  };

  // Commit Publishing
  const handleConfirmPublish = async () => {
    setPublishing(true);
    try {
      const nextVerNumber = "v2.4";
      const res = await schedulingRepository.publishScheduleVersion(
        nextVerNumber,
        "Dr. Eleanor Vance",
        publishNotes || "Official mid-semester timetable release with verified room allocations."
      );

      if (res.success) {
        toast({
          title: "Schedule Officially Published Live",
          description: `Version ${nextVerNumber} broadcasted to student & faculty portals. Prior versions archived safely.`,
          variant: "success",
        });
        setPreviewOpen(false);
        setPublishNotes("");
        loadData();
      } else {
        toast({
          title: "Publishing Blocked",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Publication Error",
        description: err.message || "Failed to publish schedule.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Commit Rollback
  const handleConfirmRollback = async () => {
    if (!rollbackTarget) return;
    setRollingBack(true);
    try {
      const res = await schedulingRepository.rollbackToVersion(
        rollbackTarget.id,
        "Dr. Eleanor Vance"
      );

      if (res.success) {
        toast({
          title: "Timetable Rollback Executed",
          description: res.message,
          variant: "success",
        });
        setRollbackTarget(null);
        loadData();
      } else {
        toast({
          title: "Rollback Failed",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Rollback Error",
        description: err.message || "Failed to execute validated rollback.",
        variant: "destructive",
      });
    } finally {
      setRollingBack(false);
    }
  };

  const filteredHistory = history.filter((h) => {
    if (categoryFilter === "all") return true;
    return h.category === categoryFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Change History, Publishing & Version Governance"
        description="Chronological audit records of timetable modifications, immutable version tracking, publication pre-flight validation, and validated rollbacks."
        breadcrumbs={[{ label: "Governance & System" }, { label: "Change History" }]}
        badge={
          <Badge variant="outline" size="sm" className="font-mono bg-blue-50/50 border-blue-200 text-blue-800">
            Active: {activePublished?.versionNumber || "v2.3"}
          </Badge>
        }
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenPublicationPreview}
            className="gap-1.5 bg-[rgb(var(--color-primary))] text-white"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Publish Current Draft</span>
          </Button>
        }
      />

      {/* KPI Version Strip (CIIRC-Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs rounded-xl min-h-[112px]">
          <div className="flex items-start justify-between">
            <span className="text-[27px] leading-none font-bold font-mono text-emerald-600 tracking-[-0.025em]">
              {activePublished?.versionNumber || "v2.3"}
            </span>
            <div className="w-6 h-6 rounded-md border border-emerald-200/80 bg-emerald-50/60 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
              Current Live Version
            </div>
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold mt-1 border border-emerald-200/50">
              <span>Production Schedule</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs rounded-xl min-h-[112px]">
          <div className="flex items-start justify-between">
            <span className="text-[27px] leading-none font-bold font-mono text-amber-600 tracking-[-0.025em]">
              {currentDraft?.versionNumber || "v2.4-preview"}
            </span>
            <div className="w-6 h-6 rounded-md border border-amber-200/80 bg-amber-50/60 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
              Staged Working Draft
            </div>
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold mt-1 border border-amber-200/60">
              <span>In Staging & Review</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs rounded-xl min-h-[112px]">
          <div className="flex items-start justify-between">
            <span className="text-[27px] leading-none font-bold font-mono text-blue-600 tracking-[-0.025em]">
              {versions.length}
            </span>
            <div className="w-6 h-6 rounded-md border border-blue-200/80 bg-blue-50/60 flex items-center justify-center text-blue-600 shrink-0">
              <GitBranch className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
              Tracked Schedule Versions
            </div>
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium mt-1 border border-blue-200/60">
              <span>Rollback-ready immutable</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs rounded-xl min-h-[112px]">
          <div className="flex items-start justify-between">
            <span className="text-[27px] leading-none font-bold font-mono text-slate-900 tracking-[-0.025em]">
              {history.length}
            </span>
            <div className="w-6 h-6 rounded-md border border-slate-200/80 bg-slate-50/60 flex items-center justify-center text-slate-500 shrink-0">
              <History className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
              Audit Trail Records
            </div>
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium mt-1 border border-slate-200/60">
              <span>Full governance logs</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Schedule Versions & Release History Table */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              <CardTitle className="text-sm font-semibold">
                Version History & Release Management
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500">
              Zero destructive overwrites: prior releases remain archived and rollback-ready.
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">
          {versions.map((ver) => (
            <div
              key={ver.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {ver.versionNumber}
                  </span>
                  <Badge
                    variant={
                      ver.status === "published"
                        ? "success"
                        : ver.status === "draft"
                        ? "warning"
                        : "neutral"
                    }
                    dot
                    size="sm"
                  >
                    {ver.status === "published"
                      ? "Live Production"
                      : ver.status === "draft"
                      ? "Working Draft"
                      : "Archived Release"}
                  </Badge>

                  {ver.clashCount > 0 && (
                    <Badge variant="error" size="sm" className="font-mono text-[10px]">
                      {ver.clashCount} exceptions
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-600">{ver.changesSummary}</p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                  {ver.publishedAt && <span>Released: {ver.publishedAt.split("T")[0]}</span>}
                  {ver.publishedBy && <span>By: {ver.publishedBy}</span>}
                  <span>Term: {ver.academicTermId}</span>
                </div>
              </div>

              {/* Version Controls */}
              <div className="flex items-center gap-2 shrink-0">
                {ver.status === "archived" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRollbackTarget(ver)}
                    className="h-7 text-xs text-amber-700 hover:bg-amber-50 border-amber-200 gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Rollback to {ver.versionNumber}</span>
                  </Button>
                )}

                {ver.status === "draft" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleOpenPublicationPreview}
                    className="h-7 text-xs gap-1"
                  >
                    <UploadCloud className="h-3 w-3" />
                    <span>Publish Draft</span>
                  </Button>
                )}

                {ver.status === "published" && (
                  <Badge variant="success" size="sm" className="text-[10px]">
                    Current Live System
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Change History & Audit Trail */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              <CardTitle className="text-sm font-semibold">
                Chronological Audit Trail
              </CardTitle>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
              {["all", "modification", "approval", "conflict", "automated"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    categoryFilter === cat
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100">
          {filteredHistory.map((act) => (
            <div
              key={act.id}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/40 transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{act.actorName}</span>
                  <span className="text-[11px] text-slate-400 font-mono">({act.actorRole})</span>
                </div>
                <div className="text-slate-600">
                  {act.action} —{" "}
                  <span className="font-medium text-slate-900 font-mono">{act.targetName}</span>
                </div>
                {act.previousValue && act.newValue && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    <span className="line-through text-slate-400">{act.previousValue}</span>{" "}
                    <ArrowRight className="inline h-3 w-3 text-slate-400 mx-0.5" />{" "}
                    <span className="text-emerald-700 font-bold">{act.newValue}</span>
                  </div>
                )}
              </div>

              <div className="text-right space-y-1 shrink-0">
                <span className="text-[11px] text-slate-400 font-mono block">
                  {act.timestamp.replace("T", " ").replace("Z", "")}
                </span>
                <Badge
                  variant={
                    act.category === "approval"
                      ? "success"
                      : act.category === "conflict"
                      ? "warning"
                      : "secondary"
                  }
                  size="sm"
                  className="text-[10px]"
                >
                  {act.category}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Publication Pre-Flight Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-[rgb(var(--color-primary))]" />
              <DialogTitle className="text-base font-semibold">
                Pre-Publication Validation & Before/After Diff
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Pre-flight report comparing proposed draft schedule with current live version.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 my-2 text-xs">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Baseline Version</span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {previewData.beforeAfterDiff.previousVersion}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Proposed Version</span>
                  <span className="font-mono text-sm font-bold text-blue-600">
                    {previewData.beforeAfterDiff.proposedVersion}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduled Sessions</span>
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {previewData.totalSessions} Classes
                  </span>
                </div>
              </div>

              {/* Blocking Conflicts Notice */}
              <div
                className={`p-3 rounded-lg border leading-relaxed space-y-1.5 ${
                  previewData.blockingConflictsCount > 0
                    ? "bg-amber-50/80 border-amber-200 text-amber-900"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {previewData.blockingConflictsCount > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>
                        Unresolved Schedule Conflicts Detected ({previewData.activeConflicts.length} active)
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>All Hard Constraints Cleared</span>
                    </>
                  )}
                </div>

                {previewData.activeConflicts.length > 0 && (
                  <div className="space-y-1 mt-1 text-[11px]">
                    <span className="font-medium block">Tracked Conflict Exceptions:</span>
                    {previewData.activeConflicts.slice(0, 4).map((c) => (
                      <div key={c.id} className="flex items-center justify-between font-mono bg-white/70 p-1 rounded">
                        <span>• {c.title}</span>
                        <span className="text-amber-700 font-bold">({c.severity})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Publication Notes Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Release Notes / Publication Summary</label>
                <input
                  type="text"
                  value={publishNotes}
                  onChange={(e) => setPublishNotes(e.target.value)}
                  placeholder="e.g. Fall 2026 official timetable release with resolved room allocations"
                  className="w-full h-8.5 rounded-md border border-slate-200 px-3 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] outline-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirmPublish}
              disabled={publishing}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UploadCloud className="h-4 w-4" />
              <span>{publishing ? "Publishing Live..." : "Confirm & Broadcast Publication"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validated Rollback Confirmation Modal */}
      <Dialog open={Boolean(rollbackTarget)} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              <DialogTitle className="text-base font-semibold">
                Confirm Timetable Rollback
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Restore the academic schedule state to previous release {rollbackTarget?.versionNumber}.
            </DialogDescription>
          </DialogHeader>

          {rollbackTarget && (
            <div className="space-y-3 my-2 text-xs">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 leading-relaxed">
                <p>
                  You are about to roll back the active timetable to{" "}
                  <strong>{rollbackTarget.versionNumber}</strong> (originally published{" "}
                  {rollbackTarget.publishedAt?.split("T")[0]}).
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  A validated rollback will be recorded in the audit history. Previous versions will remain preserved.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRollbackTarget(null)}
              disabled={rollingBack}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleConfirmRollback}
              disabled={rollingBack}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{rollingBack ? "Restoring Schedule..." : "Execute Validated Rollback"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
