import {
  Calendar, Clock, Plus, Trash2, MapPin, DollarSign,
} from "lucide-react";
import type { PersonalActivity } from "./types";

interface Props {
  activities: PersonalActivity[];
  dayCount: number;
  startDate: string;
  onAdd: (day: number) => void;
  onUpdate: (id: string, updates: Partial<PersonalActivity>) => void;
  onRemove: (id: string) => void;
  highlightDay: number | null;
  onHighlightDay: (day: number | null) => void;
}

const ACTIVITY_TYPES = [
  { value: "hotel", label: "Hotel / Accommodation" },
  { value: "activity", label: "Activity / Sightseeing" },
  { value: "restaurant", label: "Restaurant / Meal" },
  { value: "transit", label: "Transit / Transport" },
];

function formatDate(d: string, dayOffset: number): string {
  if (!d) return "";
  const date = new Date(new Date(d + "T00:00:00").getTime() + dayOffset * 86400000);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function TripItinerary({ activities, dayCount, startDate, onAdd, onUpdate, onRemove, highlightDay, onHighlightDay }: Props) {
  return (
    <div className="space-y-3">
      <div className="glass-panel rounded-2xl p-5 border border-[rgba(0,212,255,0.15)]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">Day-by-Day Itinerary</h2>
          <span className="text-[12px] text-primary font-semibold">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          Add activities, meals, and transport for each day. Max 1 anchor activity per half-day is recommended for comfortable pacing.
        </p>

        {Array.from({ length: Math.min(dayCount, 30) }, (_, i) => i + 1).map(day => {
          const dayActivities = activities.filter(a => a.day === day);
          const dateStr = formatDate(startDate, day - 1);
          const dayTotal = dayActivities.reduce((sum, a) => sum + a.cost, 0);
          const isHighlighted = highlightDay === day;
          const morningCount = dayActivities.filter(a => {
            const h = parseInt(a.time.split(":")[0] || "0");
            return h < 12;
          }).length;
          const afternoonCount = dayActivities.filter(a => {
            const h = parseInt(a.time.split(":")[0] || "0");
            return h >= 12;
          }).length;
          const pacingWarn = morningCount > 1 || afternoonCount > 1;

          return (
            <div key={day}
              className={`rounded-xl border mb-3 overflow-hidden transition-all cursor-pointer ${
                isHighlighted
                  ? "border-primary/40 bg-primary/[0.04] shadow-lg shadow-primary/5"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-white/15"
              }`}
              onClick={() => onHighlightDay(isHighlighted ? null : day)}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  <span className="text-[16px] font-black text-primary">Day {day}</span>
                  <span className="text-[11px] text-white/30">{dateStr}</span>
                </div>
                <div className="flex items-center gap-2">
                  {pacingWarn && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#ffd700]/15 text-[#ffd700] font-bold">Busy</span>
                  )}
                  {dayTotal > 0 && (
                    <span className="text-[12px] font-mono font-bold text-[#00ff88]">${dayTotal.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2" onClick={e => e.stopPropagation()}>
                {dayActivities.length === 0 && (
                  <p className="text-[12px] text-white/50 text-center py-2">No activities planned yet</p>
                )}
                {dayActivities.map(a => (
                  <div key={a.id} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
                    <div className="flex gap-2 mb-2">
                      <input type="time" value={a.time}
                        onChange={e => onUpdate(a.id, { time: e.target.value })}
                        className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-2 text-[12px] text-white w-[100px] focus:outline-none focus:border-primary/30"
                        aria-label="Activity time" />
                      <input type="text" placeholder="Activity name" value={a.title}
                        onChange={e => onUpdate(a.id, { title: e.target.value.slice(0, 200) })}
                        maxLength={200}
                        className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-primary/30 placeholder:text-white/40 min-w-0" />
                      <button onClick={() => onRemove(a.id)}
                        className="p-2 text-white/40 hover:text-[#ff3366] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Remove activity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <select value={a.type} onChange={e => onUpdate(a.id, { type: e.target.value as PersonalActivity["type"] })}
                        className="bg-[#0d0d1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-primary/30 min-h-[34px] [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                        {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <div className="relative flex items-center">
                        <DollarSign className="absolute left-2 w-3 h-3 text-white/40" />
                        <input type="number" min={0} max={99999} value={a.cost || ""}
                          onChange={e => onUpdate(a.id, { cost: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="Cost"
                          className="bg-white/[0.05] border border-white/10 rounded-lg pl-6 pr-2 py-1.5 text-[11px] text-white w-[90px] focus:outline-none focus:border-primary/30 font-mono" />
                      </div>
                      <div className="relative flex items-center flex-1 min-w-[120px]">
                        <MapPin className="absolute left-2 w-3 h-3 text-white/40" />
                        <input type="text" placeholder="Location (for map)" value={a.location}
                          onChange={e => onUpdate(a.id, { location: e.target.value.slice(0, 100) })}
                          maxLength={100}
                          className="w-full bg-transparent border-none text-[11px] text-white/40 focus:outline-none placeholder:text-white/40 pl-6 min-w-0" />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => onAdd(day)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-white/10 text-white/25 hover:text-primary hover:border-primary/30 text-[12px] transition-colors min-h-[40px]">
                  <Plus className="w-3.5 h-3.5" /> Add Activity
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
