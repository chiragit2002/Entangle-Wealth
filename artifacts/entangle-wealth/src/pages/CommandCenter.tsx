import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  TrendingUp, Terminal, Clock, Zap, ChevronDown, ChevronUp,
  Activity, AlertTriangle, ExternalLink, RefreshCw, Trophy,
} from "lucide-react";
import { fetchAlpacaBars, type AlpacaBar } from "@/lib/api";

const CC_STORAGE_KEY = "ew-command-center-layout";

const COUNCIL_INSIGHTS = [
  "Quantum Consensus Engine is online. Connect your brokerage to see live multi-agent signals.",
  "6 independent AI agents cross-check every signal before it fires — zero single points of failure.",
  "Risk Manager agent monitors portfolio exposure 24/7 — even when markets are closed.",
  "Sentiment model ingests real-time news and social data to detect institutional positioning shifts.",
  "Momentum and Technical agents vote independently — consensus required before any signal.",
];

function useUtcClock() {
  const [clock, setClock] = useState(() =>
    new Date().toUTCString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1") + " UTC"
  );
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const mm = String(now.getUTCMinutes()).padStart(2, "0");
      const ss = String(now.getUTCSeconds()).padStart(2, "0");
      setClock(`${hh}:${mm}:${ss} UTC`);
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return clock;
}

function isMarketOpen() {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const total = now.getUTCHours() * 60 + now.getUTCMinutes();
  return total >= 13 * 60 + 30 && total < 20 * 60;
}

interface PanelWrapperProps {
  title: string;
  icon: React.ReactNode;
  statusColor: string;
  statusLabel: string;
  href: string;
  collapsed: boolean;
  onToggle: () => void;
}

