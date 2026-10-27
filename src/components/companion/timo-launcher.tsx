"use client";

import * as React from "react";
import { TimoAvatar, type TimoState } from "./timo-avatar";

interface TimoLauncherProps {
  isOpen: boolean;
  onClick: () => void;
  state?: TimoState;
}

export function TimoLauncher({
  isOpen,
  onClick,
  state = "ready",
}: TimoLauncherProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Dynamic state: if hovered, Timo becomes curious ("receiving_input")
  const effectiveState: TimoState = isHovered && state === "ready" ? "receiving_input" : state;

  return (
    <aside
      aria-label="Academic AI Companion"
      className="fixed bottom-5 right-5 z-40 select-none pointer-events-auto md:bottom-7 md:right-7"
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isOpen ? "Close Timora Copilot" : "Open Timora Copilot"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={`group relative flex h-13 w-13 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition-all duration-300 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-auto sm:w-auto sm:min-h-13 sm:justify-start sm:gap-2.5 sm:py-2 sm:pl-2.5 sm:pr-4 ${
          isOpen
            ? "bg-slate-900 border-slate-800 text-white shadow-slate-900/20"
            : "bg-white/95 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5"
        }`}
      >
        {/* Character Avatar */}
        <div className="relative">
          <TimoAvatar size="sm" state={effectiveState} showCompanionDots={true} />
        </div>

        <span className="hidden text-xs font-semibold tracking-tight sm:inline">{isOpen ? "Close Timo" : "Ask Timo"}</span>
      </button>
    </aside>
  );
}
