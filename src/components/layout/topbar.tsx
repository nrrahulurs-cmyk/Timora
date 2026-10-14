"use client";

import * as React from "react";
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  Calendar,
  Sun,
  Moon,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Check,
  Database,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { activeDataSource } from "@/lib/repository/scheduling-repository";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserRole } from "@/types/domain";

interface TopbarProps {
  onOpenMobileMenu?: () => void;
  onSearchClick?: () => void;
}

export function Topbar({ onOpenMobileMenu, onSearchClick }: TopbarProps) {
  const { user, role: activeRole, switchRole: setActiveRole, logout } = useAuth();
  const [academicPeriod, setAcademicPeriod] = React.useState("Fall 2026 (Odd Sem)");
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

  return (
    <header className="h-[60px] w-full bg-white border-b border-[rgb(var(--color-border-default))] flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
      {/* ── Left: Mobile Toggle & Global Search ─── */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden text-[rgb(var(--color-text-secondary))]"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative w-full cursor-pointer" onClick={onSearchClick}>
          <Input
            placeholder="Search classes, rooms, faculty... (⌘K)"
            leftIcon={<Search className="h-4 w-4" />}
            className="h-8.5 bg-slate-50/80 border-slate-200 text-xs placeholder:text-slate-400 focus:bg-white transition-all w-full cursor-pointer"
            readOnly
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-2 pointer-events-none items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.25 font-mono text-[10px] text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Right: Data Source, Academic Period, Theme, Alerts, User ─ */}
      <div className="flex items-center gap-2">
        {/* Real-time Data Source & Governance Indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-default transition-all ${
                  isSupabaseLive
                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                    : "bg-amber-50/90 border-amber-200 text-amber-800"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSupabaseLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <Database className="h-3 w-3 opacity-70" />
                <span>{isSupabaseLive ? "Supabase Live (Postgres 17)" : "Demo Sandbox Mode"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1 py-0.5">
                <p className="font-semibold">
                  {isSupabaseLive ? "Production Supabase Connected" : "Local Mock Sandbox"}
                </p>
                <p className="text-[11px] text-slate-300">
                  {isSupabaseLive
                    ? "All mutations persist to live PostgreSQL with RLS and audit trails."
                    : "No remote credentials detected; operating in deterministic in-memory mode."}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Current Academic Period */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-slate-200 font-medium hidden sm:inline-flex"
            >
              <Calendar className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
              <span className="truncate max-w-[140px]">{academicPeriod}</span>
              <Badge variant="success" size="sm" className="ml-0.5 text-[10px] py-0">
                Active
              </Badge>
              <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Academic Period</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setAcademicPeriod("Fall 2026 (Odd Sem)")}
              className="flex items-center justify-between text-xs"
            >
              <span>Fall 2026 (Odd Sem)</span>
              {academicPeriod.includes("Fall 2026") && <Check className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAcademicPeriod("Spring 2027 (Even Sem)")}
              className="flex items-center justify-between text-xs"
            >
              <span>Spring 2027 (Even Sem)</span>
              {academicPeriod.includes("Spring 2027") && <Check className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAcademicPeriod("Summer Term 2026")}
              className="flex items-center justify-between text-xs"
            >
              <span>Summer Term 2026</span>
              {academicPeriod.includes("Summer") && <Check className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Control Toggle (CIIRC Pill Switch) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleTheme}
                className="relative w-[46px] h-[24px] rounded-full bg-slate-100 border border-slate-200/90 p-0.5 flex items-center transition-colors cursor-pointer hover:bg-slate-200/70"
                aria-label="Toggle theme"
              >
                <div
                  className={`w-[20px] h-[20px] rounded-full flex items-center justify-center transition-transform duration-200 shadow-xs ${
                    isDark
                      ? "translate-x-[22px] bg-slate-900 text-amber-300"
                      : "translate-x-0 bg-white text-slate-700"
                  }`}
                >
                  {isDark ? <Moon className="h-2.5 w-2.5" /> : <Sun className="h-2.5 w-2.5" />}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to {isDark ? "Light" : "Dark"} mode</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notification Control with unread indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-heading))]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-800">
                Actionable Alerts
              </span>
              <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-medium">
                3 Unresolved
              </span>
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="p-2 rounded-md bg-red-50/70 border border-red-100 text-xs">
                <span className="font-semibold text-red-900 block text-[11px]">
                  Room Overlap in LH-201
                </span>
                <span className="text-red-700 text-[10px]">
                  CS-401 & EE-305 assigned simultaneously on Wed 10:00 AM.
                </span>
              </div>
              <div className="p-2 rounded-md bg-amber-50/70 border border-amber-100 text-xs">
                <span className="font-semibold text-amber-900 block text-[11px]">
                  Pending Class Exchange
                </span>
                <span className="text-amber-800 text-[10px]">
                  Prof. Lin requested swap with Dr. Miller for Fri Slot 2.
                </span>
              </div>
              <div className="p-2 rounded-md bg-blue-50/70 border border-blue-100 text-xs">
                <span className="font-semibold text-blue-900 block text-[11px]">
                  Extra Class Submitted
                </span>
                <span className="text-blue-700 text-[10px]">
                  ME-202 Saturday tutorial session awaiting HOD signoff.
                </span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar & Profile Menu with Role Governance */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 pl-1 pr-2 gap-2 text-xs hover:bg-slate-100"
            >
              <div className="h-6.5 w-6.5 rounded-full bg-[rgb(var(--color-primary-light))] text-[rgb(var(--color-primary))] font-bold flex items-center justify-center text-[11px] border border-blue-200/60">
                {activeRole === "academic_admin"
                  ? "AD"
                  : activeRole === "timetable_coordinator"
                  ? "TC"
                  : activeRole === "faculty_instructor"
                  ? "FA"
                  : "ST"}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-semibold text-slate-800 text-xs leading-none">
                  {user?.fullName || "Dr. Eleanor Vance"}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight capitalize">
                  {activeRole.replace("_", " ")}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-40 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-xs text-slate-900">
                  {user?.fullName || "Dr. Eleanor Vance"}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {user?.email || "e.vance@timora.edu"}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" size="sm" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Role: {activeRole}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-1">
              Switch Active Role (Governance Test)
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setActiveRole("academic_admin")}
              className="text-xs justify-between"
            >
              <span>Academic Administrator</span>
              {activeRole === "academic_admin" && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveRole("timetable_coordinator")}
              className="text-xs justify-between"
            >
              <span>Timetable Coordinator</span>
              {activeRole === "timetable_coordinator" && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveRole("faculty_instructor")}
              className="text-xs justify-between"
            >
              <span>Faculty Instructor</span>
              {activeRole === "faculty_instructor" && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveRole("student_viewer")}
              className="text-xs justify-between"
            >
              <span>Student Viewer (Read-Only)</span>
              {activeRole === "student_viewer" && <Check className="h-3.5 w-3.5 text-blue-600" />}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 bg-slate-50 rounded mx-1 text-[10px] text-slate-500 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className="font-medium text-slate-700">PostgreSQL 17</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Security Policies:</span>
                <span className="font-medium text-emerald-600">20 Tables (RLS Enforced)</span>
              </div>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs">
              <User className="h-3.5 w-3.5" /> Academic Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <Settings className="h-3.5 w-3.5" /> System Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs">
              <HelpCircle className="h-3.5 w-3.5" /> Governance Guide
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
    </header>
  );
}
