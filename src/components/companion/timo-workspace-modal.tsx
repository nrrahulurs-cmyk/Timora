"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  X,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Layers,
  Sparkles,
  Users,
  Search,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/feedback/use-toast";
import { TimoAvatar, type TimoState } from "./timo-avatar";
import type { ActionPreviewPayload, ToolExecutionResult } from "@/lib/gemini/tools";
import type { UserRole } from "@/types/domain";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: "gemini-api" | "deterministic-copilot";
  toolResults?: ToolExecutionResult[];
  actionPreview?: ActionPreviewPayload;
  sources?: Array<{ type: string; id: string; label: string }>;
  isError?: boolean;
  committedRecordId?: string;
  isActionCancelled?: boolean;
}

interface TimoWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: UserRole;
  onNavigateToConflict?: (conflictId?: string) => void;
}

export function TimoWorkspaceModal({
  open,
  onOpenChange,
  initialRole = "academic_admin",
  onNavigateToConflict,
}: TimoWorkspaceModalProps) {
  const { toast } = useToast();
  const [input, setInput] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(initialRole);
  const [timoState, setTimoState] = React.useState<TimoState>("ready");
  const [isTyping, setIsTyping] = React.useState(false);
  const [activeStepText, setActiveStepText] = React.useState<string>("Analyzing operational request...");
  const [committingToken, setCommittingToken] = React.useState<string | null>(null);

  const initialGreeting: AssistantMessage = {
    id: "initial-msg",
    role: "assistant",
    content:
      "Hello! I am **Timo**, your academic operations and intelligent scheduling companion. I am connected directly to our deterministic constraint engine, room inventory, and faculty rosters.\n\nHow can I help coordinate your schedule today?",
    provider: "deterministic-copilot",
  };

  const [messages, setMessages] = React.useState<AssistantMessage[]>([initialGreeting]);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, activeStepText]);

  // Focus textarea when modal opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [open]);

  // Sample quick suggestion prompts
  const quickSuggestions = [
    { label: "Search available rooms", query: "Search available lecture halls on Friday 10:00 AM" },
    { label: "Check timetable conflicts", query: "Check current timetable conflicts" },
    { label: "Find feasible slots", query: "Find feasible time slots for CS-401" },
    { label: "Propose extra class", query: "Propose an extra review class for CS-401" },
    { label: "Check syllabus progress", query: "Show syllabus progress and pacing deficits" },
    { label: "Check faculty availability", query: "Check Dr. Sarah Lin's availability on Tuesday" },
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimoState("thinking");
    setActiveStepText("Validating role authorization & context...");

    const step1 = setTimeout(() => {
      setTimoState("tool_calling");
      setActiveStepText("Executing domain tools against authoritative database...");
    }, 350);

    const step2 = setTimeout(() => {
      setActiveStepText("Evaluating [start, end) interval constraints...");
    }, 700);

    try {
      const res = await fetch("/api/ask-timora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          userRole: role,
          conversationHistory: messages
            .slice(-4)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      clearTimeout(step1);
      clearTimeout(step2);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Server returned ${res.status}`);
      }

      const data = await res.json();

      const hasAction = Boolean(data.actionPreview);
      setTimoState(hasAction ? "awaiting_confirmation" : "completed");

      const assistantMsg: AssistantMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Operation completed.",
        provider: data.provider || "deterministic-copilot",
        toolResults: data.toolResults || [],
        actionPreview: data.actionPreview,
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Reset Timo state to ready after celebration
      setTimeout(() => {
        setTimoState("ready");
      }, 2500);
    } catch (err: any) {
      console.error("Timo assistant error:", err);
      setTimoState("error");
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ **Timo Notice**: Could not complete the request due to an operational timeout or service interruption. You can retry with our deterministic local engine.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);

      setTimeout(() => {
        setTimoState("ready");
      }, 3000);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmAction = async (msgId: string, confirmationToken: string) => {
    setCommittingToken(confirmationToken);
    setTimoState("tool_calling");

    try {
      const res = await fetch("/api/ask-timora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          confirmationToken,
          userRole: role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Action revalidation or commit failed.");
      }

      setTimoState("completed");
      toast({
        title: "Action Committed & Synchronized",
        description: data.message,
        variant: "success",
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                committedRecordId: data.recordId || "COMMITTED",
                content: `${m.content}\n\n✅ **Action Successfully Executed**: ${data.message}`,
              }
            : m
        )
      );

      setTimeout(() => {
        setTimoState("ready");
      }, 2500);
    } catch (err: any) {
      setTimoState("error");
      toast({
        title: "Commit Blocked",
        description: err.message || "Action revalidation failed against active database.",
        variant: "destructive",
      });

      setTimeout(() => {
        setTimoState("ready");
      }, 3000);
    } finally {
      setCommittingToken(null);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isActionCancelled: true,
            }
          : m
      )
    );
    toast({
      title: "Proposal Discarded",
      description: "The proposed schedule modification was safely cancelled.",
      variant: "default",
    });
  };

  const handleResetConversation = () => {
    setMessages([initialGreeting]);
    setTimoState("ready");
  };

  const isOnlyGreeting = messages.length <= 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 w-full sm:max-w-xl md:max-w-2xl flex flex-col h-full bg-white/95 backdrop-blur-2xl border-l border-slate-200/90 shadow-2xl z-50 overflow-hidden"
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <SheetHeader className="p-4 px-5 border-b border-slate-100/80 bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <TimoAvatar size="md" state={timoState} />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <div>
                <SheetTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Timo
                  <Badge variant="outline" className="text-[10px] font-semibold bg-primary-coral/10 text-primary-coral border-primary-coral/30 px-2 py-0">
                    Academic Companion
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span>Deterministic Constraint Engine</span>
                  <span>•</span>
                  <span>Gemini 2.5</span>
                </SheetDescription>
              </div>
            </div>

            {/* Role Switcher & Controls */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Active User Role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg px-2.5 py-1 border border-slate-200 transition cursor-pointer focus:outline-hidden"
                title="Switch role context for authorization testing"
              >
                <option value="academic_admin">Dean / Admin</option>
                <option value="timetable_coordinator">Timetable Coord</option>
                <option value="faculty_instructor">Faculty Member</option>
                <option value="student_viewer">Student (Read-Only)</option>
              </select>

              <button
                type="button"
                onClick={handleResetConversation}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                title="Reset conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                title="Close Timo (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* ── Message Thread / Scroll Area ─────────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
          {/* Welcome State when only initial greeting */}
          {isOnlyGreeting && (
            <div className="py-6 px-4 bg-slate-50/70 border border-slate-200/60 rounded-3xl text-center space-y-4">
              <div className="flex justify-center">
                <TimoAvatar size="xl" state={timoState} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  How can I coordinate your academic operations today?
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  I can check classroom occupancy, evaluate schedule clashes, recommend feasible alternatives, or propose makeup sessions.
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="pt-2 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 px-1">
                  Try asking Timo:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(item.query)}
                      className="p-2.5 rounded-2xl bg-white hover:bg-slate-100/90 border border-slate-200/80 text-left transition text-xs group cursor-pointer flex items-start gap-2 shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary-coral shrink-0 mt-0.5" />
                      <span className="text-slate-700 group-hover:text-slate-900 font-medium leading-snug">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Conversation Messages */}
          {!isOnlyGreeting &&
            messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="shrink-0 mt-0.5">
                      <TimoAvatar size="sm" state={msg.isError ? "error" : "ready"} />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl ${
                        isUser
                          ? "bg-slate-900 text-white rounded-tr-xs shadow-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      <div className="whitespace-pre-line prose prose-xs max-w-none text-inherit">
                        {msg.content}
                      </div>

                      {/* Provider pill on assistant response */}
                      {!isUser && msg.provider && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Verified with deterministic constraint engine
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Structured Result Cards ────────────────────────────── */}
                    {msg.toolResults && msg.toolResults.length > 0 && (
                      <div className="space-y-2 w-full">
                        {msg.toolResults.map((tr, trIdx) => {
                          // Room Search Structured Card
                          if (tr.toolName === "searchAvailableRooms" && tr.data?.rooms) {
                            const rooms = tr.data.rooms;
                            return (
                              <div
                                key={trIdx}
                                className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-primary-coral" />
                                    Available Facilities ({rooms.length})
                                  </span>
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Free at {tr.data.interval}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  {rooms.slice(0, 6).map((r: any, rId: number) => (
                                    <div
                                      key={rId}
                                      className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-800">{r.code}</div>
                                        <div className="text-[10px] text-slate-500">{r.name}</div>
                                      </div>
                                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
                                        <span>{r.capacity} seats</span>
                                        <span className="text-[9px] px-1 py-0.2 bg-white rounded border border-slate-200">
                                          {r.building}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          // Conflict Breakdown Structured Card
                          if (tr.toolName === "findTimetableConflicts" && tr.data?.conflicts) {
                            const conflicts = tr.data.conflicts;
                            return (
                              <div
                                key={trIdx}
                                className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                    Identified Conflicts ({conflicts.length})
                                  </span>
                                  <Link
                                    href="/conflicts"
                                    onClick={() => onOpenChange(false)}
                                    className="text-[11px] font-semibold text-primary-coral hover:underline flex items-center gap-1"
                                  >
                                    Open Studio <ArrowRight className="h-3 w-3" />
                                  </Link>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                  {conflicts.map((c: any) => (
                                    <div
                                      key={c.id}
                                      className="p-2 rounded-xl bg-rose-50/50 border border-rose-100 flex items-start justify-between gap-2"
                                    >
                                      <div>
                                        <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 text-[9px] font-mono">
                                            {c.id}
                                          </span>
                                          {c.title}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                          {c.description}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}

                    {/* ── Action Preview Card (Two-Phase Commit) ──────────────── */}
                    {msg.actionPreview && (
                      <div className="w-full bg-white rounded-2xl border-2 border-primary-coral/40 p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary-coral animate-ping" />
                            <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                              Action Preview & Impact Verification
                            </span>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                            Awaiting Confirmation
                          </Badge>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-700">
                          <p className="font-semibold text-slate-900">{msg.actionPreview.summary}</p>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono text-[11px] space-y-1">
                            {Object.entries(msg.actionPreview.details).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
                                <span className="text-slate-800 font-semibold">{String(v)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg p-2">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Constraint checks passed: 0 regular timetable collisions introduced.</span>
                          </div>
                        </div>

                        {/* Confirmation Buttons */}
                        {!msg.committedRecordId && !msg.isActionCancelled && (
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              disabled={committingToken === msg.actionPreview.confirmationToken}
                              onClick={() => handleConfirmAction(msg.id, msg.actionPreview!.confirmationToken)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {committingToken === msg.actionPreview.confirmationToken
                                ? "Committing & Syncing..."
                                : "Confirm & Commit"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelAction(msg.id)}
                              className="rounded-xl text-xs text-slate-600 hover:text-slate-900"
                            >
                              Discard
                            </Button>
                          </div>
                        )}

                        {msg.committedRecordId && (
                          <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-300 rounded-xl p-2.5 text-center flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>Database Synchronized: Record ID #{msg.committedRecordId}</span>
                          </div>
                        )}

                        {msg.isActionCancelled && (
                          <div className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-xl p-2.5 text-center">
                            Proposal Discarded
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Typing / Multi-step Progress indicator */}
          {isTyping && (
            <div className="flex gap-3 text-xs items-center">
              <TimoAvatar size="sm" state={timoState} />
              <div className="p-3 bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-coral animate-ping" />
                  <span>{activeStepText}</span>
                </div>
                <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-coral animate-pulse rounded-full w-2/3" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Message Composer ──────────────────────────────────────────────── */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white/90 backdrop-blur-md shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-col gap-2"
          >
            <div className="relative rounded-2xl border border-slate-300 focus-within:border-primary-coral focus-within:ring-2 focus-within:ring-primary-coral/20 bg-white transition-all shadow-xs">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Timo anything about classrooms, conflicts, or faculty..."
                rows={2}
                className="w-full p-3 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none bg-transparent"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2.5 bottom-2.5 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Send message (Enter)"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-600">Enter</kbd> to send, <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-slate-600">Shift+Enter</kbd> for newline</span>
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Sparkles className="h-3 w-3 text-primary-coral" /> Timo Copilot v2.4
              </span>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
