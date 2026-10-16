"use client";

import * as React from "react";
import {
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Wrench,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Edit3,
  X,
  Save,
  Check,
  AlertCircle,
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
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/feedback/use-toast";
import {
  schedulingRepository,
  type RoomRecord,
} from "@/lib/repository/scheduling-repository";
import type {
  Classroom,
  RoomType,
  RoomEquipmentType,
  TimetableSession,
  Subject,
  StudentSection,
  FacultyMember,
  TimeSlot,
} from "@/types/domain";
import Link from "next/link";

interface RoomDrawerProps {
  room: Classroom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomUpdated?: (updatedRoom: Classroom) => void;
}

const ALL_EQUIPMENT: { id: RoomEquipmentType; label: string }[] = [
  { id: "smart_projector", label: "Smart 4K Laser Projector" },
  { id: "dual_displays", label: "Dual Interactive Displays" },
  { id: "high_spec_workstations", label: "High-Spec GPU Workstations" },
  { id: "sound_reinforcement_mic", label: "Array Mic Sound System" },
  { id: "bio_safety_cabinet_l2", label: "BSL-2 Biosafety Containment" },
  { id: "bio_safety_cabinet_l3", label: "BSL-3 Biosafety Overhaul" },
  { id: "fluid_dynamics_flume", label: "Fluid Dynamics Flume Tank" },
  { id: "air_conditioning", label: "Central HVAC / AC" },
  { id: "document_camera", label: "High-Res Document Camera" },
];

export function RoomDrawer({
  room,
  open,
  onOpenChange,
  onRoomUpdated,
}: RoomDrawerProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState<"specs" | "schedule" | "edit">("specs");
  const [sessions, setSessions] = React.useState<TimetableSession[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [sections, setSections] = React.useState<StudentSection[]>([]);
  const [faculty, setFaculty] = React.useState<FacultyMember[]>([]);
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = React.useState(false);

  // Edit Form State
  const [name, setName] = React.useState("");
  const [building, setBuilding] = React.useState("");
  const [floor, setFloor] = React.useState(1);
  const [capacity, setCapacity] = React.useState(60);
  const [roomType, setRoomType] = React.useState<RoomType>("Standard Classroom");
  const [status, setStatus] = React.useState<Classroom["status"]>("Available");
  const [equipment, setEquipment] = React.useState<RoomEquipmentType[]>([]);
  const [isAccessible, setIsAccessible] = React.useState(true);

  // Safety Confirmation
  const [impactModalOpen, setImpactModalOpen] = React.useState(false);
  const [impactDetails, setImpactDetails] = React.useState<{
    affectedSessions: TimetableSession[];
    details: string[];
    message: string;
  }>({ affectedSessions: [], details: [], message: "" });
  const [saving, setSaving] = React.useState(false);

  // Sync state when room opens
  React.useEffect(() => {
    if (room && open) {
      setName(room.name);
      setBuilding(room.building);
      setFloor(room.floor);
      setCapacity(room.capacity);
      setRoomType(room.type);
      setStatus(room.status);
      setEquipment([...room.equipment]);
      setIsAccessible(room.isAccessible);
      setActiveTab("specs");

      // Load sessions and related domain data
      setLoadingSchedule(true);
      Promise.all([
        schedulingRepository.getTimetableSessions({ classroomId: room.id }),
        schedulingRepository.getSubjects(),
        schedulingRepository.getSections(),
        schedulingRepository.getFaculty(),
        schedulingRepository.getTimeSlots(),
      ])
        .then(([sess, subs, secs, facs, slots]) => {
          setSessions(sess.filter((s) => s.status !== "cancelled"));
          setSubjects(subs);
          setSections(secs);
          setFaculty(facs);
          setTimeSlots(slots);
          setLoadingSchedule(false);
        })
        .catch((err) => {
          console.error("Failed to load room schedule:", err);
          setLoadingSchedule(false);
        });
    }
  }, [room, open]);

  if (!room) return null;

  const toggleEquipment = (eq: RoomEquipmentType) => {
    if (equipment.includes(eq)) {
      setEquipment(equipment.filter((item) => item !== eq));
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const handlePreSaveCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Facility name cannot be empty.", variant: "destructive" });
      return;
    }
    if (capacity <= 0) {
      toast({ title: "Validation Error", description: "Capacity must be greater than 0 seats.", variant: "destructive" });
      return;
    }

    try {
      const impact = await schedulingRepository.checkRoomImpact(room.id, status, capacity);
      if (impact.willCauseClash) {
        setImpactDetails(impact);
        setImpactModalOpen(true);
        return;
      }
      await commitUpdate();
    } catch (err: any) {
      toast({ title: "Impact Check Failed", description: err.message, variant: "destructive" });
    }
  };

  const commitUpdate = async () => {
    setSaving(true);
    try {
      const updated = await schedulingRepository.updateClassroom(room.id, {
        name: name.trim(),
        building: building.trim(),
        floor,
        capacity,
        type: roomType,
        status,
        equipment,
        isAccessible,
      });

      toast({
        title: "Facility Updated",
        description: `Room ${updated.code} specifications persisted successfully.`,
        variant: "success",
      });

      if (onRoomUpdated) onRoomUpdated(updated);
      setImpactModalOpen(false);
      setActiveTab("specs");
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to persist facility changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-slate-50/50">
          {/* Header */}
          <SheetHeader className="p-5 pb-4 bg-white border-b border-slate-200/80 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-900">{room.code}</span>
                    <Badge
                      variant={
                        room.status === "Available"
                          ? "success"
                          : room.status === "Occupied"
                          ? "warning"
                          : "error"
                      }
                      dot
                      size="sm"
                    >
                      {room.status}
                    </Badge>
                    {room.isAccessible && (
                      <Badge variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        ADA Compliant
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-sm font-semibold text-slate-700 mt-0.5">{room.name}</SheetTitle>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab("specs")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  activeTab === "specs"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Specifications & Equipment
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "schedule"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>Scheduled Classes</span>
                <span className="px-1.5 py-0.2 rounded-full text-xs bg-slate-200/80 text-slate-800">
                  {sessions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === "edit"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Specs</span>
              </button>
            </div>
          </SheetHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            {activeTab === "specs" && (
              <div className="space-y-4">
                {/* Key Spec Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                    <span className="text-xs font-medium text-slate-400 block">Facility Type</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block">{room.type}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                    <span className="text-xs font-medium text-slate-400 block">Seating Capacity</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">
                      {room.capacity} seats
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                    <span className="text-xs font-medium text-slate-400 block">Campus Building</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block truncate">{room.building}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                    <span className="text-xs font-medium text-slate-400 block">Floor Level</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">
                      Level {room.floor}
                    </span>
                  </div>
                </div>

                {/* Equipment & Technology Inventory */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/70 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Equipment & Technology Inventory
                    </h4>
                    <span className="text-xs text-slate-400">{room.equipment.length} verified assets</span>
                  </div>

                  {room.equipment.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                      No specialized hardware registered. Standard writing board and desk facilities only.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {room.equipment.map((eq) => {
                        const item = ALL_EQUIPMENT.find((e) => e.id === eq);
                        return (
                          <div
                            key={eq}
                            className="p-2.5 rounded-xl border border-slate-200/60 bg-slate-50/60 flex items-center gap-2.5 text-xs font-medium text-slate-700"
                          >
                            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{item?.label || eq}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Link to Timetable Studio */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-4 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-white">Inspect Timetable Matrix</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Review complete weekly grid and allocate sessions for {room.code}.
                    </p>
                  </div>
                  <Link
                    href={`/timetable?roomId=${room.id}`}
                    className="px-3.5 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition shrink-0 flex items-center gap-1.5"
                  >
                    <span>Open Matrix</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Active Scheduled Classes ({sessions.length})
                  </h4>
                  <span className="text-xs text-slate-500">Term: Spring 2026</span>
                </div>

                {loadingSchedule ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading scheduled sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white border border-slate-200/70 text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-800">No Scheduled Classes</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      This venue is currently completely unoccupied. Available for immediate ad-hoc allocation or maintenance booking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((sess) => {
                      const subject = subjects.find((s) => s.id === sess.subjectId);
                      const section = sections.find((s) => s.id === sess.sectionId);
                      const inst = faculty.find((f) => f.id === sess.facultyId);
                      const slot = timeSlots.find((t) => t.id === sess.timeSlotId);

                      return (
                        <div
                          key={sess.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                {subject?.code || "Subject"}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {subject?.title || "Class Session"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>Sec: <strong className="text-slate-700">{section?.sectionCode || "Section"}</strong></span>
                              <span>•</span>
                              <span>Instructor: <strong className="text-slate-700">{inst?.name || "Faculty"}</strong></span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-bold text-indigo-700 block">
                              {slot?.dayOfWeek || "Day"}
                            </span>
                            <span className="font-mono text-xs text-slate-500 block">
                              {slot?.startTime} – {slot?.endTime}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "edit" && (
              <form onSubmit={handlePreSaveCheck} className="space-y-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/70 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Edit Facility Specifications
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Room Code</label>
                      <Input
                        value={room.code}
                        disabled
                        className="bg-slate-50 font-mono text-xs text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-xs text-slate-400 mt-1 block">Primary key cannot be modified.</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Facility Name *</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Turing Amphitheatre"
                        className="text-xs bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Building Location *</label>
                      <Input
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                        placeholder="e.g. Turing Computing Block"
                        className="text-xs bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Floor Level</label>
                      <Input
                        type="number"
                        value={floor}
                        onChange={(e) => setFloor(parseInt(e.target.value) || 1)}
                        className="text-xs bg-white font-mono"
                        min={0}
                        max={10}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Capacity (Seats) *</label>
                      <Input
                        type="number"
                        value={capacity}
                        onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                        className="text-xs bg-white font-mono font-semibold"
                        min={1}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Facility Type</label>
                      <select
                        value={roomType}
                        onChange={(e) => setRoomType(e.target.value as RoomType)}
                        className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      >
                        <option value="Lecture Hall">Lecture Hall</option>
                        <option value="Specialized Laboratory">Specialized Laboratory</option>
                        <option value="Standard Classroom">Standard Classroom</option>
                        <option value="Seminar Room">Seminar Room</option>
                        <option value="Auditorium">Auditorium</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Operational Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["Available", "Occupied", "Maintenance"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatus(st)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              status === st
                                ? st === "Maintenance"
                                  ? "bg-rose-50 border-rose-300 text-rose-700 shadow-2xs"
                                  : st === "Occupied"
                                  ? "bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                                  : "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {status === st && <Check className="h-3.5 w-3.5" />}
                            <span>{st}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-2 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAccessible}
                          onChange={(e) => setIsAccessible(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Wheelchair Accessible (ADA Compliant Ramp / Elevator Access)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Equipment Checkboxes */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/70 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Equipment Checkpoints
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_EQUIPMENT.map((eq) => {
                      const checked = equipment.includes(eq.id);
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => toggleEquipment(eq.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                            checked
                              ? "bg-indigo-50/60 border-indigo-200 text-indigo-950 font-semibold"
                              : "bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <span className="truncate">{eq.label}</span>
                          {checked && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("specs")}
                    className="text-xs h-9 px-4 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="text-xs h-9 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? "Persisting..." : "Save Specifications"}</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Safety Impact Confirmation Dialog */}
      <ConfirmDialog
        open={impactModalOpen}
        onOpenChange={setImpactModalOpen}
        title={`Safety Warning: Resource Impact on ${room.code}`}
        description={`${impactDetails.message} Are you sure you want to proceed with this modification?`}
        confirmLabel="Confirm & Override Constraints"
        cancelLabel="Abort Edit"
        variant="danger"
        loading={saving}
        onConfirm={commitUpdate}
      />
    </>
  );
}
