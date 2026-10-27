"use client";
import * as React from "react";
import { Upload, Download, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { IMPORT_COLUMNS, parseTimetableCsv, rowsFromMatrix, previewTimetableImport, type ImportRow } from "@/lib/scheduling/import";
import type { SchedulePlan } from "@/lib/scheduling/plan";

export function ImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; onImported: () => void }) {
  const [rows, setRows] = React.useState<ImportRow[]>([]);
  const [name, setName] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [plan, setPlan] = React.useState<SchedulePlan | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [success, setSuccess] = React.useState("");
  const generation = React.useRef(0);
  async function read(file: File) {
    const current = ++generation.current; setBusy(true); setErrors([]); setPlan(null); setRows([]); setSuccess(""); setName(file.name);
    try {
      if (file.size > 1_000_000) throw new Error("Use a CSV or XLSX file smaller than 1 MB.");
      let matrix: string[][];
      if (/\.csv$/i.test(file.name)) matrix = parseTimetableCsv(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        const { Workbook } = await import("exceljs");
        const workbook = new Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const sheet = workbook.worksheets[0];
        if (!sheet || sheet.rowCount > 201 || sheet.columnCount > 30) throw new Error("Use one worksheet with a header and up to 200 sessions, within 30 columns.");
        matrix = [];
        sheet.eachRow(row => { const values: string[] = []; for (let column = 1; column <= sheet.columnCount; column++) { const cell = row.getCell(column); if (cell.formula || (typeof cell.value === "object" && cell.value !== null)) throw new Error("Use plain text cells. Formulas, dates, links and embedded objects must be converted to text first."); values.push(cell.text.trim()); } matrix.push(values); });
      } else throw new Error("Use CSV or XLSX. PDF and image extraction are not available.");
      if (current === generation.current) setRows(rowsFromMatrix(matrix));
    } catch (error) { if (current === generation.current) setErrors([error instanceof Error ? error.message : "The file could not be read."]); }
    finally { if (current === generation.current) setBusy(false); }
  }
  async function validate() {
    setBusy(true); setErrors([]); setPlan(null);
    try { const preview = previewTimetableImport(rows, await schedulingRepository.getDataset()); setErrors(preview.errors); setPlan(preview.plan); }
    catch (error) { setErrors([error instanceof Error ? error.message : "Validation failed."]); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!plan) return; setBusy(true); setErrors([]);
    try {
      const result = await schedulingRepository.saveTimetableChanges(plan);
      if (!result.success) throw new Error(result.message);
      const saved = await schedulingRepository.getDataset();
      if (plan.inserts.some(session => !saved.timetableSessions.some(item => item.id === session.id))) throw new Error("Could not verify all imported sessions. Refresh before retrying.");
      setSuccess(`${plan.inserts.length} ${plan.inserts.length === 1 ? "session" : "sessions"} saved and verified in the draft timetable.`); setPlan(null); setRows([]);
    } catch (error) { setErrors([error instanceof Error ? error.message : "The import failed."]); setPlan(null); }
    finally { setBusy(false); }
  }
  function template() {
    const url = URL.createObjectURL(new Blob([IMPORT_COLUMNS.join(",") + "\n"], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "timora-import-template.csv"; link.click(); URL.revokeObjectURL(url);
  }
  const close = () => { if (success) onImported(); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={value => { if (!busy && !value) close(); }}><DialogContent className="flex max-h-[90dvh] w-[calc(100%-24px)] max-w-5xl flex-col gap-4 overflow-hidden sm:p-6">
    <DialogHeader><DialogTitle>Import timetable</DialogTitle><DialogDescription className="mt-2 leading-relaxed">Upload → correct records → validate → confirm. Your existing timetable stays intact until every row passes validation.</DialogDescription></DialogHeader>
    <div className="flex flex-wrap items-center gap-3"><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium"><Upload size={15} />{busy ? "Working…" : "Choose CSV or XLSX"}<input aria-label="Choose timetable file" type="file" accept=".csv,.xlsx" disabled={busy} className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void read(file); event.target.value = ""; }} /></label><Button variant="ghost" size="sm" onClick={template}><Download size={14} className="mr-2" />Download template</Button><span className="text-xs text-secondary">{name || "Up to 200 sessions · 1 MB"}</span></div>
    <p className="text-xs leading-relaxed text-secondary">Use existing course, section, faculty and room codes. Times use 24-hour HH:MM. Leave date blank for weekly sessions across the draft term; enter YYYY-MM-DD for a single class.</p>
    {!!rows.length && <div className="min-h-0 overflow-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><caption className="sr-only">Editable import preview, {rows.length} sessions</caption><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Row</th>{IMPORT_COLUMNS.map(column => <th key={column} className="p-2 font-medium">{column.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={index} className="border-t border-slate-100"><td className="p-2 text-secondary">{index + 2}</td>{IMPORT_COLUMNS.map(column => <td key={column} className="p-1"><input aria-label={`Row ${index+2} ${column}`} value={row[column]} maxLength={200} disabled={busy} className="w-full min-w-[100px] rounded-md border border-transparent px-2 py-2 focus:border-slate-300" onChange={event => { setRows(current => current.map((item,i) => i === index ? { ...item, [column]: event.target.value } : item)); setPlan(null); setErrors([]); }} /></td>)}</tr>)}</tbody></table></div>}
    {!!errors.length && <div role="alert" className="max-h-40 shrink-0 overflow-auto rounded-xl bg-rose-50 p-4 text-xs text-rose-800"><p className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle size={15} />{errors.length} issue{errors.length === 1 ? "" : "s"} to correct</p><ul className="list-disc space-y-1 pl-4">{errors.slice(0,30).map((error,index) => <li key={index} className="break-words">{error}</li>)}</ul></div>}
    {(plan || success) && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-900"><CheckCircle2 size={16} />{success || `${plan?.inserts.length} sessions pass the checked constraints. Confirm to add them to the draft.`}</p>}
    <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={close} disabled={busy}>{success ? "Done" : "Cancel"}</Button>{rows.length > 0 && (plan ? <Button onClick={() => void apply()} disabled={busy}>{busy ? "Saving and verifying…" : `Confirm import of ${rows.length} ${rows.length === 1 ? "session" : "sessions"}`}</Button> : <Button onClick={() => void validate()} disabled={busy}>{busy ? "Validating…" : "Validate timetable"}</Button>)}</div>
  </DialogContent></Dialog>;
}
