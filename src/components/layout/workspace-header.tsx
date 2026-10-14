"use client";

import * as React from "react";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  section?: string;
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  onSearchClick?: () => void;
  className?: string;
}

export function WorkspaceHeader({
  section = "Weekly Schedule",
  title,
  badge,
  actions,
  onSearchClick,
  className,
}: WorkspaceHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100/90 mb-5 shrink-0",
        className
      )}
    >
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
          <span>Academic Operations</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-700 font-semibold">{section}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Stitch Quick Search Pill */}
        <div
          className="relative w-full sm:w-60 md:w-64 cursor-pointer group"
          onClick={onSearchClick}
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <input
            type="text"
            readOnly
            placeholder="Quick search... (⌘K)"
            className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 rounded-full pl-9 pr-9 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition cursor-pointer"
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-2 pointer-events-none items-center rounded-full border border-slate-200 bg-white px-1.5 py-0.2 font-mono text-[10px] text-slate-400 shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* Action Buttons */}
        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}
