"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  ArrowLeftRight,
  CalendarPlus,
  Users2,
  CheckCircle2,
  ChevronRight,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AttentionItem } from "@/lib/repository/scheduling-repository";

interface AttentionPanelProps {
  items: AttentionItem[];
  onSelectItem: (item: AttentionItem) => void;
  onViewAll?: () => void;
}

export function AttentionPanel({
  items,
  onSelectItem,
  onViewAll,
}: AttentionPanelProps) {
  // Sort items: critical severity first, then warnings, then info
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const order: Record<string, number> = { critical: 1, warning: 2, info: 3 };
      return (order[a.severity] || 4) - (order[b.severity] || 4);
    });
  }, [items]);

  const [expanded, setExpanded] = React.useState(false);
  const displayedItems = expanded ? sortedItems : sortedItems.slice(0, 3);
  const criticalCount = sortedItems.filter((i) => i.severity === "critical").length;

  return (
    <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
      {/* ── CIIRC-Style Card Header ── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-slate-100/70 h-[42px] bg-slate-50/40">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-slate-900 tracking-[-0.01em]">
            Requires Attention
          </h2>
          <span className="bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {sortedItems.length}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          {criticalCount > 0 ? `${criticalCount} Critical Blockers` : "Action Queue"}
        </span>
      </div>

      <CardContent className="p-2.5 space-y-2 flex-1">
        {sortedItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
            <span className="font-semibold text-slate-700">All Conflicts Resolved</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Zero pending clashes or approval blockers.
            </span>
          </div>
        ) : (
          displayedItems.map((item) => {
            const isCritical = item.severity === "critical";
            const isClash = item.type === "clash";

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group p-2.5 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                  isCritical
                    ? "border-rose-200/70 bg-rose-50/20 hover:border-rose-300 hover:bg-rose-50/40"
                    : "border-slate-200/70 bg-white hover:border-blue-300 hover:bg-slate-50/70"
                }`}
              >
                {/* Row Header: Severity Dot + Title + Action Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCritical ? "bg-rose-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="font-semibold text-xs text-slate-900 truncate group-hover:text-[#0066cc] transition-colors">
                      {item.title}
                    </span>
                  </div>

                  <Badge
                    variant={isCritical ? "error" : "warning"}
                    size="sm"
                    className="text-[9.5px] shrink-0 font-medium tracking-wider uppercase py-0 px-1.5"
                  >
                    {item.severity}
                  </Badge>
                </div>

                {/* Resource & Time Context */}
                <div className="flex items-center gap-3 text-[10.5px] text-slate-500 pl-3.5 font-mono">
                  {item.location && (
                    <span className="flex items-center gap-1 truncate text-slate-700 font-semibold">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {item.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    {item.timeSlot}
                  </span>
                </div>

                {/* One-Line Concise Description */}
                <p className="text-[11px] text-slate-600 line-clamp-1 leading-snug pl-3.5">
                  {item.description}
                </p>

                {/* Footer Action Link */}
                <div className="flex items-center justify-end text-[10.5px] pt-1 pl-3.5">
                  <span className="text-[#0066cc] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    {item.actionLabel}
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}

        {sortedItems.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-center py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            {expanded
              ? "▲ Show Fewer Items"
              : `▼ Show ${sortedItems.length - 3} More Attention Items`}
          </button>
        )}
      </CardContent>

      <div className="p-2 border-t border-slate-100 bg-slate-50/50">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAll}
          className="w-full text-xs justify-center gap-1.5 border-slate-200 text-slate-700 hover:bg-white h-8"
        >
          <span>Complete Resolution Queue ({sortedItems.length})</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
        </Button>
      </div>
    </Card>
  );
}
