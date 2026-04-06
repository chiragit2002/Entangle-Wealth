import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Receipt, Plane, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Deduction {
  id: string;
  title: string;
  irsRef: string;
  description: string;
  estimatedValue: string;
  added: boolean;
}

const MISSING_DEDUCTIONS: Deduction[] = [
  {
    id: "home-office",
    title: "Home Office Deduction",
    irsRef: "IRS Publication 587 · Section 280A",
    description: "If you use part of your home regularly and exclusively for business, you may deduct $5 per sq ft up to 300 sq ft ($1,500 max) using simplified method.",
    estimatedValue: "$1,500/yr",
    added: false,
  },
  {
    id: "vehicle",
    title: "Vehicle Business Use",
    irsRef: "IRS Publication 463 · IRC Section 179",
    description: "Standard mileage rate is 67 cents per mile for 2024. You must keep a contemporaneous mileage log with date, destination, business purpose, and miles.",
    estimatedValue: "$2,010/yr (3,000 mi)",
    added: false,
  },
  {
    id: "education",
    title: "Professional Development",
    irsRef: "IRS Publication 970 · IRC Section 162",
    description: "Books, courses, subscriptions, and training directly related to your current business are 100% deductible as ordinary and necessary business expenses.",
    estimatedValue: "$800/yr",
    added: false,
  },
];

export default function Tax() {
  const { toast } = useToast();
  const [deductions, setDeductions] = useState(MISSING_DEDUCTIONS);
  const [checklist, setChecklist] = useState<string[]>([]);

  const addToChecklist = (id: string, title: string) => {
    if (checklist.includes(id)) return;
    setChecklist(prev => [...prev, id]);
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, added: true } : d));
    toast({ title: "Added to checklist", description: `${title} worksheet added to your checklist.` });
  };

  const score = 75;
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.03)]">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            <span className="text-secondary font-bold">Disclaimer:</span> TaxFlow provides educational information based on IRS publications and is not a substitute for professional tax advice. Always consult a licensed CPA or tax attorney for your specific situation.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 sm:p-8 text-center mb-8">
          <p className="text-[13px] text-muted-foreground uppercase tracking-wider mb-4">Your Compliance Score</p>
          <div className="relative w-[140px] h-[140px] mx-auto mb-4">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90" aria-label={`Compliance score: ${score} out of 100`} role="img">
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <circle
                cx="70" cy="70" r="60" fill="none"
                stroke="url(#compGrad)" strokeWidth="12"
                strokeDasharray={circumference} strokeDashoffset={offset}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="compGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d4ff" />
                  <stop offset="100%" stopColor="#00ff88" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[32px] font-black text-primary">{score}</span>
              <span className="text-[11px] text-muted-foreground">GOOD</span>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground mb-6">Based on your submitted receipts and business profile</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)] text-center">
              <p className="text-lg font-extrabold text-[#00ff88]">$4,280</p>
              <p className="text-[11px] text-muted-foreground mt-1">Deductions Found</p>
            </div>
            <div className="rounded-xl p-3 border border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.05)] text-center">
              <p className="text-lg font-extrabold text-secondary">{deductions.filter(d => !d.added).length}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Missing Deductions</p>
            </div>
            <div className="rounded-xl p-3 border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] text-center">
              <p className="text-lg font-extrabold text-primary">12</p>
              <p className="text-[11px] text-muted-foreground mt-1">Receipts Logged</p>
            </div>
            <div className="rounded-xl p-3 border border-[rgba(255,51,102,0.2)] bg-[rgba(255,51,102,0.05)] text-center">
              <p className="text-lg font-extrabold text-[#ff3366]">Low</p>
              <p className="text-[11px] text-muted-foreground mt-1">Audit Risk</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <Link href="/receipts">
            <Button variant="outline" className="border-primary/30 text-primary gap-2 whitespace-nowrap min-h-[44px]">
              <Receipt className="w-4 h-4" /> Receipts
            </Button>
          </Link>
          <Link href="/travel">
            <Button variant="outline" className="border-secondary/30 text-secondary gap-2 whitespace-nowrap min-h-[44px]">
              <Plane className="w-4 h-4" /> Travel Planner
            </Button>
          </Link>
          <Link href="/taxgpt">
            <Button variant="outline" className="border-[#00ff88]/30 text-[#00ff88] gap-2 whitespace-nowrap min-h-[44px]">
              <MessageCircle className="w-4 h-4" /> TaxGPT
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
          <AlertTriangle className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-semibold">Missing Deductions</h2>
        </div>

        <div className="space-y-4 mb-8">
          {deductions.map((d) => (
            <div key={d.id} className="glass-panel rounded-xl p-5">
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-[15px]">{d.title}</h3>
                  <p className="text-[12px] text-muted-foreground mt-1">{d.irsRef}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${
                  d.added
                    ? "bg-[rgba(0,255,136,0.15)] text-[#00ff88]"
                    : "bg-[rgba(255,215,0,0.15)] text-secondary"
                }`}>
                  {d.added ? "ADDED" : "MISSING"}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mb-3">{d.description}</p>
              <p className="text-[12px] text-[#00ff88] font-semibold mb-3">Estimated value: {d.estimatedValue}</p>
              {!d.added && (
                <Button
                  className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold min-h-[44px]"
                  onClick={() => addToChecklist(d.id, d.title)}
                >
                  Add to Checklist
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            TaxFlow uses IRS publications for reference. Always verify deductions with a qualified tax professional. Tax laws change frequently.
          </p>
        </div>
      </div>
    </Layout>
  );
}
