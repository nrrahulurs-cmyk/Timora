"use client";

import * as React from "react";

export type TimoState =
  | "ready"
  | "receiving_input"
  | "thinking"
  | "tool_calling"
  | "awaiting_confirmation"
  | "completed"
  | "error"
  | "offline";

interface TimoAvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  state?: TimoState;
  className?: string;
  showStatusGlow?: boolean;
}

const SIZE_MAP = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 56,
  xl: 76,
};

/**
 * TIMO — The Academic Operations & Scheduling Companion
 * An original, approachable, intelligent, and subtly expressive character.
 * Built with pure SVG and CSS animations, respecting reduced motion.
 */
export function TimoAvatar({
  size = "md",
  state = "ready",
  className = "",
  showStatusGlow = true,
}: TimoAvatarProps) {
  const pixelSize = SIZE_MAP[size];

  // State-specific palette & expressions
  const isThinking = state === "thinking";
  const isToolCalling = state === "tool_calling";
  const isConfirming = state === "awaiting_confirmation";
  const isSuccess = state === "completed";
  const isError = state === "error";
  const isOffline = state === "offline";
  const isReceiving = state === "receiving_input";

  // Accent colors
  const primaryCoral = "#F46036";
  const darkIndigo = "#0F172A";
  const softCream = "#FFFDF9";
  const glowColor = isError
    ? "rgba(244, 63, 94, 0.25)"
    : isConfirming
    ? "rgba(245, 158, 11, 0.25)"
    : isSuccess
    ? "rgba(16, 185, 129, 0.25)"
    : "rgba(244, 96, 54, 0.2)";

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      role="img"
      aria-label={`Timo the Scheduling Companion is currently ${state.replace("_", " ")}`}
    >
      {/* Ambient background glow ring */}
      {showStatusGlow && !isOffline && (
        <div
          className={`absolute inset-0 rounded-full blur-xs transition-opacity duration-500 pointer-events-none ${
            isThinking || isToolCalling ? "animate-pulse" : ""
          }`}
          style={{
            background: glowColor,
            transform: "scale(1.15)",
          }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible transition-transform duration-300 motion-reduce:transition-none"
      >
        <defs>
          <linearGradient id="timoBodyGrad" x1="15" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id="timoTasselGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryCoral} />
            <stop offset="100%" stopColor="#E04B20" />
          </linearGradient>

          <filter id="timoShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* ── 1. Character Academic Cap / Intelligent Antenna ──────────────── */}
        <g
          className={`transition-transform duration-300 origin-[50px_22px] ${
            isThinking ? "animate-bounce" : isConfirming ? "rotate-[-4deg]" : ""
          }`}
        >
          {/* Cap Base */}
          <path
            d="M28 24 L50 14 L72 24 L50 32 Z"
            fill={darkIndigo}
            filter="url(#timoShadow)"
          />
          {/* Tassel Button */}
          <circle cx="50" cy="23" r="2.8" fill={primaryCoral} />
          {/* Tassel Cord & Hanging Charm */}
          <path
            d="M50 23 Q 66 22, 68 34"
            stroke={primaryCoral}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle
            cx="68"
            cy="36"
            r="3"
            fill="url(#timoTasselGrad)"
            className={isToolCalling ? "animate-ping origin-[68px_36px]" : ""}
          />
        </g>

        {/* ── 2. Timo Capsule / Pebble Body ─────────────────────────────────── */}
        <rect
          x="18"
          y="26"
          width="64"
          height="62"
          rx="31"
          fill="url(#timoBodyGrad)"
          stroke={isError ? "#FECDD3" : isSuccess ? "#A7F3D0" : isConfirming ? "#FDE68A" : "#CBD5E1"}
          strokeWidth="2.5"
          filter="url(#timoShadow)"
        />

        {/* Belly subtle academic badge / visor */}
        <ellipse cx="50" cy="62" rx="22" ry="18" fill={softCream} opacity="0.9" />

        {/* ── 3. Expressive Face & Eyes ─────────────────────────────────────── */}
        {isOffline ? (
          /* Sleeping / Standby Eyes (- -) */
          <g stroke="#64748B" strokeWidth="2.5" strokeLinecap="round">
            <path d="M35 52 Q 41 55, 47 52" />
            <path d="M53 52 Q 59 55, 65 52" />
          </g>
        ) : isSuccess ? (
          /* Cheerful Happy Arched Eyes (^ ^) */
          <g stroke="#059669" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M35 52 Q 41 46, 47 52" />
            <path d="M53 52 Q 59 46, 65 52" />
            {/* Soft Happy Smile */}
            <path d="M44 63 Q 50 67, 56 63" stroke="#059669" strokeWidth="2" />
          </g>
        ) : isError ? (
          /* Soft Sympathetic / Alert Eyes */
          <g fill="#E11D48">
            <circle cx="41" cy="52" r="4" />
            <circle cx="59" cy="52" r="4" />
            {/* Wavy mouth */}
            <path d="M44 64 Q 50 61, 56 64" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ) : isConfirming ? (
          /* Questioning Eyes & Alert Expression */
          <g fill={darkIndigo}>
            <circle cx="41" cy="50" r="4.5" />
            <circle cx="59" cy="52" r="4" />
            {/* Catchlights */}
            <circle cx="42.5" cy="48.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            {/* Inquisitive Mouth (Small 'o') */}
            <circle cx="50" cy="63" r="2.2" fill="#D97706" />
          </g>
        ) : isThinking ? (
          /* Thinking Eyes Looking Upward / Scanning */
          <g fill={primaryCoral}>
            <circle cx="41" cy="48" r="4.2">
              <animate attributeName="cy" values="48;46;48" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="59" cy="48" r="4.2">
              <animate attributeName="cy" values="48;46;48" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="42.5" cy="46.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="46.5" r="1.5" fill="#FFFFFF" />
          </g>
        ) : isToolCalling ? (
          /* Focused Concentrated Eyes with Orbiting Ring */
          <g fill={darkIndigo}>
            <circle cx="41" cy="52" r="4" />
            <circle cx="59" cy="52" r="4" />
            <circle cx="42.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            {/* Orbiting Mini Tool Constellation */}
            <circle cx="50" cy="64" r="2" fill={primaryCoral}>
              <animate attributeName="r" values="1.8;2.6;1.8" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </g>
        ) : isReceiving ? (
          /* Wide Attentive Eyes */
          <g fill={darkIndigo}>
            <circle cx="41" cy="51" r="5" />
            <circle cx="59" cy="51" r="5" />
            <circle cx="43" cy="49" r="1.8" fill="#FFFFFF" />
            <circle cx="61" cy="49" r="1.8" fill="#FFFFFF" />
            <path d="M46 63 Q 50 66, 54 63" stroke={primaryCoral} strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          /* Standard Ready State: Calm, Friendly Eyes */
          <g fill={darkIndigo}>
            <circle cx="41" cy="52" r="4.2" />
            <circle cx="59" cy="52" r="4.2" />
            <circle cx="42.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            {/* Soft Warm Smile */}
            <path d="M45 62 Q 50 65, 55 62" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* ── 4. Subtle Blush Cheeks ────────────────────────────────────────── */}
        {!isOffline && (
          <g fill={primaryCoral} opacity="0.22">
            <circle cx="33" cy="57" r="3.2" />
            <circle cx="67" cy="57" r="3.2" />
          </g>
        )}
      </svg>
    </div>
  );
}
