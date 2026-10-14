"use client";

import * as React from "react";
import { Download, X, Check, FileText, FileSpreadsheet, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: "pdf" | "csv" | "excel") => Promise<void>;
  cohortLabel?: string;
  weekLabel?: string;
  isExporting?: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  cohortLabel = "Cohort: 5th Sem (Sec-B)",
  weekLabel = "Oct 19 – Oct 24, 2026",
  isExporting = false,
}: ExportDialogProps) {
  const [format, setFormat] = React.useState<"pdf" | "excel" | "csv">("pdf");
  const [includeFacultyNotes, setIncludeFacultyNotes] = React.useState(true);
  const [includeFloorMap, setIncludeFloorMap] = React.useState(true);
  const [includeConflictLedger, setIncludeConflictLedger] = React.useState(false);
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  if (!open) return null;

  const handleDownload = async () => {
    try {
      await onExport(format);
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        onOpenChange(false);
      }, 900);
    } catch {
      setDownloadSuccess(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-app-window border border-slate-100 p-6 relative animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        {/* ── Dialog Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-[rgb(var(--color-primary))]">
              <Download className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 id="export-dialog-title" className="text-base font-bold text-slate-900">
                Export Weekly Timetable
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {cohortLabel} • {weekLabel}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Dialog Body ───────────────────────────────────── */}
        <div className="py-5 space-y-5">
          {/* Format Selection Cards */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Choose File Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* PDF Document Card */}
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={cn(
                  "flex flex-col p-3 rounded-2xl border transition-all text-left",
                  format === "pdf"
                    ? "border-[rgb(var(--color-primary))] bg-blue-50/50 shadow-xs"
                    : "border-slate-200/80 hover:border-slate-300 bg-slate-50/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs",
                      format === "pdf"
                        ? "bg-white text-[rgb(var(--color-primary))] border-blue-200"
                        : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    PDF
                  </span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center border",
                      format === "pdf"
                        ? "bg-[rgb(var(--color-primary))] border-[rgb(var(--color-primary))]"
                        : "border-slate-300"
                    )}
                  >
                    {format === "pdf" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-800 mt-2 block">Document</span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                  Landscape & High-Res Print
                </span>
              </button>

              {/* Excel Sheet Card */}
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={cn(
                  "flex flex-col p-3 rounded-2xl border transition-all text-left",
                  format === "excel"
                    ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                    : "border-slate-200/80 hover:border-slate-300 bg-slate-50/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs",
                      format === "excel"
                        ? "bg-white text-emerald-700 border-emerald-200"
                        : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    XLSX
                  </span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center border",
                      format === "excel"
                        ? "bg-emerald-600 border-emerald-600"
                        : "border-slate-300"
                    )}
                  >
                    {format === "excel" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-800 mt-2 block">Excel Sheet</span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                  Multi-sheet faculty roster
                </span>
              </button>

              {/* CSV Raw Data Card */}
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={cn(
                  "flex flex-col p-3 rounded-2xl border transition-all text-left",
                  format === "csv"
                    ? "border-sky-600 bg-sky-50/50 shadow-xs"
                    : "border-slate-200/80 hover:border-slate-300 bg-slate-50/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs",
                      format === "csv"
                        ? "bg-white text-sky-700 border-sky-200"
                        : "bg-white text-slate-600 border-slate-200"
                    )}
                  >
                    CSV
                  </span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center border",
                      format === "csv"
                        ? "bg-sky-600 border-sky-600"
                        : "border-slate-300"
                    )}
                  >
                    {format === "csv" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-800 mt-2 block">Raw Data</span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">
                  Direct ERP / SIS import
                </span>
              </button>
            </div>
          </div>

          {/* Export Preferences & Appendices */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Export Preferences & Appendices
            </label>
            <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Include Faculty Notes & Cabin Details
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Adds lecturer office hours & contact card
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeFacultyNotes}
                  onChange={(e) => setIncludeFacultyNotes(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300"
                />
              </label>

              <div className="h-px bg-slate-200/60" />

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-sky-500" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Room Allocation & Floor Map
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Appends campus wing directions for labs
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeFloorMap}
                  onChange={(e) => setIncludeFloorMap(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300"
                />
              </label>

              <div className="h-px bg-slate-200/60" />

              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Student Conflict Ledger
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Flagged overlaps with auto-solve logs
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeConflictLedger}
                  onChange={(e) => setIncludeConflictLedger(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/20 border-slate-300"
                />
              </label>
            </div>
          </div>
        </div>

        {/* ── Dialog Footer ─────────────────────────────────── */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified with timetable schema v4.2</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-full text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold shadow-sm transition-all",
                downloadSuccess
                  ? "bg-emerald-600 text-white"
                  : isExporting
                  ? "bg-slate-700 text-white cursor-wait"
                  : "bg-slate-900 hover:bg-slate-800 text-white"
              )}
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {downloadSuccess
                  ? "Downloaded ✓"
                  : isExporting
                  ? "Generating File..."
                  : "Download Timetable"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
