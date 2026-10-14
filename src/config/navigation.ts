/**
 * SYNAPSE navigation configuration.
 * Defines sidebar groups, routes, labels, and icons.
 */

import {
  LayoutDashboard,
  BarChart3,
  CalendarDays,
  AlertTriangle,
  Building2,
  CalendarPlus,
  ArrowLeftRight,
  TrendingUp,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeVariant?: "default" | "error" | "warning" | "success" | "secondary";
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigationConfig: NavGroup[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "SCHEDULING",
    items: [
      { label: "Timetable Studio", href: "/timetable", icon: CalendarDays },
      {
        label: "Conflicts",
        href: "/conflicts",
        icon: AlertTriangle,
        badge: 5,
        badgeVariant: "error",
      },
      { label: "Rooms & Resources", href: "/rooms", icon: Building2 },
    ],
  },
  {
    title: "ACADEMIC OPERATIONS",
    items: [
      { label: "Extra Classes", href: "/extra-classes", icon: CalendarPlus },
      {
        label: "Class Exchanges",
        href: "/exchanges",
        icon: ArrowLeftRight,
        badge: 4,
        badgeVariant: "warning",
      },
      { label: "Syllabus Progress", href: "/syllabus", icon: TrendingUp },
    ],
  },
  {
    title: "GOVERNANCE & SYSTEM",
    items: [
      { label: "Change History", href: "/history", icon: History },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