function BloombergPanelHeader({
  title, icon, statusColor, statusLabel, href, collapsed, onToggle,
}: PanelWrapperProps) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border-b select-none flex-shrink-0"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(10,10,20,0.98)",
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: statusColor }}>{icon}</span>
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-widest"
          style={{ color: "#c0c0c0" }}
        >
          {title}
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: statusColor }}
          />
          <span
            className="text-[8px] font-mono uppercase tracking-widest"
            style={{ color: statusColor }}
          >
            {statusLabel}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={href}
          className="text-[9px] font-mono opacity-40 hover:opacity-80 transition-opacity flex items-center gap-0.5"
          style={{ color: "#00B4D8" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </Link>
        <button
          onClick={onToggle}
          className="opacity-40 hover:opacity-80 transition-opacity"
          style={{ color: "#c0c0c0" }}
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

const MC_DEFAULT_PROFILE = {
  currentSavings: 5000,
  monthlyInvestment: 500,
  expectedReturnRate: 7,
  inflationRate: 3,
  timeHorizonYears: 30,
};

type MCProfile = typeof MC_DEFAULT_PROFILE;

function computeMonteCarlo(p: MCProfile) {
  const baseRate = p.expectedReturnRate / 100 / 12;
  const optRate = (p.expectedReturnRate + 3) / 100 / 12;
  const pessRate = Math.max(p.expectedReturnRate - 2, 1) / 100 / 12;
  const pts = [];
  let base = p.currentSavings;
  let opt = p.currentSavings;
  let pess = p.currentSavings;
  for (let y = 1; y <= p.timeHorizonYears; y++) {
    for (let m = 0; m < 12; m++) {
      base = base * (1 + baseRate) + p.monthlyInvestment;
      opt = opt * (1 + optRate) + p.monthlyInvestment;
      pess = pess * (1 + pessRate) + p.monthlyInvestment;
    }
    pts.push({ year: y, netWorth: Math.round(base), optimistic: Math.round(opt), pessimistic: Math.round(pess) });
  }
  return pts;
}

function MonteCarloPanel({ collapsed }: { collapsed: boolean }) {
  const [profile, setProfile] = useState<MCProfile>(MC_DEFAULT_PROFILE);
  const [projections, setProjections] = useState(() => computeMonteCarlo(MC_DEFAULT_PROFILE));

  useEffect(() => { setProjections(computeMonteCarlo(profile)); }, [profile]);

  const fmt = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (collapsed) return null;

  const final = projections[projections.length - 1];
  const svgH = 120;
  const svgW = 400;
  const pad = { t: 10, r: 10, b: 20, l: 40 };
  const pw = svgW - pad.l - pad.r;
  const ph = svgH - pad.t - pad.b;

  const allVals = projections.flatMap(p => [p.pessimistic, p.optimistic]);
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i: number) => pad.l + (i / Math.max(projections.length - 1, 1)) * pw;
  const toY = (v: number) => pad.t + ph - ((v - minV) / range) * ph;

  const basePts = projections.map((p, i) => `${toX(i)},${toY(p.netWorth)}`).join(" ");
  const optPts = projections.map((p, i) => `${toX(i)},${toY(p.optimistic)}`).join(" ");
  const pessPts = projections.map((p, i) => `${toX(i)},${toY(p.pessimistic)}`).join(" ");
  const conePts = projections.map((p, i) => `${toX(i)},${toY(p.optimistic)}`).join(" ")
    + " " + [...projections].reverse().map((p, i) => `${toX(projections.length - 1 - i)},${toY(p.pessimistic)}`).join(" ");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {final && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Base Case", val: fmt(final.netWorth), color: "#00B4D8" },
              { label: "Optimistic", val: fmt(final.optimistic), color: "#00ff88" },
              { label: "Pessimistic", val: fmt(final.pessimistic), color: "#ff6b6b" },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="rounded px-2 py-1.5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {label}
                </div>
                <div className="text-sm font-mono font-bold" style={{ color }}>{val}</div>
                <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Yr {profile.timeHorizonYears}
                </div>
              </div>
            ))}
          </div>
        )}
        {projections.length > 0 && (
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <polygon points={conePts} fill="rgba(0,180,216,0.07)" />
            <polyline points={pessPts} fill="none" stroke="rgba(255,107,107,0.5)" strokeWidth="1" strokeDasharray="3,2" />
            <polyline points={optPts} fill="none" stroke="rgba(0,255,136,0.5)" strokeWidth="1" strokeDasharray="3,2" />
            <polyline points={basePts} fill="none" stroke="#00B4D8" strokeWidth="1.5" />
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const idx = Math.round(pct * (projections.length - 1));
              const p = projections[idx];
              if (!p) return null;
              const y = pad.t + ph;
              return (
                <text key={pct} x={toX(idx)} y={y + 12} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">
                  Y{p.year}
                </text>
              );
            })}
            {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
              <text key={i} x={pad.l - 3} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">
                {fmt(v)}
              </text>
            ))}
          </svg>
        )}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Monthly", key: "monthlyInvestment" as const, min: 0, max: 5000, step: 50, color: "#00B4D8" },
            { label: "Return %", key: "expectedReturnRate" as const, min: 1, max: 15, step: 0.5, color: "#f5c842" },
          ].map(({ label, key, min, max, step, color }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {label}
                </span>
                <span className="text-[9px] font-mono font-bold" style={{ color }}>
                  {key === "monthlyInvestment" ? `$${profile[key]}` : `${profile[key]}%`}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={profile[key]}
                onChange={(e) => {
                  setProfile((prev) => ({ ...prev, [key]: Number(e.target.value) }));
                }}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: color, background: "rgba(255,255,255,0.08)" }}
              />
            </div>
          ))}
        </div>
        <Link
          href="/wealth-sim"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ background: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.2)", color: "#00B4D8" }}
        >
          Full Simulation <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>
    </div>
  );
}

