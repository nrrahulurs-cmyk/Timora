"use client";

import * as React from "react";
import { Plus, Building2, Check, ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/feedback/use-toast";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import type { Classroom, RoomType, RoomEquipmentType } from "@/types/domain";

interface RoomCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomCreated?: (room: Classroom) => void;
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

export function RoomCreateModal({
  open,
  onOpenChange,
  onRoomCreated,
}: RoomCreateModalProps) {
  const { toast } = useToast();

  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [building, setBuilding] = React.useState("Turing Computing Block");
  const [floor, setFloor] = React.useState(1);
  const [capacity, setCapacity] = React.useState(60);
  const [roomType, setRoomType] = React.useState<RoomType>("Standard Classroom");
  const [status, setStatus] = React.useState<Classroom["status"]>("Available");
  const [equipment, setEquipment] = React.useState<RoomEquipmentType[]>([
    "smart_projector",
    "air_conditioning",
  ]);
  const [isAccessible, setIsAccessible] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const toggleEquipment = (eq: RoomEquipmentType) => {
    if (equipment.includes(eq)) {
      setEquipment(equipment.filter((item) => item !== eq));
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedBuilding = building.trim();

    if (!trimmedCode) {
      setErrorMsg("Venue code is required (e.g. CR-401).");
      return;
    }
    if (!trimmedName) {
      setErrorMsg("Venue name is required.");
      return;
    }
    if (!trimmedBuilding) {
      setErrorMsg("Building name is required.");
      return;
    }
    if (capacity <= 0) {
      setErrorMsg("Room capacity must be greater than 0 seats.");
      return;
    }

    setLoading(true);
    try {
      const created = await schedulingRepository.createClassroom({
        code: trimmedCode,
        name: trimmedName,
        building: trimmedBuilding,
        floor,
        capacity,
        type: roomType,
        equipment,
        isAccessible,
        status,
      });

      toast({
        title: "Facility Added",
        description: `Room ${created.code} (${created.name}) created successfully.`,
        variant: "success",
      });

      if (onRoomCreated) onRoomCreated(created);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create facility.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setName("");
    setBuilding("Turing Computing Block");
    setFloor(1);
    setCapacity(60);
    setRoomType("Standard Classroom");
    setStatus("Available");
    setEquipment(["smart_projector", "air_conditioning"]);
    setIsAccessible(true);
    setErrorMsg(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-5 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-900" />
            <DialogTitle className="text-base font-semibold text-slate-900">
              Register New Academic Facility
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Define venue code, seating capacity, equipment, and accessibility parameters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Room Code *</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CR-401 or LAB-AI-01"
                className="font-mono text-xs uppercase bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Facility Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Machine Intelligence Lab"
                className="text-xs bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Building Location *</label>
              <Input
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Central Administration Wing"
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
                max={12}
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Room Type</label>
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Initial Status</label>
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

          {/* Equipment Checkboxes */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Available Technology & Equipment</span>
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

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 px-4 rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-xs h-9 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{loading ? "Registering..." : "Register Facility"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
