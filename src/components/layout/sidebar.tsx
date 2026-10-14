"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationConfig, type NavGroup, type NavItem } from "@/config/navigation";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-[250px] bg-white border-r border-[rgb(var(--color-border-default))] select-none shrink-0",
        className
      )}
    >
      {/* ── Brand Header (Timora Wordmark) ──────── */}
      <div className="h-[60px] flex items-center px-5 border-b border-[rgb(var(--color-border-default))] gap-3">
        <div className="h-8 w-8 rounded-lg bg-[rgb(var(--color-primary))] flex items-center justify-center text-white shadow-xs">
          <Zap className="h-4.5 w-4.5 fill-current" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[15px] tracking-tight text-slate-900 leading-tight">
              Timora
            </span>
            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-[#0066cc] border border-blue-200/60">
              OS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
            Academic Operations
          </span>
        </div>
      </div>

      {/* ── Grouped Navigation ───────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {navigationConfig.map((group: NavGroup) => (
          <div key={group.title} className="space-y-1">
            <h4 className="px-2.5 text-[10px] font-semibold text-[rgb(var(--color-text-tertiary))] uppercase tracking-wider mb-1.5">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item: NavItem) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors",
                      isActive
                        ? "bg-[rgb(var(--color-primary-light))] text-[rgb(var(--color-primary))] font-semibold"
                        : "text-[rgb(var(--color-text-body))] hover:bg-slate-100 hover:text-[rgb(var(--color-text-heading))]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive
                            ? "text-[rgb(var(--color-primary))]"
                            : "text-[rgb(var(--color-text-secondary))]"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 text-[10px] font-semibold rounded-full min-w-4 text-center",
                          item.badgeVariant === "error"
                            ? "bg-red-100 text-red-700"
                            : item.badgeVariant === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : isActive
                            ? "bg-[rgb(var(--color-primary))] text-white"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Sidebar Footer / Health Monitor ──────── */}
      <div className="p-3 border-t border-[rgb(var(--color-border-default))] bg-slate-50/70">
        <div className="flex items-center justify-between text-xs text-[rgb(var(--color-text-secondary))] px-2 py-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-700">Solver Live</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Timora v2.4
          </span>
        </div>
      </div>
    </aside>
  );
}
