"use client";

import * as React from "react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Plus,
  Mail,
  Clock,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Lock,
  Star,
  SlidersHorizontal,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { FacultyAvailabilityDrawer } from "@/components/faculty/faculty-availability-drawer";
import { FacultyCreateModal } from "@/components/faculty/faculty-create-modal";
import type { FacultyMember, Department, SynapseCollegeDataset } from "@/types/domain";
import Link from "next/link";

export default function FacultyPage() {
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [query, setQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");
  const [designationFilter, setDesignationFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [loadFilter, setLoadFilter] = React.useState<"all" | "high" | "balanced" | "light">("all");

  // Modals & Drawers
  const [selectedFaculty, setSelectedFaculty] = React.useState<FacultyMember | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await schedulingRepository.getDataset();
      setDataset(data);
    } catch (err) {
      console.error("Failed to load faculty dataset:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const facultyList = dataset?.faculty || [];
  const departments = dataset?.departments || [];
  const sessions = dataset?.timetableSessions || [];

  // Filtered Faculty
  const filteredFaculty = React.useMemo(() => {
    return facultyList.filter((fac) => {
      // Department
      if (deptFilter !== "all" && fac.departmentId !== deptFilter) return false;

      // Designation
      if (designationFilter !== "all" && fac.designation !== designationFilter) return false;

      // Status
      if (statusFilter !== "all" && fac.status !== statusFilter) return false;

      // Workload
      const facSessions = sessions.filter((s) => s.facultyId === fac.id && s.status !== "cancelled");
      const assignedHrs = facSessions.length * 1.5;
      const maxHrs = fac.maxCreditHours || 16;
      const ratio = assignedHrs / maxHrs;

      if (loadFilter === "high" && ratio < 0.8) return false;
      if (loadFilter === "balanced" && (ratio < 0.4 || ratio >= 0.8)) return false;
      if (loadFilter === "light" && ratio >= 0.4) return false;

      // Search Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const specs = fac.specializations.join(" ").toLowerCase();
        return (
          fac.name.toLowerCase().includes(q) ||
          fac.email.toLowerCase().includes(q) ||
          fac.employeeCode.toLowerCase().includes(q) ||
          fac.departmentId.toLowerCase().includes(q) ||
          specs.includes(q)
        );
      }

      return true;
    });
  }, [facultyList, sessions, deptFilter, designationFilter, statusFilter, loadFilter, query]);

  // Derived Metrics
  const totalFaculty = facultyList.length;
  const activeSessions = sessions.filter((s) => s.status !== "cancelled");
  const totalTeachingHours = activeSessions.length * 1.5;
  const avgLoad = (totalTeachingHours / Math.max(1, totalFaculty)).toFixed(1);
  const facultyWithBlocks = facultyList.filter((f) =>
    f.availability.some((p) => p.blockedSlotIds.length > 0)
  ).length;

  const hasActiveFilters =
    query.trim() !== "" ||
    deptFilter !== "all" ||
    designationFilter !== "all" ||
    statusFilter !== "all" ||
    loadFilter !== "all";

  const resetFilters = () => {
    setQuery("");
    setDeptFilter("all");
    setDesignationFilter("all");
    setStatusFilter("all");
    setLoadFilter("all");
  };

  const handleOpenAvailability = (fac: FacultyMember) => {
    setSelectedFaculty(fac);
    setDrawerOpen(true);
  };

  const handleFacultyUpdated = (updated: FacultyMember) => {
    setDataset((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        faculty: prev.faculty.map((f) => (f.id === updated.id ? updated : f)),
      };
    });
    if (selectedFaculty?.id === updated.id) {
      setSelectedFaculty(updated);
    }
  };

  const handleFacultyCreated = (newFaculty: FacultyMember) => {
    setDataset((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        faculty: [newFaculty, ...prev.faculty],
      };
    });
    setSelectedFaculty(newFaculty);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      <WorkspaceHeader
        section="Faculty & Staff"
        title="Faculty & Availability Operations"
        badge={
          <Badge variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs font-semibold">
            {totalFaculty} Appointed Instructors
          </Badge>
        }
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Appoint Faculty</span>
          </Button>
        }
      />

      {/* KPI Metric Summary Row (Restrained Apple/OpenAI Minimalism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-indigo-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {totalFaculty}
            </span>
            <div className="w-8 h-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Appointed Faculty
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-700 text-xs font-semibold mt-1 border border-slate-200/60 shadow-2xs">
              <span>Professors, Readers & Lecturers</span>
            </div>
          </div>
        </Card>

        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-emerald-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-emerald-600 tracking-tight font-sans">
              {avgLoad}h
            </span>
            <div className="w-8 h-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Average Workload
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 text-xs font-semibold mt-1 border border-emerald-200/50 shadow-2xs">
              <span>Balanced academic loading</span>
            </div>
          </div>
        </Card>

        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-amber-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-amber-600 tracking-tight font-sans">
              {departments.length}
            </span>
            <div className="w-8 h-8 rounded-2xl border border-amber-100 bg-amber-50/50 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Academic Divisions
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50/80 text-amber-700 text-xs font-semibold mt-1 border border-amber-200/60 shadow-2xs">
              <span>CS, ECE, Bio & Applied Math</span>
            </div>
          </div>
        </Card>

        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-purple-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-purple-600 tracking-tight font-sans">
              {facultyWithBlocks}
            </span>
            <div className="w-8 h-8 rounded-2xl border border-purple-100 bg-purple-50/50 flex items-center justify-center text-purple-600 shrink-0 shadow-2xs">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Institutional Duty Blocks
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50/80 text-purple-700 text-xs font-semibold mt-1 border border-purple-200/60 shadow-2xs">
              <span>Senate, Clinical & Research</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
            <Input
              placeholder="Search by instructor name, code, or specialization..."
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-slate-50 text-xs h-9 rounded-full border-slate-200/80 shadow-2xs px-4"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Designation Selector */}
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              aria-label="Filter by academic designation"
              className="h-8 rounded-full border border-slate-200/80 bg-slate-50 text-xs font-semibold text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="all">All Designations</option>
              <option value="Professor">Professors</option>
              <option value="Associate Professor">Associate Professors</option>
              <option value="Assistant Professor">Assistant Professors</option>
              <option value="Adjunct Lecturer">Adjunct Lecturers</option>
            </select>

            {/* Workload Status Selector */}
            <select
              value={loadFilter}
              onChange={(e) => setLoadFilter(e.target.value as any)}
              aria-label="Filter by teaching workload"
              className="h-8 rounded-full border border-slate-200/80 bg-slate-50 text-xs font-semibold text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="all">All Workload Bands</option>
              <option value="high">Heavy Load (&gt;80%)</option>
              <option value="balanced">Balanced Load (40–80%)</option>
              <option value="light">Light Load (&lt;40%)</option>
            </select>
          </div>
        </div>

        {/* Department Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={() => setDeptFilter("all")}
            className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer text-xs ${
              deptFilter === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Divisions
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setDeptFilter(dept.id)}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer text-xs ${
                deptFilter === dept.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {dept.name}
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 ml-auto cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredFaculty.length}</strong> of <strong>{totalFaculty}</strong> appointed faculty
        </span>
        {hasActiveFilters && (
          <span className="text-slate-400">Filtered view active</span>
        )}
      </div>

      {/* Faculty Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          Loading faculty registry...
        </div>
      ) : filteredFaculty.length === 0 ? (
        <Card className="p-12 text-center bg-white border-slate-200/80 shadow-xs rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No instructors match your active criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, clearing department filters, or selecting a different designation.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="text-xs rounded-full px-4 font-semibold"
          >
            Reset All Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFaculty.map((fac) => {
            const facSessions = sessions.filter(
              (s) => s.facultyId === fac.id && s.status !== "cancelled"
            );
            const totalHours = facSessions.length * 1.5;
            const maxHours = fac.maxCreditHours || 16;
            const dept = departments.find((d) => d.id === fac.departmentId);

            const blockedCount = fac.availability.reduce(
              (acc, p) => acc + p.blockedSlotIds.length,
              0
            );
            const preferredCount = fac.availability.reduce(
              (acc, p) => acc + p.preferredSlotIds.length,
              0
            );

            return (
              <div
                key={fac.id}
                className="p-5 rounded-3xl bg-gradient-to-br from-white/95 via-slate-50/40 to-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between space-y-4 group cursor-pointer"
                onClick={() => handleOpenAvailability(fac)}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#5B4DF5] font-bold text-sm flex items-center justify-center shrink-0 border border-[#E1DEFF] shadow-2xs">
                        {fac.name
                          .replace("Dr. ", "")
                          .replace("Prof. ", "")
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#5B4DF5] transition-colors">
                          {fac.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {fac.designation} • {dept?.code || fac.departmentId}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" size="sm" className="rounded-full text-xs bg-slate-50 text-slate-700 border-slate-200 font-mono">
                      {fac.employeeCode}
                    </Badge>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-500 bg-white/70 p-3 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-700 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{fac.email}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="text-slate-400">Availability:</span>
                      <span className="font-semibold text-slate-700">
                        {fac.availability.length} active days
                        {blockedCount > 0 && ` • ${blockedCount} blocked`}
                      </span>
                    </div>
                  </div>

                  {/* Specialization Tags */}
                  {fac.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {fac.specializations.slice(0, 3).map((spec) => (
                        <span
                          key={spec}
                          className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Workload Progress Bar */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 text-xs">Teaching Workload</span>
                      <span className="font-semibold text-slate-800 text-xs font-mono">
                        {totalHours} / {maxHours} hrs/wk
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          totalHours >= maxHours
                            ? "bg-rose-500"
                            : totalHours >= maxHours * 0.8
                            ? "bg-amber-400"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, (totalHours / maxHours) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">
                    {facSessions.length} weekly sessions
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAvailability(fac);
                    }}
                    className="text-xs h-7.5 px-3.5 rounded-full shadow-2xs font-semibold group-hover:bg-slate-900 group-hover:text-white transition-all cursor-pointer"
                  >
                    <span>Manage Availability</span>
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Faculty Availability Drawer */}
      <FacultyAvailabilityDrawer
        faculty={selectedFaculty}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAvailabilityUpdated={handleFacultyUpdated}
      />

      {/* Appoint Faculty Modal */}
      <FacultyCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        departments={departments}
        onFacultyCreated={handleFacultyCreated}
      />
    </div>
  );
}
