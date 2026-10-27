import { LayoutDashboard, CalendarDays, TriangleAlert, Users, Building2, CalendarPlus, ArrowLeftRight, BookOpen, ChartNoAxesCombined, History, Settings2 } from "lucide-react";

export const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard, group: "Workspace" },
  { label: "Timetable Studio", href: "/timetable", icon: CalendarDays, group: "Workspace" },
  { label: "Conflicts", href: "/conflicts", icon: TriangleAlert, group: "Workspace" },
  { label: "Faculty & staff", href: "/faculty", icon: Users, group: "Workspace" },
  { label: "Rooms & labs", href: "/rooms", icon: Building2, group: "Workspace" },
  { label: "Extra classes", href: "/extra-classes", icon: CalendarPlus, group: "Academic operations" },
  { label: "Faculty exchanges", href: "/exchanges", icon: ArrowLeftRight, group: "Academic operations" },
  { label: "Syllabus progress", href: "/syllabus", icon: BookOpen, group: "Academic operations" },
  { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined, group: "Institution" },
  { label: "History & versions", href: "/history", icon: History, group: "Institution" },
  { label: "Settings", href: "/settings", icon: Settings2, group: "Institution" },
];
