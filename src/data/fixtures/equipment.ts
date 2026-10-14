import type { RoomEquipment } from "@/types/domain";

export const SEED_ROOM_EQUIPMENT: RoomEquipment[] = [
  {
    id: "EQ-PROJ-01",
    type: "smart_projector",
    name: "4K Laser Presentation Projector (LH-101)",
    status: "operational",
    serialNumber: "SN-EPSON-4K-901",
  },
  {
    id: "EQ-MIC-01",
    type: "sound_reinforcement_mic",
    name: "Shure Wireless Boundary Microphone Array (LH-101)",
    status: "operational",
    serialNumber: "SN-SHURE-MIC-442",
  },
  {
    id: "EQ-DISP-01",
    type: "dual_displays",
    name: "86-inch Dual Interactive Touch Displays (LH-201)",
    status: "operational",
    serialNumber: "SN-LG-TOUCH-201",
  },
  {
    id: "EQ-WS-01",
    type: "high_spec_workstations",
    name: "60x Dell Precision Xeon Workstations with RTX 4080 (LAB-CS-01)",
    status: "operational",
    serialNumber: "SN-DELL-CLUSTER-01",
  },
  {
    id: "EQ-WS-02",
    type: "high_spec_workstations",
    name: "45x HP Z8 G4 AI/ML Workstations (LAB-CS-02)",
    status: "under_maintenance",
    serialNumber: "SN-HP-Z8-CLUSTER-02",
  },
  {
    id: "EQ-BIO-L2",
    type: "bio_safety_cabinet_l2",
    name: "Thermo Class II Type A2 Biosafety Cabinet (LAB-BIO-01)",
    status: "operational",
    serialNumber: "SN-THERMO-L2-3310",
  },
  {
    id: "EQ-BIO-L3",
    type: "bio_safety_cabinet_l3",
    name: "Baker BioChemGARD Class III Total Containment Glovebox (LAB-BIO-BSL3)",
    status: "under_maintenance",
    serialNumber: "SN-BAKER-BSL3-9901",
  },
  {
    id: "EQ-FLUME-01",
    type: "fluid_dynamics_flume",
    name: "Armfield Subsonic Open-Channel Flume (LAB-ME-01)",
    status: "operational",
    serialNumber: "SN-ARMFIELD-FL-12",
  },
  {
    id: "EQ-DOC-01",
    type: "document_camera",
    name: "WolfVision Visualizer High-Res Document Camera (SEM-302)",
    status: "operational",
    serialNumber: "SN-WOLF-CAM-55",
  },
];
