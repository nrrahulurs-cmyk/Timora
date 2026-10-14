import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number | string;
  direction?: "up" | "down" | "neutral";
  isPositive?: boolean; // whether "up" is good or bad (e.g. conflicts up is bad)
  suffix?: string;
  className?: string;
}

export function TrendIndicator({
  value,
  direction = "neutral",
  isPositive = true,
  suffix = "",
  className,
}: TrendIndicatorProps) {
  const isGood =
    direction === "neutral" ? null : direction === "up" ? isPositive : !isPositive;

  const colorClass =
    isGood === true
      ? "text-[rgb(var(--color-success-text))] bg-[rgb(var(--color-success-light))] border-emerald-200/60"
      : isGood === false
      ? "text-[rgb(var(--color-error-text))] bg-[rgb(var(--color-error-light))] border-red-200/60"
      : "text-[rgb(var(--color-text-secondary))] bg-slate-100 border-slate-200/60";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
        colorClass,
        className
      )}
    >
      {direction === "up" && <ArrowUpRight className="h-3 w-3 stroke-[2.5]" />}
      {direction === "down" && <ArrowDownRight className="h-3 w-3 stroke-[2.5]" />}
      {direction === "neutral" && <Minus className="h-3 w-3 stroke-[2.5]" />}
      <span>
        {value}
        {suffix}
      </span>
    </span>
  );
}

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  variant?: "primary" | "success" | "warning" | "error";
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  variant = "primary",
  showLabel = false,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  const fillClass =
    variant === "success"
      ? "bg-[rgb(var(--color-success))]"
      : variant === "warning"
      ? "bg-[rgb(var(--color-warning))]"
      : variant === "error"
      ? "bg-[rgb(var(--color-error))]"
      : "bg-[rgb(var(--color-primary))]";

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
        <div
          className={cn("h-full transition-all duration-300 rounded-full", fillClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
          <span>Utilization</span>
          <span className="font-semibold text-[rgb(var(--color-text-heading))]">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}
