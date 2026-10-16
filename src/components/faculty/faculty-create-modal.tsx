"use client";

import * as React from "react";
import { Plus, Users, GraduationCap, Mail, X } from "lucide-react";
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
import type { FacultyMember, Department } from "@/types/domain";

interface FacultyCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onFacultyCreated?: (faculty: FacultyMember) => void;
}

export function FacultyCreateModal({
  open,
  onOpenChange,
  departments,
  onFacultyCreated,
}: FacultyCreateModalProps) {
  const { toast } = useToast();

  const [employeeCode, setEmployeeCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState(departments[0]?.id || "DEPT-CSE");
  const [designation, setDesignation] = React.useState<FacultyMember["designation"]>("Assistant Professor");
  const [maxCreditHours, setMaxCreditHours] = React.useState(16);
  const [specializationsText, setSpecializationsText] = React.useState("Artificial Intelligence, Systems");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (departments.length > 0 && !departmentId) {
      setDepartmentId(departments[0].id);
    }
  }, [departments, departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCode = employeeCode.trim().toUpperCase();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedCode) {
      setErrorMsg("Employee code is required (e.g. FAC-105).");
      return;
    }
    if (!trimmedName) {
      setErrorMsg("Faculty name is required.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMsg("A valid academic email address is required.");
      return;
    }
    if (maxCreditHours <= 0) {
      setErrorMsg("Max teaching credits must be greater than 0.");
      return;
    }

    const specializations = specializationsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const created = await schedulingRepository.createFacultyMember({
        employeeCode: trimmedCode,
        name: trimmedName,
        email: trimmedEmail,
        departmentId,
        designation,
        maxCreditHours,
        specializations,
        status: "active",
        availability: [
          {
            dayOfWeek: "Monday",
            availableSlotIds: ["SLOT-MON-1", "SLOT-MON-2", "SLOT-MON-3", "SLOT-MON-4"],
            preferredSlotIds: ["SLOT-MON-2"],
            blockedSlotIds: [],
            maxHoursPerDay: 4,
          },
          {
            dayOfWeek: "Tuesday",
            availableSlotIds: ["SLOT-TUE-1", "SLOT-TUE-2", "SLOT-TUE-3", "SLOT-TUE-4"],
            preferredSlotIds: ["SLOT-TUE-2"],
            blockedSlotIds: [],
            maxHoursPerDay: 4,
          },
          {
            dayOfWeek: "Wednesday",
            availableSlotIds: ["SLOT-WED-1", "SLOT-WED-2", "SLOT-WED-3", "SLOT-WED-4"],
            preferredSlotIds: ["SLOT-WED-2"],
            blockedSlotIds: [],
            maxHoursPerDay: 4,
          },
          {
            dayOfWeek: "Thursday",
            availableSlotIds: ["SLOT-THU-1", "SLOT-THU-2", "SLOT-THU-3", "SLOT-THU-4"],
            preferredSlotIds: ["SLOT-THU-2"],
            blockedSlotIds: [],
            maxHoursPerDay: 4,
          },
          {
            dayOfWeek: "Friday",
            availableSlotIds: ["SLOT-FRI-1", "SLOT-FRI-2", "SLOT-FRI-3"],
            preferredSlotIds: ["SLOT-FRI-1"],
            blockedSlotIds: [],
            maxHoursPerDay: 3,
          },
        ],
      });

      toast({
        title: "Faculty Appointed",
        description: `${created.name} (${created.employeeCode}) registered in academic registry.`,
        variant: "success",
      });

      if (onFacultyCreated) onFacultyCreated(created);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to appoint faculty member.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmployeeCode("");
    setName("");
    setEmail("");
    setDesignation("Assistant Professor");
    setMaxCreditHours(16);
    setSpecializationsText("Artificial Intelligence, Systems");
    setErrorMsg(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="p-5 pb-3 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-900" />
            <DialogTitle className="text-base font-semibold text-slate-900">
              Appoint New Faculty Instructor
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Register academic credentials, department affiliation, and credit limits.
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Employee Code *</label>
              <Input
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. FAC-105"
                className="font-mono text-xs uppercase bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name & Title *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Maya Patel"
                className="text-xs bg-white"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Institutional Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. m.patel@timora.edu"
                className="text-xs bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Academic Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value as any)}
                className="w-full text-xs h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Adjunct Lecturer">Adjunct Lecturer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Max Teaching Credits (hrs/wk) *</label>
              <Input
                type="number"
                value={maxCreditHours}
                onChange={(e) => setMaxCreditHours(parseInt(e.target.value) || 16)}
                className="text-xs bg-white font-mono font-semibold"
                min={1}
                max={30}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Specializations (Comma-separated)</label>
              <Input
                value={specializationsText}
                onChange={(e) => setSpecializationsText(e.target.value)}
                placeholder="e.g. ML, Bio-Informatics"
                className="text-xs bg-white"
              />
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
              <span>{loading ? "Appointing..." : "Appoint Faculty"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
