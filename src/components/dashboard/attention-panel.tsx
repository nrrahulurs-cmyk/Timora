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
  return (
    <Card className="flex flex-col justify-between bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
      {/* ── CIIRC-Style Card Header ── */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-slate-100/70 h-[42px]">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-slate-900 tracking-[-0.01em]">
            Requires Attention
          </h2>
          <span className="bg-[#ef4444] text-white text-[10.5px] font-bold px-1.5 py-0.2 rounded-full">
            {items.length}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Actionable Items
        </span>
      </div>

      <CardContent className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[360px] scrollbar-thin">
        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
            <span className="font-medium text-slate-700">All Conflicts Resolved</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              No pending clashes or approval blockers.
            </span>
          </div>
        ) : (
          items.map((item) => {
            const isClash = item.type === "clash";
            const isExchange = item.type === "exchange";
            const isApproval = item.type === "approval";

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="group p-2.5 rounded-lg border border-slate-200/70 hover:border-blue-300 hover:bg-slate-50/70 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                        item.severity === "critical"
                          ? "bg-rose-50 text-rose-600 border-rose-200/60"
                          : item.severity === "warning"
                          ? "bg-amber-50 text-amber-600 border-amber-200/60"
                          : "bg-blue-50 text-blue-600 border-blue-200/60"
                      }`}
                    >
                      {isClash ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : isExchange ? (
                        <ArrowLeftRight className="h-3 w-3" />
                      ) : isApproval ? (
                        <CalendarPlus className="h-3 w-3" />
                      ) : (
                        <Users2 className="h-3 w-3" />
                      )}
                    </div>
                    <span className="font-semibold text-xs text-slate-800 truncate group-hover:text-[#0066cc] transition-colors">
                      {item.title}
                    </span>
                  </div>

                  <Badge
                    variant={
                      item.severity === "critical"
                        ? "error"
                        : item.severity === "warning"
                        ? "warning"
                        : "info"
                    }
                    size="sm"
                    className="text-[9.5px] shrink-0 uppercase tracking-wider py-0"
                  >
                    {item.severity}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed pl-8">
                  {item.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 pl-8">
                  <span className="flex items-center gap-1 text-slate-500 font-mono">
                    <Clock className="h-3 w-3" />
                    {item.timeSlot}
                  </span>
                  <span className="text-[#0066cc] font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    {item.actionLabel}
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <div className="p-2.5 border-t border-slate-100 bg-slate-50/50">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewAll}
          className="w-full text-xs justify-center gap-1.5 border-slate-200 text-slate-700 hover:bg-white"
        >
          <span>View All Conflicts & Blockers</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
