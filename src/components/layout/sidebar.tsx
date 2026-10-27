"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { TimoraBrand } from "@/components/brand/timora-brand";
import { navigation } from "./navigation";
import { useToast } from "@/components/feedback/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { toast } = useToast();
  return <aside className={cn("flex h-full w-full flex-col bg-white/50 text-slate-600", className)} data-purpose="primary-navigation">
    <Link href="/" onClick={onNavigate} className="flex h-20 shrink-0 items-center px-6 text-slate-900" aria-label="Timora overview"><TimoraBrand markClassName="h-9 w-9" /></Link>
    <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin">
      {["Workspace", "Academic operations", "Institution"].map(group => <div key={group} className="mb-7">
        <p className="mb-3 px-3 text-[11px] font-medium text-slate-500">{group}</p>
        <ul className="space-y-1.5">{navigation.filter(item => item.group === group).map(({ icon: Icon, ...item }) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return <li key={item.href}><Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors", active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70" : "hover:bg-white/80 hover:text-slate-900")}><Icon size={17} className={active ? "text-[#de583a]" : "text-slate-500"} />{item.label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ff6b4a]" />}</Link></li>;
        })}</ul>
      </div>)}
    </nav>
    <div className="border-t border-slate-200/70 p-3">
      <DropdownMenu><DropdownMenuTrigger asChild><button className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left hover:bg-white/80" aria-label="Account and role">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff0e9] text-xs font-semibold text-[#a8462e]">{user?.fullName.split(" ").map(part => part[0]).slice(0,2).join("") || "?"}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{user?.fullName || "Not signed in"}</span><span className="mt-1 block truncate text-[10px] capitalize text-slate-500">{role.replaceAll("_", " ")}</span></span><ChevronUp size={14} />
      </button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuLabel className="break-all text-xs">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator /><DropdownMenuItem onClick={() => void logout().catch(error => toast({ title: "Could not sign out", description: error.message, variant: "destructive" }))}><LogOut size={14} className="mr-2" />Sign out</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>
  </aside>;
}
