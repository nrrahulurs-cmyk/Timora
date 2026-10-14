import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TrendIndicator } from "@/components/ui/metric-indicator";

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    isPositive?: boolean;
  };
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
  alert?: boolean;
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconColor = "text-slate-500",
  iconBg = "bg-slate-50/60 border border-slate-200/80",
  className,
  alert = false,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "p-4 flex flex-col justify-between bg-white border-slate-200/80 shadow-xs rounded-xl min-h-[112px] hover:-translate-y-0.5 transition-all duration-150 relative overflow-hidden",
        alert && "border-amber-300/80 bg-amber-50/10",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[27px] leading-none font-bold tracking-[-0.025em] text-slate-900 font-mono">
            {value}
          </span>
          {trend && (
            <TrendIndicator
              value={trend.value}
              direction={trend.direction}
              isPositive={trend.isPositive}
            />
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
              iconBg
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-[12px] font-medium text-slate-600 tracking-[-0.005em]">
          {title}
        </div>
        {subtitle && (
          <div className="mt-1 text-[11px] text-slate-400">
            {subtitle}
          </div>
        )}
      </div>
    </Card>
  );
}