function FlashCouncilPanel({ collapsed }: { collapsed: boolean }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [agentStatuses] = useState(() =>
    [
      { name: "MACRO-AGENT", color: "#00B4D8", status: "BULLISH", conf: 87 },
      { name: "SENTIMENT", color: "#00ff88", status: "BUY", conf: 91 },
      { name: "TECHNICAL", color: "#f5c842", status: "HOLD", conf: 73 },
      { name: "QUANT-7", color: "#a78bfa", status: "BUY", conf: 84 },
      { name: "RISK-MGR", color: "#ff9f43", status: "CAUTION", conf: 62 },
      { name: "MOMENTUM", color: "#00B4D8", status: "BUY", conf: 79 },
    ]
  );

  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((p) => (p + 1) % COUNCIL_INSIGHTS.length);
        setFading(false);
      }, 250);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  if (collapsed) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <div
          className="rounded px-3 py-2.5 transition-opacity duration-250"
          style={{
            background: "rgba(0,180,216,0.05)",
            border: "1px solid rgba(0,180,216,0.12)",
            opacity: fading ? 0 : 1,
          }}
        >
          <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: "rgba(0,180,216,0.6)" }}>
            AI COUNCIL INSIGHT
          </div>
          <p className="text-[10px] font-mono leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            {COUNCIL_INSIGHTS[idx]}
          </p>
        </div>
        <div className="space-y-1">
          <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
            Agent Consensus
          </div>
          {agentStatuses.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center justify-between py-1.5 px-2 rounded"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: agent.color }} />
                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {agent.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold" style={{ color: agent.color }}>
                  {agent.status}
                </span>
                <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${agent.conf}%`, background: agent.color }}
                  />
                </div>
                <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {agent.conf}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)", color: "#00ff88" }}
        >
          Full Dashboard <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>
    </div>
  );
}

function MirofishPanel({ collapsed }: { collapsed: boolean }) {
  const [commandInput, setCommandInput] = useState("");
  const [history, setHistory] = useState<{ input: string; output: string }[]>([]);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);


  const addOutput = (input: string, output: string) => {
    setHistory((prev) => [...prev.slice(-8), { input, output }]);
    setCommandInput("");
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
  };

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toUpperCase();
    if (!cmd) return;
    if (cmd === "HELP") {
      addOutput(commandInput, "Commands: QUOTE <SYM> | STATUS | SIGNALS | CLEAR");
    } else if (cmd === "STATUS") {
      addOutput(commandInput, "ENTANGLE-CORE: ONLINE | 7 AI Models | 5,000 NASDAQ | Uptime: 99.97%");
    } else if (cmd === "SIGNALS") {
      addOutput(commandInput, "NVDA BUY 87% | AMD BUY 83% | PLTR BUY 79% | TSLA SELL 74%");
    } else if (cmd === "CLEAR") {
      setHistory([]);
      setCommandInput("");
    } else if (cmd.startsWith("QUOTE ")) {
      const sym = cmd.split(" ")[1];
      addOutput(commandInput, `${sym} | Fetching live data... (use full terminal for real quotes)`);
    } else {
      addOutput(commandInput, `Unknown: ${cmd} — Type HELP`);
    }
  };

  if (collapsed) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#000810]">
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(0,180,216,0.08)", background: "rgba(0,8,16,0.98)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
          </div>
          <span className="text-[9px] font-mono text-primary/50 uppercase tracking-widest">Terminal v3.0</span>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span className="text-green-400">7 MODELS ONLINE</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>{clock}</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0">
        <div className="border-r overflow-auto p-2 flex flex-col items-center justify-center" style={{ borderColor: "rgba(0,180,216,0.07)" }}>
          <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5 w-full" style={{ color: "rgba(0,255,136,0.6)" }}>
            Live Order Flow
          </div>
          <p className="text-[9px] font-mono text-center py-6" style={{ color: "rgba(255,255,255,0.15)" }}>
            No order flow data
          </p>
        </div>
        <div className="overflow-auto p-2 flex flex-col">
          <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "rgba(147,112,219,0.7)" }}>
            System Log
          </div>
          <p className="text-[9px] font-mono text-center py-6" style={{ color: "rgba(255,255,255,0.15)" }}>
            No system events
          </p>
        </div>
      </div>
      <div className="border-t p-2 flex-shrink-0" style={{ borderColor: "rgba(0,180,216,0.08)" }}>
        <div ref={scrollRef} className="max-h-16 overflow-y-auto mb-1.5 space-y-0.5">
          {history.map((h, i) => (
            <div key={i} className="text-[9px] font-mono">
              <div style={{ color: "#00B4D8" }}>
                <span style={{ color: "rgba(0,180,216,0.4)" }}>~$ </span>{h.input}
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)" }} className="pl-3 whitespace-pre-wrap">{h.output}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleCommand} className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono" style={{ color: "rgba(0,180,216,0.4)" }}>~$</span>
          <input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono caret-primary"
            style={{ color: "#00B4D8" }}
            placeholder="HELP for commands..."
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}

interface BacktesterResult {
  symbol: string;
  startDate: string;
  currentValue: number;
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturn: number;
  maxDrawdown: number;
  bestDay: { date: string; pct: number };
  journeyData: { date: string; value: number }[];
}

const QUICK_PRESETS = [
  { symbol: "NVDA", date: "2020-01-02", label: "NVDA '20" },
  { symbol: "AAPL", date: "2019-01-02", label: "AAPL '19" },
  { symbol: "TSLA", date: "2020-06-01", label: "TSLA '20" },
  { symbol: "AMD", date: "2020-03-23", label: "AMD COVID" },
];

function BacktesterPanel({ collapsed }: { collapsed: boolean }) {
  const [symbol, setSymbol] = useState("NVDA");
  const [startDate, setStartDate] = useState("2020-01-02");
  const [amount, setAmount] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktesterResult | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async (sym?: string, date?: string, amt?: string) => {
    const s = (sym || symbol).toUpperCase();
    const d = date || startDate;
    const a = parseFloat(amt || amount);
    if (!s || !d || isNaN(a) || a <= 0) { setError("Invalid input"); return; }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await fetchAlpacaBars(s, { timeframe: "1Day", limit: 500, start: d });
      const bars: AlpacaBar[] = data.bars || [];
      if (bars.length < 2) { setError(`No data for ${s} from ${d}`); setLoading(false); return; }
      const startPrice = bars[0].o;
      const endPrice = bars[bars.length - 1].c;
      const shares = a / startPrice;
      const cv = shares * endPrice;
      const ret = cv - a;
      const retPct = ((endPrice - startPrice) / startPrice) * 100;
      const years = Math.max((new Date(bars[bars.length - 1].t).getTime() - new Date(bars[0].t).getTime()) / (365.25 * 86400000), 0.01);
      const ann = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
      let peak = bars[0].c, maxDD = 0;
      let best = { date: "", pct: -Infinity };
      const journey = bars.map((b, i) => {
        if (b.c > peak) peak = b.c;
        const dd = ((b.c - peak) / peak) * 100;
        if (dd < maxDD) maxDD = dd;
        if (i > 0) {
          const dr = ((b.c - bars[i - 1].c) / bars[i - 1].c) * 100;
          if (dr > best.pct) best = { date: b.t.split("T")[0], pct: dr };
        }
        return { date: b.t.split("T")[0], value: Math.round(shares * b.c * 100) / 100 };
      });
      setResult({ symbol: s, startDate: d, currentValue: cv, totalReturn: ret, totalReturnPct: retPct, annualizedReturn: ann, maxDrawdown: maxDD, bestDay: best, journeyData: journey });
    } catch {
      setError("Failed to fetch data. Check symbol.");
    } finally {
      setLoading(false);
    }
  }, [symbol, startDate, amount]);

  if (collapsed) return null;

  const isProfit = result && result.totalReturn >= 0;
  const profitColor = isProfit ? "#00e676" : "#ff4466";

  let miniChart = null;
  if (result && result.journeyData.length > 1) {
    const vals = result.journeyData.map(d => d.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const w = 400, h = 80, pad = { t: 5, r: 5, b: 15, l: 40 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    const pts = vals.map((v, i) => `${pad.l + (i / (vals.length - 1)) * pw},${pad.t + ph - ((v - minV) / range) * ph}`);
    const invest = pad.t + ph - ((result.currentValue - minV) / range) * ph;
    const area = pts.join(" ") + ` ${pad.l + pw},${pad.t + ph} ${pad.l},${pad.t + ph}`;
    miniChart = (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={profitColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={profitColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1={pad.l} y1={invest} x2={pad.l + pw} y2={invest} stroke="rgba(0,180,216,0.25)" strokeDasharray="4,3" strokeWidth="1" />
        <polygon points={area} fill="url(#bt-grad)" />
        <polyline points={pts.join(" ")} fill="none" stroke={profitColor} strokeWidth="1.5" />
        <text x={pad.l} y={h - 2} fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">{result.startDate}</text>
        <text x={pad.l + pw} y={h - 2} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace">Today</text>
      </svg>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 space-y-2 flex-shrink-0">
        <div className="grid grid-cols-4 gap-1.5">
          <div className="col-span-1">
            <div className="text-[7px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Symbol</div>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-transparent border rounded px-1.5 py-1 text-[10px] font-mono outline-none"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}
              placeholder="NVDA"
            />
          </div>
          <div className="col-span-1">
            <div className="text-[7px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>From</div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-transparent border rounded px-1.5 py-1 text-[9px] font-mono outline-none"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}
            />
          </div>
          <div className="col-span-1">
            <div className="text-[7px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent border rounded px-1.5 py-1 text-[10px] font-mono outline-none"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}
              placeholder="10000"
            />
          </div>
          <div>
            <div className="text-[7px] font-mono uppercase tracking-widest mb-0.5 invisible">Go</div>
            <button
              onClick={() => run()}
              disabled={loading}
              className="w-full py-1 rounded text-[9px] font-mono font-bold uppercase transition-opacity hover:opacity-80 disabled:opacity-40 flex items-center justify-center gap-1"
              style={{ background: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.25)", color: "#f5c842" }}
            >
              {loading ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
              {loading ? "" : "Run"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => { setSymbol(p.symbol); setStartDate(p.date); run(p.symbol, p.date, amount); }}
              className="text-[8px] font-mono px-2 py-0.5 rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 pb-3 space-y-2">
        {error && (
          <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: "#ff6b6b" }}>
            <AlertTriangle className="w-3 h-3" /> {error}
          </div>
        )}
        {result && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Current Value", val: `$${result.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: profitColor },
                { label: "Total Return", val: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(1)}%`, color: profitColor },
                { label: "Annualized", val: `${result.annualizedReturn >= 0 ? "+" : ""}${Math.abs(result.annualizedReturn).toFixed(1)}%`, color: result.annualizedReturn >= 0 ? "#00ff88" : "#ff4466" },
                { label: "Max Drawdown", val: `${Math.abs(result.maxDrawdown).toFixed(1)}%`, color: "#ff6b6b" },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className="rounded px-2 py-1.5"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {label}
                  </div>
                  <div className="text-xs font-mono font-bold" style={{ color }}>{val}</div>
                </div>
              ))}
            </div>
            {miniChart}
            {result.bestDay.date && (
              <div className="flex items-center gap-1.5 text-[9px] font-mono" style={{ color: "#00e676" }}>
                <Trophy className="w-2.5 h-2.5" />
                Best Day: +{result.bestDay.pct.toFixed(2)}% on {result.bestDay.date}
              </div>
            )}
          </>
        )}
        {!result && !loading && !error && (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
              Pick a preset or enter details above
            </p>
          </div>
        )}
        <Link
          href="/time-machine"
          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.15)", color: "#f5c842" }}
        >
          Full Time Machine <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>
    </div>
  );
}

const PANELS = [
  { id: "monte-carlo", title: "MONTE CARLO CONE", icon: <TrendingUp className="w-3 h-3" />, statusColor: "#00B4D8", statusLabel: "LIVE", href: "/wealth-sim" },
  { id: "flash-council", title: "FLASH COUNCIL", icon: <Zap className="w-3 h-3" />, statusColor: "#00ff88", statusLabel: "ACTIVE", href: "/dashboard" },
  { id: "mirofish", title: "MIROFISH TERMINAL", icon: <Terminal className="w-3 h-3" />, statusColor: "#a78bfa", statusLabel: "ONLINE", href: "/terminal" },
  { id: "backtester", title: "TIME MACHINE BACKTESTER", icon: <Clock className="w-3 h-3" />, statusColor: "#f5c842", statusLabel: "READY", href: "/time-machine" },
];

interface StoredLayout {
  top: number[];
  bottom: number[];
  vertical: number[];
}

const DEFAULT_LAYOUT: StoredLayout = { top: [50, 50], bottom: [50, 50], vertical: [50, 50] };

function loadLayout(): StoredLayout {
  try {
    const raw = localStorage.getItem(CC_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    return {
      top: parsed.top || DEFAULT_LAYOUT.top,
      bottom: parsed.bottom || DEFAULT_LAYOUT.bottom,
      vertical: parsed.vertical || DEFAULT_LAYOUT.vertical,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: Partial<StoredLayout>) {
  try {
    const current = loadLayout();
    localStorage.setItem(CC_STORAGE_KEY, JSON.stringify({ ...current, ...layout }));
  } catch {}
}

export default function CommandCenter() {
  const clock = useUtcClock();
  const marketOpen = isMarketOpen();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const stored = loadLayout();
  const [topSizes] = useState<number[]>(() => stored.top);
  const [bottomSizes] = useState<number[]>(() => stored.bottom);
  const [verticalSizes] = useState<number[]>(() => stored.vertical);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTopResize = (sizes: number[]) => saveLayout({ top: sizes });
  const handleBottomResize = (sizes: number[]) => saveLayout({ bottom: sizes });
  const handleVerticalResize = (sizes: number[]) => saveLayout({ vertical: sizes });

  const panelProps = [
    { id: "monte-carlo", Component: MonteCarloPanel },
    { id: "flash-council", Component: FlashCouncilPanel },
    { id: "mirofish", Component: MirofishPanel },
    { id: "backtester", Component: BacktesterPanel },
  ];

  const statusBar = (
    <div
      className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
      style={{
        background: "rgba(5,5,12,0.99)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: "#00B4D8" }}>
          EntangleWealth Command Center
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: marketOpen ? "#00ff88" : "#ff6b6b", boxShadow: marketOpen ? "0 0 4px #00ff88" : undefined }}
          />
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: marketOpen ? "#00ff88" : "#ff6b6b" }}>
            {marketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.3)" }} />
          <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>4 PANELS ACTIVE</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-mono font-bold" style={{ color: "#f5c842" }}>
          {clock}
        </span>
        <Link
          href="/dashboard"
          className="text-[8px] font-mono uppercase tracking-widest transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          ← Dashboard
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Layout>
        <div
          className="flex flex-col min-h-screen"
          style={{ background: "#060612", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {statusBar}
          <div className="flex-1 overflow-auto">
            {panelProps.map(({ id, Component }, i) => {
              const meta = PANELS[i];
              const isCollapsed = collapsed[id] ?? false;
              return (
                <div
                  key={id}
                  className="border-b"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <BloombergPanelHeader
                    title={meta.title}
                    icon={meta.icon}
                    statusColor={meta.statusColor}
                    statusLabel={meta.statusLabel}
                    href={meta.href}
                    collapsed={isCollapsed}
                    onToggle={() => toggleCollapse(id)}
                  />
                  <div style={{ minHeight: isCollapsed ? 0 : 280 }}>
                    <Component collapsed={isCollapsed} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className="flex flex-col"
        style={{
          background: "#060612",
          fontFamily: "'JetBrains Mono', monospace",
          height: "calc(100vh - 3.5rem)",
        }}
      >
        {statusBar}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ResizablePanelGroup direction="vertical" onLayout={handleVerticalResize} className="flex-1">
            <ResizablePanel defaultSize={verticalSizes[0]} minSize={20}>
              <ResizablePanelGroup
                direction="horizontal"
                onLayout={handleTopResize}
                className="h-full"
              >
                <ResizablePanel defaultSize={topSizes[0]} minSize={20}>
                  <div
                    className="flex flex-col h-full border-r"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <BloombergPanelHeader
                      {...PANELS[0]}
                      collapsed={collapsed["monte-carlo"] ?? false}
                      onToggle={() => toggleCollapse("monte-carlo")}
                    />
                    <div className="flex-1 overflow-hidden">
                      <MonteCarloPanel collapsed={collapsed["monte-carlo"] ?? false} />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle className="w-1 bg-white/[0.04] hover:bg-[#00B4D8]/30 transition-colors" />
                <ResizablePanel defaultSize={topSizes[1]} minSize={20}>
                  <div className="flex flex-col h-full">
                    <BloombergPanelHeader
                      {...PANELS[1]}
                      collapsed={collapsed["flash-council"] ?? false}
                      onToggle={() => toggleCollapse("flash-council")}
                    />
                    <div className="flex-1 overflow-hidden">
                      <FlashCouncilPanel collapsed={collapsed["flash-council"] ?? false} />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle className="h-1 bg-white/[0.04] hover:bg-[#00B4D8]/30 transition-colors" />
            <ResizablePanel defaultSize={verticalSizes[1]} minSize={20}>
              <ResizablePanelGroup
                direction="horizontal"
                onLayout={handleBottomResize}
                className="h-full"
              >
                <ResizablePanel defaultSize={bottomSizes[0]} minSize={20}>
                  <div
                    className="flex flex-col h-full border-r border-t"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <BloombergPanelHeader
                      {...PANELS[2]}
                      collapsed={collapsed["mirofish"] ?? false}
                      onToggle={() => toggleCollapse("mirofish")}
                    />
                    <div className="flex-1 overflow-hidden">
                      <MirofishPanel collapsed={collapsed["mirofish"] ?? false} />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle className="w-1 bg-white/[0.04] hover:bg-[#00B4D8]/30 transition-colors" />
                <ResizablePanel defaultSize={bottomSizes[1]} minSize={20}>
                  <div
                    className="flex flex-col h-full border-t"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}
                  >
                    <BloombergPanelHeader
                      {...PANELS[3]}
                      collapsed={collapsed["backtester"] ?? false}
                      onToggle={() => toggleCollapse("backtester")}
                    />
                    <div className="flex-1 overflow-hidden">
                      <BacktesterPanel collapsed={collapsed["backtester"] ?? false} />
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </Layout>
  );
}
