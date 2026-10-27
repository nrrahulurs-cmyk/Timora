"use client";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarPlus, ArrowRight } from "lucide-react";

export function ScheduleExtraClassModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; onScheduled?: () => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="w-[calc(100%-24px)] max-w-md"><CalendarPlus size={24} className="text-[#b7442d]" /><DialogTitle>Plan an extra class</DialogTitle><DialogDescription className="text-sm leading-relaxed">Choose the assigned instructor, section and exact date. Timora checks room, faculty and student availability before submitting the request for review.</DialogDescription><Link href="/extra-classes" onClick={() => onOpenChange(false)} className="mt-2 flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white">Open extra-class requests<ArrowRight size={15} /></Link></DialogContent></Dialog>;
}
