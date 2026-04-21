import { useState } from "react";
import {
  MapPin, Calendar, Users, Compass, DollarSign,
  Plus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PersonalTripForm as FormType } from "./types";
import { TRIP_STYLES } from "./types";

interface Props {
  form: FormType;
  onChange: (form: FormType) => void;
  onPlan: () => void;
}

const POPULAR_DESTINATIONS = [
  "Paris, France", "Tokyo, Japan", "New York, USA", "Rome, Italy",
  "Barcelona, Spain", "London, UK", "Bangkok, Thailand", "Sydney, Australia",
  "Dubai, UAE", "Cancun, Mexico", "Bali, Indonesia", "Amsterdam, Netherlands",
  "Prague, Czech Republic", "Lisbon, Portugal", "Seoul, South Korea",
  "Istanbul, Turkey", "Reykjavik, Iceland", "Marrakech, Morocco",
  "Buenos Aires, Argentina", "Cape Town, South Africa",
];

export default function PersonalTripForm({ form, onChange, onPlan }: Props) {
  const [destInput, setDestInput] = useState("");
  const [showSugg, setShowSugg] = useState(false);

  const filteredDest = destInput.length > 0
    ? POPULAR_DESTINATIONS.filter(d => d.toLowerCase().includes(destInput.toLowerCase()) && !form.destinations.includes(d))
    : [];

  const addDestination = (dest: string) => {
    if (dest.trim() && !form.destinations.includes(dest.trim())) {
      onChange({ ...form, destinations: [...form.destinations, dest.trim()] });
    }
    setDestInput("");
    setShowSugg(false);
  };

  const removeDestination = (dest: string) => {
    onChange({ ...form, destinations: form.destinations.filter(d => d !== dest) });
  };

  const toggleStyle = (style: string) => {
    const styles = form.tripStyle.includes(style)
      ? form.tripStyle.filter(s => s !== style)
      : [...form.tripStyle, style];
    onChange({ ...form, tripStyle: styles });
  };

  const isValid = form.origin.trim() && form.destinations.length > 0 && form.startDate && form.endDate;

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-sm p-5 md:p-7 border border-[rgba(0,180,216,0.15)]">
        <h2 className="text-lg font-bold mb-1">Plan Your Trip</h2>
        <p className="text-[12px] text-muted-foreground mb-5">Set up the basics of your personal trip.</p>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Where are you traveling from?"
              value={form.origin}
              onChange={e => onChange({ ...form, origin: e.target.value.slice(0, 100) })}
              maxLength={100}
              className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 text-foreground text-[14px] focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
              aria-label="Origin city"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-2 block">Destinations</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.destinations.map(dest => (
                <span key={dest} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[12px] font-semibold flex items-center gap-1.5">
                  {dest}
                  <button onClick={() => removeDestination(dest)} className="text-muted-foreground/50 hover:text-muted-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
                <Compass className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Add a destination..."
                value={destInput}
                onChange={e => { setDestInput(e.target.value.slice(0, 100)); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 200)}
                onKeyDown={e => { if (e.key === "Enter" && destInput.trim()) { addDestination(destInput); } }}
                maxLength={100}
                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 text-foreground text-[14px] focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                aria-label="Add destination"
              />
              {showSugg && filteredDest.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-30 max-h-[200px] overflow-y-auto">
                  {filteredDest.slice(0, 6).map(d => (
                    <button key={d} onClick={() => addDestination(d)}
                      className="w-full text-left px-4 py-3 text-[13px] text-foreground/80 hover:bg-primary/10 transition-colors flex items-center gap-2 min-h-[44px]">
                      <MapPin className="w-3 h-3 text-primary/40" /> {d}
                    </button>
                  ))}
                </div>
              )}
              {destInput.trim() && filteredDest.length === 0 && showSugg && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden z-30">
                  <button onClick={() => addDestination(destInput)}
                    className="w-full text-left px-4 py-3 text-[13px] text-foreground/80 hover:bg-primary/10 transition-colors flex items-center gap-2 min-h-[44px]">
                    <Plus className="w-3 h-3 text-primary/40" /> Add "{destInput}"
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><Calendar className="w-4 h-4" /></div>
              <input type="date" value={form.startDate} onChange={e => onChange({ ...form, startDate: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-3 py-3.5 text-foreground text-[13px] focus:outline-none focus:border-primary/50 min-h-[48px]"
                aria-label="Start date" />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><Calendar className="w-4 h-4" /></div>
              <input type="date" value={form.endDate} onChange={e => onChange({ ...form, endDate: e.target.value })}
                className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-3 py-3.5 text-foreground text-[13px] focus:outline-none focus:border-primary/50 min-h-[48px]"
                aria-label="End date" />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><Users className="w-4 h-4" /></div>
              <select value={form.travelers} onChange={e => onChange({ ...form, travelers: parseInt(e.target.value) })}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-3 py-3.5 text-foreground text-[13px] focus:outline-none focus:border-primary/50 appearance-none min-h-[48px] [&>option]:bg-card [&>option]:text-foreground"
                aria-label="Travelers">
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} traveler{n > 1 ? "s" : ""}</option>)}
              </select>
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><DollarSign className="w-4 h-4" /></div>
              <select value={form.budgetLevel} onChange={e => onChange({ ...form, budgetLevel: e.target.value as FormType["budgetLevel"] })}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-3 py-3.5 text-foreground text-[13px] focus:outline-none focus:border-primary/50 appearance-none min-h-[48px] [&>option]:bg-card [&>option]:text-foreground"
                aria-label="Budget level">
                <option value="budget">Budget</option>
                <option value="mid-range">Mid-Range</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-2 block">Trip Style</label>
            <div className="flex flex-wrap gap-2">
              {TRIP_STYLES.map(style => (
                <button key={style.value} onClick={() => toggleStyle(style.value)}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all min-h-[40px] ${
                    form.tripStyle.includes(style.value)
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted/50 text-muted-foreground/70 border border-border hover:text-muted-foreground"
                  }`}>
                  {style.emoji} {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold min-h-[48px] text-[14px]"
        onClick={onPlan}
        disabled={!isValid}
      >
        <Compass className="w-5 h-5 mr-2" /> Plan My Trip
      </Button>
    </div>
  );
}
