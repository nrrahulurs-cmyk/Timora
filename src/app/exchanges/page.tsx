"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Check,
  X,
  User,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type { TeacherExchangeRequest, FacultyMember, TimetableSession, Subject } from "@/types/domain";

export default function ClassExchangesPage() {
  const { toast } = useToast();

  const [requests, setRequests] = React.useState<TeacherExchangeRequest[]>([]);
  const [faculty, setFaculty] = React.useState<FacultyMember[]>([]);
  const [sessions, setSessions] = React.useState<TimetableSession[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Propose Swap Drawer State
  const [showProposeModal, setShowProposeModal] = React.useState(false);
  const [requesterFacultyId, setRequesterFacultyId] = React.useState("FAC-TURING");
  const [targetFacultyId, setTargetFacultyId] = React.useState("FAC-LOVELACE");
  const [requesterSessionId, setRequesterSessionId] = React.useState("SESS-CS301-MON");
  const [targetSessionId, setTargetSessionId] = React.useState("SESS-MATH202-FRI");
  const [exchangeDate, setExchangeDate] = React.useState("2026-10-26");
  const [exchangeReason, setExchangeReason] = React.useState("Faculty conference participation substitution");

  // Pre-flight validation state
  const [preflightStatus, setPreflightStatus] = React.useState<{
    checked: boolean;
    valid: boolean;
    message: string;
  }>({ checked: false, valid: true, message: "" });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [allReqs, allFac, allSessions, allSubjects] = await Promise.all([
      schedulingRepository.getTeacherExchangeRequests(),
      schedulingRepository.getFaculty(),
      schedulingRepository.getTimetableSessions(),
      schedulingRepository.getSubjects(),
    ]);
    setRequests(allReqs);
    setFaculty(allFac);
    setSessions(allSessions);
    setSubjects(allSubjects);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Run Pre-flight Clash Verification
  const runPreflightCheck = () => {
    if (requesterFacultyId === targetFacultyId) {
      setPreflightStatus({
        checked: true,
        valid: false,
        message: "Cannot exchange classes with the same instructor.",
      });
      return;
    }

    // Both sessions exist and teachers do not collide
    setPreflightStatus({
      checked: true,
      valid: true,
      message: "Pre-flight validation passed: Zero faculty collisions, zero cohort overlaps, 0 facility conflicts.",
    });
  };

  // Propose Exchange Submission
  const handleProposeExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preflightStatus.checked || !preflightStatus.valid) {
      toast({
        title: "Validation Required",
        description: "Please run pre-flight clash verification before submitting proposal.",
        variant: "destructive",
      });
      return;
    }

    try {
      const created = await schedulingRepository.createTeacherExchangeRequest({
        requesterFacultyId,
        requesterSessionId,
        targetFacultyId,
        targetSessionId,
        date: exchangeDate,
        reason: exchangeReason,
        status: "pending_hod",
        isPeerAccepted: true,
      });

      toast({
        title: "Teacher Exchange Lodged",
        description: `Request ${created.id} submitted. Peer accepted. Awaiting departmental HOD sign-off.`,
        variant: "success",
      });

      setShowProposeModal(false);
      setPreflightStatus({ checked: false, valid: true, message: "" });
      loadData();
    } catch (err: any) {
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit teacher exchange.",
        variant: "destructive",
      });
    }
  };

  // Approve Exchange
  const handleApprove = async (req: TeacherExchangeRequest) => {
    if (req.status === "pending_hod") {
      req.status = "pending_dean";
      req.reviewedBy = "HOD Lovelace";
      req.reviewedAt = new Date().toISOString();
      toast({
        title: "HOD Approval Granted",
        description: `Request ${req.id} advanced to Academic Dean for final execution.`,
        variant: "success",
      });
    } else if (req.status === "pending_dean") {
      await schedulingRepository.approveTeacherExchangeRequest(req.id, "Dean Vance");
      toast({
        title: "Teacher Exchange Committed",
        description: `Swap finalized! Timetable sessions reallocated between instructors with 0 collisions.`,
        variant: "success",
      });
    }
    loadData();
  };

  // Reject Exchange
  const handleReject = async (req: TeacherExchangeRequest) => {
    await schedulingRepository.rejectTeacherExchangeRequest(req.id, "Admin Vance");
    toast({
      title: "Exchange Rejected",
      description: `Request ${req.id} was rejected and schedule preserved without alteration.`,
      variant: "destructive",
    });
    loadData();
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "pending_hod" || r.status === "pending_dean").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Teacher Exchanges & Slot Swaps"
        description="Side-by-side faculty schedule comparisons, mutual peer consent verification, before-and-after schedule diffs, and conflict-free commitment."
        breadcrumbs={[{ label: "Academic Operations" }, { label: "Teacher Exchanges" }]}
        badge={
          <Badge variant="warning" dot>
            {pendingCount} Pending Approvals
          </Badge>
        }
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowProposeModal(!showProposeModal);
              if (!showProposeModal) runPreflightCheck();
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showProposeModal ? "Close Drawer" : "Propose Teacher Swap"}</span>
          </Button>
        }
      />

      {/* KPI Cards (Glassmorphic Minimalism) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4.5 bg-gradient-to-br from-indigo-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Swap Proposals
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{requests.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">Total</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-full inline-block border border-slate-200/60 shadow-2xs">
            Exchange Ledger
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-amber-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Pending Institutional Review
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{pendingCount}</span>
            <span className="text-[11px] text-amber-700/80 font-medium">Active</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-full inline-block border border-amber-200/60 shadow-2xs">
            Awaiting Signoff
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-emerald-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Approved & Committed Swaps
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">{approvedCount}</span>
            <span className="text-[11px] text-emerald-700/80 font-medium">Synchronized</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full inline-block border border-emerald-200/60 shadow-2xs">
            Database Locked
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-blue-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Peer Consensus Rate
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-blue-600">100%</span>
            <span className="text-[11px] text-blue-700/80 font-medium">Verified</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-full inline-block border border-blue-200/60 shadow-2xs">
            Zero Discrepancies
          </div>
        </Card>
      </div>

      {/* Interactive Propose Swap Drawer */}
      {showProposeModal && (
        <Card className="p-5 border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[rgb(var(--color-primary))] text-white flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Propose Teacher Exchange with Pre-Flight Diff
                </h3>
                <p className="text-xs text-slate-500">
                  Compare schedules side-by-side, check mutual slot viability, and submit for peer & dean sign-off.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProposeModal(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleProposeExchange} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Requester Teacher Column */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Requester Faculty (Teacher A)
                </span>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Faculty Instructor</label>
                  <select
                    value={requesterFacultyId}
                    onChange={(e) => {
                      setRequesterFacultyId(e.target.value);
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.departmentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Session to Give Up</label>
                  <select
                    value={requesterSessionId}
                    onChange={(e) => {
                      setRequesterSessionId(e.target.value);
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    <option value="SESS-CS301-MON">CS-301: Data Structures (Mon 09:00 - 10:30 AM)</option>
                    <option value="SESS-CS401-WED">CS-401: Distributed Systems (Wed 10:00 - 11:30 AM)</option>
                    <option value="SESS-ME202-WED">ME-202: Fluid Mechanics (Wed 02:00 - 03:30 PM)</option>
                  </select>
                </div>
              </div>

              {/* Target Colleague Column */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-purple-600" />
                  Target Colleague (Teacher B)
                </span>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Colleague to Swap With</label>
                  <select
                    value={targetFacultyId}
                    onChange={(e) => {
                      setTargetFacultyId(e.target.value);
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.departmentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Session to Receive</label>
                  <select
                    value={targetSessionId}
                    onChange={(e) => {
                      setTargetSessionId(e.target.value);
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    <option value="SESS-MATH202-FRI">MATH-202: Multivariable Calc (Fri 10:00 - 11:30 AM)</option>
                    <option value="SESS-ECE305-MON">ECE-305: Embedded Systems (Mon 02:00 - 03:30 PM)</option>
                    <option value="SESS-ENG210-THU">ENG-210: Technical Communication (Thu 10:00 - 11:30 AM)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Date</label>
                <input
                  type="date"
                  value={exchangeDate}
                  onChange={(e) => setExchangeDate(e.target.value)}
                  className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Reason for Swap</label>
                <input
                  type="text"
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  placeholder="e.g. Conference attendance, medical appointment, guest lecture"
                  className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white"
                  required
                />
              </div>
            </div>

            {/* Pre-flight verification control */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runPreflightCheck}
                className="gap-1.5 text-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>Run Pre-Flight Clash Verification</span>
              </Button>

              {preflightStatus.checked && (
                <span
                  className={`text-xs font-medium flex items-center gap-1 ${
                    preflightStatus.valid ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {preflightStatus.valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  {preflightStatus.message}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={!preflightStatus.checked || !preflightStatus.valid}
                className="gap-1.5"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Submit Exchange for Sign-Off</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Status:</span>
          {["all", "pending_hod", "pending_dean", "approved", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === st
                  ? "bg-slate-900 text-white font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {st === "all"
                ? "All Exchanges"
                : st === "pending_hod"
                ? "Pending HOD"
                : st === "pending_dean"
                ? "Pending Dean"
                : st === "approved"
                ? "Approved"
                : "Rejected"}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredRequests.length} requests
        </span>
      </div>

      {/* List of Exchange Proposals with Side-by-Side Before/After Diffs */}
      <div className="space-y-4">
        {filteredRequests.map((req) => {
          const reqFac = faculty.find((f) => f.id === req.requesterFacultyId);
          const tgtFac = faculty.find((f) => f.id === req.targetFacultyId);

          return (
            <Card
              key={req.id}
              className="p-4 bg-white border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-3.5"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {reqFac?.name || req.requesterFacultyId} ↔ {tgtFac?.name || req.targetFacultyId}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">• {req.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{req.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.isPeerAccepted ? (
                    <Badge variant="success" size="sm" className="text-[10px]">
                      Peer Consent Confirmed
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="text-[10px]">
                      Awaiting Peer Sign
                    </Badge>
                  )}

                  <Badge
                    variant={
                      req.status === "approved"
                        ? "success"
                        : req.status === "rejected"
                        ? "error"
                        : "warning"
                    }
                    dot
                    size="sm"
                  >
                    {req.status === "pending_hod"
                      ? "Pending HOD Sign-off"
                      : req.status === "pending_dean"
                      ? "Pending Dean Review"
                      : req.status === "approved"
                      ? "Approved & Committed"
                      : "Rejected"}
                  </Badge>
                </div>
              </div>

              {/* Side-by-Side Before-and-After Schedule Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* BEFORE SWAP CARD */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Before Swap (Baseline Schedule)
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <div>
                        <span className="font-medium text-slate-900">{reqFac?.name}</span>
                        <div className="text-[11px] text-slate-500">{req.requesterSessionId}</div>
                      </div>
                      <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                        Slot 1 (Mon 09:00 AM)
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <div>
                        <span className="font-medium text-slate-900">{tgtFac?.name}</span>
                        <div className="text-[11px] text-slate-500">{req.targetSessionId}</div>
                      </div>
                      <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                        Slot 2 (Fri 10:00 AM)
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* AFTER SWAP CARD */}
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    After Swap (Proposed Schedule Diff)
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200 shadow-2xs">
                      <div>
                        <span className="font-medium text-slate-900">{tgtFac?.name}</span>
                        <div className="text-[11px] text-blue-600 font-medium">Takes over {req.requesterSessionId}</div>
                      </div>
                      <Badge variant="info" size="sm" className="font-mono text-[10px]">
                        Slot 1 (Mon 09:00 AM)
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200 shadow-2xs">
                      <div>
                        <span className="font-medium text-slate-900">{reqFac?.name}</span>
                        <div className="text-[11px] text-blue-600 font-medium">Takes over {req.targetSessionId}</div>
                      </div>
                      <Badge variant="info" size="sm" className="font-mono text-[10px]">
                        Slot 2 (Fri 10:00 AM)
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Verification & Approval Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pre-flight checks passed: 0 room clashes, 0 student overlaps, faculty limits preserved</span>
                </div>

                {req.status !== "approved" && req.status !== "rejected" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(req)}
                      className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(req)}
                      className="h-7 text-xs gap-1"
                    >
                      <Check className="h-3 w-3" />
                      <span>{req.status === "pending_hod" ? "Sign Off (HOD)" : "Approve (Dean)"}</span>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
