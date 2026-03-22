import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Search, CheckCircle2, Info } from "lucide-react";
import { mockEvents, mockEventInstances } from "@/lib/mock-data";
import type { Event, EventInstance } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import BookingDialog from "@/components/BookingDialog";

type ViewTab = "whats-on" | "regular" | "one-off";

const Events = () => {
  const [search, setSearch] = useState("");
  const [booked, setBooked] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<ViewTab>("whats-on");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<EventInstance | null>(null);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);
  const { toast } = useToast();

  // Group instances by date
  const scheduledInstances = mockEventInstances.filter((i) => i.status === "scheduled");
  const instancesByDate = useMemo(() => {
    const filtered = scheduledInstances.filter((inst) => {
      const event = mockEvents.find((e) => e.id === inst.event_id);
      if (!event) return false;
      return (
        event.name.toLowerCase().includes(search.toLowerCase()) ||
        event.programme?.toLowerCase().includes(search.toLowerCase()) ||
        inst.event_name.toLowerCase().includes(search.toLowerCase())
      );
    });

    const grouped: Record<string, EventInstance[]> = {};
    filtered
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.start_time.localeCompare(b.start_time);
      })
      .forEach((inst) => {
        if (!grouped[inst.date]) grouped[inst.date] = [];
        grouped[inst.date].push(inst);
      });
    return grouped;
  }, [search]);

  const handleBookClick = (inst: EventInstance) => {
    const event = mockEvents.find((e) => e.id === inst.event_id);
    if (!event) return;
    setSelectedEvent(event);
    setSelectedInstance(inst);
    setDialogOpen(true);
  };

  const handleBooked = (instanceIds: string[], childName: string) => {
    setBooked((prev) => {
      const next = { ...prev };
      instanceIds.forEach((id) => (next[id] = childName));
      return next;
    });
  };

  const formatDateHeading = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ lineHeight: "1.2" }}>
          What's On
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find and book activities for your young people.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewTab)}>
        <TabsList>
          <TabsTrigger value="whats-on">What's On?</TabsTrigger>
          <TabsTrigger value="regular">Regular Clubs</TabsTrigger>
          <TabsTrigger value="one-off">One Off Sessions</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search activities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Day-grouped listing */}
      <div className="space-y-6">
        {Object.entries(instancesByDate).map(([date, instances]) => (
          <div key={date} className="space-y-2">
            <h2 className="text-base font-semibold text-primary" style={{ lineHeight: "1.3" }}>
              {formatDateHeading(date)}
            </h2>
            <div className="rounded-lg border overflow-hidden divide-y">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 items-center px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                <span>Time</span>
                <span>What's On?</span>
                <span>Available</span>
                <span></span>
                <span></span>
              </div>
              {instances.map((inst) => {
                const event = mockEvents.find((e) => e.id === inst.event_id);
                if (!event) return null;
                const full = inst.booked_count >= inst.capacity;
                const remaining = inst.capacity - inst.booked_count;
                const isBooked = booked[inst.id];
                const seriesCount = scheduledInstances.filter(
                  (i) => i.event_id === inst.event_id
                ).length;
                const isExpanded = expandedInfo === inst.id;

                return (
                  <div key={inst.id}>
                    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 gap-y-1 items-center px-4 py-3">
                      {/* Time */}
                      <span className="text-sm font-medium tabular-nums text-primary">
                        {inst.start_time}–{inst.end_time}
                      </span>

                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{inst.event_name}</span>
                        {seriesCount > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            Series · {seriesCount} sessions
                          </Badge>
                        )}
                        {event.programme && (
                          <Badge variant="outline" className="text-[10px]">
                            {event.programme}
                          </Badge>
                        )}
                      </div>

                      {/* Available */}
                      <span
                        className={`text-sm tabular-nums ${
                          full ? "text-destructive font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {full ? "Full" : remaining}
                      </span>

                      {/* Info */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs active:scale-[0.97] transition-transform"
                        onClick={() =>
                          setExpandedInfo(isExpanded ? null : inst.id)
                        }
                      >
                        <Info className="w-3.5 h-3.5 mr-1" />
                        Info
                      </Button>

                      {/* Book / Booked */}
                      {isBooked ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isBooked}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 text-xs active:scale-[0.97] transition-transform"
                          onClick={() => handleBookClick(inst)}
                        >
                          {full ? "Waitlist" : "Book"}
                        </Button>
                      )}
                    </div>

                    {/* Expanded info */}
                    {isExpanded && event && (
                      <div className="px-4 pb-3 pt-0 border-t bg-muted/20">
                        <div className="grid sm:grid-cols-2 gap-3 py-3 text-sm">
                          <p className="text-muted-foreground col-span-full">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {event.location_name} · {event.location_address}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            Ages {event.age_min}–{event.age_max} · Capacity{" "}
                            {event.capacity}
                          </div>
                          {event.tags.length > 0 && (
                            <div className="flex gap-1 col-span-full">
                              {event.tags.map((t) => (
                                <Badge key={t} variant="outline" className="text-[10px]">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(instancesByDate).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No activities found.</p>
          </div>
        )}
      </div>

      <BookingDialog
        event={selectedEvent}
        instance={selectedInstance}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onBooked={handleBooked}
      />
    </div>
  );
};

export default Events;
