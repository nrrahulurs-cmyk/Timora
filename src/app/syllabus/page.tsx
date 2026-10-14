"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/metric-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowRight,
  User,
  Plus,
  Check,
  TrendingUp,
  Info,
  CalendarPlus,
} from "lucide-react";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { ScheduleExtraClassModal } from "@/components/dashboard/modals/schedule-extra-class-modal";
import type { SyllabusModule, TopicProgressRecord, Subject, SyllabusTopic } from "@/types/domain";

export default function SyllabusProgressPage() {
  const { toast } = useToast();

  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState("SUB-CS401");
  const [modules, setModules] = React.useState<SyllabusModule[]>([]);
  const [progressRecords, setProgressRecords] = React.useState<TopicProgressRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [extraClassModalOpen, setExtraClassModalOpen] = React.useState(false);

  // Semester velocity constants
  const TOTAL_SEMESTER_WEEKS = 16;
  const CURRENT_WEEK = 9;
  const WEEKS_REMAINING = TOTAL_SEMESTER_WEEKS - CURRENT_WEEK; // 7 weeks left
  const SESSIONS_PER_WEEK_HOURS = 3; // 2x 1.5hr sessions = 3 hours/week

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [allSubs, allMods, allProg] = await Promise.all([
      schedulingRepository.getSubjects(),
      schedulingRepository.getSyllabusModules(),
      schedulingRepository.getTopicProgress(),
    ]);
    setSubjects(allSubs);
    setModules(allMods);
    setProgressRecords(allProg);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Current Subject and Modules
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const currentModules = modules.filter((m) => m.subjectId === selectedSubjectId);
  const currentProgress = progressRecords.find((p) => p.subjectId === selectedSubjectId);

  // Velocity calculations
  const totalPlannedHours = currentModules.reduce((s, m) => s + m.totalPlannedHours, 0);
  const totalCompletedHours = currentModules.reduce((s, m) => s + m.completedHours, 0);
  const remainingHours = Math.max(0, totalPlannedHours - totalCompletedHours);
  const availableRegularHours = WEEKS_REMAINING * SESSIONS_PER_WEEK_HOURS; // 21 hrs
  const deficitHours = remainingHours - availableRegularHours;
  const isDeficitRisk = deficitHours > 0;
  const completionRate =
    totalPlannedHours > 0
      ? Math.round((totalCompletedHours / totalPlannedHours) * 1000) / 10
      : 0;

  // Toggle Topic Completion
  const handleToggleTopic = async (topic: SyllabusTopic) => {
    const nextState = !topic.isDelivered;
    await schedulingRepository.updateTopicDelivery(
      topic.id,
      nextState,
      "FAC-VANCE",
      "SESS-CS401-MON"
    );

    toast({
      title: nextState ? "Topic Marked Delivered" : "Topic Reverted to Pending",
      description: `"${topic.title}" (${topic.estimatedHours} hrs) status updated. Syllabus metrics synchronized.`,
      variant: nextState ? "success" : "default",
    });

    loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Syllabus & Lecture Delivery Tracking"
        description="Verify topic-level curriculum delivery, monitor faculty updates, evaluate explainable pacing velocity, and schedule makeup tutorials for pacing deficits."
        breadcrumbs={[{ label: "Academic Operations" }, { label: "Syllabus Progress" }]}
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => setExtraClassModalOpen(true)}
            className="gap-1.5"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Schedule Extra Tutorial</span>
          </Button>
        }
      />

      {/* Subject Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
          Select Subject:
        </span>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedSubjectId(sub.id)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all ${
              selectedSubjectId === sub.id
                ? "bg-[rgb(var(--color-primary))] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {sub.code}: {sub.title}
          </button>
        ))}
      </div>

      {/* Course Overview & Pacing Velocity Card */}
      <Card className="p-5 bg-white border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-[rgb(var(--color-primary))]">
                {currentSubject?.code}
              </span>
              <h2 className="text-base font-semibold text-slate-900">
                {currentSubject?.title}
              </h2>
              <Badge
                variant={completionRate >= 75 ? "success" : completionRate >= 50 ? "default" : "warning"}
                size="sm"
                className="font-mono"
              >
                {completionRate}% Delivered
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Curriculum Baseline: {totalPlannedHours} Planned Hours • Delivered: {totalCompletedHours} Hours • Remaining: {remainingHours} Hours
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isDeficitRisk ? (
              <Badge variant="error" dot size="sm" className="px-2.5 py-1">
                ⚠️ Pacing Deficit Detected (-{deficitHours.toFixed(1)} hrs)
              </Badge>
            ) : (
              <Badge variant="success" dot size="sm" className="px-2.5 py-1">
                ✓ Curriculum On Schedule (+{(availableRegularHours - remainingHours).toFixed(1)} hrs Headroom)
              </Badge>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-slate-600">
            <span>Overall Curriculum Completion</span>
            <span className="font-mono">{totalCompletedHours} / {totalPlannedHours} hrs</span>
          </div>
          <ProgressBar
            value={completionRate}
            variant={completionRate >= 75 ? "success" : completionRate >= 50 ? "primary" : "warning"}
          />
        </div>

        {/* Explainable Velocity & Estimates Box */}
        <div
          className={`p-3.5 rounded-lg border text-xs leading-relaxed space-y-2 ${
            isDeficitRisk
              ? "bg-amber-50/60 border-amber-200 text-amber-900"
              : "bg-blue-50/40 border-blue-200 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              Explainable Delivery Velocity & Capacity Model (Week {CURRENT_WEEK} of {TOTAL_SEMESTER_WEEKS})
            </span>
            <span className="font-mono text-[11px] opacity-75">
              {WEEKS_REMAINING} Academic Weeks Remaining
            </span>
          </div>

          <p>
            At the standard allocation of <strong>3.0 lecture hours per week</strong>, the regular timetable provides{" "}
            <strong>{availableRegularHours} available hours</strong> before the final examination cutoff.
            With <strong>{remainingHours} curriculum hours remaining</strong>, the pacing forecast indicates:
          </p>

          {isDeficitRisk ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
              <span className="font-semibold text-amber-950">
                ⚠️ Deficit Risk: Scheduled lessons alone will fall short by {deficitHours.toFixed(1)} hours.
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setExtraClassModalOpen(true)}
                className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1"
              >
                <Sparkles className="h-3 w-3" />
                <span>Suggest Extra Class Slots to Close Deficit</span>
              </Button>
            </div>
          ) : (
            <div className="pt-1 border-t border-blue-200/60 text-emerald-800 font-medium">
              ✓ Planned sessions appear sufficient. Topics can be comfortably covered without mandatory weekend tutorials.
            </div>
          )}
        </div>
      </Card>

      {/* Modules and Topics Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Curriculum Modules & Verified Topic Delivery
          </h3>
          <span className="text-xs text-slate-500">
            Note: A scheduled lesson never guarantees topic completion. Explicit instructor sign-off is required.
          </span>
        </div>

        {currentModules.map((mod) => {
          const modRate =
            mod.totalPlannedHours > 0
              ? Math.round((mod.completedHours / mod.totalPlannedHours) * 100)
              : 0;

          return (
            <Card key={mod.id} className="p-4 bg-white border-slate-200 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      Module {mod.moduleNumber}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900">{mod.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono font-medium text-slate-700">
                    {mod.completedHours} / {mod.totalPlannedHours} hrs ({modRate}%)
                  </span>
                  <Badge
                    variant={modRate === 100 ? "success" : modRate > 0 ? "default" : "neutral"}
                    size="sm"
                  >
                    {modRate === 100 ? "Completed" : modRate > 0 ? "In Progress" : "Pending"}
                  </Badge>
                </div>
              </div>

              {/* Topics Delivery Checklist */}
              <div className="space-y-2">
                {mod.topics.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-start justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      t.isDelivered
                        ? "bg-slate-50/70 border-slate-200/80 text-slate-800"
                        : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTopic(t)}
                        className={`h-4.5 w-4.5 rounded border mt-0.5 flex items-center justify-center transition-all ${
                          t.isDelivered
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 hover:border-slate-400 bg-white"
                        }`}
                      >
                        {t.isDelivered && <Check className="h-3 w-3" />}
                      </button>

                      <div className="space-y-0.5">
                        <span
                          className={`font-medium block ${
                            t.isDelivered ? "line-through text-slate-500" : "text-slate-900"
                          }`}
                        >
                          {t.title}
                        </span>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>Target: {t.estimatedHours} Hours</span>
                          {t.isDelivered && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-mono">
                                Delivered on {t.deliveredDate || "2026-09-14"}
                              </span>
                              {t.deliveredAtSessionId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">Session: {t.deliveredAtSessionId}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {t.isDelivered ? (
                        <Badge variant="success" size="sm" className="text-[10px]">
                          ✓ Verified
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {t.estimatedHours} hrs remaining
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <ScheduleExtraClassModal
        open={extraClassModalOpen}
        onOpenChange={setExtraClassModalOpen}
        onScheduled={loadData}
      />
    </div>
  );
}
