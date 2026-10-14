"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
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
} from "lucide-react";
import { schedulingRepository, type RoomRecord, SEED_ROOMS } from "@/lib/repository/scheduling-repository";
import { FindRoomModal } from "@/components/dashboard/modals/find-room-modal";

export default function RoomsPage() {
  const [rooms, setRooms] = React.useState<RoomRecord[]>(SEED_ROOMS);
  const [query, setQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    schedulingRepository
      .getAvailableRooms(query)
      .then((res) => {
        if (res && res.length > 0) {
          setRooms(res);
        } else if (!query) {
          setRooms(SEED_ROOMS);
        } else {
          setRooms([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load rooms:", err);
        setRooms(SEED_ROOMS);
      });
  }, [query]);

  const availableCount = rooms.filter((r) => r.status === "Available").length;
  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;
  const utilization = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Rooms & Resource Inventory"
        description="Classroom capacities, specialized equipment, audio-visual facilities, and occupancy status."
        breadcrumbs={[{ label: "Scheduling" }, { label: "Rooms & Resources" }]}
        actions={
          <Button variant="default" size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span>Find & Allocate Room</span>
          </Button>
        }
      />

      {/* KPI Metric Summary Row (Stitch-Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-slate-900 tracking-tight font-sans">
              {rooms.length}
            </span>
            <div className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-500 shrink-0">
              <Building2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Total Facilities
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-semibold mt-1 border border-slate-200/60 shadow-2xs">
              <span>Auditoriums, Labs & Halls</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-emerald-600 tracking-tight font-sans">
              {availableCount}
            </span>
            <div className="w-7 h-7 rounded-full border border-emerald-200/80 bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Available Now
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold mt-1 border border-emerald-200/50 shadow-2xs">
              <span>Ready for immediate booking</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-amber-600 tracking-tight font-sans">
              {occupiedCount}
            </span>
            <div className="w-7 h-7 rounded-full border border-amber-200/80 bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              In Session / Occupied
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-semibold mt-1 border border-amber-200/60 shadow-2xs">
              <span>Live classes active</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl min-h-[116px] transition-all duration-200">
          <div className="flex items-start justify-between">
            <span className="text-[26px] leading-none font-bold text-blue-600 tracking-tight font-sans">
              {utilization}%
            </span>
            <div className="w-7 h-7 rounded-full border border-blue-200/80 bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <PieChart className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xs font-semibold text-slate-600 tracking-tight">
              Campus Space Utilization
            </div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-semibold mt-1 border border-blue-200/60 shadow-2xs">
              <span>Balanced academic loading</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Input
            placeholder="Filter rooms by code, building, or category..."
            leftIcon={<Search className="h-4 w-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-white text-xs h-9 rounded-full border-slate-200/80 shadow-2xs px-4"
          />
        </div>

        {/* Orbitask Table vs Cards Switcher */}
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
            <span className="hidden sm:inline">Facility Cards</span>
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

      {/* Main Content Area */}
      {viewMode === "table" ? (
        <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3 px-3.5">Venue Code</th>
                  <th className="py-3 px-3.5">Venue Name</th>
                  <th className="py-3 px-3.5">Building</th>
                  <th className="py-3 px-3.5 text-center">Capacity</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Next Available Slot</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rooms.map((room) => (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-default"
                  >
                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200/70 text-[11px]">
                        {room.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                      {room.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {room.building}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-medium text-slate-700">
                      {room.capacity} seats
                    </td>
                    <td className="py-2.5 px-3.5">
                      <Badge
                        variant={
                          room.status === "Available"
                            ? "success"
                            : room.status === "Occupied"
                            ? "warning"
                            : "secondary"
                        }
                        dot
                        size="sm"
                      >
                        {room.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600">
                      {room.nextAvailableSlot}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalOpen(true)}
                        className="h-7 text-xs px-2.5 opacity-85 group-hover:opacity-100"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="p-4 flex flex-col justify-between space-y-3 bg-white border border-slate-200/80 shadow-2xs hover:shadow-card-soft rounded-2xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-base font-bold text-slate-900 block">
                    {room.code}
                  </span>
                  <span className="text-xs text-slate-500">{room.name}</span>
                </div>
                <Badge
                  variant={
                    room.status === "Available"
                      ? "success"
                      : room.status === "Occupied"
                      ? "warning"
                      : "secondary"
                  }
                  dot
                  size="sm"
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                >
                  {room.status}
                </Badge>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Building:</span>
                  <span className="font-medium text-slate-800">{room.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Capacity:</span>
                  <span className="font-medium text-slate-800">{room.capacity} seats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next Slot:</span>
                  <span className="font-mono text-slate-700">{room.nextAvailableSlot}</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="w-full text-xs h-8 rounded-full shadow-2xs font-semibold"
                >
                  Allocate Room
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FindRoomModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
