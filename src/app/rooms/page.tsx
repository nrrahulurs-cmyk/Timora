"use client";

import * as React from "react";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Search,
  Plus,
  LayoutGrid,
  Table,
  CheckCircle2,
  Clock,
  PieChart,
  Layers,
  Wrench,
  SlidersHorizontal,
  X,
  ShieldCheck,
  ChevronRight,
  ArrowUpDown,
  Compass,
} from "lucide-react";
import { schedulingRepository } from "@/lib/repository/scheduling-repository";
import { RoomDrawer } from "@/components/rooms/room-drawer";
import { RoomCreateModal } from "@/components/rooms/room-create-modal";
import { FindRoomModal } from "@/components/dashboard/modals/find-room-modal";
import type { Classroom, RoomType, TimetableSession } from "@/types/domain";

export default function RoomsPage() {
  const [classrooms, setClassrooms] = React.useState<Classroom[]>([]);
  const [sessions, setSessions] = React.useState<TimetableSession[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters & State
  const [query, setQuery] = React.useState("");
  const [buildingFilter, setBuildingFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | Classroom["status"]>("all");
  const [capacityFilter, setCapacityFilter] = React.useState<"all" | "large" | "medium" | "small">("all");
  const [accessibleOnly, setAccessibleOnly] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"capacity_desc" | "capacity_asc" | "code_asc">("capacity_desc");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  // Modals & Drawers
  const [selectedRoom, setSelectedRoom] = React.useState<Classroom | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [findModalOpen, setFindModalOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [rooms, sess] = await Promise.all([
        schedulingRepository.getClassrooms(),
        schedulingRepository.getTimetableSessions(),
      ]);
      setClassrooms(rooms);
      setSessions(sess.filter((s) => s.status !== "cancelled"));
    } catch (err) {
      console.error("Failed to load facilities inventory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Distinct Buildings
  const buildings = React.useMemo(() => {
    return Array.from(new Set(classrooms.map((c) => c.building))).sort();
  }, [classrooms]);

  // Filtered & Sorted Rooms
  const filteredRooms = React.useMemo(() => {
    return classrooms
      .filter((r) => {
        // Text Search
        if (query.trim()) {
          const q = query.toLowerCase();
          const match =
            r.code.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.building.toLowerCase().includes(q) ||
            r.type.toLowerCase().includes(q);
          if (!match) return false;
        }

        // Building
        if (buildingFilter !== "all" && r.building !== buildingFilter) return false;

        // Type
        if (typeFilter !== "all" && r.type !== typeFilter) return false;

        // Status
        if (statusFilter !== "all" && r.status !== statusFilter) return false;

        // Capacity
        if (capacityFilter === "large" && r.capacity <= 100) return false;
        if (capacityFilter === "medium" && (r.capacity < 50 || r.capacity > 100)) return false;
        if (capacityFilter === "small" && r.capacity >= 50) return false;

        // Accessibility
        if (accessibleOnly && !r.isAccessible) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "capacity_desc") return b.capacity - a.capacity;
        if (sortBy === "capacity_asc") return a.capacity - b.capacity;
        if (sortBy === "code_asc") return a.code.localeCompare(b.code);
        return 0;
      });
  }, [classrooms, query, buildingFilter, typeFilter, statusFilter, capacityFilter, accessibleOnly, sortBy]);

  // Authoritative Derived Figures
  const totalCount = classrooms.length;
  const availableCount = classrooms.filter((r) => r.status === "Available").length;
  const occupiedCount = classrooms.filter((r) => r.status === "Occupied").length;
  const maintenanceCount = classrooms.filter((r) => r.status === "Maintenance").length;
  const utilization = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  const hasActiveFilters =
    query.trim() !== "" ||
    buildingFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    capacityFilter !== "all" ||
    accessibleOnly;

  const resetFilters = () => {
    setQuery("");
    setBuildingFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setCapacityFilter("all");
    setAccessibleOnly(false);
  };

  const handleInspectRoom = (room: Classroom) => {
    setSelectedRoom(room);
    setDrawerOpen(true);
  };

  const handleRoomUpdated = (updated: Classroom) => {
    setClassrooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    if (selectedRoom?.id === updated.id) {
      setSelectedRoom(updated);
    }
  };

  const handleRoomCreated = (newRoom: Classroom) => {
    setClassrooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      <WorkspaceHeader
        section="Infrastructure"
        title="Rooms & Resource Inventory"
        badge={
          <Badge variant="outline" size="sm" className="bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs font-semibold">
            {classrooms.length} Verified Facilities
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFindModalOpen(true)}
              className="gap-1.5 text-xs h-8 rounded-full px-3.5 shadow-2xs font-semibold"
            >
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              <span>Quick Finder</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 text-xs h-8 rounded-full px-4 shadow-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Facility</span>
            </Button>
          </div>
        }
      />

      {/* KPI Metric Summary Row (Restrained Apple/OpenAI Minimalism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-indigo-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {totalCount}
            </span>
            <div className="w-8 h-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Total Facilities
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-700 text-xs font-semibold mt-1 border border-slate-200/60 shadow-2xs">
              <span>Auditoriums, Labs & Halls</span>
            </div>
          </div>
        </Card>

        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-emerald-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-emerald-600 tracking-tight font-sans">
              {availableCount}
            </span>
            <div className="w-8 h-8 rounded-2xl border border-emerald-100 bg-emerald-50/50 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Available Now
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/80 text-emerald-700 text-xs font-semibold mt-1 border border-emerald-200/50 shadow-2xs">
              <span>Zero session double-booking</span>
            </div>
          </div>
        </Card>

        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-amber-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-amber-600 tracking-tight font-sans">
              {occupiedCount}
            </span>
            <div className="w-8 h-8 rounded-2xl border border-amber-100 bg-amber-50/50 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              In Session / Occupied
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50/80 text-amber-700 text-xs font-semibold mt-1 border border-amber-200/60 shadow-2xs">
              <span>{sessions.length} active scheduled classes</span>
            </div>
          </div>
        </Card>

        <Card className="p-4.5 flex flex-col justify-between bg-gradient-to-br from-rose-50/30 via-white/95 to-white/90 backdrop-blur-xl border border-slate-200/70 shadow-xs hover:shadow-md rounded-3xl min-h-[120px] transition-all duration-200 hover:-translate-y-0.5">
          <div className="flex items-start justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] leading-none font-bold text-rose-600 tracking-tight font-sans">
                {maintenanceCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">({utilization}% load)</span>
            </div>
            <div className="w-8 h-8 rounded-2xl border border-rose-100 bg-rose-50/50 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Maintenance & Blocks
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50/80 text-rose-700 text-xs font-semibold mt-1 border border-rose-200/60 shadow-2xs">
              <span>{maintenanceCount > 0 ? "Statutory locks active" : "All facilities operational"}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
            <Input
              placeholder="Search by code, venue name, or building..."
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-slate-50 text-xs h-9 rounded-full border-slate-200/80 shadow-2xs px-4"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort facilities by"
                className="h-8 rounded-full border border-slate-200/80 bg-slate-50 text-xs font-semibold text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
              >
                <option value="capacity_desc">Capacity: High to Low</option>
                <option value="capacity_asc">Capacity: Low to High</option>
                <option value="code_asc">Room Code: A to Z</option>
              </select>
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/60 gap-1">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Orbitask Table View"
              >
                <Table className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Orbitask Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-full border border-slate-200/60">
            {(["all", "Available", "Occupied", "Maintenance"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-full font-semibold transition cursor-pointer text-xs ${
                  statusFilter === st
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "all" ? "All Status" : st}
              </button>
            ))}
          </div>

          {/* Room Type Selector */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by facility type"
            className="h-7 rounded-full border border-slate-200/80 bg-slate-50 text-xs font-semibold text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="all">All Facility Types</option>
            <option value="Lecture Hall">Lecture Halls</option>
            <option value="Specialized Laboratory">Specialized Labs</option>
            <option value="Standard Classroom">Standard Classrooms</option>
            <option value="Seminar Room">Seminar Rooms</option>
            <option value="Auditorium">Auditoriums</option>
          </select>

          {/* Building Selector */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            aria-label="Filter by campus building"
            className="h-7 rounded-full border border-slate-200/80 bg-slate-50 text-xs font-semibold text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="all">All Campus Wings</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Capacity Filter */}
          <select
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value as any)}
            aria-label="Filter by seating capacity"
            className="h-7 rounded-full border border-slate-200/80 bg-slate-50 text-xs font-semibold text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="all">All Capacities</option>
            <option value="large">Large (&gt; 100 seats)</option>
            <option value="medium">Medium (50 – 100 seats)</option>
            <option value="small">Small (&lt; 50 seats)</option>
          </select>

          {/* Accessibility Toggle */}
          <button
            type="button"
            onClick={() => setAccessibleOnly(!accessibleOnly)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              accessibleOnly
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                : "bg-slate-50 border-slate-200/80 text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>ADA Accessible Only</span>
          </button>

          {/* Reset Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 ml-auto cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Count Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <strong>{filteredRooms.length}</strong> of <strong>{classrooms.length}</strong> registered facilities
        </span>
        {hasActiveFilters && (
          <span className="text-slate-400">Filters applied • Refined inventory view</span>
        )}
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          Loading verified campus facilities...
        </div>
      ) : filteredRooms.length === 0 ? (
        <Card className="p-12 text-center bg-white border-slate-200/80 shadow-xs rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No facilities match your active criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query, clearing status restrictions, or selecting a different campus building.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="text-xs rounded-full px-4 font-semibold"
          >
            Reset All Filters
          </Button>
        </Card>
      ) : viewMode === "table" ? (
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-semibold">
                  <th className="py-3 px-4">Venue Code</th>
                  <th className="py-3 px-4">Venue Name</th>
                  <th className="py-3 px-4">Building Location</th>
                  <th className="py-3 px-4">Facility Type</th>
                  <th className="py-3 px-4 text-center">Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Equipment Check</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.map((room) => {
                  const roomSessions = sessions.filter(
                    (s) => s.classroomId === room.id || s.classroomId === room.code
                  );
                  return (
                    <tr
                      key={room.id}
                      onClick={() => handleInspectRoom(room)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 shrink-0">
                        <span className="whitespace-nowrap inline-block px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/70 text-xs text-slate-900 font-mono font-bold">
                          {room.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{room.name}</div>
                        {room.isAccessible && (
                          <span className="text-xs text-emerald-600 font-normal">ADA Compliant</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {room.building} (Fl. {room.floor})
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200/60 text-xs">
                          {room.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                        {room.capacity} seats
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            room.status === "Available"
                              ? "success"
                              : room.status === "Occupied"
                              ? "warning"
                              : "error"
                          }
                          dot
                          size="sm"
                        >
                          {room.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        <span className="font-mono text-slate-700 font-medium">
                          {room.equipment.length} verified
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectRoom(room);
                          }}
                          className="h-7 text-xs px-3 font-semibold rounded-full group-hover:bg-slate-900 group-hover:text-white transition"
                        >
                          Inspect & Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const roomSessions = sessions.filter(
              (s) => s.classroomId === room.id || s.classroomId === room.code
            );

            return (
              <Card
                key={room.id}
                className="p-5 flex flex-col justify-between space-y-3.5 bg-gradient-to-br from-white/95 via-slate-50/40 to-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs hover:shadow-md rounded-3xl hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
                onClick={() => handleInspectRoom(room)}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-base font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">
                        {room.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{room.name}</span>
                    </div>
                    <Badge
                      variant={
                        room.status === "Available"
                          ? "success"
                          : room.status === "Occupied"
                          ? "warning"
                          : "error"
                      }
                      dot
                      size="sm"
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    >
                      {room.status}
                    </Badge>
                  </div>

                  <div className="mt-3.5 text-xs text-slate-600 space-y-1.5 bg-white/70 p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Campus Wing:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]">{room.building}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Venue Type:</span>
                      <span className="font-semibold text-slate-700">{room.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Seating Capacity:</span>
                      <span className="font-mono font-bold text-slate-900">{room.capacity} seats</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Scheduled Load:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {roomSessions.length} weekly sessions
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {room.isAccessible ? "ADA Accessible" : "Standard Access"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInspectRoom(room);
                    }}
                    className="text-xs h-8 rounded-full px-4 shadow-2xs font-semibold group-hover:bg-slate-900 group-hover:text-white transition-all cursor-pointer"
                  >
                    <span>Inspect Venue</span>
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Room Detail & Edit Drawer */}
      <RoomDrawer
        room={selectedRoom}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRoomUpdated={handleRoomUpdated}
      />

      {/* Room Creation Modal */}
      <RoomCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onRoomCreated={handleRoomCreated}
      />

      {/* Quick Find & Allocate Modal */}
      <FindRoomModal open={findModalOpen} onOpenChange={setFindModalOpen} />
    </div>
  );
}
