"use client";

import * as React from "react";
import { AlertCircle, CalendarDays, Clock, Plus } from "lucide-react";
import { ClassCard, type EnrichedSession } from "./class-card";
import type { TimeSlot, DayOfWeek } from "@/types/domain";

interface GridViewProps {
  timeSlots: TimeSlot[];
  sessions: EnrichedSession[];
  selectedSessionId?: string;
  onSelectSession: (session: EnrichedSession) => void;
  onMoveSession: (session: EnrichedSession) => void;
  onEmptySlotClick?: (day: DayOfWeek, slotIndex: number) => void;
  includeSaturday?: boolean;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
}: GridViewProps) {
  const displayDays = includeSaturday ? DAYS : DAYS.slice(0, 5);

  // Map sessions to a 2D matrix keyed by `${day}_${slotIndex}`
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin p-3 lg:p-5">
        <table className="w-full min-w-[960px] border-collapse table-fixed">
          {/* ── Table Header: Days of the Week (Stitch Style) ──────────────── */}
          <thead>
            <tr className="border-b border-slate-200/70 text-slate-700">
              <th className="w-36 pb-4 pt-1 text-left pl-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Time
              </th>
              {displayDays.map((day, idx) => {
                const dayNum = 14 + idx;
                const isTuesday = day === "Tuesday";

                return (
                  <th key={day} className="pb-4 pt-1 px-2 text-center text-xs font-semibold">
                    <span className="sr-only">{day}</span>
                    {isTuesday ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-slate-900 text-white rounded-full text-xs font-semibold shadow-xs">
                        <span>{dayNum} • {day.slice(0, 3)}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    ) : (
                      <span className="text-slate-600 font-semibold">
                        {dayNum} • {day.slice(0, 3)}
                      </span>
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
                {/* Time slot label (Left column) */}
                <td className="py-4 pl-3 pr-2 align-top w-36">
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
                {displayDays.map((day) => {
                  const key = `${day}_${def.index}`;
                  const cellSessions = sessionsMatrix.get(key) || [];
                  const isDoubleBooked = cellSessions.length > 1;

                  return (
                    <td key={day} className="p-2 align-top min-h-[120px]">
                      {/* Double-booking warning banner */}
                      {isDoubleBooked && (
                        <div className="mb-2 px-2 py-1 rounded-xl bg-rose-100/80 text-rose-800 text-[10px] font-bold flex items-center gap-1.5 border border-rose-300">
                          <AlertCircle className="h-3 w-3 shrink-0 text-rose-600" />
                          <span>Clash ({cellSessions.length} Classes)</span>
                        </div>
                      )}

                      {/* Render Class Cards */}
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
                          onClick={() => onEmptySlotClick?.(day, def.index)}
                          className="w-full h-full min-h-[105px] rounded-2xl border border-dashed border-slate-200 hover:border-slate-300 flex items-center justify-center p-3 text-slate-300 hover:text-slate-500 hover:bg-slate-50/50 transition cursor-pointer group/btn"
                          title={`Schedule slot on ${day}`}
                        >
                          <span className="text-xl font-light leading-none text-slate-300 group-hover/btn:text-slate-500 transition-colors">
                            +
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

      {/* ── Stitch Footer Operational Metrics Bar ──────────────────────── */}
      <footer className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Allocated: <strong className="text-slate-800">38 hrs / wk</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              Practical Labs: <strong className="text-slate-800">12 hrs</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>
              Attention Required:{" "}
              <strong className="text-rose-600 font-bold">5 Flagged</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span>AI Constraint Engine: Active</span>
          <span className="text-slate-200">•</span>
          <span className="text-[rgb(var(--color-primary))] font-semibold">
            Postgres 17 Engine Online
          </span>
        </div>
      </footer>
    </div>
  );
}
