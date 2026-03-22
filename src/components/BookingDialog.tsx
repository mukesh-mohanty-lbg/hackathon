import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, MapPin, Users, Info } from "lucide-react";
import { mockChildren, mockEventInstances } from "@/lib/mock-data";
import type { Event, EventInstance } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface BookingDialogProps {
  event: Event | null;
  instance: EventInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: (instanceIds: string[], childName: string) => void;
}

type EnrollOption = "full" | "select";

const BookingDialog = ({ event, instance, open, onOpenChange, onBooked }: BookingDialogProps) => {
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [enrollOption, setEnrollOption] = useState<EnrollOption | "">("");
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [step, setStep] = useState<"child" | "enroll" | "details">("child");
  const { toast } = useToast();

  const allInstances = event
    ? mockEventInstances.filter((i) => i.event_id === event.id && i.status === "scheduled")
    : [];

  const isSeries = allInstances.length > 1;

  const resetState = () => {
    setSelectedChild("");
    setEnrollOption("");
    setSelectedInstances([]);
    setStep("child");
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  const child = mockChildren.find((c) => c.id === selectedChild);

  const handleChildNext = () => {
    if (!selectedChild) return;
    if (isSeries) {
      setStep("enroll");
    } else {
      setStep("details");
      if (instance) setSelectedInstances([instance.id]);
    }
  };

  const handleEnrollNext = () => {
    if (enrollOption === "full") {
      setSelectedInstances(allInstances.map((i) => i.id));
    }
    setStep("details");
  };

  const toggleInstance = (id: string) => {
    setSelectedInstances((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBook = () => {
    if (!child || selectedInstances.length === 0) return;
    const name = child.preferred_name || child.first_name;
    onBooked(selectedInstances, name);
    toast({
      title: "Booked!",
      description: `${name} is booked into ${event?.name}${selectedInstances.length > 1 ? ` (${selectedInstances.length} sessions)` : ""}.`,
    });
    handleOpenChange(false);
  };

  if (!event) return null;

  const displayInstances = enrollOption === "full" ? allInstances : allInstances;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg" style={{ lineHeight: "1.2" }}>
            Book — {event.name}
          </DialogTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {event.location_name}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              Ages {event.age_min}–{event.age_max}
            </span>
          </div>
        </DialogHeader>

        {/* Step 1: Select child */}
        {step === "child" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Which young person would you like to book?
            </p>
            <div className="space-y-2">
              {mockChildren.map((c) => {
                const age = Math.floor(
                  (Date.now() - new Date(c.date_of_birth).getTime()) /
                    (365.25 * 24 * 60 * 60 * 1000)
                );
                const inRange = age >= event.age_min && age <= event.age_max;
                const isSelected = selectedChild === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => inRange && setSelectedChild(c.id)}
                    disabled={!inRange}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : inRange
                        ? "border-border hover:border-primary/40 hover:shadow-sm"
                        : "border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {c.preferred_name || c.first_name} {c.last_name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Age {age} · {c.school_year}
                      </span>
                    </div>
                    {!inRange && (
                      <Badge variant="secondary" className="text-[10px]">
                        Outside age range
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Series enrollment option */}
        {step === "enroll" && isSeries && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This activity is part of a series ({allInstances.length} sessions).
              <br />
              How would you like to enrol?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setEnrollOption("full")}
                className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all active:scale-[0.98] ${
                  enrollOption === "full"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <div>
                  <span className="text-sm font-medium">Enrol in full series</span>
                  <span className="block text-xs text-muted-foreground">
                    Book all {allInstances.length} upcoming sessions
                  </span>
                </div>
              </button>
              <button
                onClick={() => setEnrollOption("select")}
                className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-all active:scale-[0.98] ${
                  enrollOption === "select"
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
                }`}
              >
                <div>
                  <span className="text-sm font-medium">Choose individual sessions</span>
                  <span className="block text-xs text-muted-foreground">
                    Pick only the dates that work for you
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details & session selection */}
        {step === "details" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Booking for</span>
              <Badge variant="secondary">
                {child?.preferred_name || child?.first_name} {child?.last_name}
              </Badge>
            </div>

            <Tabs defaultValue="schedule">
              <TabsList className="w-full">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1">Schedule</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location_name}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Ages {event.age_min}–{event.age_max}
                  </div>
                  <div>Capacity: {event.capacity}</div>
                  <div>{event.drop_in_allowed ? "Drop-in welcome" : "Booking required"}</div>
                </div>
                {event.tags.length > 0 && (
                  <div className="flex gap-1">
                    {event.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="schedule" className="pt-2">
                <div className="rounded-lg border overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <span>Date</span>
                    <span>Time</span>
                    <span>Available</span>
                  </div>
                  <div className="divide-y">
                    {displayInstances.map((inst) => {
                      const full = inst.booked_count >= inst.capacity;
                      const remaining = inst.capacity - inst.booked_count;
                      const checked = selectedInstances.includes(inst.id);

                      return (
                        <label
                          key={inst.id}
                          className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                            checked ? "bg-primary/5" : "hover:bg-muted/30"
                          } ${full ? "opacity-50" : ""}`}
                        >
                          <span className="flex items-center gap-2">
                            {(enrollOption === "select" || !isSeries) && (
                              <Checkbox
                                checked={checked}
                                disabled={full}
                                onCheckedChange={() => !full && toggleInstance(inst.id)}
                              />
                            )}
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {new Date(inst.date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                            <Clock className="w-3 h-3" />
                            {inst.start_time}–{inst.end_time}
                          </span>
                          <span className={`text-xs tabular-nums text-right ${full ? "text-destructive" : "text-muted-foreground"}`}>
                            {full ? "Full" : remaining}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== "child" && (
            <Button
              variant="outline"
              onClick={() => {
                if (step === "details" && isSeries) setStep("enroll");
                else if (step === "enroll") setStep("child");
                else setStep("child");
              }}
              className="active:scale-[0.97] transition-transform"
            >
              Back
            </Button>
          )}
          {step === "child" && (
            <Button
              onClick={handleChildNext}
              disabled={!selectedChild}
              className="active:scale-[0.97] transition-transform"
            >
              Next
            </Button>
          )}
          {step === "enroll" && (
            <Button
              onClick={handleEnrollNext}
              disabled={!enrollOption}
              className="active:scale-[0.97] transition-transform"
            >
              Next
            </Button>
          )}
          {step === "details" && (
            <Button
              onClick={handleBook}
              disabled={selectedInstances.length === 0}
              className="active:scale-[0.97] transition-transform"
            >
              Book{selectedInstances.length > 1 ? ` (${selectedInstances.length} sessions)` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
