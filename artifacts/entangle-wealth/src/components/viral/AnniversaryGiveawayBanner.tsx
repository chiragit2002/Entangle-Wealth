import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Trophy, Users, Gift, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
}

interface GiveawayInfo {
  prizePool: number;
  referralBonusPool: number;
  anniversaryDate: string;
  countdown: CountdownData;
  totalParticipants: number;
  totalEntries: number;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[40px]">
      <span className="text-xl md:text-2xl font-black font-mono text-[#FFB800] tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function Divider() {
  return <span className="text-lg font-black text-[#FFB800]/50 self-start mt-0.5">:</span>;
}

export function AnniversaryGiveawayBanner() {
  const { getToken, isSignedIn } = useAuth();
  const [info, setInfo] = useState<GiveawayInfo | null>(null);
  const [myEntries, setMyEntries] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<CountdownData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/giveaway/info`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setInfo(d);
          setCountdown(d.countdown);
        }
      })
      .catch(() => {});
  }, []);

  const fetchMyEntries = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await authFetch("/giveaway/my-entries", getToken);
      if (res.ok) {
        const data = await res.json();
        setMyEntries(data.entries?.totalEntries || 0);
      }
    } catch {
    }
  }, [isSignedIn, getToken]);

  useEffect(() => {
    fetchMyEntries();
  }, [fetchMyEntries]);

  useEffect(() => {
    if (!info?.anniversaryDate) return;
    const target = new Date(info.anniversaryDate).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(target - now, 0);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds, passed: diff === 0 });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [info?.anniversaryDate]);

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-sm border border-[#FFB800]/30 bg-gradient-to-r from-[#0d0b00] via-[#0f0d02] to-[#0A0E1A] p-5 md:p-6 mb-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,200,66,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,180,216,0.05),transparent_60%)] pointer-events-none" />

      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#FFB800]/15 border border-[#FFB800]/30">
            <Trophy className="w-3.5 h-3.5 text-[#FFB800]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FFB800]">1-Year Anniversary</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#FFB800]/15 text-[#FFB800] text-[9px] font-bold border border-[#FFB800]/20 animate-pulse">
              LIVE
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1">
            <h2 className="text-xl md:text-3xl font-black tracking-tight text-white mb-1">
              $50,000. <span className="text-[#FFB800]">One year. Real money.</span>
            </h2>
            <p className="text-xs md:text-sm text-white/60 max-w-md leading-relaxed">
              We're giving back $50,000 to the members who showed up. Every trade, streak, login, and referral earns entries. The active members win — because they should.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {myEntries !== null ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/20 text-[11px] font-bold text-[#00B4D8]">
                  <Gift className="w-3 h-3" />
                  <span>{myEntries.toLocaleString()} entries</span>
                </div>
              ) : null}
              {info && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-white/50">
                  <Users className="w-3 h-3" />
                  <span>{info.totalParticipants.toLocaleString()} participants</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[11px] font-bold text-[#00d4ff]">
                <Gift className="w-3 h-3" />
                <span>+$36K referral bonus pool</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3">
            {countdown && !countdown.passed ? (
              <div className="text-center md:text-right">
                <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1.5">Drawing in</p>
                <div className="flex items-center gap-1.5">
                  <CountdownUnit value={countdown.days} label="days" />
                  <Divider />
                  <CountdownUnit value={countdown.hours} label="hrs" />
                  <Divider />
                  <CountdownUnit value={countdown.minutes} label="min" />
                  <Divider />
                  <CountdownUnit value={countdown.seconds} label="sec" />
                </div>
              </div>
            ) : (
              <div className="text-center px-4 py-2 rounded-xl bg-[#FFB800]/10 border border-[#FFB800]/30">
                <p className="text-sm font-bold text-[#FFB800]">Drawing has occurred!</p>
                <p className="text-[10px] text-white/50">Winner announced on our 1 year anniversary</p>
              </div>
            )}

            <Link href="/giveaway">
              <Button
                size="sm"
                className="bg-gradient-to-r from-[#FFB800] to-[#cc9900] text-black font-bold hover:opacity-90 gap-1.5 text-xs h-9"
              >
                View Full Details <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
