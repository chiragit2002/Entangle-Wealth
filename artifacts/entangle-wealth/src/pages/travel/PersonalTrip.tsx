import { useState, useMemo } from "react";
import { trackEvent } from "@/lib/trackEvent";
import { Map, List, BarChart3 } from "lucide-react";
import type { PersonalTripForm, PersonalActivity } from "./types";
import PersonalTripFormComponent from "./PersonalTripForm";
import TripMap from "./TripMap";
import TripItinerary from "./TripItinerary";
import BudgetSummary from "./BudgetSummary";
import EntryRequirements from "./EntryRequirements";

function getDayCount(start: string, end: string): number {
  if (!start || !end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(diff, 30));
}

type ViewMode = "map" | "itinerary" | "budget";

export default function PersonalTrip() {
  const [form, setForm] = useState<PersonalTripForm>({
    origin: "",
    destinations: [],
    startDate: "",
    endDate: "",
    travelers: 1,
    budgetLevel: "mid-range",
    tripStyle: [],
  });

  const [planned, setPlanned] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("itinerary");
  const [activities, setActivities] = useState<PersonalActivity[]>([]);
  const [highlightDay, setHighlightDay] = useState<number | null>(null);

  const dayCount = useMemo(() => getDayCount(form.startDate, form.endDate), [form.startDate, form.endDate]);

  const addActivity = (day: number) => {
    setActivities(prev => [...prev, {
      id: crypto.randomUUID(),
      day,
      time: "09:00",
      title: "",
      type: "activity",
      cost: 0,
      location: "",
    }]);
  };

  const updateActivity = (id: string, updates: Partial<PersonalActivity>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const removeActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  if (!planned) {
    return <PersonalTripFormComponent form={form} onChange={setForm} onPlan={() => {
      trackEvent("travel_plan_created", {
        destinations: form.destinations.length,
        budgetLevel: form.budgetLevel,
        travelers: form.travelers,
      });
      setPlanned(true);
    }} />;
  }

  const views: { key: ViewMode; label: string; icon: typeof Map }[] = [
    { key: "itinerary", label: "Itinerary", icon: List },
    { key: "map", label: "Map", icon: Map },
    { key: "budget", label: "Budget", icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-4 border border-[rgba(0,180,216,0.15)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">
              {form.origin} → {form.destinations.join(" → ")}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {dayCount} day{dayCount > 1 ? "s" : ""} · {form.travelers} traveler{form.travelers > 1 ? "s" : ""} · {form.budgetLevel}
            </p>
          </div>
          <button onClick={() => setPlanned(false)}
            className="text-[12px] text-primary hover:text-primary/80 font-semibold">
            Edit Trip
          </button>
        </div>

        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {views.map(v => {
            const Icon = v.icon;
            return (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-semibold transition-all min-h-[40px] ${
                  viewMode === v.key
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-white/40 hover:text-white/60"
                }`}>
                <Icon className="w-4 h-4" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <EntryRequirements destinations={form.destinations} />

      {viewMode === "map" && (
        <TripMap
          activities={activities}
          destinations={form.destinations}
          highlightDay={highlightDay}
        />
      )}

      {viewMode === "itinerary" && (
        <TripItinerary
          activities={activities}
          dayCount={dayCount}
          startDate={form.startDate}
          onAdd={addActivity}
          onUpdate={updateActivity}
          onRemove={removeActivity}
          highlightDay={highlightDay}
          onHighlightDay={setHighlightDay}
        />
      )}

      {viewMode === "budget" && (
        <BudgetSummary
          form={form}
          activities={activities}
          dayCount={dayCount}
        />
      )}
    </div>
  );
}
