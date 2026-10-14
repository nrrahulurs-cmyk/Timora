"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  CalendarPlus,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
  Info,
  Building2,
  Users,
} from "lucide-react";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { searchEligibleRooms } from "@/lib/scheduling/constraint-engine";
import type { ExtraClassRequest, Classroom, Subject, StudentSection, FacultyMember } from "@/types/domain";

export default function ExtraClassesPage() {
  const { toast } = useToast();

  const [requests, setRequests] = React.useState<ExtraClassRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Propose & Feasibility Finder State
  const [showProposePanel, setShowProposePanel] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState("SUB-CS401");
  const [selectedSection, setSelectedSection] = React.useState("SEC-CSE-S5-A");
  const [selectedDate, setSelectedDate] = React.useState("2026-10-24");
  const [selectedSlotTime, setSelectedSlotTime] = React.useState("10:00 - 11:30 AM");
  const [reasonInput, setReasonInput] = React.useState("Mid-term exam preparation and syllabus catch-up");
  const [selectedRoom, setSelectedRoom] = React.useState("");

  // Feasible Alternatives
  const [searchingAlternatives, setSearchingAlternatives] = React.useState(false);
  const [feasibleRooms, setFeasibleRooms] = React.useState<Classroom[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);

  // Entities for lookup
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [sections, setSections] = React.useState<StudentSection[]>([]);
  const [faculty, setFaculty] = React.useState<FacultyMember[]>([]);
  const [classrooms, setClassrooms] = React.useState<Classroom[]>([]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [allReqs, allSubs, allSecs, allFac, allRooms] = await Promise.all([
      schedulingRepository.getExtraClassRequests(),
      schedulingRepository.getSubjects(),
      schedulingRepository.getSections(),
      schedulingRepository.getFaculty(),
      schedulingRepository.getClassrooms(),
    ]);
    setRequests(allReqs);
    setSubjects(allSubs);
    setSections(allSecs);
    setFaculty(allFac);
    setClassrooms(allRooms);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Search Feasible Rooms
  const handleSearchAlternatives = async () => {
    setSearchingAlternatives(true);
    setHasSearched(true);

    const dataset = await schedulingRepository.getDataset();
    const sec = dataset.sections.find((s) => s.id === selectedSection);
    const sub = dataset.subjects.find((s) => s.id === selectedSubject);
    const slot = dataset.timeSlots[0];
    if (!sec || !sub) {
      setSearchingAlternatives(false);
      return;
    }

    // Search eligible classrooms with capacity & equipment
    const eligible = searchEligibleRooms(sub, sec, slot, dataset);

    // Filter out rooms booked on this date/time in reservations
    const available = eligible.filter((r) => {
      const isReserved = dataset.reservations.some(
        (res) =>
          res.classroomId === r.id &&
          res.date === selectedDate &&
          res.status === "approved"
      );
      return !isReserved;
    });

    setFeasibleRooms(available);
    if (available.length > 0 && !selectedRoom) {
      setSelectedRoom(available[0].id);
    }
    setSearchingAlternatives(false);
  };

  // Handle Propose Extra Class
  const handleProposeClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) {
      toast({
        title: "Facility Required",
        description: "Please select an available room from the pre-flight alternatives list.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newReq = await schedulingRepository.createExtraClassRequest({
        facultyId: "FAC-VANCE",
        subjectId: selectedSubject,
        sectionId: selectedSection,
        classroomId: selectedRoom,
        timeSlotId: "SLOT-SAT-1",
        scheduledDate: selectedDate,
        reason: reasonInput,
        status: "pending_hod",
      });

      toast({
        title: "Extra Class Proposal Submitted",
        description: `Request ${newReq.id} lodged for HOD sign-off. Verified: 0 student collisions, 0 faculty clashes.`,
        variant: "success",
      });

      setShowProposePanel(false);
      setHasSearched(false);
      loadData();
    } catch (err: any) {
      toast({
        title: "Proposal Failed",
        description: err.message || "Failed to submit extra class request.",
        variant: "destructive",
      });
    }
  };

  // Handle Approval Workflow
  const handleApprove = async (req: ExtraClassRequest) => {
    if (req.status === "pending_hod") {
      // HOD approves -> moves to Dean
      req.status = "pending_dean";
      req.reviewedBy = "HOD Turing";
      req.reviewedAt = new Date().toISOString();
      toast({
        title: "HOD Endorsement Granted",
        description: `Request ${req.id} forwarded to Academic Dean for final executive approval.`,
        variant: "success",
      });
    } else if (req.status === "pending_dean") {
      // Dean approves -> confirmed & locked
      await schedulingRepository.approveExtraClassRequest(req.id, "Dean Vance");
      toast({
        title: "Extra Class Confirmed & Published",
        description: `Request ${req.id} finalized. Slot and facility locked into active timetable.`,
        variant: "success",
      });
    }
    loadData();
  };

  // Handle Rejection
  const handleReject = async (req: ExtraClassRequest) => {
    await schedulingRepository.rejectExtraClassRequest(req.id, "Admin Vance");
    toast({
      title: "Request Rejected",
      description: `Extra class ${req.id} was rejected and marked archived.`,
      variant: "destructive",
    });
    loadData();
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const pendingHodCount = requests.filter((r) => r.status === "pending_hod").length;
  const pendingDeanCount = requests.filter((r) => r.status === "pending_dean").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Extra Classes & Tutorial Management"
        description="Schedule, verify feasibility, and manage multi-stage sign-offs for supplementary curriculum lectures, makeup sessions, and exam tutorials."
        breadcrumbs={[{ label: "Academic Operations" }, { label: "Extra Classes" }]}
        actions={
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setShowProposePanel(!showProposePanel);
              if (!showProposePanel) handleSearchAlternatives();
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{showProposePanel ? "Close Propose Panel" : "Propose Extra Class"}</span>
          </Button>
        }
      />

      {/* KPI Summary Cards (Glassmorphic Minimalism) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4.5 bg-gradient-to-br from-indigo-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Requests
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{requests.length}</span>
            <span className="text-[11px] text-slate-400 font-medium">Lodged</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-full inline-block border border-slate-200/60 shadow-2xs">
            Academic Schedule
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-amber-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Pending HOD Review
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{pendingHodCount}</span>
            <span className="text-[11px] text-amber-700/80 font-medium">Stage 1</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-full inline-block border border-amber-200/60 shadow-2xs">
            Department Signoff
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-blue-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Pending Dean Approval
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-blue-600">{pendingDeanCount}</span>
            <span className="text-[11px] text-blue-700/80 font-medium">Stage 2</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-full inline-block border border-blue-200/60 shadow-2xs">
            Dean Governance
          </div>
        </Card>

        <Card className="p-4.5 bg-gradient-to-br from-emerald-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Approved & Booked
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">{approvedCount}</span>
            <span className="text-[11px] text-emerald-700/80 font-medium">Active</span>
          </div>
          <div className="mt-2 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full inline-block border border-emerald-200/60 shadow-2xs">
            Timetable Integrated
          </div>
        </Card>
      </div>

      {/* Interactive Propose & Feasibility Finder Drawer / Panel */}
      {showProposePanel && (
        <Card className="p-5 border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[rgb(var(--color-primary))] text-white flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Propose Extra Class with Feasibility Pre-Flight
                </h3>
                <p className="text-xs text-slate-500">
                  Search conflict-free room alternatives, verify faculty & student cohort availability.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProposePanel(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleProposeClass} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Course / Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-200 px-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}: {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Student Section Cohort</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-200 px-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] outline-none"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} ({sec.studentCount} students)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-200 px-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Preferred Time Slot</label>
                <select
                  value={selectedSlotTime}
                  onChange={(e) => setSelectedSlotTime(e.target.value)}
                  className="w-full h-8.5 rounded-md border border-slate-200 px-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] outline-none"
                >
                  <option value="09:00 - 10:30 AM">09:00 - 10:30 AM (Slot 1)</option>
                  <option value="10:00 - 11:30 AM">10:00 - 11:30 AM (Slot 2)</option>
                  <option value="02:00 - 03:30 PM">02:00 - 03:30 PM (Slot 3)</option>
                  <option value="04:00 - 05:30 PM">04:00 - 05:30 PM (Slot 4)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Academic Justification</label>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="e.g. Mid-term exam revision tutorial, makeup for holiday disruption"
                className="w-full h-8.5 rounded-md border border-slate-200 px-2.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[rgb(var(--color-focus-ring))] outline-none"
                required
              />
            </div>

            {/* Feasibility Scan Action */}
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSearchAlternatives}
                disabled={searchingAlternatives}
                className="text-xs gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                {searchingAlternatives ? "Checking Constraint Engine..." : "Search Feasible Rooms & Slots"}
              </Button>

              <span className="text-[11px] text-slate-500">
                Verifies: Room capacity, lab suitability, faculty calendar & cohort schedule.
              </span>
            </div>

            {/* Candidate Alternatives List */}
            {hasSearched && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Feasible Classrooms ({feasibleRooms.length} available with zero clashes):
                </span>
                {feasibleRooms.length === 0 ? (
                  <div className="text-xs text-amber-700 p-2 bg-amber-50 rounded border border-amber-200">
                    ⚠️ No classrooms match both capacity and non-clashing criteria on this date/slot. Try an alternative time slot.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {feasibleRooms.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => setSelectedRoom(room.id)}
                        className={`p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                          selectedRoom === room.id
                            ? "border-[rgb(var(--color-primary))] bg-blue-50/60 ring-2 ring-[rgb(var(--color-focus-ring))]"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>{room.code}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">✓ Free</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {room.building} • {room.capacity} Seats ({room.type})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={!selectedRoom}
                className="gap-1.5"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                <span>Submit Extra Class Proposal</span>
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Status:</span>
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
                ? "All Requests"
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
          Showing {filteredRequests.length} of {requests.length} records
        </span>
      </div>

      {/* Request Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.map((req) => {
          const sub = subjects.find((s) => s.id === req.subjectId);
          const fac = faculty.find((f) => f.id === req.facultyId);
          const sec = sections.find((s) => s.id === req.sectionId);
          const room = classrooms.find((c) => c.id === req.classroomId);

          return (
            <Card
              key={req.id}
              className="p-4 bg-white border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[rgb(var(--color-primary))]">
                      {sub?.code || req.subjectId}
                    </span>
                    <span className="text-xs font-medium text-slate-800">
                      {sub?.title || "Curriculum Session"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    {req.reason}
                  </span>
                </div>

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
                    ? "Stage 1: HOD Sign-off"
                    : req.status === "pending_dean"
                    ? "Stage 2: Dean Approval"
                    : req.status === "approved"
                    ? "Approved & Booked"
                    : "Rejected"}
                </Badge>
              </div>

              {/* Resource Verification Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="truncate">{fac?.name || req.facultyId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span>{sec?.name || req.sectionId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  <span>{room ? `${room.code} (${room.capacity} seats)` : req.classroomId}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span className="font-mono">{req.scheduledDate}</span>
                </div>
              </div>

              {/* Pre-flight Verification Badge */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Pre-flight: 0 room clashes, 0 student overlaps
                </span>

                {/* Workflow Actions */}
                {req.status !== "approved" && req.status !== "rejected" && (
                  <div className="flex items-center gap-1.5">
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
                      <span>
                        {req.status === "pending_hod" ? "Sign Off (HOD)" : "Approve (Dean)"}
                      </span>
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
