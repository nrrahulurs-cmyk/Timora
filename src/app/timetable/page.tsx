"use client";

import * as React from "react";
import { ChevronRight, GraduationCap, Building, Layers } from "lucide-react";
import { useToast } from "@/components/feedback/use-toast";
import { Button } from "@/components/ui/button";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import type {
  SynapseCollegeDataset,
  TimetableSession,
  ConflictRecord,
  DayOfWeek,
} from "@/types/domain";

import { StudioHeader } from "@/components/timetable/studio-header";
import { StudioToolbar, type StudioFilters } from "@/components/timetable/studio-toolbar";
import { GridView } from "@/components/timetable/grid-view";
import { TableView } from "@/components/timetable/table-view";
import { SessionDetailSheet } from "@/components/timetable/session-detail-sheet";
import { MoveSessionModal } from "@/components/timetable/move-session-modal";
import { PublishDialog } from "@/components/timetable/publish-dialog";
import { ExportDialog } from "@/components/timetable/export-dialog";
import { ScheduleExtraClassModal } from "@/components/dashboard/modals/schedule-extra-class-modal";
import type { EnrichedSession } from "@/components/timetable/class-card";
import {
  buildExportRows,
  generateTimetableCsv,
  generateTimetableExcel,
  generateTimetablePdf,
  downloadFile,
  type ExportMetadata,
} from "@/lib/export/timetable-export-service";
import { getCurrentAcademicWeekOffset, getWeekScheduleDetails } from "@/lib/utils/date-utils";
import { allocation } from "@/lib/scheduling/plan";
import { useAuth } from "@/lib/auth/auth-context";
import { ImportDialog } from "@/components/timetable/import-dialog";

interface StagedMove {
  sessionId: string;
  timeSlotId: string;
  classroomId?: string;
  facultyId?: string;
  originalTimeSlotId: string;
  originalClassroomId: string;
}

