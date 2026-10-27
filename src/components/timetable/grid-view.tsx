"use client";

import * as React from "react";
import { AlertCircle, CalendarDays, Clock, Plus, ChevronRight } from "lucide-react";
import { ClassCard, type EnrichedSession } from "./class-card";
import { getWeekScheduleDetails, type WeekDayDetail } from "@/lib/utils/date-utils";
import type { TimeSlot, DayOfWeek } from "@/types/domain";
import { cn } from "@/lib/utils";

interface GridViewProps {
  timeSlots: TimeSlot[];
  sessions: EnrichedSession[];
  selectedSessionId?: string;
  onSelectSession: (session: EnrichedSession) => void;
  onMoveSession: (session: EnrichedSession) => void;
  onEmptySlotClick?: (day: DayOfWeek, slotIndex: number) => void;
  includeSaturday?: boolean;
  weekOffset?: number;
  today?: Date;
}

const SLOT_DEFINITIONS = [
  { index: 1, label: "08:30 – 10:00 AM", period: "Morning 1" },
  { index: 2, label: "10:00 – 11:30 AM", period: "Morning 2 (Peak)" },
  { index: 3, label: "11:30 AM – 01:00 PM", period: "Midday (Peak)" },
  { index: 4, label: "02:00 – 03:30 PM", period: "Afternoon 1" },
  { index: 5, label: "03:30 – 05:00 PM", period: "Afternoon 2" },
];

