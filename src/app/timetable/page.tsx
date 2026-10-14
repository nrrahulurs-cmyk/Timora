"use client";

import * as React from "react";
import { ChevronRight, GraduationCap, Building, Layers } from "lucide-react";
import { useToast } from "@/components/feedback/use-toast";
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
import type { EnrichedSession } from "@/components/timetable/class-card";
import {
  buildExportRows,
  generateTimetableCsv,
  generateTimetableExcel,
  generateTimetablePdf,
  downloadFile,
  type ExportMetadata,
} from "@/lib/export/timetable-export-service";

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

  // Primary dataset loaded from repository
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset>(SYNAPSE_SEED_DATA);
  const [loading, setLoading] = React.useState(false);
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

  // Staged moves & undo history (Never present uncommitted change as established assignment)
  const [stagedMoves, setStagedMoves] = React.useState<Record<string, StagedMove>>({});
  const [undoStack, setUndoStack] = React.useState<string[]>([]);

  // Interactive panels & modals
  const [selectedSession, setSelectedSession] = React.useState<EnrichedSession | null>(null);
  const [movingSession, setMovingSession] = React.useState<EnrichedSession | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  // Load latest dataset from repository
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await schedulingRepository.getDataset();
      setDataset(data);
    } catch (err) {
      console.error("Failed to load scheduling dataset:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute enriched sessions with staged moves, foreign keys, and conflict linkages
  const allEnrichedSessions: EnrichedSession[] = React.useMemo(() => {
    return dataset.timetableSessions.map((session) => {
      const staged = stagedMoves[session.id];
      const effectiveSession: TimetableSession = staged
        ? {
            ...session,
            timeSlotId: staged.timeSlotId,
            classroomId: staged.classroomId || session.classroomId,
            facultyId: staged.facultyId || session.facultyId,
          }
        : session;

      const subject = dataset.subjects.find((s) => s.id === session.subjectId);
      const classroom = dataset.classrooms.find((c) => c.id === effectiveSession.classroomId);
      const faculty = dataset.faculty.find((f) => f.id === effectiveSession.facultyId);
      const section = dataset.sections.find((s) => s.id === session.sectionId);

      // Link to known conflict records
      const conflict = dataset.conflicts.find(
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
  }, [dataset, stagedMoves]);

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
    return dataset.conflicts.filter((c) => c.status === "active");
  }, [dataset.conflicts]);

  // ── Staged Editing Handlers ───────────────────────────────────────────────

  const handleStageMove = (sessionId: string, targetTimeSlotId: string, targetClassroomId?: string) => {
    const session = dataset.timetableSessions.find((s) => s.id === sessionId);
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
      // Apply staged moves into the dataset clone
      const updatedSessions = dataset.timetableSessions.map((s) => {
        const staged = stagedMoves[s.id];
        if (!staged) return s;
        return {
          ...s,
          timeSlotId: staged.timeSlotId,
          classroomId: staged.classroomId || s.classroomId,
        };
      });

      // Update dataset in state and repository
      const updatedDataset: SynapseCollegeDataset = {
        ...dataset,
        timetableSessions: updatedSessions,
      };

      setDataset(updatedDataset);
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
        description: "An unexpected error occurred while saving timetable changes.",
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

  const handlePublishConfirm = () => {
    toast({
      title: "Schedule v2.4 Published Live",
      description: "Fall 2026 timetable locked and broadcast to student & faculty portals.",
      variant: "success",
    });
  };

  // Weekly timetable download handler for PDF, CSV, and Excel (.xlsx)
  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    setIsExporting(true);
    try {
      const activeDept = dataset.departments.find((d) => d.id === filters.departmentId);
      const activeSec = dataset.sections.find((s) => s.id === filters.sectionId);
      const weekNumber = 9 + filters.weekOffset;
      const weekLabel = `Week ${weekNumber}`;

      const metadata: ExportMetadata = {
        institutionName: "Timora Institute of Technology",
        academicTerm: "Fall 2026 (Odd Semester)",
        weekLabel: `Week ${weekNumber} (Oct 19 – Oct 24, 2026)`,
        departmentName: activeDept?.name,
        sectionCode: activeSec?.sectionCode,
        generatedAt: new Date().toLocaleString(),
        generatedBy: "Dr. Eleanor Vance",
        isDraft: true,
        version: "v2.4-preview",
      };

      const exportRows = buildExportRows(
        filteredSessions.map((f) => f.session),
        dataset.subjects,
        dataset.classrooms,
        dataset.faculty,
        dataset.sections,
        dataset.timeSlots,
        dataset.conflicts
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

  const selectedDepartment = dataset.departments.find((d) => d.id === filters.departmentId);
  const selectedSection = dataset.sections.find((s) => s.id === filters.sectionId);

  return (
    <div className="space-y-4 pb-14">
      {/* ── Hierarchical Academic Breadcrumb Navigation (Reference Composition) ─── */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-1 font-semibold text-slate-800">
          <Building className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
          <span>Faculty of Engineering</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <div className="flex items-center gap-1 font-medium text-slate-700">
          <span>{selectedDepartment?.name || "All Engineering Depts"}</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <div className="flex items-center gap-1 text-slate-500">
          <span>Fall 2026 (Odd Sem)</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <div className="flex items-center gap-1 font-medium text-slate-700">
          <span>{filters.semester !== "all" ? `Semester ${filters.semester}` : "All Semesters"}</span>
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        <div className="flex items-center gap-1 font-bold text-[rgb(var(--color-primary))] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
          <GraduationCap className="h-3 w-3 text-[rgb(var(--color-primary))]" />
          <span>{selectedSection ? `${selectedSection.sectionCode} (${selectedSection.name})` : "All Cohort Sections"}</span>
        </div>
      </div>

      {/* ── Studio Header: Title, Versions, Clashes, Grouped Actions ──────── */}
      <StudioHeader
        scheduleVersion="v2.4-preview"
        isDraft={true}
        conflictCount={activeConflicts.length}
        stagedChangesCount={Object.keys(stagedMoves).length}
        onUndo={handleUndo}
        onSave={handleSave}
        onPublish={() => setPublishDialogOpen(true)}
        onReset={handleReset}
        isSaving={isSaving}
      />

      {/* ── Studio Toolbar: Filters, Week Navigator & View Switch ────────── */}
      <StudioToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFilterChange={setFilters}
        departments={dataset.departments}
        sections={dataset.sections}
        classrooms={dataset.classrooms}
        faculty={dataset.faculty}
        totalFilteredCount={filteredSessions.length}
        onExport={handleExport}
        onOpenExport={() => setExportDialogOpen(true)}
        isExporting={isExporting}
      />

      {/* ── Main View Area: Grid View or Table View ──────────────────────── */}
      {viewMode === "grid" ? (
        <GridView
          timeSlots={dataset.timeSlots}
          sessions={filteredSessions}
          selectedSessionId={selectedSession?.session.id}
          onSelectSession={(enr) => setSelectedSession(enr)}
          onMoveSession={(enr) => setMovingSession(enr)}
          onEmptySlotClick={(day, slotIndex) => {
            toast({
              title: "Open Time Slot",
              description: `Slot ${slotIndex} on ${day} is vacant. Use 'Add Section' to assign a class.`,
              variant: "info",
            });
          }}
          includeSaturday={true}
        />
      ) : (
        <TableView
          sessions={filteredSessions}
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
            ? `Cohort: ${dataset.sections.find((s) => s.id === filters.sectionId)?.semester || 5}th Sem (${
                dataset.sections.find((s) => s.id === filters.sectionId)?.sectionCode || "Sec-B"
              })`
            : "All Cohorts"
        }
        weekLabel={`Week ${9 + filters.weekOffset} (Oct 19 – Oct 24, 2026)`}
        isExporting={isExporting}
      />
    </div>
  );
}
