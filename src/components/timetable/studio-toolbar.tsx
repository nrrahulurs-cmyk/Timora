"use client";

import * as React from "react";
import {
  CalendarDays,
  Table as TableIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Layers,
  MapPin,
  GraduationCap,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Compute week range dates
  const weekDates = React.useMemo(() => {
    const baseMonday = new Date(2026, 9, 19); // Oct 19, 2026 (Fall Week 9)
    baseMonday.setDate(baseMonday.getDate() + filters.weekOffset * 7);
    const saturday = new Date(baseMonday);
    saturday.setDate(baseMonday.getDate() + 5);

    const mStr = baseMonday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const sStr = saturday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const weekNumber = 9 + filters.weekOffset;
    return `Week ${weekNumber}: ${mStr} – ${sStr}`;
  }, [filters.weekOffset]);

  // Active cohort label
  const activeCohortLabel = React.useMemo(() => {
    const activeSec = sections.find((s) => s.id === filters.sectionId);
    if (activeSec) {
      return `Cohort: ${activeSec.semester}th Sem (${activeSec.sectionCode})`;
    }
    if (filters.semester !== "all") {
      return `Cohort: Semester ${filters.semester}`;
    }
    return "All Cohorts";
  }, [sections, filters.sectionId, filters.semester]);

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

  return (
    <div className="space-y-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
      {/* ── Stitch Primary Row: Segmented Controls, Date Navigator, Cohort & Export ─ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Segmented Control + Week Stepper */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented View Switcher Pill */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-full text-xs font-medium">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "px-3.5 py-1 rounded-full transition-all duration-150",
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
                "px-3.5 py-1 rounded-full transition-all duration-150",
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Table
            </button>
          </div>

          {/* Date Navigator Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 rounded-full text-xs">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, weekOffset: filters.weekOffset - 1 })}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200/50 transition"
              title="Previous Week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-semibold text-slate-700 px-1.5 min-w-[150px] text-center tracking-tight">
              {weekDates}
            </span>

            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, weekOffset: filters.weekOffset + 1 })}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200/50 transition"
              title="Next Week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {filters.weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, weekOffset: 0 })}
                className="text-[10px] font-semibold text-[rgb(var(--color-primary))] px-1.5 py-0.2 bg-blue-50 border border-blue-200/60 rounded-full ml-0.5"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Right: Cohort Selector, Filter Toggle & Export Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cohort Selector Pill Dropdown */}
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
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[rgb(var(--color-primary))] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Stitch Export Button Pill */}
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

      {/* ── Secondary Row: Search & Advanced Filters (Expandable) ──────── */}
      {showAdvanced && (
        <div className="pt-2.5 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 items-center">
          {/* Quick Search */}
          <div className="relative md:col-span-2">
            <Input
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
              placeholder="Search by code, title, room or instructor..."
              leftIcon={<Search className="h-3.5 w-3.5 text-slate-400" />}
              className="h-8.5 text-xs bg-slate-50/70 border-slate-200"
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: "" })}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
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
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
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
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
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
              className="h-8.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            >
              <option value="all">All Sessions</option>
              <option value="conflicted">⚠️ Conflicted Sessions Only</option>
              <option value="clean">✓ Conflict-Free Only</option>
            </select>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs text-slate-500 hover:text-slate-800 px-2 shrink-0"
                title="Reset all filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results Filter Summary pill */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <div className="flex items-center gap-2">
          <span>Showing <strong className="text-slate-700 font-semibold">{totalFilteredCount}</strong> sessions</span>
          {activeFilterCount > 0 && (
            <Badge variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-600 font-normal">
              Active Filters: {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-slate-400 hidden sm:block">
          Click any class card to inspect room equipment, faculty availability, and resolution options.
        </div>
      </div>
    </div>
  );
}
