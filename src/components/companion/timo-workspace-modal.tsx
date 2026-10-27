"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowUpRight, ArrowRight, CheckCircle2, CircleStop, LoaderCircle, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { TimoMarkdown } from "./timo-markdown";
import { TimoAvatar, type TimoState } from "./timo-avatar";
import type { ActionPreviewPayload, ToolExecutionResult } from "@/lib/gemini/tools";
import type { UserRole } from "@/types/domain";

export interface AssistantMessage {
  id: string; role: "user" | "assistant"; content: string;
  toolResults?: ToolExecutionResult[]; actionPreview?: ActionPreviewPayload;
  sources?: { type: string; id: string; label: string }[]; suggestions?: string[];
  isError?: boolean; retryPrompt?: string; applied?: boolean; dismissed?: boolean;
}
interface Props { open: boolean; onOpenChange: (open: boolean) => void; initialRole?: UserRole; onNavigateToConflict?: (id?: string) => void; context?: { sessionId?: string; prompt?: string }; }
const starters = ["Show active conflicts", "Find available rooms Friday 10:00-11:30", "Compare faculty workloads", "Help me import a timetable"];
const sourcePath = (type: string) => ({ session: "/timetable", conflict: "/conflicts", room: "/rooms", faculty: "/faculty", subject: "/syllabus", course: "/syllabus", version: "/history" })[type] || "/timetable";

