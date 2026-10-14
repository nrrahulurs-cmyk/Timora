import type { AcademicTerm } from "@/types/domain";

export const SEED_ACADEMIC_TERMS: AcademicTerm[] = [
  {
    id: "TERM-FALL-2026",
    name: "Fall 2026 (Odd Semester)",
    startDate: "2026-08-17",
    endDate: "2026-12-18",
    status: "active",
    weeksCount: 16,
    isCurrent: true,
  },
  {
    id: "TERM-SPRING-2026",
    name: "Spring 2026 (Even Semester)",
    startDate: "2026-01-12",
    endDate: "2026-05-22",
    status: "archived",
    weeksCount: 16,
    isCurrent: false,
  },
];
