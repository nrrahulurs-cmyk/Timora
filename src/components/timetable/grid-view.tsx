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
    <div className="bg-white rounded-lg border border-[rgb(var(--color-border-default))] shadow-xs overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px] border-collapse table-fixed">
          {/* ── Table Header: Days of the Week ────────────────────────────── */}
          <thead>
            <tr className="bg-slate-50 border-b border-[rgb(var(--color-border-default))] text-slate-700">
              <th className="w-32 p-3 text-left font-semibold text-xs border-r border-slate-200 shrink-0 sticky left-0 bg-slate-50 z-10">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Time / Day</span>
                </div>
              </th>
              {displayDays.map((day) => (
                <th
                  key={day}
                  className="p-3 text-left font-semibold text-xs border-r last:border-r-0 border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <span>{day}</span>
                    {day === "Saturday" && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-normal border border-amber-200">
                        Makeup / Labs
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Grid Body: Slots × Days ──────────────────────────────────── */}
          <tbody className="divide-y divide-slate-100 text-xs">
            {SLOT_DEFINITIONS.map((def) => (
              <tr key={def.index} className="group hover:bg-slate-50/30 transition-colors">
                {/* Time slot label (Left sticky column) */}
                <td className="p-3 border-r border-slate-200 bg-slate-50/60 sticky left-0 z-10 align-top">
                  <div className="font-mono text-[11px] font-bold text-slate-700">
                    {def.label.split("–")[0]}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    – {def.label.split("–")[1]}
                  </div>
                  <div className="mt-2 text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                    {def.period}
                  </div>
                </td>

                {/* Day cells */}
                {displayDays.map((day) => {
                  const key = `${day}_${def.index}`;
                  const cellSessions = sessionsMatrix.get(key) || [];
                  const isDoubleBooked = cellSessions.length > 1;

                  return (
                    <td
                      key={day}
                      className={`p-1.5 border-r last:border-r-0 border-slate-200 align-top transition-colors min-h-[130px] ${
                        isDoubleBooked
                          ? "bg-rose-50/40"
                          : cellSessions.length > 0
                          ? "bg-white"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      {/* If multiple sessions clash in same cell */}
                      {isDoubleBooked && (
                        <div className="mb-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1 border border-rose-300">
                          <AlertCircle className="h-3 w-3 shrink-0 text-rose-600" />
                          <span>Double-Booking ({cellSessions.length} Classes)</span>
                        </div>
                      )}

                      {/* Render Class Cards */}
                      {cellSessions.length > 0 ? (
                        <div className="space-y-1.5">
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
                          className="w-full h-full min-h-[105px] rounded border border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all flex flex-col items-center justify-center text-slate-300 hover:text-[rgb(var(--color-primary))] text-[11px] gap-1 group/btn p-2"
                        >
                          <Plus className="h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity font-medium text-[10px]">
                            Schedule Class
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
    </div>
  );
}
