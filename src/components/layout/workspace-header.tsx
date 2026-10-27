"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export interface WorkspaceHeaderProps { section?: string; title: string; subtitle?: ReactNode; badge?: ReactNode; actions?: ReactNode; onSearchClick?: () => void; className?: string; }
export function WorkspaceHeader({ title, subtitle, badge, actions, className }: WorkspaceHeaderProps) {
  return <header className={cn("mb-8 flex shrink-0 flex-col justify-between gap-5 border-b border-[#e4e7e2] pb-7 lg:flex-row lg:items-end", className)}><div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[#202722] sm:text-[30px]">{title}</h1>{badge}</div>{subtitle && <div className="mt-2 max-w-[75ch] text-[13px] leading-relaxed text-[#626a64]">{subtitle}</div>}</div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}</header>;
}
