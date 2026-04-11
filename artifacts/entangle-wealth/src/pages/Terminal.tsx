import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { MirofishTerminal } from "@/components/MirofishTerminal";
import { PositionCalculator } from "@/components/PositionCalculator";
import { PLSimulator } from "@/components/PLSimulator";
import { RiskRadar } from "@/components/RiskRadar";
import { SignalHistory } from "@/components/SignalHistory";
import { Terminal as TerminalIcon, Calculator, TrendingUp, Shield, BarChart3, Clock, Keyboard, X } from "lucide-react";
import { PaperTradingWidget } from "@/components/PaperTradingWidget";

function PanelHeader({ title, icon, color = "cyan", rightContent }: { title: string; icon?: React.ReactNode; color?: string; rightContent?: React.ReactNode }) {
  const borderColor = color === "cyan" ? "border-l-[#00D4FF]" : color === "gold" ? "border-l-[#FFD700]" : color === "green" ? "border-l-[#00ff88]" : color === "red" ? "border-l-[#ff3366]" : color === "purple" ? "border-l-[#9c27b0]" : "border-l-white/20";
  const textColor = color === "cyan" ? "text-[#00D4FF]" : color === "gold" ? "text-[#FFD700]" : color === "green" ? "text-[#00ff88]" : color === "red" ? "text-[#ff3366]" : color === "purple" ? "text-[#9c27b0]" : "text-white/60";
  return (
    <div className={`flex items-center justify-between px-2 py-1.5 bg-white/[0.02] border-b border-white/[0.06] border-l-2 ${borderColor}`}>
      <div className="flex items-center gap-1.5">
        {icon && <span className={textColor}>{icon}</span>}
        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${textColor}`}>{title}</span>
      </div>
      {rightContent}
    </div>
  );
}

function BloombergPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#0a0a0f] border border-white/[0.06] rounded-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export default function Terminal() {
  const [clock, setClock] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) { setShowShortcuts(v => !v); return; }
      if (e.key === "Escape") { setShowShortcuts(false); return; }
      if (e.key === "1") navigate("/dashboard");
      if (e.key === "2") navigate("/terminal");
      if (e.key === "3") navigate("/market-overview");
      if (e.key === "4") navigate("/technical");
      if (e.key === "5") navigate("/stocks");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const isMarketOpen = (() => {
    const now = new Date();
    const hour = now.getUTCHours();
    const min = now.getUTCMinutes();
    const day = now.getUTCDay();
    if (day === 0 || day === 6) return false;
    const totalMin = hour * 60 + min;
    return totalMin >= 13 * 60 + 30 && totalMin < 20 * 60;
  })();

  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />

      <div className="bg-[#040408] border-b border-white/[0.06] px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="text-[11px] font-mono font-bold text-[#00D4FF] tracking-wider">ANALYSIS TERMINAL v3.0</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className={`relative flex h-2 w-2`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isMarketOpen ? 'bg-[#00ff88]' : 'bg-[#FFD700]'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isMarketOpen ? 'bg-[#00ff88]' : 'bg-[#FFD700]'}`} />
            </span>
            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isMarketOpen ? 'text-[#00ff88]' : 'text-[#FFD700]'}`}>
              {isMarketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
            </span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <span className="text-[9px] font-mono text-white/30">7 AI MODELS · MULTI-PANEL</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowShortcuts(v => !v)} aria-label="Show keyboard shortcuts" className="flex items-center gap-1 text-[9px] font-mono text-white/20 hover:text-white/40 transition-colors">
            <Keyboard className="w-3 h-3" />
            <span>?</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-white/20" />
            <span className="text-[11px] font-mono font-bold text-white/60 tabular-nums">{clock}</span>
          </div>
        </div>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowShortcuts(false)} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="bg-[#0a0a14] border border-white/10 rounded-sm p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-mono font-bold text-[#00D4FF] tracking-wider">KEYBOARD SHORTCUTS</span>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close shortcuts" className="text-white/20 hover:text-white/40"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1">
              {[
                ["1", "Dashboard"], ["2", "Terminal"], ["3", "Market Overview"],
                ["4", "Technical Analysis"], ["5", "Stock Explorer"],
                ["?", "Toggle shortcuts"], ["Esc", "Close"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center gap-3 py-1">
                  <kbd className="min-w-[28px] text-center px-1.5 py-0.5 bg-white/[0.04] border border-white/10 rounded-sm text-[10px] font-mono font-bold text-white/60">{key}</kbd>
                  <span className="text-[10px] text-white/40">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-2 py-2 bg-[#020204]">
        <div className="mb-1.5">
          <BloombergPanel>
            <PanelHeader title="MIROFISH TERMINAL" icon={<TerminalIcon className="w-3 h-3" />} color="cyan" rightContent={
              <span className="text-[8px] font-mono text-white/20">ORDER FLOW · NEWS · SYSTEM LOG · COMMANDS</span>
            } />
            <div className="p-0">
              <MirofishTerminal />
            </div>
          </BloombergPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 mb-1.5">
          <BloombergPanel>
            <PanelHeader title="POSITION CALCULATOR" icon={<Calculator className="w-3 h-3" />} color="gold" />
            <div className="p-2">
              <PositionCalculator />
            </div>
          </BloombergPanel>
          <BloombergPanel>
            <PanelHeader title="P&L SIMULATOR" icon={<TrendingUp className="w-3 h-3" />} color="green" />
            <div className="p-2">
              <PLSimulator />
            </div>
          </BloombergPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1.5 mb-1.5">
          <div className="lg:col-span-2">
            <BloombergPanel>
              <PanelHeader title="SIGNAL HISTORY" icon={<BarChart3 className="w-3 h-3" />} color="cyan" />
              <div className="p-2">
                <SignalHistory />
              </div>
            </BloombergPanel>
          </div>
          <BloombergPanel>
            <PanelHeader title="RISK RADAR" icon={<Shield className="w-3 h-3" />} color="red" />
            <div className="p-2">
              <RiskRadar />
            </div>
          </BloombergPanel>
        </div>

        <div className="flex items-center justify-between px-2 py-1 bg-[#0a0a0f] border border-white/[0.04] rounded-sm">
          <div className="flex items-center gap-4 text-[8px] font-mono text-white/15">
            <span>ENTANGLEWEALTH TERMINAL v3.0</span>
            <span>·</span>
            <span>7 AI MODELS</span>
            <span>·</span>
            <span>REAL-TIME ANALYSIS</span>
          </div>
          <span className="text-[7px] font-mono text-white/10">Demo data · Not financial advice · Press ? for shortcuts</span>
        </div>
      </div>
      <PaperTradingWidget variant="floating" />
    </Layout>
  );
}
