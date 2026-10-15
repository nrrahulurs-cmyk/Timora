"use client";

import * as React from "react";
import {
  CalendarDays,
  Table as TableIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Layers,
  MapPin,
  GraduationCap,
  Download,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getWeekScheduleDetails } from "@/lib/utils/date-utils";
import type { Department, StudentSection, Classroom, FacultyMember } from "@/types/domain";

export interface StudioFilters {
  departmentId: string;
  semester: string;
  sectionId: string;
  classroomId: string;
  facultyId: string;
  conflictStatus: "all" | "conflicted" | "clean";
  subjectType: string;
  searchQuery: string;
  weekOffset: number; // 0 is current week
}

interface StudioToolbarProps {
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  filters: StudioFilters;
  onFilterChange: (filters: StudioFilters) => void;
  departments: Department[];
  sections: StudentSection[];
  classrooms: Classroom[];
  faculty: FacultyMember[];
  totalFilteredCount: number;
  onExport?: (format: "pdf" | "csv" | "excel") => void;
  onOpenExport?: () => void;
  isExporting?: boolean;
}

export function StudioToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  departments,
  sections,
  classrooms,
  faculty,
  totalFilteredCount,
  onExport,
  onOpenExport,
  isExporting = false,
}: StudioToolbarProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Compute accurate week range using dedicated date utility
  const weekDetails = React.useMemo(() => {
    return getWeekScheduleDetails(filters.weekOffset);
  }, [filters.weekOffset]);

  // Filter sections by department/semester
  const availableSections = React.useMemo(() => {
    return sections.filter((s) => {
      if (filters.departmentId !== "all" && s.departmentId !== filters.departmentId) return false;
      if (filters.semester !== "all" && s.semester !== parseInt(filters.semester, 10)) return false;
      return true;
    });
  }, [sections, filters.departmentId, filters.semester]);

  const activeFilterCount =
    (filters.departmentId !== "all" ? 1 : 0) +
    (filters.semester !== "all" ? 1 : 0) +
    (filters.sectionId !== "all" ? 1 : 0) +
    (filters.classroomId !== "all" ? 1 : 0) +
    (filters.facultyId !== "all" ? 1 : 0) +
    (filters.conflictStatus !== "all" ? 1 : 0) +
    (filters.subjectType !== "all" ? 1 : 0) +
    (filters.searchQuery ? 1 : 0);

  const resetFilters = () => {
    onFilterChange({
      ...filters,
      departmentId: "all",
      semester: "all",
      sectionId: "all",
      classroomId: "all",
      facultyId: "all",
      conflictStatus: "all",
      subjectType: "all",
      searchQuery: "",
    });
  };

  const selectedDepartment = departments.find((d) => d.id === filters.departmentId);
  const selectedSection = sections.find((s) => s.id === filters.sectionId);
  const selectedClassroom = classrooms.find((c) => c.id === filters.classroomId);
  const selectedFaculty = faculty.find((f) => f.id === filters.facultyId);

  return (
    <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs">
      {/* ── Primary Row: View Switch, Week Nav, Quick Filters, Filter Toggle & Export ─ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Toggle & Week Stepper */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-full text-xs font-medium">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "px-3.5 py-1 rounded-full transition-all duration-150 cursor-pointer",
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={cn(
                "px-3.5 py-1 rounded-full transition-all duration-150 cursor-pointer",
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Table
            </button>
          </div>

          {/* Week Date Navigator Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 rounded-full text-xs">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, weekOffset: filters.weekOffset - 1 })}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200/50 transition cursor-pointer"
              title="Previous Week"
              aria-label="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-semibold text-slate-800 px-1.5 min-w-[170px] text-center tracking-tight select-none">
              Week {weekDetails.weekNumber}: {weekDetails.formattedRange}
            </span>

            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, weekOffset: filters.weekOffset + 1 })}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200/50 transition cursor-pointer"
              title="Next Week"
              aria-label="Next Week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {filters.weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, weekOffset: 0 })}
                className="text-[10px] font-semibold text-[rgb(var(--color-primary))] px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-full ml-1 transition cursor-pointer"
                title="Return to current week"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Right: Primary Quick Selects, Filter Button & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cohort Selector Dropdown */}
          <div className="relative">
            <select
              value={filters.sectionId}
              onChange={(e) => onFilterChange({ ...filters, sectionId: e.target.value })}
              className="h-8.5 rounded-full border border-slate-200/80 bg-white pl-3.5 pr-8 py-1 text-xs text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="all">Cohort: All Sections</option>
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  Cohort: {s.semester}th Sem ({s.sectionCode})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Department Quick Filter */}
          <div className="relative hidden sm:block">
            <select
              value={filters.departmentId}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  departmentId: e.target.value,
                  sectionId: "all",
                })
              }
              className="h-8.5 rounded-full border border-slate-200/80 bg-white pl-3.5 pr-8 py-1 text-xs text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer shadow-2xs"
            >
              <option value="all">Dept: All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  Dept: {d.code}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Advanced Filter Toggle Pill */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 border text-xs font-medium rounded-full cursor-pointer transition shadow-2xs",
              showAdvanced || activeFilterCount > 0
                ? "bg-blue-50 border-blue-200 text-[rgb(var(--color-primary))] font-semibold"
                : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[rgb(var(--color-primary))] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export Button */}
          <button
            type="button"
            id="timetable-export-button"
            disabled={isExporting}
            onClick={() => {
              if (onOpenExport) {
                onOpenExport();
              } else if (onExport) {
                onExport("pdf");
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-700 text-xs font-medium rounded-full cursor-pointer transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isExporting ? "Generating..." : "Export"}</span>
          </button>
        </div>
      </div>

      {/* ── Collapsible Filter Panel ───────────────────────────────────── */}
      {showAdvanced && (
        <div className="pt-3 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2.5 items-center bg-slate-50/50 p-3 rounded-2xl">
          {/* Quick Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Input
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Search code, title, room or instructor..."
              leftIcon={<Search className="h-3.5 w-3.5 text-slate-400" />}
              className="h-8.5 text-xs bg-white border-slate-200"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Room Filter */}
          <div>
            <select
              value={filters.classroomId}
              onChange={(e) => onFilterChange({ ...filters, classroomId: e.target.value })}
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">All Classrooms ({classrooms.length})</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.capacity} seats • {c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Filter */}
          <div>
            <select
              value={filters.facultyId}
              onChange={(e) => onFilterChange({ ...filters, facultyId: e.target.value })}
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">All Faculty ({faculty.length})</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.designation})
                </option>
              ))}
            </select>
          </div>

          {/* Conflict Status Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={filters.conflictStatus}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  conflictStatus: e.target.value as "all" | "conflicted" | "clean",
                })
              }
              className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="conflicted">⚠️ Conflicted Only</option>
              <option value="clean">✓ Conflict-Free Only</option>
            </select>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8.5 text-xs text-slate-500 hover:text-slate-800 px-2 shrink-0 rounded-lg hover:bg-slate-200/50"
                title="Reset all filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Active Filters Chips Bar ──────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Active filters:</span>

          {filters.departmentId !== "all" && selectedDepartment && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60">
              Dept: {selectedDepartment.code}
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, departmentId: "all" })}
                className="hover:text-blue-950"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.sectionId !== "all" && selectedSection && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200/60">
              Cohort: {selectedSection.sectionCode}
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, sectionId: "all" })}
                className="hover:text-indigo-950"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.classroomId !== "all" && selectedClassroom && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              Room: {selectedClassroom.code}
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, classroomId: "all" })}
                className="hover:text-emerald-950"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.facultyId !== "all" && selectedFaculty && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200/60">
              Faculty: {selectedFaculty.name}
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, facultyId: "all" })}
                className="hover:text-purple-950"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.conflictStatus !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200/60">
              {filters.conflictStatus === "conflicted" ? "⚠️ Conflicted Only" : "✓ Clean Only"}
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, conflictStatus: "all" })}
                className="hover:text-rose-950"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
              &ldquo;{filters.searchQuery}&rdquo;
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
                className="hover:text-slate-950"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Summary & Helper Text ────────────────────────────────────── */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-800 font-semibold">{totalFilteredCount}</strong>{" "}
            scheduled sessions
          </span>
        </div>
        <div className="text-[11px] text-slate-400 hidden md:block">
          Click any session card to inspect details, validate constraints, and reschedule.
        </div>
      </div>
    </div>
  );
}
