"use client";

import * as React from "react";
import {
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Star,
  Lock,
  Check,
  Save,
  RotateCcw,
  ExternalLink,
  BookOpen,
  MapPin,
  Info,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type {
  FacultyMember,
  FacultyAvailabilityPattern,
  DayOfWeek,
  TimeSlot,
  TimetableSession,
  Subject,
  StudentSection,
  Classroom,
} from "@/types/domain";
import type { HardViolation } from "@/lib/scheduling/constraint-engine";
import Link from "next/link";

interface FacultyAvailabilityDrawerProps {
  faculty: FacultyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvailabilityUpdated?: (updatedFaculty: FacultyMember) => void;
}

const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function FacultyAvailabilityDrawer({
  faculty,
  open,
  onOpenChange,
  onAvailabilityUpdated,
}: FacultyAvailabilityDrawerProps) {
  const { toast } = useToast();

  const [patterns, setPatterns] = React.useState<FacultyAvailabilityPattern[]>([]);
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([]);
  const [sessions, setSessions] = React.useState<TimetableSession[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [sections, setSections] = React.useState<StudentSection[]>([]);
  const [classrooms, setClassrooms] = React.useState<Classroom[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Impact & Safety Dialog
  const [safetyModalOpen, setSafetyModalOpen] = React.useState(false);
  const [safetyViolations, setSafetyViolations] = React.useState<HardViolation[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Initial load
  React.useEffect(() => {
    if (faculty && open) {
      // Deep clone existing availability patterns
      setPatterns(JSON.parse(JSON.stringify(faculty.availability || [])));

      setLoading(true);
      Promise.all([
        schedulingRepository.getTimeSlots(),
        schedulingRepository.getTimetableSessions({ facultyId: faculty.id }),
        schedulingRepository.getSubjects(),
        schedulingRepository.getSections(),
        schedulingRepository.getClassrooms(),
      ])
        .then(([slots, sess, subs, secs, rooms]) => {
          setTimeSlots(slots);
          setSessions(sess.filter((s) => s.status !== "cancelled"));
          setSubjects(subs);
          setSections(secs);
          setClassrooms(rooms);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load faculty availability context:", err);
          setLoading(false);
        });
    }
  }, [faculty, open]);

  if (!faculty) return null;

  // Group slots by index
  const slotIndices = Array.from(new Set(timeSlots.map((s) => s.slotIndex))).sort((a, b) => a - b);

  // Helper to get or initialize pattern for day
  const getDayPattern = (day: DayOfWeek): FacultyAvailabilityPattern => {
    const existing = patterns.find((p) => p.dayOfWeek === day);
    if (existing) return existing;
    return {
      dayOfWeek: day,
      availableSlotIds: [],
      preferredSlotIds: [],
      blockedSlotIds: [],
      maxHoursPerDay: 4,
    };
  };

  // Helper to determine slot state for day
  const getSlotStatus = (day: DayOfWeek, slotId: string): "available" | "preferred" | "blocked" | "neutral" => {
    const pattern = patterns.find((p) => p.dayOfWeek === day);
    if (!pattern) return "neutral";
    if (pattern.blockedSlotIds.includes(slotId)) return "blocked";
    if (pattern.preferredSlotIds.includes(slotId)) return "preferred";
    if (pattern.availableSlotIds.includes(slotId)) return "available";
    return "neutral";
  };

  // Cycle status: neutral -> available -> preferred -> blocked -> neutral
  const cycleSlotStatus = (day: DayOfWeek, slotId: string) => {
    const current = getSlotStatus(day, slotId);
    let next: "available" | "preferred" | "blocked" | "neutral" = "available";
    if (current === "available") next = "preferred";
    else if (current === "preferred") next = "blocked";
    else if (current === "blocked") next = "neutral";
    else next = "available";

    setPatterns((prev) => {
      const copy = [...prev];
      let dayIndex = copy.findIndex((p) => p.dayOfWeek === day);
      if (dayIndex === -1) {
        copy.push({
          dayOfWeek: day,
          availableSlotIds: [],
          preferredSlotIds: [],
          blockedSlotIds: [],
          maxHoursPerDay: 4,
        });
        dayIndex = copy.length - 1;
      }

      const p = { ...copy[dayIndex] };
      // Remove from all
      p.availableSlotIds = p.availableSlotIds.filter((id) => id !== slotId);
      p.preferredSlotIds = p.preferredSlotIds.filter((id) => id !== slotId);
      p.blockedSlotIds = p.blockedSlotIds.filter((id) => id !== slotId);

      if (next === "available") {
        p.availableSlotIds.push(slotId);
      } else if (next === "preferred") {
        p.availableSlotIds.push(slotId);
        p.preferredSlotIds.push(slotId);
      } else if (next === "blocked") {
        p.blockedSlotIds.push(slotId);
      }

      copy[dayIndex] = p;
      return copy;
    });
  };

  // Check if a timetable session is scheduled in this day/slot
  const getSessionInSlot = (day: DayOfWeek, slotId: string): TimetableSession | undefined => {
    return sessions.find((s) => s.timeSlotId === slotId);
  };

  // Pre-save safety validation
  const handlePreSave = async () => {
    try {
      setSaving(true);
      const impact = await schedulingRepository.checkFacultyAvailabilityImpact(faculty.id, patterns);
      if (impact.introducedViolations.length > 0) {
        setSafetyViolations(impact.introducedViolations);
        setSafetyModalOpen(true);
        setSaving(false);
        return;
      }
      await commitAvailability();
    } catch (err: any) {
      toast({
        title: "Validation Error",
        description: err.message || "Failed to validate availability patterns.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  const commitAvailability = async () => {
    setSaving(true);
    try {
      const res = await schedulingRepository.updateFacultyAvailability(faculty.id, patterns);
      toast({
        title: "Availability Patterns Persisted",
        description: `Weekly availability updated for ${faculty.name}.`,
        variant: "success",
      });

      if (onAvailabilityUpdated) {
        onAvailabilityUpdated({ ...faculty, availability: patterns });
      }
      setSafetyModalOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to save availability rules.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToOriginal = () => {
    setPatterns(JSON.parse(JSON.stringify(faculty.availability || [])));
    toast({
      title: "Changes Reset",
      description: "Restored faculty availability to stored state.",
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-3xl md:max-w-4xl p-0 flex flex-col h-full bg-slate-50/50">
          {/* Header */}
          <SheetHeader className="p-5 pb-4 bg-white border-b border-slate-200/80 shrink-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F0EEFF] text-[#5B4DF5] font-bold text-base flex items-center justify-center shrink-0 border border-[#E1DEFF] shadow-2xs">
                  {faculty.name
                    .replace("Dr. ", "")
                    .replace("Prof. ", "")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-base font-bold text-slate-900">{faculty.name}</SheetTitle>
                    <Badge variant="outline" size="sm" className="font-mono text-xs bg-slate-100 text-slate-700 border-slate-200">
                      {faculty.employeeCode}
                    </Badge>
                    <Badge
                      variant={faculty.status === "active" ? "success" : "secondary"}
                      size="sm"
                      dot
                    >
                      {faculty.status}
                    </Badge>
                  </div>
                  <SheetDescription className="text-xs text-slate-500 mt-0.5">
                    {faculty.designation} • Department ID: {faculty.departmentId} • Workload: {sessions.length * 1.5} / {faculty.maxCreditHours} hrs
                  </SheetDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/timetable?facultyId=${faculty.id}`}
                  className="px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>View Timetable Matrix</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Link>
              </div>
            </div>

            {/* Availability Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Rule States:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                <span className="text-slate-700 font-medium">Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-500 ring-2 ring-purple-100" />
                <span className="text-slate-700 font-medium">Preferred (⭐ Priority)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-100" />
                <span className="text-slate-700 font-medium">Blocked (Senate / Duty)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-600 ring-2 ring-indigo-200" />
                <span className="text-slate-700 font-medium">Active Teaching Commitment</span>
              </div>
            </div>
          </SheetHeader>

          {/* Interactive Weekly Availability Matrix */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Weekly Availability Grid (Term: Spring 2026)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any slot cell to cycle rule state: Available ➔ Preferred ➔ Blocked ➔ Neutral.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToOriginal}
                    className="h-7 text-xs px-2.5 font-semibold text-slate-600 gap-1 rounded-full"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="p-16 text-center text-xs text-slate-400">Loading schedule matrix...</div>
              ) : (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-28">Time Slot</th>
                        {WEEKDAYS.map((day) => (
                          <th key={day} className="py-2.5 px-3 min-w-[130px]">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slotIndices.map((idx) => {
                        const representativeSlot = timeSlots.find((s) => s.slotIndex === idx);
                        const timeRange = representativeSlot
                          ? `${representativeSlot.startTime} – ${representativeSlot.endTime}`
                          : `Slot ${idx}`;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 bg-slate-50/40 border-r border-slate-200/70 font-mono text-xs text-slate-700 font-semibold align-middle">
                              <div>Slot {idx}</div>
                              <div className="text-slate-500 text-xs font-normal">{timeRange}</div>
                            </td>

                            {WEEKDAYS.map((day) => {
                              const slot = timeSlots.find(
                                (s) => s.dayOfWeek === day && s.slotIndex === idx
                              );
                              if (!slot) {
                                return (
                                  <td key={day} className="py-2.5 px-2.5 bg-slate-50/20 text-slate-300 text-center">
                                    —
                                  </td>
                                );
                              }

                              const status = getSlotStatus(day, slot.id);
                              const session = getSessionInSlot(day, slot.id);
                              const subject = session ? subjects.find((s) => s.id === session.subjectId) : null;
                              const section = session ? sections.find((s) => s.id === session.sectionId) : null;
                              const room = session ? classrooms.find((c) => c.id === session.classroomId) : null;

                              const isClashWithBlocked = session && status === "blocked";

                              return (
                                <td key={day} className="py-2.5 px-2.5 align-top">
                                  <div
                                    onClick={() => cycleSlotStatus(day, slot.id)}
                                    className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer select-none space-y-1.5 ${
                                      isClashWithBlocked
                                        ? "bg-rose-50 border-rose-400 ring-2 ring-rose-300/60 shadow-xs"
                                        : session
                                        ? "bg-indigo-50/80 border-indigo-200 hover:border-indigo-300 shadow-2xs"
                                        : status === "preferred"
                                        ? "bg-purple-50/70 border-purple-200 text-purple-900 shadow-2xs"
                                        : status === "blocked"
                                        ? "bg-rose-50/70 border-rose-200 text-rose-800 shadow-2xs"
                                        : status === "available"
                                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs"
                                        : "bg-slate-50/60 border-slate-200/70 text-slate-400 hover:bg-slate-100"
                                    }`}
                                  >
                                    {/* Slot Rule Status Pill */}
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-mono text-xs font-semibold">
                                        {status === "preferred" ? (
                                          <span className="text-purple-700 flex items-center gap-0.5">
                                            <Star className="h-3 w-3 fill-purple-500 text-purple-500" />
                                            <span>Preferred</span>
                                          </span>
                                        ) : status === "blocked" ? (
                                          <span className="text-rose-700 flex items-center gap-0.5">
                                            <Lock className="h-3 w-3 text-rose-600" />
                                            <span>Blocked</span>
                                          </span>
                                        ) : status === "available" ? (
                                          <span className="text-emerald-700 flex items-center gap-0.5">
                                            <Check className="h-3 w-3 text-emerald-600" />
                                            <span>Available</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">Unspecified</span>
                                        )}
                                      </span>
                                    </div>

                                    {/* Active Scheduled Class Banner if present */}
                                    {session && (
                                      <div className={`p-1.5 rounded-lg border text-xs ${
                                        isClashWithBlocked
                                          ? "bg-rose-100/80 border-rose-300 text-rose-950 font-bold"
                                          : "bg-white/90 border-indigo-200 text-indigo-950"
                                      }`}>
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono font-bold text-slate-900">{subject?.code}</span>
                                          <span className="text-xs text-slate-500 font-mono">{room?.code}</span>
                                        </div>
                                        <div className="text-slate-600 truncate text-xs mt-0.5">
                                          Sec: {section?.sectionCode}
                                        </div>
                                        {isClashWithBlocked && (
                                          <div className="text-rose-700 font-bold text-xs mt-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                                            <span>Hard Conflict!</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Information Notice */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Integrity Rule: Active Class Protection</strong>
                <span>
                  Marking an interval as <strong>Blocked</strong> when an active teaching commitment is scheduled introduces an institutional Hard Constraint Violation (<code>faculty_hard_availability</code>). The system requires explicit confirmation and logs an audit record before saving.
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500">
              {patterns.reduce((acc, p) => acc + p.blockedSlotIds.length, 0)} Blocked Slots • {patterns.reduce((acc, p) => acc + p.preferredSlotIds.length, 0)} Preferred
            </span>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9 px-4 rounded-full"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handlePreSave}
                disabled={saving}
                className="text-xs h-9 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-1.5 shadow-sm"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Persisting..." : "Save Availability Rules"}</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Safety Impact Confirmation Dialog */}
      <ConfirmDialog
        open={safetyModalOpen}
        onOpenChange={setSafetyModalOpen}
        title="Institutional Safety Warning: Scheduling Conflict"
        description={`Saving this availability configuration introduces ${safetyViolations.length} Hard Constraint Violation(s). Dr. ${faculty.name} is currently scheduled to teach active curriculum classes during the newly blocked periods. Do you want to proceed and flag these sessions for administrative rescheduling?`}
        confirmLabel="Confirm & Flag Sessions for Rescheduling"
        cancelLabel="Review & Abort"
        variant="danger"
        loading={saving}
        onConfirm={commitAvailability}
      />
    </>
  );
}
