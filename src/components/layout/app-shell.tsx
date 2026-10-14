"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Toaster } from "@/components/feedback/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Users, Building, AlertTriangle, Sparkles } from "lucide-react";
import Link from "next/link";
import { AskSynapseSheet } from "@/components/dashboard/modals/ask-synapse-sheet";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [copilotOpen, setCopilotOpen] = React.useState(false);

  // Keyboard shortcut for command palette (⌘K / Ctrl+K)
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

  const searchItems = [
    { label: "Timetable Grid", category: "Scheduling", href: "/timetable", icon: Calendar },
    { label: "Room LH-201", category: "Rooms", href: "/rooms", icon: Building },
    { label: "Room CS-Lab-1", category: "Rooms", href: "/rooms", icon: Building },
    { label: "Prof. Sarah Connor", category: "Faculty", href: "/faculty", icon: Users },
    { label: "Conflict: Room Double-Booking", category: "Conflicts", href: "/conflicts", icon: AlertTriangle },
  ];

  const filteredItems = searchItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[rgb(var(--color-bg-page))] font-sans antialiased text-[rgb(var(--color-text-body))]">
      {/* ── Desktop Sidebar ──────────────────────── */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar Drawer ────────────────── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[260px] bg-white border-r">
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* ── Main Content Area ────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-7 scrollbar-thin">
          <div className="max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* ── Global Command Search Modal ─────────── */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="p-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search rooms, faculty, courses..."
                className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="p-2 max-h-72 overflow-y-auto space-y-1">
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
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 text-xs text-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-[rgb(var(--color-primary))]" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                      {item.category}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Global Floating Ask Timora Copilot Launcher ── */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[rgb(var(--color-primary))] text-white text-xs font-semibold px-3.5 py-2.5 rounded-full shadow-lg hover:shadow-xl hover:opacity-95 transition-all group border border-white/20 active:scale-95"
        title="Open Ask Timora Copilot (⌘J)"
      >
        <Sparkles className="h-4 w-4 animate-pulse text-amber-200" />
        <span className="tracking-wide">Ask Timora</span>
        <span className="hidden sm:inline-block text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono text-white/90">
          ⌘J
        </span>
      </button>

      {/* ── Global Ask SYNAPSE Copilot Drawer ─────── */}
      <AskSynapseSheet open={copilotOpen} onOpenChange={setCopilotOpen} />

      {/* ── Global Toaster ───────────────────────── */}
      <Toaster />
    </div>
  );
}
