import { useState } from "react";
import { Calendar, TrendingUp, AlertTriangle, Clock } from "lucide-react";

interface EconEvent {
  date: string;
  time: string;
  name: string;
  impact: "high" | "medium" | "low";
  previous: string;
  forecast: string;
  actual?: string;
  category: "fed" | "employment" | "inflation" | "gdp" | "earnings" | "housing";
}

const EVENTS: EconEvent[] = [
  { date: "Apr 7", time: "8:30 AM", name: "Trade Balance", impact: "medium", previous: "$68.3B", forecast: "$67.5B", category: "gdp" },
  { date: "Apr 8", time: "6:00 AM", name: "NFIB Small Business Optimism", impact: "low", previous: "100.7", forecast: "101.2", category: "gdp" },
  { date: "Apr 9", time: "2:00 PM", name: "FOMC Meeting Minutes", impact: "high", previous: "N/A", forecast: "N/A", category: "fed" },
  { date: "Apr 10", time: "8:30 AM", name: "CPI (MoM)", impact: "high", previous: "0.4%", forecast: "0.3%", category: "inflation" },
  { date: "Apr 10", time: "8:30 AM", name: "Core CPI (YoY)", impact: "high", previous: "3.8%", forecast: "3.7%", category: "inflation" },
  { date: "Apr 10", time: "8:30 AM", name: "Initial Jobless Claims", impact: "medium", previous: "221K", forecast: "215K", category: "employment" },
  { date: "Apr 11", time: "8:30 AM", name: "PPI (MoM)", impact: "medium", previous: "0.6%", forecast: "0.3%", category: "inflation" },
  { date: "Apr 11", time: "10:00 AM", name: "Michigan Consumer Sentiment", impact: "medium", previous: "79.4", forecast: "79.0", category: "gdp" },
  { date: "Apr 12", time: "Pre-Mkt", name: "JPM Earnings", impact: "high", previous: "$4.44", forecast: "$4.15", category: "earnings" },
  { date: "Apr 12", time: "Pre-Mkt", name: "WFC Earnings", impact: "medium", previous: "$1.29", forecast: "$1.08", category: "earnings" },
  { date: "Apr 12", time: "Pre-Mkt", name: "C Earnings", impact: "medium", previous: "$1.52", forecast: "$1.22", category: "earnings" },
  { date: "Apr 16", time: "8:30 AM", name: "Retail Sales (MoM)", impact: "high", previous: "0.6%", forecast: "0.4%", category: "gdp" },
  { date: "Apr 17", time: "8:30 AM", name: "Housing Starts", impact: "medium", previous: "1.521M", forecast: "1.490M", category: "housing" },
  { date: "Apr 23", time: "Pre-Mkt", name: "TSLA Earnings", impact: "high", previous: "$0.71", forecast: "$0.52", category: "earnings" },
  { date: "Apr 24", time: "Pre-Mkt", name: "META Earnings", impact: "high", previous: "$5.33", forecast: "$4.72", category: "earnings" },
  { date: "Apr 25", time: "Pre-Mkt", name: "MSFT Earnings", impact: "high", previous: "$2.93", forecast: "$2.82", category: "earnings" },
  { date: "Apr 25", time: "Pre-Mkt", name: "GOOGL Earnings", impact: "high", previous: "$1.64", forecast: "$1.52", category: "earnings" },
  { date: "May 1", time: "2:00 PM", name: "FOMC Rate Decision", impact: "high", previous: "5.50%", forecast: "5.50%", category: "fed" },
  { date: "May 3", time: "8:30 AM", name: "Non-Farm Payrolls", impact: "high", previous: "303K", forecast: "240K", category: "employment" },
  { date: "May 3", time: "8:30 AM", name: "Unemployment Rate", impact: "high", previous: "3.8%", forecast: "3.9%", category: "employment" },
];

const impactColor = (i: string) => i === "high" ? "text-[#ff3366] bg-[#ff3366]/10" : i === "medium" ? "text-[#ffd700] bg-[#ffd700]/10" : "text-white/40 bg-white/[0.03]";
const catIcon = (c: string) => c === "fed" ? "FED" : c === "employment" ? "EMP" : c === "inflation" ? "CPI" : c === "gdp" ? "GDP" : c === "earnings" ? "ERN" : "HSG";

export function EconomicCalendar() {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? EVENTS : EVENTS.filter(e => e.category === filter);

  return (
    <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary/50" />
          <span className="text-[11px] font-bold text-white/50">ECONOMIC CALENDAR</span>
        </div>
        <div className="flex items-center gap-1">
          {["all", "fed", "earnings", "inflation", "employment"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${filter === f ? "bg-primary/10 text-primary" : "text-white/40 hover:text-white/30"}`}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {filtered.map((event, i) => (
          <div key={i} className="flex items-center px-4 py-2 border-b border-white/[0.015] hover:bg-white/[0.01] transition-colors gap-3">
            <div className="w-[52px] flex-shrink-0">
              <p className="text-[10px] font-bold text-white/30">{event.date}</p>
              <p className="text-[8px] text-white/12 font-mono">{event.time}</p>
            </div>
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${impactColor(event.impact)} flex-shrink-0 w-7 text-center`}>
              {event.impact === "high" ? "!!!" : event.impact === "medium" ? "!!" : "!"}
            </span>
            <span className="text-[8px] font-mono text-white/40 w-6 flex-shrink-0">{catIcon(event.category)}</span>
            <span className="text-[11px] font-medium flex-1 min-w-0 truncate">{event.name}</span>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-[8px] text-white/10">Prev</p>
                <p className="text-[10px] font-mono text-white/25">{event.previous}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-white/10">Fcst</p>
                <p className="text-[10px] font-mono text-white/35">{event.forecast}</p>
              </div>
              {event.actual && (
                <div className="text-right">
                  <p className="text-[8px] text-white/10">Act</p>
                  <p className="text-[10px] font-mono font-bold text-primary">{event.actual}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
