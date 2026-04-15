import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  Plane, ArrowLeftRight, Calendar, Users, ChevronRight, ChevronLeft,
  MapPin, Clock, Download, CheckCircle2, FileText, Shield, Search,
  Building2, Briefcase, GraduationCap, Utensils, Car, Home, Wifi,
  Heart, DollarSign, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  Compass, Camera, Mail, Send,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PersonalTrip from "./travel/PersonalTrip";

type TravelMode = "personal" | "business";
type Step = 1 | 2 | 3 | 4;

const DEFAULT_MODE: TravelMode = "business";

interface TripForm {
  tripType: "roundtrip" | "oneway" | "multicity";
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  travelers: number;
  travelClass: string;
  purpose: string;
  purposeType: string;
}

interface IRSDeduction {
  id: string;
  category: string;
  title: string;
  irsRef: string;
  publication: string;
  description: string;
  pct: number;
  conditions: string[];
  icon: typeof Plane;
  selected: boolean;
}

interface ItineraryActivity {
  id: string;
  day: number;
  time: string;
  title: string;
  type: "business" | "meal" | "travel" | "personal" | "networking";
  deductible: "full" | "partial" | "none";
  pct: number;
  notes: string;
}

const AIRPORTS = [
  "Atlanta (ATL)", "Anchorage (ANC)", "Albuquerque (ABQ)", "Austin (AUS)",
  "Baltimore (BWI)", "Birmingham (BHM)", "Boise (BOI)", "Boston (BOS)", "Buffalo (BUF)",
  "Burbank (BUR)", "Charleston (CHS)", "Charlotte (CLT)", "Chicago (ORD)", "Chicago Midway (MDW)",
  "Cincinnati (CVG)", "Cleveland (CLE)", "Colorado Springs (COS)", "Columbus (CMH)",
  "Dallas (DFW)", "Dallas Love Field (DAL)", "Denver (DEN)", "Des Moines (DSM)",
  "Detroit (DTW)", "El Paso (ELP)", "Fort Lauderdale (FLL)", "Fort Myers (RSW)",
  "Hartford (BDL)", "Honolulu (HNL)", "Houston (IAH)", "Houston Hobby (HOU)",
  "Indianapolis (IND)", "Jacksonville (JAX)", "Kansas City (MCI)", "Knoxville (TYS)",
  "Las Vegas (LAS)", "Long Beach (LGB)", "Los Angeles (LAX)", "Louisville (SDF)",
  "Maui (OGG)", "Memphis (MEM)", "Miami (MIA)", "Milwaukee (MKE)",
  "Minneapolis (MSP)", "Myrtle Beach (MYR)", "Nashville (BNA)", "New Orleans (MSY)",
  "New York (JFK)", "New York LaGuardia (LGA)", "Newark (EWR)", "Norfolk (ORF)",
  "Oakland (OAK)", "Oklahoma City (OKC)", "Omaha (OMA)", "Ontario (ONT)",
  "Orange County (SNA)", "Orlando (MCO)", "Palm Beach (PBI)", "Palm Springs (PSP)",
  "Philadelphia (PHL)", "Phoenix (PHX)", "Pittsburgh (PIT)", "Portland (PDX)",
  "Providence (PVD)", "Raleigh-Durham (RDU)", "Reno (RNO)", "Richmond (RIC)",
  "Sacramento (SMF)", "Salt Lake City (SLC)", "San Antonio (SAT)", "San Diego (SAN)",
  "San Francisco (SFO)", "San Jose (SJC)", "San Juan (SJU)", "Santa Ana (SNA)",
  "Savannah (SAV)", "Seattle (SEA)", "Spokane (GEG)", "St. Louis (STL)",
  "Tampa (TPA)", "Tucson (TUS)", "Tulsa (TUL)", "Washington Dulles (IAD)",
  "Washington Reagan (DCA)", "West Palm Beach (PBI)",
  "Amsterdam (AMS)", "Athens (ATH)", "Auckland (AKL)", "Bangkok (BKK)",
  "Barcelona (BCN)", "Beijing (PEK)", "Berlin (BER)", "Bogota (BOG)",
  "Brussels (BRU)", "Buenos Aires (EZE)", "Cairo (CAI)", "Calgary (YYC)",
  "Cancun (CUN)", "Cape Town (CPT)", "Cartagena (CTG)", "Casablanca (CMN)",
  "Copenhagen (CPH)", "Delhi (DEL)", "Doha (DOH)", "Dubai (DXB)",
  "Dublin (DUB)", "Dusseldorf (DUS)", "Edinburgh (EDI)", "Frankfurt (FRA)",
  "Geneva (GVA)", "Glasgow (GLA)", "Grand Cayman (GCM)", "Guadalajara (GDL)",
  "Guatemala City (GUA)", "Hamburg (HAM)", "Havana (HAV)", "Helsinki (HEL)",
  "Ho Chi Minh City (SGN)", "Hong Kong (HKG)", "Istanbul (IST)", "Jakarta (CGK)",
  "Johannesburg (JNB)", "Kingston (KIN)", "Kuala Lumpur (KUL)", "Lagos (LOS)",
  "Lima (LIM)", "Lisbon (LIS)", "London Heathrow (LHR)", "London Gatwick (LGW)",
  "Los Cabos (SJD)", "Madrid (MAD)", "Manchester (MAN)", "Manila (MNL)",
  "Marrakech (RAK)", "Mauritius (MRU)", "Medellin (MDE)", "Melbourne (MEL)",
  "Mexico City (MEX)", "Milan (MXP)", "Montego Bay (MBJ)", "Monterrey (MTY)",
  "Montreal (YUL)", "Moscow (SVO)", "Mumbai (BOM)", "Munich (MUC)",
  "Nairobi (NBO)", "Nassau (NAS)", "Nice (NCE)", "Osaka (KIX)",
  "Oslo (OSL)", "Panama City (PTY)", "Paris CDG (CDG)", "Paris Orly (ORY)",
  "Prague (PRG)", "Punta Cana (PUJ)", "Reykjavik (KEF)", "Rio de Janeiro (GIG)",
  "Rome (FCO)", "San Jose Costa Rica (SJO)", "Santiago (SCL)", "Sao Paulo (GRU)",
  "Seoul (ICN)", "Shanghai (PVG)", "Singapore (SIN)", "Stockholm (ARN)",
  "Sydney (SYD)", "Taipei (TPE)", "Tel Aviv (TLV)", "Tokyo Haneda (HND)",
  "Tokyo Narita (NRT)", "Toronto (YYZ)", "Vancouver (YVR)", "Venice (VCE)",
  "Vienna (VIE)", "Warsaw (WAW)", "Zurich (ZRH)",
];

