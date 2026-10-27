import { cn } from "@/lib/utils";

export function TimoraMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className={cn("h-10 w-10 shrink-0", className)} fill="none">
      <rect x="1" y="1" width="46" height="46" rx="16" fill="#1D2927" />
      <path d="M14 18H29" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M21.5 11.5V29.5C21.5 33.3 23.9 35.5 27.5 35.5H30" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32.5" cy="14" r="4" fill="#F27A5C" />
      <circle cx="32.5" cy="14" r="1.25" fill="#FFF6F1" />
    </svg>
  );
}

export function TimoraBrand({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <TimoraMark className={markClassName} />
      <span className="text-xl font-bold tracking-[-0.04em] text-[#1D2927]">timora<span className="text-[#DF684C]">.</span></span>
    </span>
  );
}
