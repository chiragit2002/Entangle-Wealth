import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { authFetch } from "@/lib/authFetch";
import {
  Trophy, Gift, Users, Zap, TrendingUp, Flame, Target,
  ChevronRight, Copy, Check, Share2, Star, Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const PRIZE_POOL = 50000;
const REFERRAL_BONUS_POOL = 36000;
const ANNIVERSARY_DATE = new Date("2026-04-11T00:00:00Z");

interface CountdownData {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
}

interface EntryData {
  totalEntries: number;
  tradeEntries: number;
  streakEntries: number;
  loginEntries: number;
  xpMilestoneEntries: number;
  referralEntries: number;
  referralBonusShare: number;
  convertedReferrals: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalEntries: number;
  convertedReferrals: number;
  referralBonusShare: number;
  odds: string;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 min-w-[64px]">
      <span className="text-3xl md:text-4xl font-black font-mono text-[#f5c842] tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-white/40 uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

function useCountdown(targetDate: Date) {
  const [countdown, setCountdown] = useState<CountdownData>({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: false });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(targetDate.getTime() - now, 0);
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        passed: diff === 0,
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

const HOW_TO_EARN = [
  {
    icon: TrendingUp,
    color: "text-[#00c8f8]",
    bg: "bg-[#00c8f8]/10",
    border: "border-[#00c8f8]/20",
    title: "Trade & Use Signals",
    desc: "Every 500 XP earned through trading, running analysis, or using signals = 1 entry. Up to 50 entries.",
    entryKey: "tradeEntries",
  },
  {
    icon: Flame,
    color: "text-[#ff8800]",
    bg: "bg-[#ff8800]/10",
    border: "border-[#ff8800]/20",
    title: "Maintain Streaks",
    desc: "Your current login streak earns you daily entries. 30-day streak = 30 bonus entries. Keep it going.",
    entryKey: "streakEntries",
  },
  {
    icon: Zap,
    color: "text-[#00ff88]",
    bg: "bg-[#00ff88]/10",
    border: "border-[#00ff88]/20",
    title: "Daily Logins",
    desc: "Staying active on the platform earns you login entries. Every 100 XP = 1 entry, up to 30.",
    entryKey: "loginEntries",
  },
  {
    icon: Star,
    color: "text-[#f5c842]",
    bg: "bg-[#f5c842]/10",
    border: "border-[#f5c842]/20",
    title: "Level Up",
    desc: "Every 5 levels you reach unlocks additional entries. Higher level = more entries in the pool.",
    entryKey: "xpMilestoneEntries",
  },
  {
    icon: Users,
    color: "text-[#c084fc]",
    bg: "bg-[#c084fc]/10",
    border: "border-[#c084fc]/20",
    title: "Refer Friends",
    desc: "Every converted referral = 5 entries into the $50K drawing. No cap on referral entries.",
    entryKey: "referralEntries",
  },
];

export default function Giveaway() {
  const { getToken, isSignedIn } = useAuth();
  const { toast } = useToast();
  const countdown = useCountdown(ANNIVERSARY_DATE);
  const [entries, setEntries] = useState<EntryData | null>(null);
  const [odds, setOdds] = useState("—");
  const [totalPoolEntries, setTotalPoolEntries] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPublicInfo = useCallback(async () => {
    try {
      const [infoRes, lbRes] = await Promise.all([
        fetch(`${API_BASE}/giveaway/info`),
        fetch(`${API_BASE}/giveaway/leaderboard?limit=10`),
      ]);
      if (infoRes.ok) {
        const data = await infoRes.json();
        setTotalParticipants(data.totalParticipants || 0);
        setTotalPoolEntries(data.totalEntries || 0);
      }
      if (lbRes.ok) {
        const data = await lbRes.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch {}
  }, []);

  const fetchMyData = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const [entriesRes, codeRes] = await Promise.all([
        authFetch("/giveaway/my-entries", getToken),
        authFetch("/viral/referral/code", getToken),
      ]);
      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries);
        setOdds(data.odds || "—");
        setTotalPoolEntries(data.totalPoolEntries || 0);
      }
      if (codeRes.ok) {
        const data = await codeRes.json();
        if (data.code) setReferralLink(`${window.location.origin}?ref=${data.code}`);
      }
    } catch {}
    setLoading(false);
  }, [isSignedIn, getToken]);

  useEffect(() => {
    fetchPublicInfo();
    fetchMyData();
  }, [fetchPublicInfo, fetchMyData]);

  const copyLink = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Referral link copied!", description: "Share it to earn entries and your referral bonus share." });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [referralLink, toast]);

  const shareLink = useCallback(async () => {
    if (!referralLink) return;
    const text = `Win $50,000 with me on EntangleWealth! Join using my link and we both earn more entries into the 1-year anniversary giveaway. 🏆`;
    if (navigator.share) {
      try { await navigator.share({ title: "EntangleWealth $50K Giveaway", text, url: referralLink }); return; } catch {}
    }
    copyLink();
  }, [referralLink, copyLink]);

  const referralBonusShare = entries?.referralBonusShare || 0;
  const convertedReferrals = entries?.convertedReferrals || 0;
  const bonusPct = totalPoolEntries > 0 && entries ? ((entries.totalEntries / Math.max(totalPoolEntries, 1)) * 100) : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f5c842]/30 bg-[#f5c842]/5 text-[11px] font-mono text-[#f5c842] mb-5">
            <Trophy className="w-3.5 h-3.5" />
            <span>1-Year Anniversary Celebration</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5c842] animate-pulse" />
          </div>

          <h1 className="text-3xl md:text-6xl font-black tracking-tight text-white mb-4">
            $50,000<br />
            <span className="bg-gradient-to-r from-[#f5c842] to-[#cc9900] bg-clip-text text-transparent">Anniversary Giveaway</span>
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Our biggest milestone is your reward. Every action on the platform — trading, streaks, referrals — earns you
            entries. One winner takes $50,000 on our 1-year anniversary.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="col-span-1 md:col-span-2 glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Drawing countdown</p>
            {countdown.passed ? (
              <div className="text-center py-4">
                <p className="text-2xl font-black text-[#f5c842]">Drawing has occurred!</p>
                <p className="text-sm text-white/50 mt-1">Winner will be announced shortly.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <CountdownUnit value={countdown.days} label="Days" />
                <span className="text-2xl font-black text-[#f5c842]/50">:</span>
                <CountdownUnit value={countdown.hours} label="Hours" />
                <span className="text-2xl font-black text-[#f5c842]/50">:</span>
                <CountdownUnit value={countdown.minutes} label="Min" />
                <span className="text-2xl font-black text-[#f5c842]/50">:</span>
                <CountdownUnit value={countdown.seconds} label="Sec" />
              </div>
            )}
            <p className="text-xs text-white/30">Drawing on April 11, 2026 at midnight UTC</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-1 border border-[#f5c842]/15">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-[#f5c842]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#f5c842]">Grand Prize</span>
              </div>
              <p className="text-3xl font-black text-white">${PRIZE_POOL.toLocaleString()}</p>
              <p className="text-[10px] text-white/40">1 grand prize winner</p>
            </div>
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-1 border border-[#00d4ff]/15">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#00d4ff]">Referral Pool</span>
              </div>
              <p className="text-3xl font-black text-white">${REFERRAL_BONUS_POOL.toLocaleString()}</p>
              <p className="text-[10px] text-white/40">Split among all referrers</p>
            </div>
          </div>
        </div>

        {isSignedIn && entries && (
          <div className="glass-panel rounded-2xl p-6 mb-8 border border-[#00ff88]/15">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#00ff88]" />
                Your Entries
              </h2>
              {loading && <span className="text-[10px] text-white/30 animate-pulse">Updating...</span>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5">
                <p className="text-2xl font-black font-mono text-[#f5c842]">{entries.totalEntries}</p>
                <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Total Entries</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5">
                <p className="text-2xl font-black font-mono text-[#00ff88]">{odds}</p>
                <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Win Odds</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5">
                <p className="text-2xl font-black font-mono text-[#00d4ff]">{convertedReferrals}</p>
                <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Referrals</p>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/5">
                <p className="text-xl font-black font-mono text-[#c084fc]">
                  ${referralBonusShare > 0 ? referralBonusShare.toFixed(0) : "—"}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-white/40 mt-0.5">Bonus Share</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
              {HOW_TO_EARN.map((item) => {
                const val = entries[item.entryKey as keyof EntryData] as number;
                return (
                  <div key={item.title} className={`rounded-lg p-3 border ${item.border} ${item.bg} text-center`}>
                    <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
                    <p className={`text-lg font-black ${item.color}`}>{val}</p>
                    <p className="text-[8px] text-white/40 leading-tight">{item.title.split(" ").slice(0, 2).join(" ")}</p>
                  </div>
                );
              })}
            </div>

            {referralLink && (
              <div className="bg-white/[0.03] rounded-xl p-4 border border-[#c084fc]/15">
                <p className="text-xs font-bold text-[#c084fc] mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Earn More Entries — Share Your Referral Link
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/60 truncate">
                    {referralLink}
                  </div>
                  <Button size="sm" variant="outline" className="border-[#c084fc]/30 text-[#c084fc] shrink-0" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="outline" className="border-[#00ff88]/30 text-[#00ff88] shrink-0" onClick={shareLink}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-white/30 mt-2">Each converted referral = 5 giveaway entries + share of $36,000 referral bonus pool</p>
              </div>
            )}
          </div>
        )}

        {!isSignedIn && (
          <div className="glass-panel rounded-2xl p-8 mb-8 text-center border border-[#f5c842]/20">
            <Trophy className="w-10 h-10 text-[#f5c842] mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Sign up to enter</h3>
            <p className="text-sm text-white/50 mb-4 max-w-sm mx-auto">
              Create your free account and start earning entries through trading, streaks, and referrals.
            </p>
            <Link href="/sign-up">
              <Button className="bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black font-bold hover:opacity-90 h-12 px-8">
                Start Free — Enter Now →
              </Button>
            </Link>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00ff88]" />
            How to Earn Entries
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {HOW_TO_EARN.map((item) => (
              <div key={item.title} className={`glass-panel rounded-xl p-5 border ${item.border}`}>
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${item.bg} border ${item.border} mb-3`}>
                  <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                </div>
                <h3 className="font-bold text-sm mb-1.5">{item.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <Crown className="w-5 h-5 text-[#f5c842]" />
            Entry Leaderboard
          </h2>
          <p className="text-xs text-white/40 mb-5">Top participants ranked by total entries. More entries = better odds.</p>

          {leaderboard.length === 0 ? (
            <div className="glass-panel rounded-xl p-8 text-center text-white/30 text-sm">
              No entries yet — be the first to participate!
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-[10px] text-white/30 uppercase tracking-wider font-medium">Rank</th>
                    <th className="text-left py-3 px-4 text-[10px] text-white/30 uppercase tracking-wider font-medium">Member</th>
                    <th className="text-right py-3 px-4 text-[10px] text-white/30 uppercase tracking-wider font-medium">Entries</th>
                    <th className="text-right py-3 px-4 text-[10px] text-white/30 uppercase tracking-wider font-medium hidden md:table-cell">Referrals</th>
                    <th className="text-right py-3 px-4 text-[10px] text-white/30 uppercase tracking-wider font-medium hidden md:table-cell">Odds</th>
                    <th className="text-right py-3 px-4 text-[10px] text-white/30 uppercase tracking-wider font-medium">Bonus Share</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.rank} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${idx === 0 ? "bg-[#f5c842]/[0.03]" : ""}`}>
                      <td className="py-3 px-4">
                        <span className={`font-mono font-bold text-sm ${idx === 0 ? "text-[#f5c842]" : idx === 1 ? "text-white/60" : idx === 2 ? "text-[#cd7f32]" : "text-white/30"}`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? "bg-[#f5c842]/20 text-[#f5c842]" : "bg-white/5 text-white/40"}`}>
                            {entry.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{entry.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#00ff88]">{entry.totalEntries.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-white/50 hidden md:table-cell">{entry.convertedReferrals}</td>
                      <td className="py-3 px-4 text-right text-white/50 hidden md:table-cell text-xs">{entry.odds}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#c084fc] text-sm">
                        {entry.referralBonusShare > 0 ? `$${entry.referralBonusShare.toFixed(0)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#00d4ff]" />
            $36,000 Referral Bonus Pool
          </h2>
          <div className="glass-panel rounded-2xl p-6 border border-[#00d4ff]/15">
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              On top of the $50K grand prize drawing, there's a separate <strong className="text-[#00d4ff]">$36,000 referral bonus pool</strong> split
              among everyone who successfully brings friends onto the platform. The more friends you convert, the bigger your
              share. This is in <em>addition</em> to all existing milestone rewards (extra signals, Pro trial, TaxGPT, Ambassador).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Users, color: "text-[#c084fc]", val: "1–5 refs", bonus: "~$360–$1,800", label: "Starter share" },
                { icon: Star, color: "text-[#f5c842]", val: "10–25 refs", bonus: "~$3,600–$9,000", label: "Active referrer" },
                { icon: Crown, color: "text-[#00ff88]", val: "50+ refs", bonus: "$18,000+", label: "Super referrer" },
              ].map((t) => (
                <div key={t.label} className="bg-white/[0.03] rounded-xl p-4 border border-white/5 text-center">
                  <t.icon className={`w-5 h-5 ${t.color} mx-auto mb-2`} />
                  <p className="text-xs text-white/40">{t.val}</p>
                  <p className={`text-lg font-black ${t.color}`}>{t.bonus}</p>
                  <p className="text-[10px] text-white/30">{t.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-4">
              * Bonus shares are approximate and proportional to your share of total converted referrals. Actual amounts depend on total pool participants.
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Rules Summary
          </h2>
          <ul className="space-y-2 text-sm text-white/60">
            {[
              "Open to all registered EntangleWealth members in good standing.",
              "Entries are calculated automatically based on platform activity — no manual submission needed.",
              "The grand prize drawing uses a weighted random selection (more entries = better odds).",
              "Winner is selected by EntangleWealth administrators on the anniversary date (April 11, 2026).",
              "The $36,000 referral bonus pool is distributed proportionally to all users with converted referrals.",
              "Disbursement is handled manually by the EntangleWealth team — winner is contacted via registered email.",
              "Giveaway is promotional and not a registered lottery. See Terms of Service for full details.",
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-white/20 mt-4">
            <a href="/terms" className="underline hover:text-white/40 transition-colors">Full Terms & Conditions</a>
          </p>
        </div>

        <div className="text-center pb-4">
          <Link href="/sign-up">
            <Button className="bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black font-bold hover:opacity-90 h-12 px-10 text-base">
              Enter Now — It's Free →
            </Button>
          </Link>
          <p className="text-[10px] text-white/30 mt-2">No purchase necessary. Free tier users are fully eligible.</p>
        </div>
      </div>
    </Layout>
  );
}
