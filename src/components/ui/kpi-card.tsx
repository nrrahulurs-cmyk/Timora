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
        "p-4.5 flex flex-col justify-between bg-gradient-to-br from-white/95 via-slate-50/40 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden",
        alert && "border-amber-300/80 bg-gradient-to-br from-amber-50/40 via-white/90 to-white/90",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] leading-none font-bold tracking-tight text-slate-900 font-sans">
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
              "w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs",
              iconBg
            )}
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
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
