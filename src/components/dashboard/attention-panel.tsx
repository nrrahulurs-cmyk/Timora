"use client";

import * as React from "react";
import {
  Clock,
  ChevronRight,
  MapPin,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
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
    <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-3xl overflow-hidden">
      {/* ── Card Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-slate-900 tracking-tight">
            Requires Attention
          </h2>
          <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
            {sortedItems.length}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          {criticalCount > 0 ? `${criticalCount} Critical Blockers` : "Action Queue"}
        </span>
      </div>

      <CardContent className="p-3.5 space-y-2.5 flex-1">
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
            const isWarning = item.severity === "warning";
            const isNoAlternative =
              item.id === "ATT-006" ||
              item.description.toLowerCase().includes("zero on-campus") ||
              item.description.toLowerCase().includes("lockdown");

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className={`group p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  isCritical
                    ? "border-rose-200/90 bg-rose-50/25 hover:border-rose-300 hover:bg-rose-50/50 shadow-2xs"
                    : isWarning
                    ? "border-amber-200/80 bg-amber-50/25 hover:border-amber-300 hover:bg-amber-50/50 shadow-2xs"
                    : "border-slate-200/80 bg-slate-50/30 hover:border-blue-300 hover:bg-white shadow-2xs"
                }`}
              >
                {/* Row Header: Severity Dot + Title + Severity Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCritical
                          ? "bg-rose-500"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <span className="font-semibold text-xs text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isNoAlternative && (
                      <span className="text-[9px] font-semibold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded border border-rose-200">
                        NO ALTERNATIVE
                      </span>
                    )}
                    <Badge
                      variant={isCritical ? "error" : isWarning ? "warning" : "default"}
                      size="sm"
                      className="text-[9.5px] font-semibold tracking-wider uppercase py-0.5 px-2 rounded-full"
                    >
                      {item.severity}
                    </Badge>
                  </div>
                </div>

                {/* Resource & Time Context */}
                <div className="flex items-center gap-3 text-[10.5px] text-slate-500 pl-4 font-mono">
                  {item.location && (
                    <span className="flex items-center gap-1 truncate text-slate-700 font-medium">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      {item.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    {item.timeSlot}
                  </span>
                </div>

                {/* Concise Explanation */}
                <p className="text-[11px] text-slate-600 line-clamp-1 leading-snug pl-4">
                  {item.description}
                </p>

                {/* Footer Action Link */}
                <div className="flex items-center justify-between text-[10.5px] pt-1 pl-4">
                  <span className="text-[10px] text-slate-400">
                    {isNoAlternative ? "Requires Dean escalation" : "Action required"}
                  </span>
                  <span
                    className={`font-semibold flex items-center gap-0.5 transition-transform group-hover:translate-x-0.5 ${
                      isNoAlternative ? "text-rose-600" : "text-blue-600"
                    }`}
                  >
                    {isNoAlternative ? "Administrative Review" : item.actionLabel}
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
            className="w-full text-center py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60"
          >
            {expanded
              ? "▲ Show Fewer Items"
              : `▼ Show ${sortedItems.length - 3} More Attention Items`}
          </button>
        )}
      </CardContent>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAll}
          className="w-full text-xs justify-center gap-1.5 border-slate-200 text-slate-700 hover:bg-white h-8 rounded-full shadow-2xs font-semibold cursor-pointer"
        >
          <span>Complete Resolution Queue ({sortedItems.length})</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
        </Button>
      </div>
    </Card>
  );
}
