import type { ConflictRecord } from "@/types/domain";

export const SEED_CONFLICTS: ConflictRecord[] = [
  // ── 1. Room Clash (Double-Booking) ─────────────────────────────────────────
  {
    id: "CONF-01",
    type: "room_clash",
    severity: "critical",
    title: "Classroom Double-Booking in LH-201",
    description:
      "CS-401 Sec A (145 students) and ECE-305 Sec A (120 students) are concurrently scheduled in Maxwell Lecture Theatre (LH-201) on Wednesday 10:00 - 11:30 AM.",
    sessionIds: ["SESS-CS401-WED", "SESS-ECE305-WED"],
    classroomId: "ROOM-LH-201",
    timeSlotId: "SLOT-WED-2",
    detectedAt: "2026-10-14T08:30:00Z",
    status: "active",
    hasFeasibleAlternative: true,
    alternatives: [
      {
        solutionId: "SOL-01-A",
        description:
          "Reassign ECE-305 to Turing Amphitheatre (LH-102, 160 seats). Zero downstream schedule collisions.",
        targetClassroomId: "ROOM-LH-102",
        targetTimeSlotId: "SLOT-WED-2",
        downstreamClashCount: 0,
        feasibilityScore: 98,
        isRecommended: true,
      },
      {
        solutionId: "SOL-01-B",
        description:
          "Shift ECE-305 to Wednesday Slot 3 (11:30 AM - 01:00 PM) in LH-201. Generates 1 soft student break constraint.",
        targetClassroomId: "ROOM-LH-201",
        targetTimeSlotId: "SLOT-WED-3",
        downstreamClashCount: 1,
        feasibilityScore: 82,
        isRecommended: false,
      },
    ],
    resolutionNotes: "LH-102 is vacant and fully equipped with required smart projector.",
  },

  // ── 2. Faculty Overlap ─────────────────────────────────────────────────────
  {
    id: "CONF-02",
    type: "faculty_overlap",
    severity: "critical",
    title: "Faculty Duty Overlap for Dr. Sarah Lin",
    description:
      "Dr. Sarah Lin is scheduled for BIO-110 in Molecular Genetics Lab on Tuesday 02:00 - 03:30 PM while committed to Academic Senate Hospital Committee.",
    sessionIds: ["SESS-BIO110-TUE"],
    facultyId: "FAC-LIN",
    classroomId: "ROOM-LAB-BIO-01",
    timeSlotId: "SLOT-TUE-4",
    detectedAt: "2026-10-14T09:15:00Z",
    status: "active",
    hasFeasibleAlternative: true,
    alternatives: [
      {
        solutionId: "SOL-02-A",
        description:
          "Shift BIO-110 lab to Wednesday Slot 4 (02:00 - 03:30 PM). Dr. Lin is available and lab is unreserved.",
        targetClassroomId: "ROOM-LAB-BIO-01",
        targetTimeSlotId: "SLOT-WED-4",
        downstreamClashCount: 0,
        feasibilityScore: 94,
        isRecommended: true,
      },
      {
        solutionId: "SOL-02-B",
        description:
          "Substitute primary lab supervision with Dr. Marie Curie (qualified in cellular biochemistry).",
        substituteFacultyId: "FAC-CURIE",
        targetClassroomId: "ROOM-LAB-BIO-01",
        targetTimeSlotId: "SLOT-TUE-4",
        downstreamClashCount: 0,
        feasibilityScore: 86,
        isRecommended: false,
      },
    ],
    resolutionNotes: "Dr. Lin prefers Wednesday afternoon slot to avoid delegation.",
  },

  // ── 3. Room Capacity Deficit ───────────────────────────────────────────────
  {
    id: "CONF-03",
    type: "capacity_deficit",
    severity: "warning",
    title: "Room Capacity Deficit in SEM-302",
    description:
      "ENG-210 Sec A has 65 enrolled students but is scheduled in Executive Seminar Room (SEM-302) with capacity 50. Negative margin of 15 seats.",
    sessionIds: ["SESS-ENG210-THU"],
    classroomId: "ROOM-SEM-302",
    sectionId: "SEC-CSE-S5-A",
    timeSlotId: "SLOT-THU-3",
    detectedAt: "2026-10-14T10:00:00Z",
    status: "active",
    hasFeasibleAlternative: true,
    alternatives: [
      {
        solutionId: "SOL-03-A",
        description:
          "Move session to Interactive Classroom 204 (CR-204, Capacity: 75). Fully accommodates 65 students with 10 spare seats.",
        targetClassroomId: "ROOM-CR-204",
        targetTimeSlotId: "SLOT-THU-3",
        downstreamClashCount: 0,
        feasibilityScore: 99,
        isRecommended: true,
      },
      {
        solutionId: "SOL-03-B",
        description:
          "Move session to Carnot Memorial Hall (LH-202, Capacity: 140). Room is oversized but available.",
        targetClassroomId: "ROOM-LH-202",
        targetTimeSlotId: "SLOT-THU-3",
        downstreamClashCount: 0,
        feasibilityScore: 88,
        isRecommended: false,
      },
    ],
    resolutionNotes: "CR-204 is in the same building wing as students' preceding lecture.",
  },

  // ── 4. Maintenance Block Collision ─────────────────────────────────────────
  {
    id: "CONF-04",
    type: "maintenance_block",
    severity: "warning",
    title: "Scheduled Maintenance Collision in LAB-CS-02",
    description:
      "CS-402L DevOps Lab is assigned to AI Cluster Lab (LAB-CS-02) during pre-approved UPS power grid servicing (RES-MAINT-01) on Thursday 02:00 - 03:30 PM.",
    sessionIds: ["SESS-CS402L-THU"],
    classroomId: "ROOM-LAB-CS-02",
    timeSlotId: "SLOT-THU-4",
    detectedAt: "2026-10-14T10:45:00Z",
    status: "active",
    hasFeasibleAlternative: true,
    alternatives: [
      {
        solutionId: "SOL-04-A",
        description:
          "Reallocate lab to Cloud Systems Lab (LAB-CS-01, 60 workstations). Vacant at this slot with required Linux images.",
        targetClassroomId: "ROOM-LAB-CS-01",
        targetTimeSlotId: "SLOT-THU-4",
        downstreamClashCount: 0,
        feasibilityScore: 96,
        isRecommended: true,
      },
    ],
    resolutionNotes: "LAB-CS-01 has identical virtual environment and tooling installed.",
  },

  // ── 5. NO FEASIBLE ALTERNATIVE SCENARIO ─────────────────────────────────────
  {
    id: "CONF-05",
    type: "equipment_mismatch",
    severity: "critical",
    title: "Sole BSL-3 Facility Overhaul — No Feasible Alternative",
    description:
      "ADV-BIO-901 High-Containment Pathogen Analysis requires statutory Bio-Safety Level 3 equipment (bio_safety_cabinet_l3). The sole certified BSL-3 laboratory on campus (LAB-BIO-BSL3) is closed under mandatory negative-pressure seal overhaul (RES-MAINT-BSL3) on Wednesday 11:30 AM - 01:00 PM.",
    sessionIds: ["SESS-BIO901-WED"],
    classroomId: "ROOM-LAB-BIO-BSL3",
    timeSlotId: "SLOT-WED-3",
    detectedAt: "2026-10-14T11:00:00Z",
    status: "active",
    hasFeasibleAlternative: false,
    alternatives: [], // Strictly no feasible alternative on campus
    resolutionNotes:
      "NO FEASIBLE ON-CAMPUS ALTERNATIVE: Federal biosafety compliance prohibits moving pathogen agents to standard BSL-2 laboratories (LAB-BIO-01). No other Level 3 facility exists on campus. Action required: Reschedule to post-overhaul week or conduct lecture component first.",
  },
];
