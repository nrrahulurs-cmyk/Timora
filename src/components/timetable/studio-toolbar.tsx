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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-3 bg-white p-3.5 rounded-lg border border-[rgb(var(--color-border-default))] shadow-xs">
      {/* ── Primary Row: Context Selectors, Week Navigator & View Switch ─ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Department, Semester, Section select controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Select */}
          <div className="relative">
            <select
              value={filters.departmentId}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  departmentId: e.target.value,
                  sectionId: "all", // reset section when department changes
                });
              }}
              className="h-8.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))]"
              aria-label="Filter by department"
            >
              <option value="all">All Departments (4)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Semester Select */}
          <div className="relative">
            <select
              value={filters.semester}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  semester: e.target.value,
                  sectionId: "all",
                });
              }}
              className="h-8.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))]"
              aria-label="Filter by semester"
            >
              <option value="all">All Semesters</option>
              <option value="3">Semester 3</option>
              <option value="5">Semester 5</option>
              <option value="7">Semester 7</option>
            </select>
          </div>

          {/* Section Select */}
          <div className="relative">
            <select
              value={filters.sectionId}
              onChange={(e) => onFilterChange({ ...filters, sectionId: e.target.value })}
              className="h-8.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))]"
              aria-label="Filter by student section"
            >
              <option value="all">All Sections ({availableSections.length})</option>
              {availableSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sectionCode} • {s.name} ({s.studentCount} stds)
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Advanced Filters Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`h-8.5 text-xs gap-1.5 px-2.5 ${
              showAdvanced || activeFilterCount > 0
                ? "bg-blue-50 text-[rgb(var(--color-primary))] font-semibold"
                : "text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[rgb(var(--color-primary))] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Center: Week & Date Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-200/80">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onFilterChange({ ...filters, weekOffset: filters.weekOffset - 1 })}
            className="h-7 w-7 text-slate-600 hover:bg-white hover:text-slate-900"
            title="Previous Week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs font-semibold text-slate-800 px-2 tracking-tight min-w-[170px] text-center">
            {weekDates}
          </span>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onFilterChange({ ...filters, weekOffset: filters.weekOffset + 1 })}
            className="h-7 w-7 text-slate-600 hover:bg-white hover:text-slate-900"
            title="Next Week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {filters.weekOffset !== 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFilterChange({ ...filters, weekOffset: 0 })}
              className="h-7 text-[10px] px-1.5 py-0 bg-white border-slate-200 text-slate-600 ml-1"
            >
              Current
            </Button>
          )}
        </div>

        {/* Right: View Switch (Grid / Table) */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className={`h-7.5 px-3 text-xs gap-1.5 rounded-md ${
              viewMode === "grid"
                ? "bg-white text-[rgb(var(--color-primary))] shadow-xs font-semibold hover:bg-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Grid View</span>
          </Button>

          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("table")}
            className={`h-7.5 px-3 text-xs gap-1.5 rounded-md ${
              viewMode === "table"
                ? "bg-white text-[rgb(var(--color-primary))] shadow-xs font-semibold hover:bg-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Table View</span>
          </Button>
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
