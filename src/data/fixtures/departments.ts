import type { Department } from "@/types/domain";

export const SEED_DEPARTMENTS: Department[] = [
  {
    id: "DEPT-CSE",
    code: "CSE",
    name: "Computer Science & Engineering",
    building: "Turing Computing Block",
    headOfDepartmentId: "FAC-TURING",
    colorToken: "#0066cc",
    activeSectionsCount: 4,
    totalFacultyCount: 18,
  },
  {
    id: "DEPT-ECE",
    code: "ECE",
    name: "Electronics & Communication Engineering",
    building: "Maxwell Physics & RF Wing",
    headOfDepartmentId: "FAC-MAXWELL",
    colorToken: "#10b981",
    activeSectionsCount: 3,
    totalFacultyCount: 14,
  },
  {
    id: "DEPT-MECH",
    code: "MECH",
    name: "Mechanical & Aerospace Engineering",
    building: "Carnot Thermal Complex",
    headOfDepartmentId: "FAC-CARNOT",
    colorToken: "#f59e0b",
    activeSectionsCount: 3,
    totalFacultyCount: 12,
  },
  {
    id: "DEPT-BIO",
    code: "BIOTECH",
    name: "Biotechnology & Biomedical Sciences",
    building: "Franklin Life Sciences Wing",
    headOfDepartmentId: "FAC-CURIE",
    colorToken: "#8b5cf6",
    activeSectionsCount: 2,
    totalFacultyCount: 10,
  },
];
