"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
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
import type { TeacherExchangeRequest, FacultyMember, TimetableSession, Subject, TimeSlot } from "@/types/domain";

export default function ClassExchangesPage() {
  const { toast } = useToast();

  const [requests, setRequests] = React.useState<TeacherExchangeRequest[]>([]);
  const [faculty, setFaculty] = React.useState<FacultyMember[]>([]);
  const [sessions, setSessions] = React.useState<TimetableSession[]>([]);
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Propose Swap Drawer State
  const [showProposeModal, setShowProposeModal] = React.useState(false);
  const [requesterFacultyId, setRequesterFacultyId] = React.useState("");
  const [targetFacultyId, setTargetFacultyId] = React.useState("");
  const [requesterSessionId, setRequesterSessionId] = React.useState("");
  const [targetSessionId, setTargetSessionId] = React.useState("");
  const [exchangeDate, setExchangeDate] = React.useState("");
  const [exchangeReason, setExchangeReason] = React.useState("");

  // Pre-flight validation state
  const [preflightStatus, setPreflightStatus] = React.useState<{
    checked: boolean;
    valid: boolean;
    message: string;
  }>({ checked: false, valid: true, message: "" });

  const loadData = React.useCallback(async () => {
    setLoadError("");
    try {
      const [allReqs, allFac, allSessions, allSubjects, allTimeSlots] = await Promise.all([
        schedulingRepository.getTeacherExchangeRequests(),
        schedulingRepository.getFaculty(),
        schedulingRepository.getTimetableSessions(),
        schedulingRepository.getSubjects(),
        schedulingRepository.getTimeSlots(),
      ]);
      setRequests(allReqs);
      setFaculty(allFac);
      setSessions(allSessions);
      setSubjects(allSubjects);
      setTimeSlots(allTimeSlots);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Exchange records could not be loaded.");
    } finally {
      setLoading(false);
    }
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

    const first = sessions.find(session => session.id === requesterSessionId && session.facultyId === requesterFacultyId && session.status !== "cancelled");
    const second = sessions.find(session => session.id === targetSessionId && session.facultyId === targetFacultyId && session.status !== "cancelled");
    const weekday = /^\d{4}-\d{2}-\d{2}$/.test(exchangeDate) ? new Date(`${exchangeDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" }) : "";
    const firstSlot = timeSlots.find(slot => slot.id === first?.timeSlotId);
    const secondSlot = timeSlots.find(slot => slot.id === second?.timeSlotId);
    const matchingDate = Boolean(first && second && weekday && firstSlot?.dayOfWeek === weekday && secondSlot && first.academicTermId === second.academicTermId && exchangeDate >= first.effectiveFrom && exchangeDate <= first.effectiveUntil);
    setPreflightStatus({
      checked: true,
      valid: Boolean(first && second && first.id !== second.id && matchingDate),
      message: !first || !second || first.id === second.id ? "Choose two different active sessions belonging to the selected instructors." : !matchingDate ? "The selected date must be a scheduled occurrence of the requester's class, and both sessions must belong to the same term." : "Requester session and date checked. The other occurrence, peer consent and conflicts still require validation before applying.",
    });
  };

  // Propose Exchange Submission
  const handleProposeExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preflightStatus.checked || !preflightStatus.valid) {
      toast({
        title: "Validation Required",
        description: "Check the selected sessions and date before submitting a request.",
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
        isPeerAccepted: false,
      });

      toast({
        title: "Teacher Exchange Lodged",
        description: `Request ${created.id} submitted for review. Peer consent has not been recorded.`,
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

  // Reject Exchange
  const handleReject = async (req: TeacherExchangeRequest) => {
    try {
      await schedulingRepository.rejectTeacherExchangeRequest(req.id, "Reviewer");
      toast({ title: "Exchange Rejected", description: `Request ${req.id} was rejected and the timetable was not changed.`, variant: "success" });
      await loadData();
    } catch (error) {
      toast({ title: "Rejection failed", description: error instanceof Error ? error.message : "Could not save the decision.", variant: "destructive" });
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests.filter((r) => r.status === "pending_hod" || r.status === "pending_dean").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const peerAcceptedCount = requests.filter((r) => r.isPeerAccepted).length;
  const sessionLabel = (id: string) => {
    const session = sessions.find(item => item.id === id);
    const subject = subjects.find(item => item.id === session?.subjectId);
    const slot = timeSlots.find(item => item.id === session?.timeSlotId);
    return `${subject?.code ?? id} · ${slot ? `${slot.dayOfWeek} ${slot.startTime}–${slot.endTime}` : "time unavailable"}`;
  };

  if (loading) return <div role="status" className="p-8 text-sm text-slate-600">Loading exchange records…</div>;
  if (loadError) return <div role="alert" className="space-y-3 p-8 text-sm text-rose-800"><p>Exchange records could not be loaded: {loadError}</p><Button variant="outline" onClick={() => void loadData()}>Try again</Button></div>;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Teacher Exchanges & Slot Swaps"
        description="Review faculty exchange requests. Applying an exchange is unavailable until peer consent and date-specific timetable exceptions are supported."
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
            Approved Requests
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">{approvedCount}</span>
            <span className="text-[11px] text-emerald-700/80 font-medium">Recorded</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full inline-block border border-emerald-200/60 shadow-2xs">
            Legacy approvals; verify timetable separately
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-blue-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Peer Consent Recorded
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-blue-600">{peerAcceptedCount}</span>
            <span className="text-[11px] text-blue-700/80 font-medium">of {requests.length}</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-full inline-block border border-blue-200/60 shadow-2xs">
            From stored request records
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
                  Propose Teacher Exchange
                </h3>
                <p className="text-xs text-slate-500">
                  Select two real sessions and a date. This records a request; an exchange cannot be applied yet.
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
                  <label htmlFor="exchange-requester-faculty" className="text-[11px] font-medium text-slate-600">Faculty Instructor</label>
                  <select
                    id="exchange-requester-faculty"
                    value={requesterFacultyId}
                    onChange={(e) => {
                      setRequesterFacultyId(e.target.value);
                      setRequesterSessionId("");
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    <option value="">Choose faculty</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.departmentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="exchange-requester-session" className="text-[11px] font-medium text-slate-600">Session to Give Up</label>
                  <select
                    id="exchange-requester-session"
                    value={requesterSessionId}
                    onChange={(e) => {
                      setRequesterSessionId(e.target.value);
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    <option value="">Choose session</option>
                    {sessions.filter(item => item.facultyId === requesterFacultyId && item.status !== "cancelled").map(item => <option key={item.id} value={item.id}>{sessionLabel(item.id)}</option>)}
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
                  <label htmlFor="exchange-target-faculty" className="text-[11px] font-medium text-slate-600">Colleague to Swap With</label>
                  <select
                    id="exchange-target-faculty"
                    value={targetFacultyId}
                    onChange={(e) => {
                      setTargetFacultyId(e.target.value);
                      setTargetSessionId("");
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    <option value="">Choose colleague</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.departmentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="exchange-target-session" className="text-[11px] font-medium text-slate-600">Session to Receive</label>
                  <select
                    id="exchange-target-session"
                    value={targetSessionId}
                    onChange={(e) => {
                      setTargetSessionId(e.target.value);
                      setPreflightStatus({ checked: false, valid: true, message: "" });
                    }}
                    className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white text-slate-800"
                  >
                    <option value="">Choose session</option>
                    {sessions.filter(item => item.facultyId === targetFacultyId && item.status !== "cancelled").map(item => <option key={item.id} value={item.id}>{sessionLabel(item.id)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="exchange-date" className="text-xs font-semibold text-slate-700">Target Date</label>
                <input
                  id="exchange-date"
                  type="date"
                  value={exchangeDate}
                  onChange={(e) => { setExchangeDate(e.target.value); setPreflightStatus({ checked: false, valid: true, message: "" }); }}
                  className="w-full h-8 rounded border border-slate-200 px-2 text-xs bg-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="exchange-reason" className="text-xs font-semibold text-slate-700">Reason for Swap</label>
                <input
                  id="exchange-reason"
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
                <span>Check Request Details</span>
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
                      ? "Approved request · application unverified"
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
                      <Badge variant="neutral" size="sm" className="font-mono text-[10px]">{sessionLabel(req.requesterSessionId)}</Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <div>
                        <span className="font-medium text-slate-900">{tgtFac?.name}</span>
                        <div className="text-[11px] text-slate-500">{req.targetSessionId}</div>
                      </div>
                      <Badge variant="neutral" size="sm" className="font-mono text-[10px]">{sessionLabel(req.targetSessionId)}</Badge>
                    </div>
                  </div>
                </div>

                {/* AFTER SWAP CARD */}
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    Proposed exchange · not applied
                  </span>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200 shadow-2xs">
                      <div>
                        <span className="font-medium text-slate-900">{tgtFac?.name}</span>
                        <div className="text-[11px] text-blue-600 font-medium">Takes over {req.requesterSessionId}</div>
                      </div>
                      <Badge variant="info" size="sm" className="font-mono text-[10px]">{sessionLabel(req.requesterSessionId)}</Badge>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200 shadow-2xs">
                      <div>
                        <span className="font-medium text-slate-900">{reqFac?.name}</span>
                        <div className="text-[11px] text-blue-600 font-medium">Takes over {req.targetSessionId}</div>
                      </div>
                      <Badge variant="info" size="sm" className="font-mono text-[10px]">{sessionLabel(req.targetSessionId)}</Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Verification & Approval Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="text-[11px] text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Peer consent and date-specific conflict checks are required before applying.</span>
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
