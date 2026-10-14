"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  AlertTriangle,
  Users,
  Building,
  BarChart3,
  Settings,
  ShieldCheck,
  Check,
  LogOut,
  Sun,
  Moon,
  Database,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { activeDataSource } from "@/lib/repository/scheduling-repository";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, role: activeRole, switchRole: setActiveRole, logout } = useAuth();
  const [isDark, setIsDark] = React.useState(false);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const isSupabaseLive = activeDataSource === "supabase";

  const userInitials = React.useMemo(() => {
    if (!user?.fullName) return "MV";
    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [user]);

  const menuItems = [
    { label: "Overview", href: "/", icon: Home },
    { label: "Schedule", href: "/timetable", icon: Calendar, activeDot: true },
    { label: "Conflicts", href: "/conflicts", icon: AlertTriangle, badge: "1", badgeVariant: "error" },
    { label: "Faculty & Staff", href: "/faculty", icon: Users },
    { label: "Rooms & Labs", href: "/rooms", icon: Building },
  ];

  const systemItems = [
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-full xl:w-64 select-none shrink-0 justify-between pr-0 xl:pr-5 pb-5 xl:pb-0",
        className
      )}
      data-purpose="primary-navigation"
    >
      <div className="space-y-8">
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-2 pt-2">
          <Link href="/" onClick={onNavigate} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" fill="currentColor" r="3" />
                <path
                  d="M12 3v2m0 14v2m9-9h-2M5 12H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">timora</span>
            </div>
          </Link>

          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition"
            aria-label="Toggle navigation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>

        {/* ── Navigation Sections ──────────────────────────────── */}
        <nav className="space-y-6">
          {/* Main Menu */}
          <div>
            <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Main menu
            </span>
            <ul className="space-y-1.5">
              {menuItems.map((item) => {
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
                          ? "bg-white shadow-card-soft border border-slate-200/60 text-slate-900 font-semibold"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive ? "text-[#FF6B4A]" : "text-slate-400"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-500 leading-none">
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B4A]" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* System Menu */}
          <div>
            <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              System
            </span>
            <ul className="space-y-1.5">
              {systemItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-150",
                        isActive
                          ? "bg-white shadow-card-soft border border-slate-200/60 text-slate-900 font-semibold"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "w-4 h-4 transition-colors",
                            isActive ? "text-[#FF6B4A]" : "text-slate-400"
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B4A]" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>

      {/* ── User Profile & Governance Dropdown ────────────────── */}
      <div className="pt-6 border-t border-slate-100 px-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className="flex items-center justify-between px-2 py-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
              title="User profile & role governance"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-none truncate max-w-[120px]">
                    {user?.fullName || "Marcus Vance"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[120px] capitalize">
                    {activeRole === "academic_admin"
                      ? "Dean"
                      : activeRole.replace("_", " ")}
                  </p>
                </div>
              </div>
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                title="System Operational"
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-64 mb-2">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-slate-900">
                  {user?.fullName || "Marcus Vance"}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {user?.email || "m.vance@timora.edu"}
                </span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge
                    variant="outline"
                    size="sm"
                    className="text-[10px] px-2 py-0.5 border-emerald-200 text-emerald-700 bg-emerald-50"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Role: {activeRole}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1">
              Switch Active Role
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setActiveRole("academic_admin")}
              className="text-xs justify-between"
            >
              <span>Academic Administrator (Dean)</span>
              {activeRole === "academic_admin" && (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveRole("timetable_coordinator")}
              className="text-xs justify-between"
            >
              <span>Timetable Coordinator</span>
              {activeRole === "timetable_coordinator" && (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveRole("faculty_instructor")}
              className="text-xs justify-between"
            >
              <span>Faculty Instructor</span>
              {activeRole === "faculty_instructor" && (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveRole("student_viewer")}
              className="text-xs justify-between"
            >
              <span>Student Viewer</span>
              {activeRole === "student_viewer" && (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Supabase Status */}
            <div className="px-2 py-1.5 bg-slate-50 rounded mx-1 text-[10px] text-slate-500 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className="font-semibold text-slate-700">PostgreSQL 17</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Data Source:</span>
                <span
                  className={cn(
                    "font-semibold",
                    isSupabaseLive ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {isSupabaseLive ? "Supabase Live" : "Deterministic Demo"}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Theme Toggle */}
            <DropdownMenuItem onClick={toggleTheme} className="text-xs justify-between">
              <div className="flex items-center gap-2">
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="gap-2 text-xs text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