const IRS_DEDUCTIONS: IRSDeduction[] = [
  {
    id: "transport", category: "Transportation", title: "Airfare & Ground Transportation",
    irsRef: "IRC §162(a)(2)", publication: "IRS Publication 463, Chapter 1",
    description: "Airfare, train, bus, rideshare (Uber/Lyft), rental cars, and parking fees when traveling away from your tax home for business.",
    pct: 100, conditions: ["Primary purpose of trip must be business", "Must be traveling away from tax home overnight", "Keep all receipts and boarding passes"],
    icon: Plane, selected: false,
  },
  {
    id: "lodging", category: "Lodging", title: "Hotel & Accommodation",
    irsRef: "IRC §162(a)(2)", publication: "IRS Publication 463, Chapter 1",
    description: "Hotel rooms, Airbnb, and other lodging while on business travel. Only deductible for business days | personal days excluded.",
    pct: 100, conditions: ["Only for nights with business activity the next day", "Cannot be lavish or extravagant", "Tips to hotel staff are also deductible"],
    icon: Building2, selected: false,
  },
  {
    id: "meals", category: "Meals", title: "Business Meals (50% Deductible)",
    irsRef: "IRC §274(n)", publication: "IRS Publication 463, Chapter 2",
    description: "Meals while traveling for business or meals with clients/prospects where business is discussed. Limited to 50% deductibility.",
    pct: 50, conditions: ["Must not be lavish or extravagant", "Business must be discussed before, during, or after", "Document: who, where, what was discussed, amount"],
    icon: Utensils, selected: false,
  },
  {
    id: "conference", category: "Education", title: "Conference & Registration Fees",
    irsRef: "IRC §162", publication: "IRS Publication 463, Chapter 1 & Pub 970",
    description: "Registration fees, trade show admission, workshop fees, and seminar costs that maintain or improve skills needed in your current business.",
    pct: 100, conditions: ["Must relate to your current trade or business", "Cannot qualify you for a new profession", "Keep registration confirmations"],
    icon: GraduationCap, selected: false,
  },
  {
    id: "vehicle", category: "Vehicle", title: "Vehicle / Mileage Deduction",
    irsRef: "IRC §162, §274(d)", publication: "IRS Publication 463, Chapter 4",
    description: "Standard mileage rate (67¢/mile for 2024) or actual expenses for business driving. Includes gas, insurance, repairs, depreciation.",
    pct: 100, conditions: ["Must keep contemporaneous mileage log", "Commuting miles are NOT deductible", "Choose standard rate OR actual expenses, not both"],
    icon: Car, selected: false,
  },
  {
    id: "communication", category: "Communication", title: "Phone, Internet & Wi-Fi",
    irsRef: "IRC §162", publication: "IRS Publication 463",
    description: "Business calls, Wi-Fi fees during travel, international calling plans, and business portion of cell phone bills while traveling.",
    pct: 75, conditions: ["Only business-use portion deductible", "Keep itemized phone bills", "Hotel Wi-Fi charges are typically 100%"],
    icon: Wifi, selected: false,
  },
  {
    id: "supplies", category: "Supplies", title: "Travel Office Supplies & Equipment",
    irsRef: "IRC §162", publication: "IRS Publication 535, Chapter 1",
    description: "Laptop bags, portable chargers, business cards, presentation materials, and other supplies purchased specifically for business travel.",
    pct: 100, conditions: ["Must be ordinary and necessary for business", "Items used personally after trip may be partially deductible", "Keep all receipts"],
    icon: Briefcase, selected: false,
  },
  {
    id: "drycleaning", category: "Personal Care", title: "Laundry & Dry Cleaning",
    irsRef: "IRC §162(a)(2)", publication: "IRS Publication 463, Chapter 1",
    description: "Laundry, dry cleaning, and pressing of business attire while on an overnight business trip away from your tax home.",
    pct: 100, conditions: ["Must be on an overnight business trip", "Only for clothes worn during business activities", "Keep hotel laundry receipts"],
    icon: Home, selected: false,
  },
  {
    id: "tips", category: "Gratuities", title: "Business-Related Tips",
    irsRef: "IRC §162(a)(2)", publication: "IRS Publication 463",
    description: "Tips to hotel staff, taxi/rideshare drivers, restaurant servers, and others providing services during business travel.",
    pct: 100, conditions: ["Must be related to a deductible business expense", "Keep records of tips given", "Reasonable amounts only"],
    icon: DollarSign, selected: false,
  },
  {
    id: "medical", category: "Health", title: "Travel Medical Insurance",
    irsRef: "IRC §162, §213", publication: "IRS Publication 502 & 463",
    description: "Travel medical insurance, evacuation insurance, and emergency medical expenses incurred during business travel.",
    pct: 100, conditions: ["Must be purchased specifically for business trip", "Regular health insurance premiums handled separately", "Keep policy documentation"],
    icon: Heart, selected: false,
  },
];

const ACTIVITY_TYPES = [
  { value: "business", label: "Business Meeting / Session", pct: 100, deductible: "full" as const },
  { value: "meal", label: "Business Meal", pct: 50, deductible: "partial" as const },
  { value: "travel", label: "Transit / Transportation", pct: 100, deductible: "full" as const },
  { value: "networking", label: "Networking Event", pct: 100, deductible: "full" as const },
  { value: "personal", label: "Personal Time", pct: 0, deductible: "none" as const },
];

function escapeCSV(str: string): string {
  let s = str;
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return `"${s.replace(/"/g, '""')}"`;

}

function getDayCount(start: string, end: string): number {
  if (!start) return 1;
  if (!end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(diff, 30));
}

