import { describe, it, expect } from "vitest";
import {
  buildExportRows,
  generateTimetableCsv,
  generateTimetableExcel,
  generateTimetablePdf,
  sanitizeForFormulaInjection,
  type ExportMetadata,
} from "../timetable-export-service";
import { SYNAPSE_SEED_DATA } from "@/data/fixtures";

describe("Timetable Export Service", () => {
  const metadata: ExportMetadata = {
    institutionName: "Timora Institute of Technology",
    academicTerm: "Fall 2026 (Odd Sem)",
    weekLabel: "Week 9: Oct 19 – Oct 24, 2026",
    departmentName: "Computer Science & Engineering",
    sectionCode: "CSE-S5-A",
    generatedAt: "2026-10-14 20:00:00",
    generatedBy: "Dr. Eleanor Vance",
    isDraft: true,
    version: "v2.4-preview",
  };

  it("sanitizes formula injection prefixes correctly", () => {
    expect(sanitizeForFormulaInjection("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeForFormulaInjection("+cmd|'/c calc'!A0")).toBe("'+cmd|'/c calc'!A0");
    expect(sanitizeForFormulaInjection("-100")).toBe("'-100");
    expect(sanitizeForFormulaInjection("@SUM(B1)")).toBe("'@SUM(B1)");
    expect(sanitizeForFormulaInjection("Regular Subject")).toBe("Regular Subject");
  });

  it("builds enriched export rows from domain dataset", () => {
    const rows = buildExportRows(
      SYNAPSE_SEED_DATA.timetableSessions.slice(0, 10),
      SYNAPSE_SEED_DATA.subjects,
      SYNAPSE_SEED_DATA.classrooms,
      SYNAPSE_SEED_DATA.faculty,
      SYNAPSE_SEED_DATA.sections,
      SYNAPSE_SEED_DATA.timeSlots,
      SYNAPSE_SEED_DATA.conflicts
    );

    expect(rows.length).toBe(10);
    expect(rows[0]).toHaveProperty("day");
    expect(rows[0]).toHaveProperty("slotTime");
    expect(rows[0]).toHaveProperty("subjectCode");
    expect(rows[0]).toHaveProperty("classroomCode");
    expect(rows[0]).toHaveProperty("facultyName");
  });

  it("generates a valid CSV with UTF-8 BOM and metadata header", () => {
    const rows = buildExportRows(
      SYNAPSE_SEED_DATA.timetableSessions.slice(0, 5),
      SYNAPSE_SEED_DATA.subjects,
      SYNAPSE_SEED_DATA.classrooms,
      SYNAPSE_SEED_DATA.faculty,
      SYNAPSE_SEED_DATA.sections,
      SYNAPSE_SEED_DATA.timeSlots
    );

    const csv = generateTimetableCsv(rows, metadata);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("# Institution: Timora Institute of Technology");
    expect(csv).toContain("Day,Slot Time,Subject Code,Subject Title");
    expect(csv.split("\r\n").length).toBeGreaterThan(5);
  });

  it("generates a genuine multi-sheet Excel workbook as Uint8Array", async () => {
    const rows = buildExportRows(
      SYNAPSE_SEED_DATA.timetableSessions.slice(0, 5),
      SYNAPSE_SEED_DATA.subjects,
      SYNAPSE_SEED_DATA.classrooms,
      SYNAPSE_SEED_DATA.faculty,
      SYNAPSE_SEED_DATA.sections,
      SYNAPSE_SEED_DATA.timeSlots
    );

    const excelBytes = await generateTimetableExcel(rows, metadata);
    expect(excelBytes).toBeInstanceOf(Uint8Array);
    expect(excelBytes.length).toBeGreaterThan(1000); // Standard xlsx zip container > 1KB
  });

  it("generates a genuine landscape PDF file as Uint8Array", () => {
    const rows = buildExportRows(
      SYNAPSE_SEED_DATA.timetableSessions.slice(0, 5),
      SYNAPSE_SEED_DATA.subjects,
      SYNAPSE_SEED_DATA.classrooms,
      SYNAPSE_SEED_DATA.faculty,
      SYNAPSE_SEED_DATA.sections,
      SYNAPSE_SEED_DATA.timeSlots
    );

    const pdfBytes = generateTimetablePdf(rows, metadata);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000); // Standard PDF container > 1KB
  });
});