export function TimoWorkspaceModal({ open, onOpenChange, context }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [messages, setMessages] = React.useState<AssistantMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const controller = React.useRef<AbortController | null>(null);
  const busy = React.useRef(false);
  const end = React.useRef<HTMLDivElement>(null);
  const textarea = React.useRef<HTMLTextAreaElement>(null);
  const identity = `${user?.id}:${user?.role}`;
  // Keep context in this authenticated session; never store signed action tokens in browser storage.
  React.useEffect(() => { controller.current?.abort(); setMessages([]); setInput(""); }, [identity]);
  React.useEffect(() => { if (open && context?.prompt) setInput(context.prompt); }, [open, context?.prompt]);
  React.useEffect(() => { end.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); }, [messages, pending]);
  React.useEffect(() => () => controller.current?.abort(), []);

  async function send(prompt: string) {
    const text = prompt.trim();
    if (!text || busy.current || confirming) return;
    busy.current = true; setPending(true); setInput("");
    const history = messages.filter(message => !message.isError).slice(-16).map(({ role, content }) => ({ role, content: content.slice(0, 6000) }));
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort("timeout"), 30_000);
    try {
      const response = await fetch("/api/ask-timora", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, conversationHistory: history, context: { page: pathname, sessionId: context?.sessionId } }), signal: abort.signal });
      const result = await response.json();
      if (!response.ok || typeof result.reply !== "string") throw new Error(result.error || "Copilot could not read the workspace. Try again.");
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: result.reply, sources: result.sources, toolResults: result.toolResults, suggestions: result.suggestions, actionPreview: result.actionPreview }]);
    } catch (error) {
      const content = abort.signal.aborted ? (abort.signal.reason === "timeout" ? "The request took too long. Try again." : "Request stopped. No change was applied.") : error instanceof Error ? error.message : "The request failed. Try again.";
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content, isError: true, retryPrompt: text }]);
    } finally { clearTimeout(timer); busy.current = false; setPending(false); controller.current = null; textarea.current?.focus(); }
  }
  async function confirm(message: AssistantMessage) {
    if (!message.actionPreview?.isValid || confirming || busy.current) return;
    setConfirming(message.id); busy.current = true;
    try {
      const response = await fetch("/api/ask-timora", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", confirmationToken: message.actionPreview.confirmationToken }), signal: AbortSignal.timeout(30_000) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || result.message || "The change was not saved.");
      setMessages(current => [...current.map(item => item.id === message.id ? { ...item, applied: true } : item), { id: crypto.randomUUID(), role: "assistant", content: `${result.message} The saved allocation was checked against your proposal.`, suggestions: ["Show schedule summary", "Show active conflicts"] }]);
      window.dispatchEvent(new Event("timora:data-changed"));
    } catch (error) {
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: error instanceof Error ? error.message : "Could not verify the change. Refresh the timetable before retrying.", isError: true }]);
    } finally { busy.current = false; setConfirming(null); }
  }
  const last = messages.at(-1);
  const timoState: TimoState = confirming ? "tool_calling" : pending ? "thinking" : last?.isError ? "error" : last?.applied ? "completed" : last?.actionPreview?.isValid && !last.dismissed ? "awaiting_confirmation" : input ? "receiving_input" : "ready";
  const suggestions = context?.sessionId && !messages.length ? [`Find alternatives for ${context.sessionId}`, `Find timetable session ${context.sessionId}`] : last?.suggestions || (!messages.length ? starters : []);
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="flex h-dvh w-full flex-col gap-0 border-white/80 bg-white/95 p-0 backdrop-blur-2xl sm:inset-y-4 sm:right-4 sm:h-[calc(100dvh-32px)] sm:max-w-[560px] sm:rounded-[28px] sm:border">
    <SheetHeader className="shrink-0 border-b border-slate-100 px-5 py-5 pr-12 sm:px-6">
      <div className="flex items-center gap-4"><TimoAvatar size="md" state={timoState} /><div><SheetTitle className="text-lg">Timo, your academic copilot</SheetTitle><SheetDescription className="mt-1 text-xs leading-relaxed">A little help for your whole academic day.</SheetDescription></div></div>
    </SheetHeader>
    <div className="flex shrink-0 items-center justify-between gap-3 bg-slate-50/60 px-5 py-2.5 text-[11px] text-slate-500"><span className="min-w-0 truncate">{context?.sessionId ? `Session · ${context.sessionId}` : "Connected to your workspace · local interpretation"}</span><button disabled={pending || !!confirming} onClick={() => { setMessages([]); setInput(""); }} className="flex shrink-0 items-center gap-1.5 rounded p-1 hover:text-slate-900 disabled:opacity-50"><RotateCcw size={13} />New chat</button></div>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 scrollbar-thin" role="log" aria-label="Copilot conversation" aria-live="polite">
      {!messages.length && <div className="flex flex-col items-center pb-3 pt-3 text-center"><div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[36px] bg-gradient-to-br from-[#fff2e9] via-white to-[#eef0ff] shadow-[0_12px_36px_-12px_rgba(148,163,184,.3)]"><TimoAvatar size="lg" state={timoState} glance={input ? "down" : "center"} /></div><h2 className="max-w-[22ch] text-[23px] font-semibold leading-tight tracking-[-0.03em]">Hi, I’m Timo.<br />Let’s untangle your day.</h2><p className="mt-4 max-w-[39ch] text-[13px] leading-relaxed text-slate-500">Find a room, make sense of a conflict, or explore a better time for a class. I’ll check your records and show you what I find.</p><p className="mt-3 max-w-[42ch] text-[11px] leading-relaxed text-slate-500">Include a weekday and time for availability, or a session ID to explore a change.</p></div>}
      <div className="space-y-7">{messages.map(message => <article key={message.id} className={message.role === "user" ? "ml-8 rounded-xl bg-[#f0f2ed] px-4 py-3" : "min-w-0"}>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-slate-500">{message.role === "user" ? "You" : <><TimoAvatar size="xs" state={message.isError ? "error" : message.applied ? "completed" : "ready"} showCompanionDots={false} showStatusGlow={false} />Timo</>}{message.isError && <TriangleAlert size={13} className="text-amber-700" />}</div>
        <TimoMarkdown content={message.content} className="break-words !text-[13px] !leading-6" />
        {message.toolResults?.map((tool, index) => <ToolRecords key={`${tool.toolName}-${index}`} tool={tool} />)}
        {message.actionPreview && <div className="mt-4 overflow-hidden rounded-xl border border-[#dce1da]" data-testid="copilot-action-preview"><div className="border-b bg-[#f7f7f4] px-4 py-3"><h3 className="text-sm font-semibold">{message.actionPreview.summary}</h3><p className="mt-1 text-xs text-secondary">{message.applied ? "Saved and verified" : message.dismissed ? "Proposal dismissed" : "Proposed change · not yet saved"}</p></div><div className="space-y-3 p-4"><dl className="space-y-3 text-xs">{Object.entries(message.actionPreview.details).map(([key,value]) => <div key={key}><dt className="mb-1 font-medium capitalize text-secondary">{key.replaceAll(/([A-Z])/g," $1")}</dt><dd className="break-words leading-relaxed">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>{!!message.actionPreview.violations?.length && <ul className="list-disc space-y-2 pl-4 text-xs text-red-800">{message.actionPreview.violations.map((violation, i) => <li key={i}>{violation}</li>)}</ul>}{message.applied ? <p className="flex items-center gap-2 text-xs font-medium text-emerald-800"><CheckCircle2 size={15} />Change applied</p> : !message.dismissed && <div className="flex flex-wrap gap-2"><Button size="sm" disabled={!message.actionPreview.isValid || !!confirming || pending} onClick={() => void confirm(message)}>{confirming === message.id ? "Applying and verifying…" : "Confirm change"}</Button><Button variant="outline" size="sm" disabled={!!confirming} onClick={() => setMessages(current => current.map(item => item.id === message.id ? { ...item, dismissed: true } : item))}>Dismiss</Button></div>}</div></div>}
        {!!message.sources?.length && <details className="mt-4 text-xs"><summary className="cursor-pointer font-medium text-[#626a64]">{new Set(message.sources.map(source => source.id)).size} source records</summary><div className="mt-2 divide-y rounded-lg border border-[#e4e7e2]">{message.sources.filter((source,index,all) => all.findIndex(item => item.id === source.id) === index).slice(0,20).map(source => <Link key={source.id} href={`${sourcePath(source.type)}?record=${encodeURIComponent(source.id)}`} onClick={() => onOpenChange(false)} className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-[#f7f7f4]"><span><span className="block font-medium">{source.id}</span><span className="mt-1 block text-secondary">{source.label}</span></span><ArrowUpRight size={14} className="shrink-0" /></Link>)}</div></details>}
        {message.isError && message.retryPrompt && <button onClick={() => void send(message.retryPrompt!)} disabled={pending} className="mt-3 flex items-center gap-2 text-xs font-medium"><RotateCcw size={13} />Retry request</button>}
      </article>)}</div>
      {pending && <p role="status" className="mt-6 flex items-center gap-2 text-xs text-secondary"><LoaderCircle size={15} className="animate-spin" />Checking workspace records…</p>}
      <div ref={end} />
    </div>
    <div className="shrink-0 border-t border-slate-100 bg-white/80 p-4 sm:p-5">
      {!!suggestions.length && <div className="mb-4 flex flex-col gap-1.5">{suggestions.slice(0,3).map(suggestion => <button key={suggestion} disabled={pending || !!confirming} onClick={() => void send(suggestion)} className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-[#e4e7e2] px-3 py-2 text-left text-xs hover:bg-[#f7f7f4] disabled:opacity-50"><span>{suggestion}</span><ArrowRight size={13} className="shrink-0 text-secondary" /></button>)}</div>}
      <form onSubmit={event => { event.preventDefault(); void send(input); }} className="rounded-xl border border-[#bac4bb] bg-white p-2 focus-within:ring-2 focus-within:ring-[#b7442d]/20"><label htmlFor="copilot-message" className="sr-only">Message Timora Copilot</label><textarea id="copilot-message" ref={textarea} rows={2} maxLength={4000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(input); } }} placeholder="Ask about your schedule…" className="max-h-32 min-h-14 w-full resize-none border-0 bg-transparent px-2 py-1 text-sm leading-relaxed outline-none focus-visible:outline-none" /><div className="flex items-center justify-between px-2 pb-1"><span className="text-[10px] text-secondary">Changes require your confirmation</span>{pending ? <button type="button" aria-label="Stop request" onClick={() => controller.current?.abort()} className="grid h-9 w-9 place-items-center rounded-lg bg-[#202722] text-white"><CircleStop size={16} /></button> : <button type="submit" aria-label="Send message" disabled={!input.trim() || !!confirming} className="grid h-9 w-9 place-items-center rounded-lg bg-[#202722] text-white disabled:opacity-30"><ArrowUp size={17} /></button>}</div></form>
    </div>
  </SheetContent></Sheet>;
}

function ToolRecords({ tool }: { tool: ToolExecutionResult }) {
  if (!tool.success) return <p className="mt-3 text-xs text-red-800">{tool.error || "This data query failed."}</p>;
  const data = tool.data as Record<string, unknown> | undefined;
  const rows = data && (Array.isArray(data.sessions) ? data.sessions : Array.isArray(data.rooms) ? data.rooms : []);
  if (!rows?.length) return null;
  return <div className="mt-4 overflow-hidden rounded-xl border border-[#e4e7e2]"><p className="border-b bg-[#f7f7f4] px-3 py-2 text-[11px] font-medium text-secondary">{tool.toolName === "searchTimetable" ? "Matched sessions" : "Available rooms"}{typeof data?.interval === "string" ? ` · ${data.interval}` : ""}</p><div className="divide-y">{rows.slice(0,8).map((raw, index) => { const row = raw as Record<string, unknown>; const fields = [row.courseCode, row.subjectCode, row.code, row.dayOfWeek, row.startTime, row.endTime, row.roomCode, row.facultyName, row.sectionCode, row.capacity ? `${row.capacity} seats` : ""].filter(value => typeof value === "string"); return <div key={String(row.sessionId || row.id || index)} className="px-3 py-2.5 text-xs"><p className="font-medium">{String(row.sessionId || row.id || row.name || `Result ${index + 1}`)}</p><p className="mt-1 leading-relaxed text-secondary">{fields.join(" · ") || String(row.title || row.name || "View source record for details")}</p></div>; })}</div></div>;
}
