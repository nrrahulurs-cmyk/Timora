"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarCheck, CheckCircle2, ShieldAlert } from "lucide-react";
import type { ConflictRecord } from "@/types/domain";

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: () => void | Promise<void>;
  versionNumber: string;
  activeConflicts: ConflictRecord[];
}

export function PublishDialog({
  isOpen,
  onClose,
  onConfirmPublish,
  versionNumber,
  activeConflicts,
}: PublishDialogProps) {
  const hasCritical = activeConflicts.some((c) => c.severity === "critical");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-full bg-blue-100 text-[rgb(var(--color-primary))]">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold">
              Publish Timetable Schedule ({versionNumber})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Pre-flight schedule verification scans room availability, faculty teaching limits, and campus maintenance blocks before locking the timetable.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3 text-xs">
          {activeConflicts.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">
                    {activeConflicts.length} Unresolved Conflicts Detected
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                    {hasCritical
                      ? "Critical constraint violations remain in this schedule draft. Publishing will notify affected faculty and student cohorts."
                      : "Only advisory or warning level conflicts exist. Proceed with caution."}
                  </p>
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pt-1 border-t border-amber-200">
                {activeConflicts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-[11px] p-1.5 rounded bg-white border border-amber-200/80"
                  >
                    <span className="font-semibold text-slate-800 truncate pr-2">
                      {c.title}
                    </span>
                    <Badge
                      variant={c.severity === "critical" ? "critical" : "warning"}
                      size="sm"
                      className="text-[9px] shrink-0"
                    >
                      {c.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-2.5 text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold">Zero Scheduling Collisions</h4>
                <p className="text-[11px] text-emerald-800">
                  All room allocations, faculty hours, and student section requirements are satisfied.
                </p>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            Publishing records a new version and an audit entry. Resolve critical conflicts before making this schedule authoritative.
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs border-slate-200">
            Return to Studio
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={pending || hasCritical}
            onClick={async () => {
              setPending(true); setError(null);
              try { await onConfirmPublish(); onClose(); }
              catch (failure) { setError(failure instanceof Error ? failure.message : "Publication failed. Try again."); }
              finally { setPending(false); }
            }}
            className="h-8 text-xs bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))]"
          >
            {pending ? "Publishing…" : hasCritical ? "Resolve critical conflicts" : "Confirm & Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
