"use client";

import * as React from "react";
import { TimoAvatar, type TimoState } from "./timo-avatar";

interface TimoLauncherProps {
  isOpen: boolean;
  onClick: () => void;
  state?: TimoState;
  activeConflictCount?: number;
}

export function TimoLauncher({
  isOpen,
  onClick,
  state = "ready",
  activeConflictCount = 0,
}: TimoLauncherProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Dynamic state: if hovered, Timo becomes curious ("receiving_input")
  const effectiveState: TimoState = isHovered && state === "ready" ? "receiving_input" : state;

  return (
    <aside
      aria-label="Academic AI Companion"
      className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-40 select-none pointer-events-auto"
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isOpen ? "Close Timo Companion" : "Open Timo Academic Operations Companion (Press ⌘J)"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`group relative flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-full border shadow-lg backdrop-blur-xl transition-all duration-300 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          isOpen
            ? "bg-slate-900 border-slate-800 text-white shadow-slate-900/20"
            : "bg-white/95 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5"
        }`}
      >
        {/* Character Avatar */}
        <div className="relative">
          <TimoAvatar size="sm" state={effectiveState} showCompanionDots={true} />
          {/* Status Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeConflictCount > 0 ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                activeConflictCount > 0 ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
          </span>
        </div>

        {/* Text and Shortcuts */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-tight">
            {isOpen ? "Close Timo" : "Ask Timo"}
          </span>
          <kbd
            className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md border ${
              isOpen
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-slate-200/70"
            }`}
          >
            ⌘J
          </kbd>
        </div>

        {/* Notification badge if active conflicts */}
        {activeConflictCount > 0 && !isOpen && (
          <span
            className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full"
            title={`${activeConflictCount} active schedule clashes`}
          >
            {activeConflictCount}
          </span>
        )}
      </button>
    </aside>
  );
}
