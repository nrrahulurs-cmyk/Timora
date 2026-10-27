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

export type TimoGlance = "center" | "left" | "right" | "up" | "down";

interface TimoAvatarProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  state?: TimoState;
  glance?: TimoGlance;
  className?: string;
  showStatusGlow?: boolean;
  showCompanionDots?: boolean;
}

const SIZE_MAP = {
  xs: 22,
  sm: 30,
  md: 44,
  lg: 60,
  xl: 80,
};

/**
 * TIMO — The Cute Academic Operations AI Companion
 * Inspired by Meta Muse and OpenAI Dots:
 * - Expressive character personality with responsive pupils, blushing cheeks, and mortarboard cap.
 * - OpenAI Dots inspired orbiting constellation (4 dynamic colored micro-dots).
 * - Morphing visual states from listening to thinking, tool execution, and joyous celebration.
 * - 100% lightweight SVG + CSS animations respecting reduced motion.
 */
export function TimoAvatar({
  size = "md",
  state = "ready",
  glance = "center",
  className = "",
  showStatusGlow = true,
  showCompanionDots = true,
}: TimoAvatarProps) {
  const pixelSize = SIZE_MAP[size];
  const instanceId = React.useId().replaceAll(":", "");
  const bodyGradient = `${instanceId}-body`;
  const tasselGradient = `${instanceId}-tassel`;
  const shadow = `${instanceId}-shadow`;

  // State checks
  const isThinking = state === "thinking";
  const isToolCalling = state === "tool_calling";
  const isConfirming = state === "awaiting_confirmation";
  const isSuccess = state === "completed";
  const isError = state === "error";
  const isOffline = state === "offline";
  const isReceiving = state === "receiving_input";

  // Palette
  const primaryCoral = "#F46036";
  const darkIndigo = "#0F172A";
  const softCream = "#FFFDF9";

  // Pupil glance offsets
  const glanceOffsetX = glance === "left" ? -2 : glance === "right" ? 2 : 0;
  const glanceOffsetY = glance === "up" ? -2 : glance === "down" ? 2 : 0;

  // Glow color by state
  const glowColor = isError
    ? "rgba(244, 63, 94, 0.28)"
    : isConfirming
    ? "rgba(245, 158, 11, 0.3)"
    : isSuccess
    ? "rgba(16, 185, 129, 0.3)"
    : isThinking || isToolCalling
    ? "rgba(99, 102, 241, 0.28)"
    : "rgba(244, 96, 54, 0.22)";

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      role="img"
      aria-label={`Timo AI Companion is ${state.replace("_", " ")}`}
    >
      {/* ── Ambient Radial Halo Glow ────────────────────────────────────────── */}
      {showStatusGlow && !isOffline && (
        <div
          className={`absolute inset-0 rounded-full blur-xs transition-all duration-500 pointer-events-none ${
            isThinking || isToolCalling ? "animate-pulse scale-125" : "scale-110"
          }`}
          style={{ background: glowColor }}
        />
      )}

      {/* ── OpenAI Dots Inspired Orbiting Companion Halo (size >= sm) ──────── */}
      {showCompanionDots && !isOffline && size !== "xs" && (
        <div
          className={`absolute inset-[-6px] pointer-events-none transition-transform duration-700 ${
            isThinking || isToolCalling
              ? "animate-spin"
              : isReceiving
              ? "animate-pulse"
              : ""
          }`}
          style={{ animationDuration: isThinking ? "2.5s" : "6s" }}
        >
          {/* Dot 1: Coral */}
          <span
            className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-[#F46036] shadow-xs transition-all duration-300 ${
              isThinking ? "h-1.5 w-1.5 animate-ping" : "h-1 w-1 opacity-80"
            }`}
          />
          {/* Dot 2: Emerald */}
          <span
            className={`absolute bottom-1 right-0 rounded-full bg-[#10B981] shadow-xs transition-all duration-300 ${
              isSuccess ? "h-2 w-2 scale-125" : "h-1 w-1 opacity-80"
            }`}
          />
          {/* Dot 3: Indigo */}
          <span
            className={`absolute bottom-1 left-0 rounded-full bg-[#6366F1] shadow-xs transition-all duration-300 ${
              isToolCalling ? "h-1.5 w-1.5 scale-110" : "h-1 w-1 opacity-80"
            }`}
          />
          {/* Dot 4: Amber */}
          <span
            className={`absolute top-1/2 right-[-2px] -translate-y-1/2 rounded-full bg-[#F59E0B] shadow-xs transition-all duration-300 ${
              isConfirming ? "h-1.5 w-1.5 animate-bounce" : "h-1 w-1 opacity-70"
            }`}
          />
        </div>
      )}

      {/* ── Timo Character SVG ────────────────────────────────────────────── */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full overflow-visible transition-transform duration-300 motion-reduce:transition-none ${
          isSuccess ? "scale-105" : isReceiving ? "scale-102" : ""
        }`}
      >
        <defs>
          <linearGradient id={bodyGradient} x1="15" y1="10" x2="85" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          <linearGradient id={tasselGradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryCoral} />
            <stop offset="100%" stopColor="#E04B20" />
          </linearGradient>

          <filter id={shadow} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#0F172A" floodOpacity="0.1" />
          </filter>
        </defs>

        {/* ── 1. Academic Mortarboard Cap / Intellect Antenna ────────────────── */}
        <g
          className={`transition-transform duration-300 origin-[50px_22px] ${
            isThinking
              ? "animate-bounce"
              : isConfirming
              ? "rotate-[-4deg]"
              : isReceiving
              ? "rotate-[3deg]"
              : ""
          }`}
        >
          {/* Cap Diamond */}
          <path
            d="M28 24 L50 14 L72 24 L50 32 Z"
            fill={darkIndigo}
            filter={`url(#${shadow})`}
          />
          {/* Cap Button */}
          <circle cx="50" cy="23" r="2.8" fill={primaryCoral} />
          {/* Hanging Tassel */}
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
            fill={`url(#${tasselGradient})`}
            className={isToolCalling ? "animate-ping origin-[68px_36px]" : ""}
          />
        </g>

        {/* ── 2. Timo Capsule Pebble Body ───────────────────────────────────── */}
        <rect
          x="18"
          y="26"
          width="64"
          height="62"
          rx="31"
          fill={`url(#${bodyGradient})`}
          stroke={
            isError
              ? "#FECDD3"
              : isSuccess
              ? "#A7F3D0"
              : isConfirming
              ? "#FDE68A"
              : isThinking || isToolCalling
              ? "#C7D2FE"
              : "#CBD5E1"
          }
          strokeWidth="2.5"
          filter={`url(#${shadow})`}
        />

        {/* Soft Belly Pad */}
        <ellipse cx="50" cy="62" rx="22" ry="18" fill={softCream} opacity="0.9" />

        {/* ── 3. Expressive Eyes & Smile ────────────────────────────────────── */}
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
            {/* Joyful Open Smile */}
            <path d="M44 63 Q 50 68, 56 63" stroke="#059669" strokeWidth="2" />
          </g>
        ) : isError ? (
          /* Sympathetic Eyes */
          <g fill="#E11D48">
            <circle cx="41" cy="52" r="4" />
            <circle cx="59" cy="52" r="4" />
            <path d="M44 64 Q 50 61, 56 64" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ) : isConfirming ? (
          /* Inquisitive Eyes & Curious Mouth */
          <g fill={darkIndigo}>
            <circle cx="41" cy="50" r="4.5" />
            <circle cx="59" cy="52" r="4" />
            <circle cx="42.5" cy="48.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            <circle cx="50" cy="63" r="2.2" fill="#D97706" />
          </g>
        ) : isThinking ? (
          /* Thinking / Upward Looking Eyes */
          <g fill={primaryCoral}>
            <circle cx="41" cy="47" r="4.2">
            </circle>
            <circle cx="59" cy="47" r="4.2">
            </circle>
            <circle cx="42.5" cy="45.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="45.5" r="1.5" fill="#FFFFFF" />
            {/* Thinking Mouth (Small gentle curve) */}
            <path d="M46 63 Q 50 62, 54 63" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        ) : isToolCalling ? (
          /* Concentrating Tool Calling Eyes */
          <g fill={darkIndigo}>
            <circle cx="41" cy="52" r="4" />
            <circle cx="59" cy="52" r="4" />
            <circle cx="42.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            <circle cx="60.5" cy="50.5" r="1.5" fill="#FFFFFF" />
            {/* Sparkle Node */}
            <circle cx="50" cy="64" r="2" fill={primaryCoral}>
            </circle>
          </g>
        ) : isReceiving ? (
          /* Wide Attentive Listening Eyes */
          <g fill={darkIndigo}>
            <circle cx={41 + glanceOffsetX} cy={51 + glanceOffsetY} r="5" />
            <circle cx={59 + glanceOffsetX} cy={51 + glanceOffsetY} r="5" />
            <circle cx={43 + glanceOffsetX} cy={49 + glanceOffsetY} r="1.8" fill="#FFFFFF" />
            <circle cx={61 + glanceOffsetX} cy={49 + glanceOffsetY} r="1.8" fill="#FFFFFF" />
            <path d="M46 63 Q 50 66, 54 63" stroke={primaryCoral} strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          /* Ready Calm Eyes with Glance tracking */
          <g fill={darkIndigo}>
            <circle cx={41 + glanceOffsetX} cy={52 + glanceOffsetY} r="4.2" />
            <circle cx={59 + glanceOffsetX} cy={52 + glanceOffsetY} r="4.2" />
            <circle cx={42.5 + glanceOffsetX} cy={50.5 + glanceOffsetY} r="1.5" fill="#FFFFFF" />
            <circle cx={60.5 + glanceOffsetX} cy={50.5 + glanceOffsetY} r="1.5" fill="#FFFFFF" />
            {/* Soft Warm Smile */}
            <path d="M45 62 Q 50 65, 55 62" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* ── 4. Subtle Blush Cheeks ────────────────────────────────────────── */}
        {!isOffline && (
          <g fill={isSuccess ? "#10B981" : primaryCoral} opacity={isSuccess ? "0.35" : "0.22"}>
            <circle cx="33" cy="57" r="3.2" />
            <circle cx="67" cy="57" r="3.2" />
          </g>
        )}
      </svg>
    </div>
  );
}
