"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Toaster } from "@/components/feedback/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Search, Calendar, Users, Building, AlertTriangle, Sparkles, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AskSynapseSheet } from "@/components/dashboard/modals/ask-synapse-sheet";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copilotOpen, setCopilotOpen] = React.useState(false);

  // Keyboard shortcut for command palette (⌘K / Ctrl+K) and copilot (⌘J)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // If on login route, render children full-screen without app frame
  if (pathname.startsWith("/login")) {
    return (
      <div className="min-h-screen w-screen bg-[#F4F5FB] font-sans antialiased text-slate-800">
        {children}
        <Toaster />
      </div>
    );
  }

  const searchItems = [
    { label: "Timetable Studio", category: "Scheduling", href: "/timetable", icon: Calendar },
    { label: "Conflict Resolution Ledger", category: "Conflicts", href: "/conflicts", icon: AlertTriangle },
    { label: "Room LH-201 (180 Seats)", category: "Rooms", href: "/rooms", icon: Building },
    { label: "Room Lab-Bio-01 (BSL-3)", category: "Rooms", href: "/rooms", icon: Building },
    { label: "Dr. Alan Turing", category: "Faculty", href: "/faculty", icon: Users },
    { label: "Dr. Sarah Lin", category: "Faculty", href: "/faculty", icon: Users },
    { label: "Institutional Analytics", category: "Performance", href: "/analytics", icon: Sparkles },
  ];

  const filteredItems = searchItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#F4F5FB] text-[#1E293B] font-sans min-h-screen relative flex items-center justify-center p-3 lg:p-6 antialiased selection:bg-[#FF6B4A] selection:text-white">
      {/* ── Ambient Radial Glow Shapes (Google Stitch Exact Physics) ── */}
      <div aria-hidden="true" className="bg-blob-1" />
      <div aria-hidden="true" className="bg-blob-2" />

      {/* ── Master Floating Application Window ───────────────────── */}
      <main
        className="relative z-10 w-full max-w-[1560px] h-[92vh] max-h-[1050px] min-h-[720px] bg-white rounded-[32px] lg:rounded-[38px] shadow-app-window border border-white/90 p-4 sm:p-5 lg:p-7 flex flex-col lg:flex-row gap-6 overflow-hidden"
        data-purpose="master-shell"
      >
        {/* ── Mobile Header (only on small viewports) ──────────────── */}
        <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                T
              </div>
              <span className="font-bold text-slate-900 text-sm">timora</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* ── Desktop Left Sidebar ─────────────────────────────────── */}
        <div className="hidden lg:flex shrink-0 h-full border-r border-slate-100 pr-5">
          <Sidebar />
        </div>

        {/* ── Mobile Sidebar Drawer ────────────────────────────────── */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-5 w-[280px] bg-white border-r">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* ── Main Workspace ───────────────────────────────────────── */}
        <section
          className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto scrollbar-thin pr-1"
          data-purpose="center-workspace"
        >
          {children}
        </section>
      </main>

      {/* ── Global Command Search Modal (⌘K) ────────────────────────── */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0 rounded-3xl border border-slate-100 shadow-app-window">
          <DialogHeader className="p-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classes, rooms, faculty... (Esc to close)"
                className="w-full text-xs outline-none bg-transparent placeholder:text-slate-400 text-slate-800"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="p-2.5 max-h-72 overflow-y-auto space-y-1">
            <div className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-1">
              Quick Suggestions
            </div>
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching results found
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-xs text-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-[#FF6B4A]" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                      {item.category}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Global Floating Ask Timora Copilot Launcher (⌘J) ────────── */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all group active:scale-95 border border-white/20"
        title="Open Ask Timora Copilot (⌘J)"
      >
        <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
        <span className="tracking-wide">Ask Timora</span>
        <span className="hidden sm:inline-block text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-mono text-white/90">
          ⌘J
        </span>
      </button>

      {/* ── Global Ask Timora Copilot Drawer ────────────────────────── */}
      <AskSynapseSheet open={copilotOpen} onOpenChange={setCopilotOpen} />

      {/* ── Global Toast Notifications ──────────────────────────────── */}
      <Toaster />
    </div>
  );
}
