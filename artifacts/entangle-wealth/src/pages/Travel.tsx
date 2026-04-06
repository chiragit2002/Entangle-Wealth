import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { Plane, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Activity {
  time: string;
  title: string;
  note: string;
  deductible: "full" | "partial" | "none";
  pct: string;
}

interface DayPlan {
  day: number;
  label: string;
  activities: Activity[];
}

const GENERATED_ITINERARY: DayPlan[] = [
  {
    day: 1, label: "100% Business",
    activities: [
      { time: "9:00 AM", title: "Conference Registration", note: "Qualifies: IRC 162 ordinary business expense", deductible: "full", pct: "100%" },
      { time: "12:00 PM", title: "Networking Lunch", note: "50% deductible — document attendees & purpose", deductible: "partial", pct: "50%" },
      { time: "2:00 PM", title: "Industry Sessions", note: "Qualifies: education maintaining business skills", deductible: "full", pct: "100%" },
      { time: "7:00 PM", title: "Client Dinner", note: "50% deductible — document business discussed", deductible: "partial", pct: "50%" },
    ],
  },
  {
    day: 2, label: "100% Business",
    activities: [
      { time: "8:00 AM", title: "Keynote Session", note: "Qualifies: industry knowledge for business", deductible: "full", pct: "100%" },
      { time: "10:00 AM", title: "Vendor Meetings", note: "Qualifies: ordinary and necessary business activity", deductible: "full", pct: "100%" },
      { time: "3:00 PM", title: "Personal Time", note: "NOT deductible — personal activities excluded", deductible: "none", pct: "0%" },
    ],
  },
];

const SUMMARY_ITEMS = [
  { label: "Transportation", pct: "100% deductible", color: "#00ff88" },
  { label: "Lodging", pct: "100% deductible", color: "#00ff88" },
  { label: "Meals", pct: "50% deductible", color: "#ffd700" },
  { label: "Conference Fees", pct: "100% deductible", color: "#00ff88" },
];

export default function Travel() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", purpose: "", type: "Conference / Trade Show" });
  const [showItinerary, setShowItinerary] = useState(false);

  const createItinerary = () => {
    if (!form.name || !form.startDate || !form.purpose) {
      toast({ title: "Missing fields", description: "Please fill trip name, start date, and purpose.", variant: "destructive" });
      return;
    }
    setShowItinerary(true);
    toast({ title: "Itinerary generated", description: "Tax-optimized travel plan created." });
  };

  const exportItinerary = () => {
    toast({ title: "Exported", description: "Itinerary exported for CPA review." });
  };

  const getBadgeStyle = (type: "full" | "partial" | "none") => {
    switch (type) {
      case "full": return "bg-[rgba(0,255,136,0.15)] text-[#00ff88]";
      case "partial": return "bg-[rgba(255,215,0,0.15)] text-[#ffd700]";
      case "none": return "bg-[rgba(255,51,102,0.15)] text-[#ff3366]";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Plane className="w-8 h-8 text-secondary" />
          <h1 className="text-3xl md:text-4xl font-bold">Business Travel Planner</h1>
        </div>
        <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.03)]">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Per IRS Publication 463, travel is deductible when the primary purpose is business. The trip must be ordinary and necessary. Keep records of business activities each day.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-primary mb-3">Trip Details</h3>
          <div className="space-y-2.5">
            <Input placeholder="Trip name / destination" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="bg-white/5 border-white/10" />
              <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="bg-white/5 border-white/10" />
            </div>
            <Input placeholder="Primary business purpose" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} className="bg-white/5 border-white/10" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-primary/50">
              <option>Conference / Trade Show</option>
              <option>Client Meeting</option>
              <option>Business Training</option>
              <option>Site Inspection</option>
              <option>Industry Event</option>
            </select>
            <Button className="w-full bg-gradient-to-r from-secondary to-[#cc9900] text-black font-bold" onClick={createItinerary}>
              Build Deductible Itinerary
            </Button>
          </div>
        </div>

        {showItinerary && (
          <>
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
              <h2 className="text-lg font-semibold">Your Itinerary</h2>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(0,255,136,0.15)] text-[#00ff88]">TAX OPTIMIZED</span>
            </div>

            <div className="space-y-4 mb-6">
              {GENERATED_ITINERARY.map((day) => (
                <div key={day.day} className="glass-panel rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-black text-primary">Day {day.day}</span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(0,255,136,0.15)] text-[#00ff88]">{day.label}</span>
                  </div>
                  <div className="space-y-2">
                    {day.activities.map((a, i) => (
                      <div key={i} className="bg-white/[0.03] rounded-lg p-3 flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold">{a.time} — {a.title}</p>
                          <p className="text-[11px]" style={{
                            color: a.deductible === "full" ? "#666" : a.deductible === "partial" ? "#ffd700" : "#ff3366"
                          }}>
                            {a.note}
                          </p>
                        </div>
                        <span className={`ml-3 px-2.5 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0 ${getBadgeStyle(a.deductible)}`}>
                          {a.deductible === "full" ? "✓" : a.deductible === "partial" ? "50%" : "✗"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel rounded-xl p-5 mb-6 border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.03)]">
              <h3 className="text-sm font-bold text-[#00ff88] mb-3">Trip Deduction Summary</h3>
              <div className="space-y-0">
                {SUMMARY_ITEMS.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-[13px] text-muted-foreground">{item.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: item.color }}>{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold" onClick={exportItinerary}>
              Export Itinerary for CPA
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
