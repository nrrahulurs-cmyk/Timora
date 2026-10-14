import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[rgb(var(--color-primary-light))] text-[rgb(var(--color-primary))] border border-blue-200/60",
        secondary:
          "bg-slate-100 text-slate-700 border border-slate-200/80",
        neutral:
          "bg-slate-100 text-slate-700 border border-slate-200/80",
        success:
          "bg-[rgb(var(--color-success-light))] text-[rgb(var(--color-success-text))] border border-emerald-200/70",
        warning:
          "bg-[rgb(var(--color-warning-light))] text-[rgb(var(--color-warning-text))] border border-amber-200/70",
        error:
          "bg-[rgb(var(--color-error-light))] text-[rgb(var(--color-error-text))] border border-red-200/70",
        critical:
          "bg-[rgb(var(--color-error-light))] text-[rgb(var(--color-error-text))] border border-red-200/70",
        info:
          "bg-[rgb(var(--color-info-light))] text-[rgb(var(--color-info-text))] border border-blue-200/70",
        outline:
          "text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border-default))] bg-white",
      },
      size: {
        default: "text-xs px-2.5 py-0.5",
        sm: "text-[11px] px-2 py-0.25",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  const dotColor =
    variant === "success"
      ? "bg-emerald-500"
      : variant === "warning"
      ? "bg-amber-500"
      : variant === "error" || variant === "critical"
      ? "bg-red-500"
      : variant === "info"
      ? "bg-blue-500"
      : variant === "secondary" || variant === "neutral"
      ? "bg-slate-400"
      : "bg-[rgb(var(--color-primary))]";

  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
