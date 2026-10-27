"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { SynapseCollegeDataset } from "@/types/domain";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function WeeklyScheduleOverview({ dataset }: { dataset: SynapseCollegeDataset }) {
  const [selectedDay, setSelectedDay] = React.useState("Monday");

  // Get active sessions for the selected day
  const daySessions = React.useMemo(() => {
    const slots = dataset.timeSlots.filter((t) => t.dayOfWeek === selectedDay);
    const slotIds = new Set(slots.map((s) => s.id));

    const daySessions = dataset.timetableSessions
      .filter((sess) => slotIds.has(sess.timeSlotId) && sess.status !== "cancelled");
    return daySessions
      .slice(0, 5)
      .map((sess) => {
        const slot = slots.find((t) => t.id === sess.timeSlotId);
        const subj = dataset.subjects.find((s) => s.id === sess.subjectId);
        const room = dataset.classrooms.find((c) => c.id === sess.classroomId);
        const fac = dataset.faculty.find((f) => f.id === sess.facultyId);
        const sec = dataset.sections.find((s) => s.id === sess.sectionId);

        return {
          id: sess.id,
          time: slot ? `${slot.startTime} – ${slot.endTime}` : "Time unavailable",
          slotIndex: slot?.slotIndex || 1,
          subjectCode: subj?.code || "Unknown subject",
          subjectTitle: subj?.title || "Subject record unavailable",
          subjectType: subj?.type || "Lecture",
          roomCode: room?.code || "Unknown room",
          capacity: room?.capacity || 0,
          facultyName: fac?.name || "Faculty record unavailable",
          sectionCode: sec?.sectionCode || "Unknown section",
        };
      })
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }, [dataset, selectedDay]);
  const totalDaySessions = dataset.timetableSessions.filter((session) => {
    const slot = dataset.timeSlots.find((item) => item.id === session.timeSlotId);
    return session.status !== "cancelled" && slot?.dayOfWeek === selectedDay;
  }).length;

  return (
    <div className="space-y-3">
      {/* Day Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {WEEKDAYS.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 select-none ${
                isSelected
                  ? "bg-[rgb(var(--color-primary))] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Sessions Timeline Cards */}
      <div className="space-y-2">
        {daySessions.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              {/* Time Indicator Badge */}
              <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 shrink-0">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{item.time}</span>
              </div>

              {/* Subject Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-[rgb(var(--color-primary))]">
                    {item.subjectCode}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-medium border ${
                      item.subjectType === "Laboratory"
                        ? "bg-amber-50 text-amber-700 border-amber-200/60"
                        : "bg-blue-50 text-blue-700 border-blue-200/60"
                    }`}
                  >
                    {item.subjectType}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    [{item.sectionCode}]
                  </span>
                </div>
                <h5 className="text-xs font-medium text-slate-800 truncate mt-0.5" title={item.subjectTitle}>
                  {item.subjectTitle}
                </h5>
              </div>
            </div>

            {/* Room & Instructor Badges */}
            <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0 self-end sm:self-auto">
              <div className="flex items-center gap-1 font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{item.roomCode}</span>
                <span className="text-[10px] text-slate-400">({item.capacity}s)</span>
              </div>

              <div className="flex items-center gap-1 text-slate-600 truncate max-w-[130px]">
                <User className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">{item.facultyName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="text-[11px] text-slate-500">
          Showing {Math.min(totalDaySessions, 5)} of {totalDaySessions} scheduled sessions for {selectedDay}
        </span>
        <Link
          href="/timetable"
          className="text-[11px] font-semibold text-[rgb(var(--color-primary))] hover:underline flex items-center gap-1"
        >
          <span>Open Full Matrix</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
