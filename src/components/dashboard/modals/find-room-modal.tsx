"use client";

import * as React from "react";
import { Search, Building2, Users, CheckCircle2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { schedulingRepository, type RoomRecord } from "@/lib/repository/scheduling-repository";
import { useToast } from "@/components/feedback/use-toast";

interface FindRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRoom?: (room: RoomRecord) => void;
}

export function FindRoomModal({
  open,
  onOpenChange,
  onSelectRoom,
}: FindRoomModalProps) {
  const { toast } = useToast();
  const [query, setQuery] = React.useState("");
  const [rooms, setRooms] = React.useState<RoomRecord[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setLoading(true);
      schedulingRepository.getAvailableRooms(query).then((res) => {
        setRooms(res);
        setLoading(false);
      });
    }
  }, [open, query]);

  const handleBook = (room: RoomRecord) => {
    toast({
      title: `Room ${room.code} Selected`,
      description: `Capacity: ${room.capacity} seats | ${room.building}`,
      variant: "success",
    });
    if (onSelectRoom) onSelectRoom(room);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[rgb(var(--color-primary))]" />
            <DialogTitle className="text-base font-semibold">
              Find a Room & Available Facility
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Real-time room availability across all campus blocks for Fall 2026.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <Input
            placeholder="Search by room code (e.g. LH-101), building, or room type..."
            leftIcon={<Search className="h-4 w-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-white text-xs"
            autoFocus
          />
        </div>

        <div className="p-4 max-h-[360px] overflow-y-auto space-y-2.5 scrollbar-thin">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Searching room availability database...
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching facilities found for &quot;{query}&quot;.
            </div>
          ) : (
            rooms.map((room) => {
              const isAvailable = room.status === "Available";
              return (
                <div
                  key={room.id}
                  className="p-3.5 rounded-lg border border-slate-200/90 bg-white hover:border-[rgb(var(--color-primary))] transition-all flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {room.code}
                      </span>
                      <span className="text-xs text-slate-600 truncate">
                        {room.name}
                      </span>
                      <Badge
                        variant={
                          room.status === "Available"
                            ? "success"
                            : room.status === "Occupied"
                            ? "warning"
                            : "secondary"
                        }
                        size="sm"
                        dot
                      >
                        {room.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {room.capacity} seats
                      </span>
                      <span>•</span>
                      <span>{room.building}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                        <Clock className="h-3 w-3" />
                        {room.nextAvailableSlot}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isAvailable ? "default" : "outline"}
                    onClick={() => handleBook(room)}
                    disabled={room.status === "Maintenance"}
                    className="shrink-0 text-xs"
                  >
                    {isAvailable ? "Select Room" : "View Slot"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
