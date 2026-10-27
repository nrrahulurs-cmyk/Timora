"use client";
import * as React from "react";
import { CalendarPlus, Search, CheckCircle2, XCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/feedback/use-toast";
import { useAuth } from "@/lib/auth/auth-context";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { prepareExtraClass } from "@/lib/scheduling/extra-class";
import type { SynapseCollegeDataset, ExtraClassRequest } from "@/types/domain";

export default function ExtraClassesPage() {
  const { user, role } = useAuth(); const { toast } = useToast();
  const [data, setData] = React.useState<SynapseCollegeDataset | null>(null);
  const [error, setError] = React.useState(""); const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false); const [filter, setFilter] = React.useState("all"); const [busy, setBusy] = React.useState(false);
  const [assignmentId, setAssignmentId] = React.useState(""); const [date, setDate] = React.useState(() => new Date().toLocaleDateString("en-CA"));
  const [slotId, setSlotId] = React.useState(""); const [roomId, setRoomId] = React.useState(""); const [reason, setReason] = React.useState("");
  const [available, setAvailable] = React.useState<string[] | null>(null);
  const load = React.useCallback(async () => { setLoading(true); setError(""); try { setData(await schedulingRepository.getDataset()); } catch(error) { setError(error instanceof Error ? error.message : "Could not load extra classes."); } finally { setLoading(false); } }, []);
  React.useEffect(() => { void load(); const reload = () => { void load(); }; window.addEventListener("timora:data-changed", reload); return () => window.removeEventListener("timora:data-changed", reload); }, [load]);
  const assignments = data?.teachingAssignments.filter(item => role !== "faculty_instructor" || data.faculty.find(faculty => faculty.id === item.facultyId)?.userId === user?.id) || [];
  const assignment = assignments.find(item => item.id === assignmentId);
  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) : "";
  const slots = data?.timeSlots.filter(item => item.dayOfWeek === weekday) || [];
  function invalidate() { setAvailable(null); setRoomId(""); }
  async function search() {
    if (!assignment || !slotId) { setError("Choose a teaching assignment, date and time slot first."); return; }
    setBusy(true); setError("");
    try {
      const fresh = await schedulingRepository.getDataset(); setData(fresh);
      const matches = fresh.classrooms.filter(room => { try { return prepareExtraClass(fresh, { ...assignment, classroomId: room.id, timeSlotId: slotId, scheduledDate: date, reason: "Check extra-class feasibility" }).isValid; } catch { return false; } }).map(room => room.id);
      setAvailable(matches); setRoomId("");
    } catch(error) { setError(error instanceof Error ? error.message : "Availability could not be checked."); }
    finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!assignment || !roomId) return; setBusy(true); setError("");
    try {
      const request = await schedulingRepository.createExtraClassRequest({ facultyId: assignment.facultyId, subjectId: assignment.subjectId, sectionId: assignment.sectionId, classroomId: roomId, timeSlotId: slotId, scheduledDate: date, reason, status: "pending_hod" });
      const persisted = await schedulingRepository.getExtraClassRequests();
      if (!persisted.some(item => item.id === request.id)) throw new Error("Could not verify the saved request. Refresh before retrying.");
      toast({ title: "Extra-class request submitted", description: `${request.id} is awaiting department review. The room has not been reserved.`, variant: "success" }); setOpen(false); invalidate(); await load();
    } catch(error) { setError(error instanceof Error ? error.message : "The request was not saved."); }
    finally { setBusy(false); }
  }
  async function review(request: ExtraClassRequest, reject = false) {
    setBusy(true); setError("");
    try {
      const result = reject ? await schedulingRepository.rejectExtraClassRequest(request.id, user?.fullName || "Reviewer") : request.status === "pending_hod" ? await schedulingRepository.advanceExtraClassRequest(request.id, user?.fullName || "Reviewer") : await schedulingRepository.approveExtraClassRequest(request.id, user?.fullName || "Reviewer");
      if (!result) throw new Error("The request changed or no longer exists. Refresh and try again.");
      await load(); toast({ title: reject ? "Request rejected" : request.status === "pending_hod" ? "Forwarded for final review" : "Extra class added to the draft", description: "The updated status has been saved.", variant: "success" });
    } catch(error) { setError(error instanceof Error ? error.message : "The review was not saved."); }
    finally { setBusy(false); }
  }
  const canPropose = ["academic_admin", "dean", "timetable_coordinator", "faculty_instructor"].includes(role);
  const canReview = ["academic_admin", "dean", "timetable_coordinator", "department_head"].includes(role);
  const requests = data?.extraClassRequests.filter(request => filter === "all" || request.status === filter) || [];
  const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800";
  return <div className="space-y-6 pb-8"><WorkspaceHeader title="Extra classes" subtitle="Find a feasible time, request department review, and add approved classes to the draft timetable." actions={canPropose && <Button className="rounded-full" onClick={() => setOpen(value => !value)}><CalendarPlus size={15} className="mr-2" />Request extra class</Button>} />
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="max-w-[75ch]">{error}</p><Button size="sm" variant="outline" onClick={() => void load()}>Reload records</Button></div>}
    {open && <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white/90 p-5 sm:p-6"><div><h2 className="text-lg font-semibold">Plan an extra class</h2><p className="mt-1 text-xs leading-relaxed text-secondary">Availability includes the instructor, students, room capacity, equipment and date-specific reservations. It will be checked again at final approval.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">Teaching assignment<select required value={assignmentId} className={inputClass} onChange={event => { setAssignmentId(event.target.value); invalidate(); }}><option value="">Choose course, section and instructor</option>{assignments.map(item => <option key={item.id} value={item.id}>{data?.subjects.find(subject => subject.id === item.subjectId)?.code} · {data?.sections.find(section => section.id === item.sectionId)?.sectionCode} · {data?.faculty.find(faculty => faculty.id === item.facultyId)?.name}</option>)}</select></label><label className="text-xs font-medium">Date<input required type="date" value={date} className={inputClass} onChange={event => { setDate(event.target.value); setSlotId(""); invalidate(); }} /></label><label className="text-xs font-medium">Time slot<select required value={slotId} className={inputClass} onChange={event => { setSlotId(event.target.value); invalidate(); }}><option value="">Choose an institutional time slot</option>{slots.map(slot => <option key={slot.id} value={slot.id}>{slot.dayOfWeek} · {slot.startTime}–{slot.endTime}</option>)}</select></label><label className="text-xs font-medium">Reason<input required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="What does this class help students complete?" className={inputClass} /></label></div><Button variant="outline" type="button" disabled={busy || !assignment || !slotId} onClick={() => void search()} className="rounded-full"><Search size={14} className="mr-2" />{busy ? "Checking…" : "Find feasible rooms"}</Button>
    {available !== null && <div className="border-t pt-4"><p className="mb-3 text-xs text-secondary">{available.length ? `${available.length} rooms satisfy the checked constraints. Choose one to request.` : "No room satisfies all constraints for this assignment and time. Try another time slot."}</p><div className="grid gap-2 sm:grid-cols-3">{available.map(id => { const room = data?.classrooms.find(item => item.id === id); return <label key={id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs ${roomId === id ? "border-[#b7442d] bg-[#fff5ee]" : "border-slate-200"}`}><input type="radio" name="room" value={id} checked={roomId === id} onChange={() => setRoomId(id)} /><span><strong className="block">{room?.code}</strong><span className="mt-1 block text-secondary">{room?.capacity} seats · {room?.type}</span></span></label>; })}</div></div>}
    <div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || !roomId || reason.trim().length < 5} type="submit">Submit for department review<ArrowRight size={14} className="ml-2" /></Button></div></form>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter requests">{["all", "pending_hod", "pending_dean", "approved", "rejected"].map(status => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-full border px-4 py-2 text-xs ${filter === status ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{({ all: "All requests", pending_hod: "Department review", pending_dean: "Final review", approved: "Approved", rejected: "Rejected" })[status as "all"]}</button>)}</div>
    {loading && !data ? <p role="status" className="flex items-center gap-2 p-8 text-sm text-secondary"><LoaderCircle size={16} className="animate-spin" />Loading requests…</p> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90">{requests.length ? requests.map(request => { const slot = data?.timeSlots.find(item => item.id === request.timeSlotId); const pending = ["pending_hod", "pending_dean"].includes(request.status); return <article key={request.id} className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 last:border-0 xl:flex-row xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{data?.subjects.find(item => item.id === request.subjectId)?.code} · {data?.sections.find(item => item.id === request.sectionId)?.sectionCode}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] capitalize">{request.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-xs text-secondary">{request.scheduledDate} · {slot?.startTime}–{slot?.endTime} · {data?.classrooms.find(item => item.id === request.classroomId)?.code} · {data?.faculty.find(item => item.id === request.facultyId)?.name}</p><p className="mt-2 text-xs leading-relaxed">{request.reason}</p><p className="mt-2 text-[10px] text-secondary">{request.id}</p></div>{canReview && pending && <div className="flex shrink-0 gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => void review(request,true)}><XCircle size={14} className="mr-1.5" />Reject</Button>{(request.status === "pending_hod" || role !== "department_head") && <Button size="sm" disabled={busy} onClick={() => void review(request)}><CheckCircle2 size={14} className="mr-1.5" />{request.status === "pending_hod" ? "Forward for final review" : "Approve & add class"}</Button>}</div>}</article>; }) : <p className="p-10 text-center text-sm text-secondary">No requests in this stage.</p>}</div>}
  </div>;
}
