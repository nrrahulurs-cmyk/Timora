"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ArrowUpRight, LoaderCircle } from "lucide-react";
import { Sidebar } from "./sidebar";
import { navigation } from "./navigation";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Toaster } from "@/components/feedback/toaster";
import { TimoWorkspaceModal } from "@/components/companion/timo-workspace-modal";
import { useAuth } from "@/lib/auth/auth-context";
import { TimoLauncher } from "@/components/companion/timo-launcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [copilotOpen, setCopilotOpen] = React.useState(false);
  const [context, setContext] = React.useState<{ sessionId?: string; prompt?: string }>({});
  React.useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(value => !value); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setCopilotOpen(value => !value); }
    };
    const openCopilot = (event: Event) => { setContext((event as CustomEvent).detail || {}); setCopilotOpen(true); };
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("keydown", keys); window.addEventListener("timora:copilot-open", openCopilot); window.addEventListener("timora:search-open", openSearch);
    return () => { window.removeEventListener("keydown", keys); window.removeEventListener("timora:copilot-open", openCopilot); window.removeEventListener("timora:search-open", openSearch); };
  }, []);
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && !pathname.startsWith("/login")) router.replace("/login");
  }, [isAuthenticated, isLoading, pathname, router]);
  if (pathname.startsWith("/login")) return <>{children}<Toaster /></>;
  if (isLoading) return <div role="status" className="flex min-h-dvh items-center justify-center gap-3 text-sm"><LoaderCircle size={18} className="animate-spin" />Opening your workspace…</div>;
  if (!isAuthenticated) return <div role="status" className="flex min-h-dvh items-center justify-center gap-3 text-sm"><LoaderCircle size={18} className="animate-spin" />Opening sign in…</div>;
  const current = navigation.find(item => item.href === pathname);
  const results = navigation.filter(item => `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="relative flex h-dvh overflow-hidden bg-[#f4f5fb] p-2 text-slate-800 sm:p-3 lg:p-5">
    <div aria-hidden="true" className="bg-blob-1" /><div aria-hidden="true" className="bg-blob-2" />
    <div className="relative z-10 mx-auto flex h-full w-full max-w-[1800px] overflow-hidden rounded-[24px] border border-white/90 bg-white/85 shadow-app-window backdrop-blur-xl lg:rounded-[30px]">
    <a href="#main-content" className="sr-only z-[100] rounded bg-white p-3 focus:not-sr-only focus:absolute">Skip to main content</a>
    <div className="hidden h-full w-[224px] shrink-0 border-r border-slate-200/60 xl:w-[240px] lg:block"><Sidebar /></div>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-17 shrink-0 items-center justify-between gap-3 border-b border-slate-200/60 bg-white/55 px-5 sm:px-9">
        <div className="flex min-w-0 items-center gap-3"><button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100 lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><span className="truncate text-sm font-medium lg:hidden">{current?.label || "Workspace"}</span><span className="hidden text-xs text-[#626a64] lg:block">Institutional workspace</span></div>
        <button onClick={() => setSearchOpen(true)} aria-label="Search workspace" className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200/70 bg-white/75 px-3 text-xs text-slate-600 transition-colors hover:bg-white"><Search size={16} /><span className="hidden sm:inline">Search</span><kbd className="hidden rounded px-1 text-[10px] md:inline">⌘ K</kbd></button>
      </header>
      <main id="main-content" tabIndex={-1} className="workspace-canvas min-h-0 flex-1 overflow-y-auto px-5 py-7 pb-24 sm:px-9 sm:py-9 xl:px-10 scrollbar-thin" data-purpose="center-workspace"><div className="mx-auto w-full max-w-[1500px]">{children}</div></main>
    </div>
    </div>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-[280px] bg-white/95 p-0 backdrop-blur-xl"><SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Academic workspaces and account</SheetDescription><Sidebar onNavigate={() => setMobileOpen(false)} /></SheetContent></Sheet>
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent className="w-[calc(100%-32px)] gap-0 overflow-hidden p-0 sm:max-w-lg"><div className="border-b p-5 pr-12"><DialogTitle className="text-base">Go to a workspace</DialogTitle><DialogDescription className="sr-only">Search Timora pages</DialogDescription><label className="mt-4 flex items-center gap-3"><Search size={18} className="text-secondary" /><input aria-label="Search workspaces" autoFocus placeholder="Timetable, rooms, requests…" value={query} onChange={event => setQuery(event.target.value)} className="h-10 w-full bg-transparent text-sm outline-none" /></label></div><div className="max-h-[55dvh] overflow-auto p-2">{results.length ? results.map(({ icon: Icon, ...item }) => <Link key={item.href} href={item.href} onClick={() => setSearchOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[#f3f4f0]"><Icon size={17} className="text-secondary" /><span className="flex-1">{item.label}</span><ArrowUpRight size={14} className="text-secondary" /></Link>) : <p className="p-6 text-center text-sm text-secondary">No workspaces match “{query}”.</p>}</div></DialogContent></Dialog>
    <TimoWorkspaceModal open={copilotOpen} onOpenChange={setCopilotOpen} context={context} />
    <TimoLauncher isOpen={copilotOpen} onClick={() => setCopilotOpen(value => !value)} />
    <Toaster />
  </div>;
}
