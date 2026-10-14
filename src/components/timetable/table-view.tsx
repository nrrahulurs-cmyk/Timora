"use client";

import * as React from "react";
import {
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Move,
  MapPin,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EnrichedSession } from "./class-card";

interface TableViewProps {
  sessions: EnrichedSession[];
  onSelectSession: (session: EnrichedSession) => void;
  onMoveSession: (session: EnrichedSession) => void;
  pageSize?: number;
}

type SortField = "subject" | "section" | "day" | "room" | "faculty" | "status";
type SortDirection = "asc" | "desc";

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export function TableView({
  sessions,
  onSelectSession,
  onMoveSession,
  pageSize = 10,
}: TableViewProps) {
  const [sortField, setSortField] = React.useState<SortField>("day");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = React.useState(1);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedSessions = React.useMemo(() => {
    const list = [...sessions];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "subject":
          cmp = (a.subject?.code || "").localeCompare(b.subject?.code || "");
          break;
        case "section":
          cmp = (a.section?.sectionCode || "").localeCompare(b.section?.sectionCode || "");
          break;
        case "day": {
          const aDayVal = a.session.timeSlotId ? DAY_ORDER[a.session.timeSlotId.split("-")[1]] || 0 : 0;
          const bDayVal = b.session.timeSlotId ? DAY_ORDER[b.session.timeSlotId.split("-")[1]] || 0 : 0;
          cmp = aDayVal - bDayVal;
          break;
        }
        case "room":
          cmp = (a.classroom?.code || "").localeCompare(b.classroom?.code || "");
          break;
        case "faculty":
          cmp = (a.faculty?.name || "").localeCompare(b.faculty?.name || "");
          break;
        case "status": {
          const aConflict = a.conflict?.status === "active" ? 1 : 0;
          const bConflict = b.conflict?.status === "active" ? 1 : 0;
          cmp = bConflict - aConflict; // Conflicted first
          break;
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return list;
  }, [sessions, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedSessions.length / pageSize) || 1;
  const paginatedSessions = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedSessions.slice(start, start + pageSize);
  }, [sortedSessions, currentPage, pageSize]);

  return (
    <div className="bg-white rounded-lg border border-[rgb(var(--color-border-default))] shadow-xs overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          {/* ── Table Head ────────────────────────────────────────────────── */}
          <thead>
            <tr className="bg-slate-50 border-b border-[rgb(var(--color-border-default))] text-slate-600 font-semibold select-none">
              <th
                onClick={() => toggleSort("subject")}
                className="p-3.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Subject</span>
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => toggleSort("section")}
                className="p-3.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Section</span>
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => toggleSort("day")}
                className="p-3.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Day & Time Slot</span>
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => toggleSort("room")}
                className="p-3.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Classroom</span>
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => toggleSort("faculty")}
                className="p-3.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Instructor</span>
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                </div>
              </th>

              <th className="p-3.5">Session Type</th>

              <th
                onClick={() => toggleSort("status")}
                className="p-3.5 cursor-pointer hover:text-slate-900 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Validation Status</span>
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                </div>
              </th>

              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>

          {/* ── Table Body ────────────────────────────────────────────────── */}
          <tbody className="divide-y divide-slate-100">
            {paginatedSessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  No academic sessions match the current active filters.
                </td>
              </tr>
            ) : (
              paginatedSessions.map((enr) => {
                const { session, subject, classroom, faculty, section, conflict, isStaged } = enr;
                const isConflicted = Boolean(conflict && conflict.status === "active");

                return (
                  <tr
                    key={session.id}
                    className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                      isStaged
                        ? "bg-amber-50/40"
                        : isConflicted
                        ? "bg-rose-50/30"
                        : ""
                    }`}
                    onClick={() => onSelectSession(enr)}
                  >
                    {/* Subject */}
                    <td className="p-3.5 align-middle">
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {subject?.code || "N/A"}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={subject?.title}>
                        {subject?.title || "Session"}
                      </div>
                    </td>

                    {/* Section */}
                    <td className="p-3.5 align-middle whitespace-nowrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {section?.sectionCode || "SEC"}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {section?.studentCount} students
                      </div>
                    </td>

                    {/* Day & Time Slot */}
                    <td className="p-3.5 align-middle whitespace-nowrap">
                      <div className="font-medium text-slate-700 text-xs">
                        {session.timeSlotId.replace("SLOT-", "")}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {session.timeSlotId}
                      </div>
                    </td>

                    {/* Room */}
                    <td className="p-3.5 align-middle whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-800">
                        {classroom?.code || "TBD"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {classroom?.capacity} seats • {classroom?.building}
                      </div>
                    </td>

                    {/* Faculty */}
                    <td className="p-3.5 align-middle whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        {faculty?.name || "Unassigned"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {faculty?.designation}
                      </div>
                    </td>

                    {/* Session Type */}
                    <td className="p-3.5 align-middle whitespace-nowrap">
                      <Badge
                        variant={
                          subject?.type === "Laboratory"
                            ? "neutral"
                            : subject?.type === "Seminar"
                            ? "warning"
                            : "info"
                        }
                        size="sm"
                        className="text-[10px]"
                      >
                        {subject?.type || "Lecture"}
                      </Badge>
                    </td>

                    {/* Validation Status */}
                    <td className="p-3.5 align-middle whitespace-nowrap">
                      {isStaged ? (
                        <Badge variant="warning" size="sm" className="font-medium bg-amber-50 text-amber-800 border-amber-300">
                          ● Staged Move (Unsaved)
                        </Badge>
                      ) : isConflicted ? (
                        <div className="flex items-center gap-1.5 text-rose-700 font-semibold text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <span>{conflict?.title || "Conflict Detected"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Conflict-Free</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 align-middle text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectSession(enr)}
                          className="h-7 text-xs px-2 text-slate-600 hover:text-[rgb(var(--color-primary))]"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span>Inspect</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onMoveSession(enr)}
                          className="h-7 text-xs px-2 border-slate-200 hover:border-blue-300 text-slate-700"
                        >
                          <Move className="h-3 w-3 mr-1" />
                          <span>Move</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination Controls ────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[rgb(var(--color-border-default))] flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedSessions.length)} of{" "}
            {sortedSessions.length} sessions
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 text-xs px-2 border-slate-200"
            >
              Previous
            </Button>
            <span className="px-2 text-slate-600 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 text-xs px-2 border-slate-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
