"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationConfig, type NavGroup, type NavItem } from "@/config/navigation";
import { useAuth } from "@/lib/auth/auth-context";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const userInitials = React.useMemo(() => {
    if (!user?.fullName) return "MV";
    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-[240px] xl:w-[256px] bg-white select-none shrink-0 justify-between p-4 xl:p-5",
        className
      )}
    >
      <div className="space-y-6">
        {/* ── Stitch Brand Header ─────────────────────── */}
        <div className="flex items-center justify-between px-1.5 pt-1">
          <Link href="/" onClick={onNavigate} className="flex items-center gap-3 group">
            <div className="w-8.5 h-8.5 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" fill="currentColor" r="2.8" />
                <path d="M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900">timora</span>
              <span className="text-[10px] font-semibold text-slate-400">os</span>
            </div>
          </Link>
        </div>

        {/* ── Grouped Navigation ───────────────────── */}
        <nav className="space-y-5">
          {navigationConfig.map((group: NavGroup) => (
            <div key={group.title}>
              <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                {group.title}
              </span>
              <ul className="space-y-1">
                {group.items.map((item: NavItem) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-150",
                          isActive
                            ? "bg-white shadow-card-soft border border-slate-200/80 text-slate-900 font-semibold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80 font-medium"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0 transition-colors",
                              isActive ? "text-[rgb(var(--color-primary))]" : "text-slate-400"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined ? (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 text-[10px] font-bold rounded-full min-w-4 text-center leading-none",
                              item.badgeVariant === "error"
                                ? "bg-rose-50 text-rose-500"
                                : item.badgeVariant === "warning"
                                ? "bg-amber-50 text-amber-700"
                                : isActive
                                ? "bg-blue-50 text-blue-600"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--color-primary))]" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* ── Stitch Profile Footer ────────────────────── */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/60 flex items-center justify-center font-bold text-xs text-slate-700">
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">
              {user?.fullName || "Marcus Vance"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 capitalize truncate max-w-[120px]">
              {user?.role ? `${user.role} role` : "Dean of Academics"}
            </p>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="System Operational" />
      </div>
    </aside>
  );
}