function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function Travel() {
  const { toast } = useToast();
  const [travelMode, setTravelMode] = useState<TravelMode>(DEFAULT_MODE);
  const [step, setStep] = useState<Step>(1);
  const [trip, setTrip] = useState<TripForm>({
    tripType: "roundtrip",
    from: "",
    to: "",
    departDate: "",
    returnDate: "",
    travelers: 1,
    travelClass: "economy",
    purpose: "",
    purposeType: "conference",
  });
  const [deductions, setDeductions] = useState<IRSDeduction[]>(IRS_DEDUCTIONS);
  const [expandedDed, setExpandedDed] = useState<string | null>(null);
  const [activities, setActivities] = useState<ItineraryActivity[]>([]);
  const [fromSugg, setFromSugg] = useState(false);
  const [toSugg, setToSugg] = useState(false);
  const [dedSearch, setDedSearch] = useState("");
  const [cpaDialogOpen, setCpaDialogOpen] = useState(false);
  const [cpaEmail, setCpaEmail] = useState("");
  const [cpaMessage, setCpaMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ew_cpa_email");
    if (saved) setCpaEmail(saved);
  }, []);

  const dayCount = getDayCount(trip.departDate, trip.returnDate);
  const selectedDeductions = deductions.filter(d => d.selected);

  const filteredDeductions = useMemo(() => {
    if (!dedSearch.trim()) return deductions;
    const q = dedSearch.toLowerCase();
    return deductions.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.irsRef.toLowerCase().includes(q)
    );
  }, [deductions, dedSearch]);

  const businessDays = activities.filter(a => a.type !== "personal").length > 0
    ? [...new Set(activities.filter(a => a.type !== "personal").map(a => a.day))].length
    : dayCount;
  const personalDays = dayCount - businessDays;

  const estimatedSavings = useMemo(() => {
    const transport = selectedDeductions.find(d => d.id === "transport") ? 450 * trip.travelers : 0;
    const lodging = selectedDeductions.find(d => d.id === "lodging") ? 180 * businessDays : 0;
    const meals = selectedDeductions.find(d => d.id === "meals") ? 75 * dayCount * 0.5 : 0;
    const conference = selectedDeductions.find(d => d.id === "conference") ? 350 : 0;
    const vehicle = selectedDeductions.find(d => d.id === "vehicle") ? 45 * dayCount : 0;
    const communication = selectedDeductions.find(d => d.id === "communication") ? 15 * dayCount * 0.75 : 0;
    const other = selectedDeductions.filter(d => !["transport", "lodging", "meals", "conference", "vehicle", "communication"].includes(d.id)).length * 25;
    return transport + lodging + meals + conference + vehicle + communication + other;
  }, [selectedDeductions, dayCount, businessDays, trip.travelers]);

  const complianceScore = useMemo(() => {
    let s = 40;
    if (trip.purpose.trim()) s += 10;
    if (trip.purposeType) s += 5;
    if (selectedDeductions.length > 0) s += 10;
    if (selectedDeductions.length >= 3) s += 5;
    if (activities.length > 0) s += 10;
    if (activities.filter(a => a.notes.trim()).length > 0) s += 5;
    const hasBizActivities = activities.some(a => a.type !== "personal");
    if (hasBizActivities) s += 10;
    if (personalDays < businessDays) s += 5;
    return Math.min(s, 100);
  }, [trip, selectedDeductions, activities, personalDays, businessDays]);

  const swapLocations = () => {
    setTrip(p => ({ ...p, from: p.to, to: p.from }));
  };

  const toggleDeduction = (id: string) => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
  };

  const addActivity = (day: number) => {
    setActivities(prev => [...prev, {
      id: crypto.randomUUID(),
      day,
      time: "09:00",
      title: "",
      type: "business",
      deductible: "full",
      pct: 100,
      notes: "",
    }]);
  };

  const updateActivity = (id: string, updates: Partial<ItineraryActivity>) => {
    setActivities(prev => prev.map(a => {
      if (a.id !== id) return a;
      const merged = { ...a, ...updates };
      if (updates.type) {
        const typeInfo = ACTIVITY_TYPES.find(t => t.value === updates.type);
        if (typeInfo) {
          merged.deductible = typeInfo.deductible;
          merged.pct = typeInfo.pct;
        }
      }
      return merged;
    }));
  };

  const removeActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const seedDefaultItinerary = () => {
    const seed: ItineraryActivity[] = [];
    for (let day = 1; day <= Math.min(dayCount, 5); day++) {
      seed.push(
        { id: crypto.randomUUID(), day, time: "08:00", title: "Morning session / meetings", type: "business", deductible: "full", pct: 100, notes: "" },
        { id: crypto.randomUUID(), day, time: "12:00", title: "Business lunch", type: "meal", deductible: "partial", pct: 50, notes: "Document attendees and topics discussed" },
        { id: crypto.randomUUID(), day, time: "14:00", title: "Afternoon sessions", type: "business", deductible: "full", pct: 100, notes: "" },
      );
      if (day === dayCount && dayCount > 1) {
        seed.push({ id: crypto.randomUUID(), day, time: "16:00", title: "Return travel", type: "travel", deductible: "full", pct: 100, notes: "" });
      } else {
        seed.push({ id: crypto.randomUUID(), day, time: "19:00", title: "Networking dinner", type: "networking", deductible: "full", pct: 100, notes: "" });
      }
    }
    setActivities(seed);
    toast({ title: "Template loaded", description: `${Math.min(dayCount, 5)}-day business itinerary generated.` });
  };

  const goNext = () => {
    if (step === 1) {
      if (!trip.from.trim() || !trip.to.trim() || !trip.departDate || !trip.purpose.trim()) {
        toast({ title: "Missing fields", description: "Please fill in all required trip details.", variant: "destructive" });
        return;
      }
      if (trip.tripType === "roundtrip" && !trip.returnDate) {
        toast({ title: "Missing return date", description: "Round trips require a return date.", variant: "destructive" });
        return;
      }
    }
    if (step === 2 && selectedDeductions.length === 0) {
      toast({ title: "Select deductions", description: "Choose at least one IRS deduction category for your trip.", variant: "destructive" });
      return;
    }
    if (step < 4) setStep((step + 1) as Step);
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const exportAll = () => {
    const lines: string[] = [];
    lines.push("ENTANGLEWEALTH | BUSINESS TRAVEL TAX REPORT");
    lines.push(`Generated,${new Date().toLocaleDateString("en-US")}`);
    lines.push("");
    lines.push("TRIP DETAILS");
    lines.push(`From,${escapeCSV(trip.from)}`);
    lines.push(`To,${escapeCSV(trip.to)}`);
    lines.push(`Depart,${trip.departDate}`);
    if (trip.returnDate) lines.push(`Return,${trip.returnDate}`);
    lines.push(`Travelers,${trip.travelers}`);
    lines.push(`Class,${escapeCSV(trip.travelClass)}`);
    lines.push(`Purpose,${escapeCSV(trip.purpose)}`);
    lines.push(`Type,${escapeCSV(trip.purposeType)}`);
    lines.push(`Business Days,${businessDays}`);
    lines.push(`Personal Days,${personalDays}`);
    lines.push("");
    lines.push("SELECTED IRS DEDUCTIONS");
    lines.push("Category,Deduction,IRS Reference,Publication,Deductible %");
    selectedDeductions.forEach(d => {
      lines.push(`${escapeCSV(d.category)},${escapeCSV(d.title)},${escapeCSV(d.irsRef)},${escapeCSV(d.publication)},${d.pct}%`);
    });
    lines.push("");
    lines.push("ITINERARY");
    lines.push("Day,Time,Activity,Type,Deductible %,Notes");
    activities.forEach(a => {
      lines.push(`${a.day},${escapeCSV(a.time)},${escapeCSV(a.title)},${escapeCSV(a.type)},${a.pct}%,${escapeCSV(a.notes)}`);
    });
    lines.push("");
    lines.push("SUMMARY");
    lines.push(`Estimated Deductible Amount,$${estimatedSavings.toLocaleString()}`);
    lines.push(`Compliance Score,${complianceScore}/100`);
    lines.push(`Deduction Categories Selected,${selectedDeductions.length}`);
    lines.push(`Total Activities Logged,${activities.length}`);

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `travel-tax-report-${trip.to.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Report exported", description: "Full travel tax report downloaded for your CPA." });
  };

  const buildCpaReport = (): string => {
    const lines: string[] = [];
    lines.push("ENTANGLEWEALTH — BUSINESS TRAVEL TAX REPORT");
    lines.push(`Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`);
    lines.push("");
    lines.push("═══════════════════════════════════════");
    lines.push("TRIP DETAILS");
    lines.push("═══════════════════════════════════════");
    lines.push(`From: ${trip.from}`);
    lines.push(`To: ${trip.to}`);
    lines.push(`Departure: ${formatDate(trip.departDate)}`);
    if (trip.returnDate) lines.push(`Return: ${formatDate(trip.returnDate)}`);
    lines.push(`Duration: ${dayCount} day${dayCount > 1 ? "s" : ""} (${businessDays} business, ${personalDays} personal)`);
    lines.push(`Travelers: ${trip.travelers}`);
    lines.push(`Class: ${trip.travelClass.charAt(0).toUpperCase() + trip.travelClass.slice(1)}`);
    lines.push(`Purpose: ${trip.purpose}`);
    lines.push(`Type: ${trip.purposeType}`);
    lines.push("");
    lines.push("═══════════════════════════════════════");
    lines.push("SELECTED IRS DEDUCTIONS");
    lines.push("═══════════════════════════════════════");
    selectedDeductions.forEach(d => {
      lines.push(`• ${d.title} — ${d.pct}% deductible`);
      lines.push(`  IRS Ref: ${d.irsRef} | ${d.publication}`);
    });
    if (selectedDeductions.length === 0) lines.push("(No deductions selected)");
    lines.push("");
    if (activities.length > 0) {
      lines.push("═══════════════════════════════════════");
      lines.push("ITINERARY");
      lines.push("═══════════════════════════════════════");
      for (let day = 1; day <= dayCount; day++) {
        const dayActs = activities.filter(a => a.day === day);
        if (dayActs.length === 0) continue;
        lines.push(`Day ${day}:`);
        dayActs.forEach(a => {
          lines.push(`  ${a.time} — ${a.title || "Untitled"} [${a.type}] (${a.pct}% deductible)${a.notes ? ` Note: ${a.notes}` : ""}`);
        });
      }
      lines.push("");
    }
    lines.push("═══════════════════════════════════════");
    lines.push("SUMMARY");
    lines.push("═══════════════════════════════════════");
    lines.push(`Estimated Deductible Amount: $${estimatedSavings.toLocaleString()}`);
    lines.push(`Compliance Score: ${complianceScore}/100`);
    lines.push(`Deduction Categories Selected: ${selectedDeductions.length}`);
    lines.push(`Total Activities Logged: ${activities.length}`);
    lines.push("");
    lines.push("— Generated by EntangleWealth Travel & Trip Planner");
    return lines.join("\n");
  };

  const sendToCpa = () => {
    const emailTrimmed = cpaEmail.trim();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address for your CPA.", variant: "destructive" });
      return;
    }
    localStorage.setItem("ew_cpa_email", emailTrimmed);
    const dest = trip.to.match(/\((\w+)\)/)?.[1] || trip.to;
    const subject = `Business Travel Tax Report — ${trip.from.match(/\((\w+)\)/)?.[1] || trip.from} → ${dest} (${formatDate(trip.departDate)})`;
    const body = (cpaMessage.trim() ? cpaMessage.trim() + "\n\n---\n\n" : "") + buildCpaReport();
    const mailtoUrl = `mailto:${encodeURIComponent(emailTrimmed)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setCpaDialogOpen(false);
    setCpaMessage("");
    toast({ title: "Email prepared", description: `Your travel report is ready to send to ${emailTrimmed}. Review and hit send in your email client.` });
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "#00B4D8";
    if (s >= 60) return "#FFA500";
    return "#ff3366";
  };

  const filteredFrom = AIRPORTS.filter(a => a.toLowerCase().includes(trip.from.toLowerCase()));
  const filteredTo = AIRPORTS.filter(a => a.toLowerCase().includes(trip.to.toLowerCase()));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#FF6600] flex items-center justify-center">
            <Plane className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Travel & Trip Planner</h1>
            <p className="text-[12px] text-muted-foreground">
              {travelMode === "personal"
                ? "Plan your dream trip and track costs against your financial goals"
                : "Book itineraries with IRS-compliant deduction tracking for business trips"}
            </p>
          </div>
        </div>

        <div className="flex gap-1 mt-4 mb-6 bg-white/[0.04] rounded-xl p-1">
          <button
            onClick={() => setTravelMode("personal")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-semibold transition-all min-h-[44px] ${
              travelMode === "personal"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <Compass className="w-4 h-4" /> Personal Trip
          </button>
          <button
            onClick={() => setTravelMode("business")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-semibold transition-all min-h-[44px] ${
              travelMode === "business"
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <Briefcase className="w-4 h-4" /> Business Trip
          </button>
        </div>

        {travelMode === "personal" && <PersonalTrip />}

        {travelMode === "business" && (<>
        <div className="flex items-center gap-0 mt-2 mb-8 relative">
          {[1, 2, 3, 4].map((s, i) => {
            const labels = ["Plan Trip", "IRS Deductions", "Build Itinerary", "Review & Export"];
            const icons = [Plane, FileText, Calendar, Download];
            const Icon = icons[i];
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center relative z-10 w-full">
                  <button
                    onClick={() => { if (isDone) setStep(s as Step); }}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      isActive
                        ? "bg-gradient-to-br from-primary to-[#FF6600] text-black shadow-lg shadow-primary/20"
                        : isDone
                        ? "bg-[#00B4D8]/20 text-[#00B4D8] border-2 border-[#00B4D8]/40 cursor-pointer"
                        : "bg-white/5 text-white/30 border border-white/10"
                    }`}
                    aria-label={`Step ${s}: ${labels[i]}`}
                    disabled={!isDone && !isActive}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                  <span className={`text-[10px] md:text-[11px] mt-2 font-semibold text-center ${
                    isActive ? "text-primary" : isDone ? "text-[#00B4D8]" : "text-white/30"
                  }`}>
                    {labels[i]}
                  </span>
                </div>
                {i < 3 && (
                  <div className={`h-[2px] flex-1 mx-1 -mt-5 ${step > s ? "bg-[#00B4D8]/40" : "bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="glass-panel rounded-sm p-5 md:p-7 border border-[rgba(0,180,216,0.15)]">
              <div className="flex gap-1 mb-5">
                {(["roundtrip", "oneway", "multicity"] as const).map(t => (
                  <button key={t} onClick={() => setTrip(p => ({ ...p, tripType: t }))}
                    className={`px-4 py-2 rounded-full text-[12px] md:text-[13px] font-semibold transition-all min-h-[40px] ${
                      trip.tripType === t
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-white/40 hover:text-white/60"
                    }`}
                  >
                    {t === "roundtrip" ? "Round trip" : t === "oneway" ? "One way" : "Multi-city"}
                  </button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-stretch mb-4">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Where from?"
                    value={trip.from}
                    onChange={e => { setTrip(p => ({ ...p, from: e.target.value.slice(0, 100) })); setFromSugg(true); }}
                    onFocus={() => setFromSugg(true)}
                    onBlur={() => setTimeout(() => setFromSugg(false), 200)}
                    maxLength={100}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white text-[14px] md:text-[15px] focus:outline-none focus:border-primary/50 placeholder:text-white/25"
                    aria-label="Departure city"
                  />
                  {fromSugg && trip.from.length > 0 && filteredFrom.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d1a] border border-white/10 rounded-xl overflow-hidden z-30 max-h-[260px] overflow-y-auto">
                      {filteredFrom.slice(0, 8).map(a => (
                        <button key={a} onClick={() => { setTrip(p => ({ ...p, from: a })); setFromSugg(false); }}
                          className="w-full text-left px-4 py-3 text-[13px] text-white/80 hover:bg-primary/10 transition-colors flex items-center gap-2 min-h-[44px]">
                          <Plane className="w-3 h-3 text-primary/40" /> {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={swapLocations}
                  className="self-center md:self-auto w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:border-primary/30 transition-all flex-shrink-0"
                  aria-label="Swap locations"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Where to?"
                    value={trip.to}
                    onChange={e => { setTrip(p => ({ ...p, to: e.target.value.slice(0, 100) })); setToSugg(true); }}
                    onFocus={() => setToSugg(true)}
                    onBlur={() => setTimeout(() => setToSugg(false), 200)}
                    maxLength={100}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white text-[14px] md:text-[15px] focus:outline-none focus:border-primary/50 placeholder:text-white/25"
                    aria-label="Destination city"
                  />
                  {toSugg && trip.to.length > 0 && filteredTo.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d1a] border border-white/10 rounded-xl overflow-hidden z-30 max-h-[260px] overflow-y-auto">
                      {filteredTo.slice(0, 8).map(a => (
                        <button key={a} onClick={() => { setTrip(p => ({ ...p, to: a })); setToSugg(false); }}
                          className="w-full text-left px-4 py-3 text-[13px] text-white/80 hover:bg-primary/10 transition-colors flex items-center gap-2 min-h-[44px]">
                          <Plane className="w-3 h-3 text-primary/40" /> {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><Calendar className="w-4 h-4" /></div>
                  <input type="date" value={trip.departDate} onChange={e => setTrip(p => ({ ...p, departDate: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-3 py-3.5 text-white text-[13px] focus:outline-none focus:border-primary/50 min-h-[48px]"
                    aria-label="Departure date" />
                </div>
                {trip.tripType === "roundtrip" && (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><Calendar className="w-4 h-4" /></div>
                    <input type="date" value={trip.returnDate} onChange={e => setTrip(p => ({ ...p, returnDate: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-3 py-3.5 text-white text-[13px] focus:outline-none focus:border-primary/50 min-h-[48px]"
                      aria-label="Return date" />
                  </div>
                )}
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50"><Users className="w-4 h-4" /></div>
                  <select value={trip.travelers} onChange={e => setTrip(p => ({ ...p, travelers: parseInt(e.target.value) }))}
                    className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl pl-10 pr-3 py-3.5 text-white text-[13px] focus:outline-none focus:border-primary/50 appearance-none min-h-[48px] [&>option]:bg-[#0d0d1a] [&>option]:text-white"
                    aria-label="Travelers">
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} traveler{n > 1 ? "s" : ""}</option>)}
                  </select>
                </div>
                <select value={trip.travelClass} onChange={e => setTrip(p => ({ ...p, travelClass: e.target.value }))}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl px-3 py-3.5 text-white text-[13px] focus:outline-none focus:border-primary/50 appearance-none min-h-[48px] [&>option]:bg-[#0d0d1a] [&>option]:text-white"
                  aria-label="Travel class">
                  <option value="economy">Economy</option>
                  <option value="premium">Premium Economy</option>
                  <option value="business">Business Class</option>
                  <option value="first">First Class</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Input placeholder="Primary business purpose *" value={trip.purpose}
                  onChange={e => setTrip(p => ({ ...p, purpose: e.target.value.slice(0, 500) }))}
                  maxLength={500} className="bg-white/[0.04] border-white/10 py-3.5 text-[14px]" />
                <select value={trip.purposeType} onChange={e => setTrip(p => ({ ...p, purposeType: e.target.value }))}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-xl px-3 py-3.5 text-white text-[13px] focus:outline-none focus:border-primary/50 appearance-none min-h-[48px] [&>option]:bg-[#0d0d1a] [&>option]:text-white"
                  aria-label="Trip purpose type">
                  <option value="conference">Conference / Trade Show</option>
                  <option value="client">Client Meeting</option>
                  <option value="training">Business Training</option>
                  <option value="inspection">Site Inspection</option>
                  <option value="event">Industry Event</option>
                  <option value="sales">Sales / Prospecting</option>
                  <option value="consulting">Consulting Engagement</option>
                </select>
              </div>

              {trip.from && trip.to && trip.departDate && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] uppercase tracking-wider text-white/30 font-semibold">Trip Summary</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[18px] font-black text-white">{trip.from.match(/\((\w+)\)/)?.[1] || trip.from.slice(0, 3).toUpperCase()}</p>
                      <p className="text-[10px] text-white/30">{formatDate(trip.departDate)}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-primary to-secondary" />
                      <Plane className="w-4 h-4 text-secondary" />
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-secondary to-primary" />
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-[18px] font-black text-white">{trip.to.match(/\((\w+)\)/)?.[1] || trip.to.slice(0, 3).toUpperCase()}</p>
                      <p className="text-[10px] text-white/30">{trip.returnDate ? formatDate(trip.returnDate) : "—"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.02)]">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="text-secondary font-bold">IRS Pub 463:</span> Travel expenses are deductible when the primary purpose is business, you are away from your tax home overnight, and expenses are ordinary and necessary.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="glass-panel rounded-sm p-5 border border-[rgba(0,180,216,0.15)]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold">Select IRS Deductions</h2>
                <span className="text-[12px] text-primary font-semibold">{selectedDeductions.length} selected</span>
              </div>
              <p className="text-[12px] text-muted-foreground mb-4">
                Choose deduction categories that apply to your trip. Each references specific IRS publications and tax code sections from over 80,000 pages of regulations.
              </p>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search deductions (e.g., meals, vehicle, IRC §162...)"
                  value={dedSearch}
                  onChange={e => setDedSearch(e.target.value.slice(0, 100))}
                  maxLength={100}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-[13px] text-white focus:outline-none focus:border-primary/30 placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                {filteredDeductions.map(d => {
                  const Icon = d.icon;
                  const isExpanded = expandedDed === d.id;
                  return (
                    <div key={d.id} className={`rounded-xl border transition-all ${
                      d.selected
                        ? "border-primary/30 bg-primary/[0.04]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"
                    }`}>
                      <div className="flex items-center gap-3 p-3.5 md:p-4 cursor-pointer"
                        onClick={() => toggleDeduction(d.id)} role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") toggleDeduction(d.id); }}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          d.selected ? "bg-primary/15" : "bg-white/5"
                        }`}>
                          <Icon className={`w-5 h-5 ${d.selected ? "text-primary" : "text-white/30"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] md:text-[14px] font-bold">{d.title}</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.pct === 100 ? "bg-[#00B4D8]/15 text-[#00B4D8]" : d.pct >= 50 ? "bg-[#FFB800]/15 text-[#FFB800]" : "bg-white/10 text-white/50"
                            }`}>
                              {d.pct}%
                            </span>
                          </div>
                          <p className="text-[11px] text-primary/60 font-mono mt-0.5">{d.irsRef}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={e => { e.stopPropagation(); setExpandedDed(isExpanded ? null : d.id); }}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 min-w-[36px] min-h-[36px] flex items-center justify-center"
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                            d.selected ? "bg-primary border-primary" : "border-white/20"
                          }`}>
                            {d.selected && <CheckCircle2 className="w-4 h-4 text-black" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-white/5 mt-0">
                          <div className="pt-3">
                            <p className="text-[12px] text-white/60 mb-3">{d.description}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-3 h-3 text-secondary/60" />
                              <span className="text-[11px] text-secondary/80 font-semibold">{d.publication}</span>
                            </div>
                            <div className="space-y-1.5">
                              {d.conditions.map((c, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <AlertTriangle className="w-3 h-3 text-[#FFB800]/50 mt-0.5 flex-shrink-0" />
                                  <span className="text-[11px] text-white/50">{c}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedDeductions.length > 0 && (
              <div className="glass-panel rounded-xl p-4 border border-[#00B4D8]/15 bg-[#00B4D8]/[0.02]">
                <p className="text-[12px] font-bold text-[#00B4D8] mb-2">Selected ({selectedDeductions.length})</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDeductions.map(d => (
                    <span key={d.id} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold flex items-center gap-1.5">
                      {d.title.split(" ")[0]} <span className="text-[#00B4D8]">{d.pct}%</span>
                      <button onClick={() => toggleDeduction(d.id)} className="ml-1 text-white/30 hover:text-white/60">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="glass-panel rounded-sm p-5 border border-[rgba(0,180,216,0.15)]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold">Build Your Itinerary</h2>
                <span className="text-[12px] text-primary font-semibold">{dayCount} day{dayCount > 1 ? "s" : ""}</span>
              </div>
              <p className="text-[12px] text-muted-foreground mb-4">
                Add activities for each day of your trip. Tag each as business, meal, travel, networking, or personal to determine deductibility.
              </p>

              {activities.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-white/10" />
                  <p className="text-[14px] text-white/30 mb-4">No activities yet. Start from a template or add manually.</p>
                  <Button className="bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[44px]" onClick={seedDefaultItinerary}>
                    Generate Template Itinerary
                  </Button>
                </div>
              )}

              {Array.from({ length: Math.min(dayCount, 10) }, (_, i) => i + 1).map(day => {
                const dayActivities = activities.filter(a => a.day === day);
                const dateStr = trip.departDate
                  ? formatDate(new Date(new Date(trip.departDate + "T00:00:00").getTime() + (day - 1) * 86400000).toISOString().split("T")[0])
                  : `Day ${day}`;
                const bizCount = dayActivities.filter(a => a.type !== "personal").length;

                return (
                  <div key={day} className="rounded-xl border border-white/[0.06] bg-white/[0.015] mb-3 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-black text-primary">Day {day}</span>
                        <span className="text-[11px] text-white/30">{dateStr}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        bizCount > 0 ? "bg-[#00B4D8]/15 text-[#00B4D8]" : "bg-white/5 text-white/30"
                      }`}>
                        {bizCount > 0 ? `${bizCount} business` : "No activities"}
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      {dayActivities.map(a => (
                        <div key={a.id} className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-3">
                          <div className="flex gap-2 mb-2">
                            <input type="time" value={a.time}
                              onChange={e => updateActivity(a.id, { time: e.target.value })}
                              className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-2 text-[12px] text-white w-[100px] focus:outline-none focus:border-primary/30"
                              aria-label="Activity time" />
                            <input type="text" placeholder="Activity description" value={a.title}
                              onChange={e => updateActivity(a.id, { title: e.target.value.slice(0, 200) })}
                              maxLength={200}
                              className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-primary/30 placeholder:text-white/40 min-w-0" />
                            <button onClick={() => removeActivity(a.id)}
                              className="p-2 text-white/40 hover:text-[#ff3366] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                              aria-label="Remove activity">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex gap-2 items-center">
                            <select value={a.type} onChange={e => updateActivity(a.id, { type: e.target.value as ItineraryActivity["type"] })}
                              className="bg-[#0d0d1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-primary/30 min-h-[34px] [&>option]:bg-[#0d0d1a] [&>option]:text-white">
                              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                              a.deductible === "full" ? "bg-[#00B4D8]/15 text-[#00B4D8]" :
                              a.deductible === "partial" ? "bg-[#FFB800]/15 text-[#FFB800]" :
                              "bg-[#ff3366]/15 text-[#ff3366]"
                            }`}>
                              {a.pct}%
                            </span>
                            <input type="text" placeholder="Notes for CPA..." value={a.notes}
                              onChange={e => updateActivity(a.id, { notes: e.target.value.slice(0, 300) })}
                              maxLength={300}
                              className="flex-1 bg-transparent border-none text-[11px] text-white/40 focus:outline-none placeholder:text-white/40 min-w-0" />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addActivity(day)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-white/10 text-white/25 hover:text-primary hover:border-primary/30 text-[12px] transition-colors min-h-[40px]">
                        <Plus className="w-3.5 h-3.5" /> Add Activity
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="glass-panel rounded-sm p-5 md:p-7 border border-[rgba(0,180,216,0.15)]">
              <div className="text-center mb-6">
                <div className="relative w-[120px] h-[120px] mx-auto mb-3">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90" role="img" aria-label={`Compliance score: ${complianceScore}`}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke={getScoreColor(complianceScore)} strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * (1 - complianceScore / 100)}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[28px] font-black" style={{ color: getScoreColor(complianceScore) }}>{complianceScore}</span>
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">Compliance</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-1">Trip Tax Report</h2>
                <p className="text-[12px] text-muted-foreground">
                  {trip.from.match(/\((\w+)\)/)?.[1] || trip.from} → {trip.to.match(/\((\w+)\)/)?.[1] || trip.to} · {dayCount} day{dayCount > 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="rounded-xl p-3 bg-[#00B4D8]/[0.06] border border-[#00B4D8]/15 text-center">
                  <p className="text-[20px] font-black text-[#00B4D8]">${estimatedSavings.toLocaleString()}</p>
                  <p className="text-[10px] text-white/30 mt-1">Est. Deductible</p>
                </div>
                <div className="rounded-xl p-3 bg-primary/[0.06] border border-primary/15 text-center">
                  <p className="text-[20px] font-black text-primary">{selectedDeductions.length}</p>
                  <p className="text-[10px] text-white/30 mt-1">IRS Categories</p>
                </div>
                <div className="rounded-xl p-3 bg-secondary/[0.06] border border-secondary/15 text-center">
                  <p className="text-[20px] font-black text-secondary">{businessDays}</p>
                  <p className="text-[10px] text-white/30 mt-1">Business Days</p>
                </div>
                <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10 text-center">
                  <p className="text-[20px] font-black text-white">{activities.length}</p>
                  <p className="text-[10px] text-white/30 mt-1">Activities</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-[16px] font-black">{trip.from.match(/\((\w+)\)/)?.[1] || trip.from.slice(0, 3).toUpperCase()}</p>
                    <p className="text-[10px] text-white/30">{formatDate(trip.departDate)}</p>
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-primary to-secondary" />
                    <Plane className="w-3 h-3 text-secondary" />
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-secondary to-primary" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-[16px] font-black">{trip.to.match(/\((\w+)\)/)?.[1] || trip.to.slice(0, 3).toUpperCase()}</p>
                    <p className="text-[10px] text-white/30">{trip.returnDate ? formatDate(trip.returnDate) : "—"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-white/30">Purpose</span><span className="text-white/60">{trip.purpose.slice(0, 40)}</span></div>
                  <div className="flex justify-between"><span className="text-white/30">Type</span><span className="text-white/60">{trip.purposeType}</span></div>
                  <div className="flex justify-between"><span className="text-white/30">Travelers</span><span className="text-white/60">{trip.travelers}</span></div>
                  <div className="flex justify-between"><span className="text-white/30">Class</span><span className="text-white/60 capitalize">{trip.travelClass}</span></div>
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-4">
                <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                  <p className="text-[12px] font-bold text-primary">Deduction Breakdown</p>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {selectedDeductions.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <d.icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                        <span className="text-[12px] text-white/70 truncate">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-white/30 font-mono">{d.irsRef}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.pct === 100 ? "bg-[#00B4D8]/15 text-[#00B4D8]" : "bg-[#FFB800]/15 text-[#FFB800]"
                        }`}>{d.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activities.length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden mb-4">
                  <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
                    <p className="text-[12px] font-bold text-primary">Itinerary Overview</p>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {Array.from({ length: Math.min(dayCount, 10) }, (_, i) => i + 1).map(day => {
                      const dayActs = activities.filter(a => a.day === day);
                      if (dayActs.length === 0) return null;
                      return (
                        <div key={day} className="px-4 py-2.5">
                          <p className="text-[11px] font-bold text-white/50 mb-1.5">Day {day}</p>
                          {dayActs.map(a => (
                            <div key={a.id} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <Clock className="w-3 h-3 text-white/40 flex-shrink-0" />
                                <span className="text-[11px] text-white/50">{a.time}</span>
                                <span className="text-[12px] text-white/70 truncate">{a.title || "Untitled"}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${
                                a.deductible === "full" ? "bg-[#00B4D8]/15 text-[#00B4D8]" :
                                a.deductible === "partial" ? "bg-[#FFB800]/15 text-[#FFB800]" :
                                "bg-[#ff3366]/15 text-[#ff3366]"
                              }`}>{a.pct}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Link href="/receipts">
              <div className="glass-panel rounded-sm p-5 border border-primary/20 bg-primary/[0.03] cursor-pointer hover:border-primary/40 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all flex-shrink-0">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-white mb-0.5">Capture Trip Receipts</h3>
                    <p className="text-[12px] text-white/40">Upload photos of receipts for AI-powered categorization and IRS-compliant tracking. Scan meals, hotels, transport, and more.</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button className="bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold min-h-[48px] gap-2 text-[14px]" onClick={exportAll}>
                <Download className="w-5 h-5" /> Download Full Report (CSV)
              </Button>
              <Button variant="outline" className="border-[#00B4D8]/30 text-[#00B4D8] font-bold min-h-[48px] gap-2 text-[14px]" onClick={() => setCpaDialogOpen(true)}>
                <Mail className="w-5 h-5" /> Send to CPA
              </Button>
            </div>

            <Dialog open={cpaDialogOpen} onOpenChange={setCpaDialogOpen}>
              <DialogContent className="bg-[#0d0d1a] border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-white">
                    <Mail className="w-5 h-5 text-[#00B4D8]" /> Send Travel Plan to CPA
                  </DialogTitle>
                  <DialogDescription className="text-white/50 text-[13px]">
                    Your full trip report including deductions, itinerary, and tax summary will be prepared for your CPA to review.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-[12px] font-semibold text-white/60 mb-1.5 block">CPA Email Address *</label>
                    <Input
                      type="email"
                      placeholder="cpa@example.com"
                      value={cpaEmail}
                      onChange={e => setCpaEmail(e.target.value)}
                      className="bg-white/[0.04] border-white/10 text-white"
                    />
                    <p className="text-[10px] text-white/30 mt-1">Email is saved for future use</p>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-white/60 mb-1.5 block">Personal Message (optional)</label>
                    <Textarea
                      placeholder="Hi, please review my upcoming business trip deductions..."
                      value={cpaMessage}
                      onChange={e => setCpaMessage(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="bg-white/[0.04] border-white/10 text-white resize-none text-[13px]"
                    />
                  </div>
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                    <p className="text-[11px] font-bold text-white/50 mb-2">Report Preview</p>
                    <div className="space-y-1 text-[11px] text-white/40">
                      <p>{trip.from} → {trip.to}</p>
                      <p>{formatDate(trip.departDate)}{trip.returnDate ? ` — ${formatDate(trip.returnDate)}` : ""} · {dayCount} day{dayCount > 1 ? "s" : ""}</p>
                      <p>{selectedDeductions.length} deduction{selectedDeductions.length !== 1 ? "s" : ""} · {activities.length} activit{activities.length !== 1 ? "ies" : "y"}</p>
                      <p className="text-[#00B4D8]/60 font-bold">Est. Deductible: ${estimatedSavings.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setCpaDialogOpen(false)} className="border-white/10 text-white/60 min-h-[44px]">
                    Cancel
                  </Button>
                  <Button onClick={sendToCpa} className="bg-gradient-to-r from-[#00B4D8] to-[#FFA500] text-black font-bold min-h-[44px] gap-2">
                    <Send className="w-4 h-4" /> Prepare Email
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="glass-panel rounded-xl p-4 border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.02)]">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This report is generated based on IRS publications and tax code sections. Always have your CPA review deductions before filing. Keep all original receipts and documentation for at least 7 years.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
          <Button variant="outline" className="gap-1.5 min-h-[44px]" onClick={goBack} disabled={step === 1}>
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-1">
            {[1,2,3,4].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${step === s ? "bg-primary w-6" : step > s ? "bg-[#00B4D8]/40" : "bg-white/10"}`} />
            ))}
          </div>
          {step < 4 ? (
            <Button className="bg-gradient-to-r from-primary to-[#FF6600] text-black font-bold gap-1.5 min-h-[44px]" onClick={goNext}>
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button className="bg-gradient-to-r from-[#00B4D8] to-[#FFA500] text-black font-bold gap-1.5 min-h-[44px]" onClick={exportAll}>
              <Download className="w-4 h-4" /> Export
            </Button>
          )}
        </div>
        </>)}
      </div>
    </Layout>
  );
}
