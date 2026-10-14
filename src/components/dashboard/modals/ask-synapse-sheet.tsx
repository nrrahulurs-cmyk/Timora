"use client";

import * as React from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  RotateCcw,
  Database,
  ExternalLink,
  Layers,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/feedback/use-toast";
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

interface AskSynapseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: UserRole;
}

export function AskSynapseSheet({
  open,
  onOpenChange,
  initialRole = "academic_admin",
}: AskSynapseSheetProps) {
  const { toast } = useToast();
  const [input, setInput] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(initialRole);
  const [messages, setMessages] = React.useState<AssistantMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Hello! I am **Ask Timora**, your academic operations copilot. I am connected directly to our deterministic constraint engine, classroom databases, and curriculum delivery metrics.\n\nAsk me to find available rooms, evaluate conflict solutions, propose extra classes, or inspect syllabus completion.",
      provider: "gemini-api",
    },
  ]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [typingStep, setTypingStep] = React.useState("Analyzing request...");
  const [committingToken, setCommittingToken] = React.useState<string | null>(null);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const samplePrompts = [
    "Search available lecture halls on Friday morning",
    "Check current timetable conflicts",
    "Propose an extra review class for CS-401",
    "Show syllabus progress and pacing deficits",
    "Check Dr. Sarah Lin's availability on Tuesday",
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    setApiError(null);
    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTypingStep("Validating permissions & constraint models...");

    const stepTimer = setTimeout(() => {
      setTypingStep("Executing scheduling tools & verifying intervals...");
    }, 400);

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

      clearTimeout(stepTimer);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: AssistantMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Operation completed.",
        provider: data.provider || "gemini-api",
        toolResults: data.toolResults || [],
        actionPreview: data.actionPreview,
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Ask Timora error:", err);
      setApiError(err.message || "Failed to reach Timora Copilot service.");
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "⚠️ **Copilot System Notice**: Could not complete the request due to an operational timeout or service interruption. You can retry with our deterministic local engine.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmAction = async (msgId: string, confirmationToken: string) => {
    setCommittingToken(confirmationToken);
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
    } catch (err: any) {
      toast({
        title: "Commit Blocked",
        description: err.message || "Action revalidation failed against active database.",
        variant: "destructive",
      });
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
      title: "Action Cancelled",
      description: "The proposed schedule modification was safely discarded.",
      variant: "default",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 sm:max-w-lg flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="p-4 pb-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[rgb(var(--color-primary))] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  Ask Timora Copilot
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </SheetTitle>
                <SheetDescription className="text-[11px] text-slate-500">
                  Google Gemini & Deterministic Constraint Engine
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge
                variant="neutral"
                size="sm"
                className="text-[10px] uppercase font-mono px-2 py-0.5"
              >
                {role === "academic_admin" ? "Admin" : "Coordinator"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Message Thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin bg-slate-50/30"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col gap-1.5 ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-400 font-medium">
                {m.role === "user" ? (
                  <>
                    <span>You</span>
                    <User className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3 text-[rgb(var(--color-primary))]" />
                    <span>Timora Assistant</span>
                    {m.provider && (
                      <span className="text-[9px] bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                        {m.provider === "gemini-api" ? "Gemini 2.5 Flash" : "Deterministic Copilot"}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-xl max-w-[90%] leading-relaxed ${
                  m.role === "user"
                    ? "bg-[rgb(var(--color-primary))] text-white font-medium shadow-xs"
                    : m.isError
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : "bg-white border border-slate-200 text-slate-800 shadow-xs"
                }`}
              >
                <div className="whitespace-pre-line space-y-1.5">
                  {m.content}
                </div>

                {/* Tool Executions */}
                {m.toolResults && m.toolResults.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {m.toolResults.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] bg-blue-50/80 text-blue-700 font-mono px-2 py-0.5 rounded border border-blue-100"
                      >
                        <ShieldCheck className="h-2.5 w-2.5 text-blue-500" />
                        Tool: {t.toolName} {t.success ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                )}

                {/* Verified Source Citations */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Verified Data Sources:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {m.sources.map((src, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          <Database className="h-2.5 w-2.5 opacity-60" />
                          <span className="capitalize">{src.type}:</span>
                          <span className="font-semibold text-slate-800">{src.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Preview Card with Visible Confirmation Controls */}
                {m.actionPreview && !m.committedRecordId && !m.isActionCancelled && (
                  <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Action Required: {m.actionPreview.summary}
                      </span>
                      {m.actionPreview.isValid ? (
                        <Badge variant="success" size="sm" className="text-[10px]">
                          All Constraints Satisfied
                        </Badge>
                      ) : (
                        <Badge variant="error" size="sm" className="text-[10px]">
                          Constraint Violations
                        </Badge>
                      )}
                    </div>

                    {/* Action Details Table */}
                    <div className="bg-white/80 p-2 rounded border border-amber-200/60 text-[11px] space-y-1">
                      {Object.entries(m.actionPreview.details).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-slate-600">
                          <span className="font-medium text-slate-500 capitalize">{k}:</span>
                          <span className="font-mono text-slate-800">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Pre-flight Violations Notice */}
                    {!m.actionPreview.isValid && m.actionPreview.violations && (
                      <div className="text-[10px] text-red-600 space-y-0.5">
                        <span className="font-bold">Violations Detected:</span>
                        {m.actionPreview.violations.map((viol, i) => (
                          <div key={i}>• {viol}</div>
                        ))}
                      </div>
                    )}

                    {/* Two-Phase Confirmation Controls */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelAction(m.id)}
                        disabled={committingToken === m.actionPreview.confirmationToken}
                        className="h-7 text-[11px] px-2.5 text-slate-600"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        disabled={
                          !m.actionPreview.isValid ||
                          committingToken === m.actionPreview.confirmationToken
                        }
                        onClick={() =>
                          handleConfirmAction(m.id, m.actionPreview!.confirmationToken)
                        }
                        className="h-7 text-[11px] px-3 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {committingToken === m.actionPreview.confirmationToken ? (
                          <>
                            <span className="h-3 w-3 border-2 border-white/60 border-t-white rounded-full animate-spin mr-1.5" />
                            Revalidating & Committing...
                          </>
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Confirm & Commit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancelled State Badge */}
                {m.isActionCancelled && (
                  <div className="mt-2 p-2 rounded bg-slate-100 text-slate-500 text-[11px] flex items-center gap-1.5">
                    <X className="h-3 w-3 text-slate-400" />
                    <span>Action cancelled by coordinator. No changes were committed.</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing State */}
          {isTyping && (
            <div className="flex items-center gap-2.5 text-xs text-slate-400 pl-2">
              <span className="h-2 w-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-[rgb(var(--color-primary))] animate-bounce [animation-delay:0.4s]" />
              <span className="font-mono text-[11px] text-slate-500">{typingStep}</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts Pill Carousel */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Suggested Institutional Workflows
            </span>
            <span className="text-[10px] text-slate-400">Click to ask</span>
          </div>
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(p)}
                disabled={isTyping}
                className="text-left text-[11px] text-slate-600 hover:text-[rgb(var(--color-primary))] hover:bg-blue-50/60 p-1.5 rounded transition-colors flex items-center justify-between group"
              >
                <span className="truncate">{p}</span>
                <ArrowRight className="h-3 w-3 text-slate-300 group-hover:text-[rgb(var(--color-primary))] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Input Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask anything about schedules, rooms, conflicts..."
            disabled={isTyping}
            className="flex-1 text-xs border border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] transition-all bg-slate-50/30"
          />
          <Button
            size="sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="h-9 w-9 p-0 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
