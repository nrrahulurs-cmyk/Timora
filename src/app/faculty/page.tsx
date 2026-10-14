"use client";

import * as React from "react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Plus,
  Mail,
  MapPin,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";
import type { FacultyMember, SynapseCollegeDataset } from "@/types/domain";
import Link from "next/link";

export default function FacultyPage() {
  const [dataset, setDataset] = React.useState<SynapseCollegeDataset>(SYNAPSE_SEED_DATA);
  const [query, setQuery] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("all");

  React.useEffect(() => {
    schedulingRepository
      .getDataset()
      .then((data) => {
        if (data && data.faculty.length > 0) {
          setDataset(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load faculty:", err);
      });
  }, []);

  const filteredFaculty = React.useMemo(() => {
    return dataset.faculty.filter((fac) => {
      if (deptFilter !== "all" && fac.departmentId !== deptFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        fac.name.toLowerCase().includes(q) ||
        fac.email.toLowerCase().includes(q) ||
        fac.departmentId.toLowerCase().includes(q)
      );
    });
  }, [dataset.faculty, deptFilter, query]);

  const totalTeachingHours = dataset.timetableSessions.reduce((acc, s) => {
    return s.status !== "cancelled" ? acc + 1.5 : acc;
  }, 0);

  const avgLoad = (totalTeachingHours / Math.max(1, dataset.faculty.length)).toFixed(1);

  return (
    <div className="space-y-6 pb-12">
      <WorkspaceHeader
        section="Faculty & Staff"
        title="Faculty & Staff Operations"
        badge={
          <Badge variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-600 rounded-full text-[11px] font-medium">
            {dataset.faculty.length} Active Instructors
          </Badge>
        }
        actions={
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Faculty</span>
          </Button>
        }
      />

      {/* ── KPI Metric Summary Row ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {dataset.faculty.length}
            </span>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Appointed Faculty
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-semibold mt-1 border border-slate-200/60 shadow-2xs">
              <span>Professors, Readers & Lecturers</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-emerald-600 tracking-tight font-sans">
              {avgLoad}h
            </span>
            <div className="w-7 h-7 rounded-full border border-emerald-200/80 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Average Workload
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold mt-1 border border-emerald-200/50 shadow-2xs">
              <span>Optimal load distribution</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-[#FF6B4A] tracking-tight font-sans">
              {dataset.departments.length}
            </span>
            <div className="w-7 h-7 rounded-full border border-orange-200/80 bg-orange-50 flex items-center justify-center text-[#FF6B4A] shrink-0">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Academic Divisions
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 text-[#FF6B4A] text-[10.5px] font-semibold mt-1 border border-orange-200/60 shadow-2xs">
              <span>CS, ECE, Bio & Applied Math</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-sky-600 tracking-tight font-sans">
              100%
            </span>
            <div className="w-7 h-7 rounded-full border border-sky-200/80 bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Curriculum Coverage
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10.5px] font-semibold mt-1 border border-sky-200/60 shadow-2xs">
              <span>Zero unstaffed course units</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-card-soft">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              deptFilter === "all"
                ? "bg-slate-900 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Departments
          </button>
          {dataset.departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => setDeptFilter(dept.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                deptFilter === dept.id
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search faculty by name or email..."
            className="w-full bg-slate-50 border border-slate-200/70 rounded-full pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          />
        </div>
      </div>

      {/* ── Faculty Cards Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredFaculty.map((fac) => {
          const sessions = dataset.timetableSessions.filter(
            (s) => s.facultyId === fac.id && s.status !== "cancelled"
          );
          const totalHours = sessions.length * 1.5;
          const maxHours = fac.maxCreditHours || 16;
          const dept = dataset.departments.find((d) => d.id === fac.departmentId);

          return (
            <div
              key={fac.id}
              className="p-5 rounded-3xl bg-white border border-slate-100 shadow-card-soft hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F0EEFF] text-[#5B4DF5] font-bold text-sm flex items-center justify-center shrink-0 border border-[#E1DEFF]">
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
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {dept?.name || fac.departmentId}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="rounded-full text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                    Cabin {101 + Math.abs(fac.id.charCodeAt(0) % 20)}
                  </Badge>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{fac.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Office Hours: Tue & Thu 14:00 – 16:00</span>
                  </div>
                </div>

                {/* Workload Progress Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 text-[11px]">Teaching Load</span>
                    <span className="font-semibold text-slate-800 text-[11px]">
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

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {sessions.length} weekly sessions assigned
                </span>
                <Link
                  href={`/timetable?facultyId=${fac.id}`}
                  className="text-xs font-semibold text-[#5B4DF5] hover:underline flex items-center gap-1"
                >
                  <span>View Matrix →</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