export function GridView({
  timeSlots,
  sessions,
  selectedSessionId,
  onSelectSession,
  onMoveSession,
  onEmptySlotClick,
  includeSaturday = true,
  weekOffset = 0,
  today,
}: GridViewProps) {
  // Mobile day filter: "all" or specific day
  const [mobileActiveDay, setMobileActiveDay] = React.useState<string>("all");
  const effectiveToday = today ?? new Date(2026, 9, 19);

  // Get dynamic dates for the current week
  const weekDetails = React.useMemo(() => {
    return getWeekScheduleDetails(weekOffset, effectiveToday);
  }, [weekOffset, effectiveToday]);

  const displayDays: WeekDayDetail[] = React.useMemo(() => {
    const days = includeSaturday ? weekDetails.days : weekDetails.days.slice(0, 5);
    if (mobileActiveDay === "all") return days;
    return days.filter((d) => d.day === mobileActiveDay);
  }, [includeSaturday, weekDetails.days, mobileActiveDay]);

  // Map sessions to 2D matrix keyed by `${day}_${slotIndex}`
  const sessionsMatrix = React.useMemo(() => {
    const map = new Map<string, EnrichedSession[]>();

    for (const enriched of sessions) {
      const slot = timeSlots.find((t) => t.id === enriched.session.timeSlotId);
      if (!slot) continue;

      const key = `${slot.dayOfWeek}_${slot.slotIndex}`;
      const existing = map.get(key) || [];
      existing.push(enriched);
      map.set(key, existing);
    }

    return map;
  }, [sessions, timeSlots]);

  const footerMetrics = React.useMemo(() => {
    const slotHours = (slotId: string) => {
      const slot = timeSlots.find((item) => item.id === slotId);
      if (!slot) return 0;
      const [startHour, startMinute] = slot.startTime.split(":").map(Number);
      const [endHour, endMinute] = slot.endTime.split(":").map(Number);
      return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
    };
    const totalHours = sessions.reduce((sum, item) => sum + slotHours(item.session.timeSlotId), 0);
    const labHours = sessions
      .filter((item) => item.subject?.type === "Laboratory")
      .reduce((sum, item) => sum + slotHours(item.session.timeSlotId), 0);
    const conflictCount = new Set(sessions.flatMap((item) => item.conflict ? [item.conflict.id] : [])).size;
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      labHours: Math.round(labHours * 10) / 10,
      conflictCount,
    };
  }, [sessions, timeSlots]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* ── Mobile Day Selector Pills (Visible on small screens) ────────── */}
      <div className="sm:hidden p-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-slate-50/60">
        <button
          type="button"
          onClick={() => setMobileActiveDay("all")}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition",
            mobileActiveDay === "all"
              ? "bg-slate-900 text-white font-semibold"
              : "bg-white text-slate-600 border border-slate-200"
          )}
        >
          All Days
        </button>
        {weekDetails.days.map((d) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setMobileActiveDay(d.day)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition flex items-center gap-1",
              mobileActiveDay === d.day
                ? "bg-slate-900 text-white font-semibold"
                : "bg-white text-slate-600 border border-slate-200"
            )}
          >
            <span>{d.shortDay}</span>
            <span className="text-[10px] opacity-75">{d.dayNum}</span>
          </button>
        ))}
      </div>

      {/* ── Responsive Weekly Timetable Grid ───────────────────────────── */}
      <h2 className="sr-only">Weekly Timetable Schedule</h2>
      <div className="overflow-x-auto scrollbar-thin p-3 lg:p-5">
        <table className="w-full min-w-[960px] border-collapse table-fixed">
          {/* ── Table Header: Dynamic Days & Dates ──────────────────────── */}
          <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 shadow-xs">
            <tr className="border-b border-slate-200/80 text-slate-700 bg-white">
              <th className="w-36 pb-3 pt-2 text-left pl-3 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky left-0 bg-white z-30">
                Time
              </th>
              {displayDays.map((dayDetail) => {
                const { day, shortDay, dayNum, monthName, isToday } = dayDetail;

                return (
                  <th key={day} className="pb-3 pt-1 px-2 text-center text-xs font-semibold">
                    <span className="sr-only">{day}</span>
                    {isToday ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-semibold shadow-xs">
                        <span>
                          {dayNum} {shortDay}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center">
                        <span className="text-slate-800 font-semibold text-xs">
                          {dayNum} • {shortDay}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {monthName}
                        </span>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Grid Body: Slots × Days ──────────────────────────────────── */}
          <tbody className="divide-y divide-slate-100 text-xs">
            {SLOT_DEFINITIONS.map((def) => (
              <tr key={def.index} className="group hover:bg-slate-50/20 transition-colors">
                {/* Time slot axis (Left Column) */}
                <td className="py-4 pl-3 pr-2 align-top w-36 relative sticky left-0 bg-white group-hover:bg-slate-50/20 transition-colors z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Slot {def.index}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 tracking-tight font-sans">
                    {def.label.split(" ")[0]}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    – {def.label.split("–")[1]?.trim()}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-medium bg-slate-50 border border-slate-200/60 rounded-full px-2 py-0.5 inline-block">
                    90 min
                  </div>
                </td>

                {/* Day cells */}
                {displayDays.map((dayDetail) => {
                  const key = `${dayDetail.day}_${def.index}`;
                  const cellSessions = sessionsMatrix.get(key) || [];
                  const isDoubleBooked = cellSessions.length > 1;

                  return (
                    <td key={dayDetail.day} className="p-2 align-top relative">
                      {/* Double-booking clash warning banner */}
                      {isDoubleBooked && (
                        <div className="mb-2 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 text-[10px] font-bold flex items-center gap-1.5 border border-rose-300 shadow-2xs">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                          <span>Clash ({cellSessions.length} Classes)</span>
                        </div>
                      )}

                      {/* Render Class Cards or Quiet Empty Slot */}
                      {cellSessions.length > 0 ? (
                        <div className="space-y-2">
                          {cellSessions.map((enr) => (
                            <ClassCard
                              key={enr.session.id}
                              data={enr}
                              isSelected={selectedSessionId === enr.session.id}
                              onClick={() => onSelectSession(enr)}
                              onMoveClick={() => onMoveSession(enr)}
                            />
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEmptySlotClick?.(dayDetail.day, def.index)}
                          className="w-full h-full min-h-[105px] rounded-2xl border border-dashed border-slate-200/90 hover:border-slate-300 flex items-center justify-center p-3 text-slate-300 hover:text-slate-600 bg-slate-50/40 hover:bg-slate-100/60 transition cursor-pointer group/btn shadow-2xs"
                          title={`Schedule class on ${dayDetail.day} (${def.label})`}
                          aria-label={`Schedule slot on ${dayDetail.day} ${def.label}`}
                        >
                          <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-light text-slate-400 group-hover/btn:text-slate-700 group-hover/btn:scale-110 group-hover/btn:border-slate-300 transition-all shadow-2xs">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Operational Metrics Footer Bar ─────────────────────────────── */}
      <footer className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Allocated: <strong className="text-slate-800">{footerMetrics.totalHours} hrs / wk</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              Practical Labs: <strong className="text-slate-800">{footerMetrics.labHours} hrs</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>
              Attention Required:{" "}
              <strong className="text-rose-600 font-bold">{footerMetrics.conflictCount} Flagged</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span>Summary for the displayed timetable</span>
        </div>
      </footer>
    </div>
  );
}