export default function TimetableStudioPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Primary dataset loaded from repository
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset | null>(null);
  const activeDataset = dataset ?? SYNAPSE_SEED_DATA;
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // View state: Grid vs Table
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");

  // Filtering state
  const [filters, setFilters] = React.useState<StudioFilters>({
    departmentId: "all",
    semester: "all",
    sectionId: "all",
    classroomId: "all",
    facultyId: "all",
    conflictStatus: "all",
    subjectType: "all",
    searchQuery: "",
    weekOffset: 0,
  });
  const [today, setToday] = React.useState<Date | null>(null);

  // Staged moves & undo history (Never present uncommitted change as established assignment)
  const [stagedMoves, setStagedMoves] = React.useState<Record<string, StagedMove>>({});
  const [undoStack, setUndoStack] = React.useState<string[]>([]);

  // Interactive panels & modals
  const [selectedSession, setSelectedSession] = React.useState<EnrichedSession | null>(null);
  const [movingSession, setMovingSession] = React.useState<EnrichedSession | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [newSessionOpen, setNewSessionOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  // Load latest dataset from repository
  const loadData = React.useCallback(async () => {
    try {
      setLoadError(null);
      const data = await schedulingRepository.getDataset();
      setDataset(data);
    } catch (err) {
      console.error("Failed to load scheduling dataset:", err);
      setLoadError("Timetable data could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const currentDate = new Date();
    setToday(currentDate);
    setFilters((current) => ({ ...current, weekOffset: getCurrentAcademicWeekOffset(currentDate) }));
  }, []);

  React.useEffect(() => {
    loadData();
    const reload = () => { void loadData(); };
    window.addEventListener("timora:data-changed", reload);
    return () => window.removeEventListener("timora:data-changed", reload);
  }, [loadData]);

  // Compute enriched sessions with staged moves, foreign keys, and conflict linkages
  const allEnrichedSessions: EnrichedSession[] = React.useMemo(() => {
    return activeDataset.timetableSessions.map((session) => {
      const staged = stagedMoves[session.id];
      const effectiveSession: TimetableSession = staged
        ? {
            ...session,
            timeSlotId: staged.timeSlotId,
            classroomId: staged.classroomId || session.classroomId,
            facultyId: staged.facultyId || session.facultyId,
          }
        : session;

      const subject = activeDataset.subjects.find((s) => s.id === session.subjectId);
      const classroom = activeDataset.classrooms.find((c) => c.id === effectiveSession.classroomId);
      const faculty = activeDataset.faculty.find((f) => f.id === effectiveSession.facultyId);
      const section = activeDataset.sections.find((s) => s.id === session.sectionId);

      // Link to known conflict records
      const conflict = activeDataset.conflicts.find(
        (c) =>
          c.status === "active" &&
          (c.sessionIds.includes(session.id) ||
            (c.classroomId === effectiveSession.classroomId &&
              c.timeSlotId === effectiveSession.timeSlotId &&
              !staged))
      );

      return {
        session: effectiveSession,
        subject,
        classroom,
        faculty,
        section,
        conflict,
        isStaged: Boolean(staged),
        stagedNote: staged
          ? `Moved from ${staged.originalTimeSlotId.replace("SLOT-", "")}`
          : undefined,
      };
    });
  }, [activeDataset, stagedMoves]);

  // Filter enriched sessions
  const filteredSessions = React.useMemo(() => {
    return allEnrichedSessions.filter((enr) => {
      const { session, subject, classroom, faculty, section, conflict } = enr;

      // Department filter
      if (filters.departmentId !== "all" && subject?.departmentId !== filters.departmentId) {
        return false;
      }

      // Semester filter
      if (filters.semester !== "all" && section?.semester !== parseInt(filters.semester, 10)) {
        return false;
      }

      // Section filter
      if (filters.sectionId !== "all" && section?.id !== filters.sectionId) {
        return false;
      }

      // Classroom filter
      if (filters.classroomId !== "all" && classroom?.id !== filters.classroomId) {
        return false;
      }

      // Faculty filter
      if (filters.facultyId !== "all" && faculty?.id !== filters.facultyId) {
        return false;
      }

      // Conflict status filter
      const isConflicted = Boolean(conflict && conflict.status === "active");
      if (filters.conflictStatus === "conflicted" && !isConflicted) return false;
      if (filters.conflictStatus === "clean" && isConflicted) return false;

      // Subject Type filter
      if (filters.subjectType !== "all" && subject?.type !== filters.subjectType) {
        return false;
      }

      // Quick Search Query (matches code, title, instructor, room)
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchesCode = subject?.code.toLowerCase().includes(q);
        const matchesTitle = subject?.title.toLowerCase().includes(q);
        const matchesRoom = classroom?.code.toLowerCase().includes(q);
        const matchesFaculty = faculty?.name.toLowerCase().includes(q);
        const matchesSection = section?.sectionCode.toLowerCase().includes(q);
        if (!matchesCode && !matchesTitle && !matchesRoom && !matchesFaculty && !matchesSection) {
          return false;
        }
      }

      return true;
    });
  }, [allEnrichedSessions, filters]);

  // Active conflicts count
  const activeConflicts = React.useMemo(() => {
    return activeDataset.conflicts.filter((c) => c.status === "active");
  }, [activeDataset.conflicts]);

  // ── Staged Editing Handlers ───────────────────────────────────────────────

  const handleStageMove = (sessionId: string, targetTimeSlotId: string, targetClassroomId?: string) => {
    const session = activeDataset.timetableSessions.find((s) => s.id === sessionId);
    if (!session) return;

    setStagedMoves((prev) => ({
      ...prev,
      [sessionId]: {
        sessionId,
        timeSlotId: targetTimeSlotId,
        classroomId: targetClassroomId,
        originalTimeSlotId: session.timeSlotId,
        originalClassroomId: session.classroomId,
      },
    }));

    setUndoStack((prev) => [...prev, sessionId]);

    toast({
      title: "Schedule Reassignment Staged",
      description: "Movement is staged in preview. Click 'Save Changes' to permanently apply.",
      variant: "info",
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastSessionId = undoStack[undoStack.length - 1];

    setStagedMoves((prev) => {
      const next = { ...prev };
      delete next[lastSessionId];
      return next;
    });

    setUndoStack((prev) => prev.slice(0, -1));

    toast({
      title: "Reassignment Undone",
      description: "Session restored to its previous schedule position.",
      variant: "default",
    });
  };

  const handleReset = () => {
    setStagedMoves({});
    setUndoStack([]);
    toast({
      title: "Staged Changes Discarded",
      description: "All uncommitted timetable movements have been reset.",
      variant: "warning",
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await schedulingRepository.saveTimetableChanges({
        reason: "Saved reviewed changes in Timetable Studio", inserts: [],
        updates: Object.values(stagedMoves).map((move) => {
          const session = activeDataset.timetableSessions.find((item) => item.id === move.sessionId)!;
          return { id: session.id, expected: allocation(session), changes: {
            timeSlotId: move.timeSlotId, classroomId: move.classroomId || session.classroomId,
            facultyId: move.facultyId || session.facultyId, status: "moved" as const,
          } };
        }),
      });
      if (!result.success) throw new Error(result.message);
      setDataset(await schedulingRepository.getDataset());
      setStagedMoves({});
      setUndoStack([]);

      toast({
        title: "Timetable Changes Saved",
        description: `Successfully committed ${Object.keys(stagedMoves).length} session reassignments.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Changes could not be saved. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Conflict 1-click alternative resolution handler
  const handleApplyAlternative = async (conflictId: string, solutionId: string) => {
    const res = await schedulingRepository.resolveConflict(conflictId, solutionId);
    if (res.success) {
      toast({
        title: "Conflict Resolved",
        description: res.message,
        variant: "success",
      });
      // Refresh dataset
      loadData();
    } else {
      toast({
        title: "Resolution Blocked",
        description: res.message,
        variant: "destructive",
      });
    }
  };

  const handlePublishConfirm = async () => {
    if (Object.keys(stagedMoves).length) throw new Error("Save or discard staged changes before publication.");
    const draft = activeDataset.scheduleVersions.find((version) => version.status === "draft");
    if (!draft) throw new Error("There is no draft version to publish.");
    const result = await schedulingRepository.publishScheduleVersion(draft.versionNumber, user?.fullName || "Institution member");
    if (!result.success) throw new Error(result.message);
    await loadData();
    toast({ title: "Schedule published", description: result.message, variant: "success" });
  };

  // Weekly timetable download handler for PDF, CSV, and Excel (.xlsx)
  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    setIsExporting(true);
    try {
      const activeDept = activeDataset.departments.find((d) => d.id === filters.departmentId);
      const activeSec = activeDataset.sections.find((s) => s.id === filters.sectionId);
      const weekInfo = getWeekScheduleDetails(filters.weekOffset, today || new Date());
      const weekLabel = `Week ${weekInfo.weekNumber}`;

      const metadata: ExportMetadata = {
        institutionName: "Timora Institute of Technology",
        academicTerm: "Fall 2026 (Odd Semester)",
        weekLabel: `Week ${weekInfo.weekNumber} (${weekInfo.formattedRange})`,
        departmentName: activeDept?.name,
        sectionCode: activeSec?.sectionCode,
        generatedAt: new Date().toLocaleString(),
        generatedBy: "Dr. Eleanor Vance",
        isDraft: true,
        version: "v2.4-preview",
      };

      const exportRows = buildExportRows(
        filteredSessions.map((f) => f.session),
        activeDataset.subjects,
        activeDataset.classrooms,
        activeDataset.faculty,
        activeDataset.sections,
        activeDataset.timeSlots,
        activeDataset.conflicts
      );

      const baseName = `Timora_Timetable_${weekLabel.replace(/\s+/g, "_")}${
        activeSec ? `_${activeSec.sectionCode}` : activeDept ? `_${activeDept.code}` : "_All"
      }`;

      if (format === "csv") {
        const csvContent = generateTimetableCsv(exportRows, metadata);
        downloadFile(csvContent, `${baseName}.csv`, "text/csv;charset=utf-8;");
        toast({
          title: "CSV Export Complete",
          description: `Exported ${exportRows.length} timetable records to ${baseName}.csv`,
          variant: "success",
        });
      } else if (format === "excel") {
        const excelBuffer = await generateTimetableExcel(exportRows, metadata);
        downloadFile(
          excelBuffer as any,
          `${baseName}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        toast({
          title: "Excel (.xlsx) Export Complete",
          description: `Generated multi-sheet formatted workbook ${baseName}.xlsx`,
          variant: "success",
        });
      } else if (format === "pdf") {
        const pdfBuffer = generateTimetablePdf(exportRows, metadata);
        downloadFile(pdfBuffer as any, `${baseName}.pdf`, "application/pdf");
        toast({
          title: "PDF Export Complete",
          description: `Print-ready landscape PDF ${baseName}.pdf downloaded.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      console.error("Export generation error:", err);
      toast({
        title: "Export Failed",
        description: err?.message || "Failed to generate timetable export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedDepartment = activeDataset.departments.find((d) => d.id === filters.departmentId);
  const selectedSection = activeDataset.sections.find((s) => s.id === filters.sectionId);

  if (loading) {
    return <div className="p-12 text-center text-sm text-slate-500" role="status">Loading timetable records…</div>;
  }

  if (loadError || !dataset) {
    return (
      <div className="m-4 rounded-2xl border border-rose-200 bg-white p-10 text-center" role="alert">
        <p className="text-sm font-semibold text-slate-900">Timetable unavailable</p>
        <p className="mt-1 text-xs text-slate-500">{loadError || "No timetable dataset was returned."}</p>
        <Button variant="outline" size="sm" onClick={loadData} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!today) {
    return <div className="p-12 text-center text-sm text-slate-500" role="status">Preparing the current academic week…</div>;
  }

  return (
    <div className="space-y-4 pb-14">
      {/* ── Studio Header: Title, Versions, Clashes, Grouped Actions ──────── */}
      <StudioHeader
        scheduleVersion={activeDataset.scheduleVersions.find(version => version.status === "draft")?.versionNumber || "No draft"}
        isDraft={activeDataset.scheduleVersions.some(version => version.status === "draft")}
        conflictCount={activeConflicts.length}
        stagedChangesCount={Object.keys(stagedMoves).length}
        onUndo={handleUndo}
        onSave={handleSave}
        onPublish={() => setPublishDialogOpen(true)}
        onReset={handleReset}
        onNewSession={() => setNewSessionOpen(true)}
        onImport={user && ["academic_admin", "dean", "timetable_coordinator"].includes(user.role) ? () => setImportOpen(true) : undefined}
        isSaving={isSaving}
      />

      {/* ── Studio Toolbar: Filters, Week Navigator & View Switch ────────── */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => void loadData()} />
      <StudioToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        today={today}
        onFilterChange={setFilters}
        departments={activeDataset.departments}
        sections={activeDataset.sections}
        classrooms={activeDataset.classrooms}
        faculty={activeDataset.faculty}
        totalFilteredCount={filteredSessions.length}
        onExport={handleExport}
        onOpenExport={() => setExportDialogOpen(true)}
        isExporting={isExporting}
      />

      {/* ── Main View Area: Grid View or Table View ──────────────────────── */}
      {viewMode === "grid" ? (
        <GridView
          timeSlots={activeDataset.timeSlots}
          sessions={filteredSessions}
          selectedSessionId={selectedSession?.session.id}
          onSelectSession={(enr) => setSelectedSession(enr)}
          onMoveSession={(enr) => setMovingSession(enr)}
          onEmptySlotClick={(day, slotIndex) => {
            toast({
              title: "Open Time Slot",
              description: `Slot ${slotIndex} on ${day} is vacant. You can schedule a new class here.`,
              variant: "info",
            });
            setNewSessionOpen(true);
          }}
          includeSaturday={true}
          weekOffset={filters.weekOffset}
          today={today}
        />
      ) : (
        <TableView
          sessions={filteredSessions}
          timeSlots={activeDataset.timeSlots}
          weekOffset={filters.weekOffset}
          onSelectSession={(enr) => setSelectedSession(enr)}
          onMoveSession={(enr) => setMovingSession(enr)}
          pageSize={10}
        />
      )}

      {/* ── Contextual Detail Slide-Over Sheet (Without Navigating Away) ──── */}
      <SessionDetailSheet
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        sessionData={selectedSession}
        dataset={dataset}
        onApplyAlternative={handleApplyAlternative}
        onStageMove={handleStageMove}
      />

      {/* ── Move & Reschedule Modal ───────────────────────────────────────── */}
      <MoveSessionModal
        isOpen={Boolean(movingSession)}
        onClose={() => setMovingSession(null)}
        sessionData={movingSession}
        dataset={dataset}
        onConfirmMove={handleStageMove}
      />

      {/* ── Pre-flight Publish Dialog ─────────────────────────────────────── */}
      <PublishDialog
        isOpen={publishDialogOpen}
        onClose={() => setPublishDialogOpen(false)}
        onConfirmPublish={handlePublishConfirm}
        versionNumber="v2.4-preview"
        activeConflicts={activeConflicts}
      />

      {/* ── Google Stitch Glassmorphic Export Dialog ──────────────────────── */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        cohortLabel={
          filters.sectionId !== "all"
            ? `Cohort: ${activeDataset.sections.find((s) => s.id === filters.sectionId)?.semester || 5}th Sem (${
                activeDataset.sections.find((s) => s.id === filters.sectionId)?.sectionCode || "Sec-B"
              })`
            : "All Cohorts"
        }
        weekLabel={`Week ${getWeekScheduleDetails(filters.weekOffset, today).weekNumber} (${getWeekScheduleDetails(filters.weekOffset, today).formattedRange})`}
        isExporting={isExporting}
      />

      {/* ── Schedule New Session Modal ─────────────────────────────────────── */}
      <ScheduleExtraClassModal
        open={newSessionOpen}
        onOpenChange={setNewSessionOpen}
        onScheduled={loadData}
      />
    </div>
  );
}
