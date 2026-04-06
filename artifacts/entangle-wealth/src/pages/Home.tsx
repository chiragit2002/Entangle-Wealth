import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { MarketTicker } from "@/components/MarketTicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Target, Zap, TrendingUp, ShieldAlert, BarChart3, Eye, DollarSign, ArrowRight, Terminal } from "lucide-react";

const heroStats = [
  { value: "87%", label: "Accuracy", color: "text-[#00c8f8]" },
  { value: "1,247", label: "Signals", color: "text-[#00e676]" },
  { value: "4,891", label: "Members", color: "text-[#f5c842]" },
];

const modelScores = [
  { name: "Price Action", pct: 92 },
  { name: "Volume Analysis", pct: 88 },
  { name: "Options Flow", pct: 95 },
  { name: "RSI + MACD", pct: 84 },
  { name: "Sentiment", pct: 71 },
  { name: "Risk Mgmt", pct: 90 },
];

const liveSignals = [
  { sym: "NVDA", price: "$875.40", chg: "+3.2%", sig: "buy" as const, conf: 92, tgt: "$920", stop: "$850", reason: "Bull flag breakout confirmed. Volume 2.8x average. Institutional accumulation detected.", rsi: 62, macd: "Bullish crossover" },
  { sym: "TSLA", price: "$198.45", chg: "-1.8%", sig: "sell" as const, conf: 85, tgt: "$180", stop: "$210", reason: "RSI bearish divergence on 4H. Lower highs while price tests resistance. $3.1M put sweep.", rsi: 71, macd: "Bearish divergence" },
  { sym: "AMD", price: "$162.75", chg: "+2.1%", sig: "buy" as const, conf: 88, tgt: "$178", stop: "$155", reason: "Wyckoff spring at support. Institutional accumulation. RSI recovering from oversold.", rsi: 44, macd: "Bullish crossover" },
];

function QuantumCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cx = 100, cy = 100, r = 70;
    ctx.clearRect(0, 0, 200, 200);
    const nodes = [
      { label: "RSI", angle: -90, color: "#00c8f8" },
      { label: "MACD", angle: -30, color: "#00e676" },
      { label: "Flow", angle: 30, color: "#f5c842" },
      { label: "Price", angle: 90, color: "#00c8f8" },
      { label: "Vol", angle: 150, color: "#00e676" },
      { label: "Risk", angle: 210, color: "#f5c842" },
    ];
    const positions = nodes.map((n) => ({
      x: cx + r * Math.cos((n.angle * Math.PI) / 180),
      y: cy + r * Math.sin((n.angle * Math.PI) / 180),
      ...n,
    }));
    positions.forEach((a) => {
      positions.forEach((b) => {
        if (a !== b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = "rgba(0,200,248,0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });
    positions.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = n.color + "22";
      ctx.fill();
      ctx.strokeStyle = n.color + "88";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = n.color;
      ctx.font = "bold 9px Inter,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, n.y);
    });
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,200,248,0.08)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,200,248,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#00c8f8";
    ctx.font = "bold 14px Inter,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("87%", cx, cy - 6);
    ctx.font = "bold 8px Inter,sans-serif";
    ctx.fillStyle = "rgba(0,200,248,0.6)";
    ctx.fillText("CONSENSUS", cx, cy + 8);
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  return <canvas ref={canvasRef} width={200} height={200} className={className} />;
}

function SignalCard({ s }: { s: typeof liveSignals[0] }) {
  const badgeClass = s.sig === "buy" ? "mobile-badge-green" : s.sig === "sell" ? "mobile-badge-red" : "mobile-badge-gold";
  const confGradient = s.sig === "buy" ? "linear-gradient(90deg, #00c8f8, #00e676)" : s.sig === "sell" ? "linear-gradient(90deg, #ff4466, #ff8888)" : "linear-gradient(90deg, #f5c842, #ffaa00)";
  const rsiColor = s.rsi < 30 ? "#00e676" : s.rsi > 70 ? "#ff4466" : "#f5c842";
  const rsiLabel = s.rsi < 30 ? "Oversold" : s.rsi > 70 ? "Overbought" : "Neutral";
  const rsiClass = s.rsi < 30 ? "bull" : s.rsi > 70 ? "bear" : "neut";
  const macdClass = s.macd.includes("Bull") ? "bull" : s.macd.includes("Bear") ? "bear" : "neut";

  return (
    <div className={`signal-card ${s.sig} mb-3`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xl font-black tracking-tight">{s.sym}</div>
          <div className="text-xs text-muted-foreground font-medium">{s.price} · {s.chg}</div>
        </div>
        <span className={`mobile-badge ${badgeClass}`}>{s.sig.toUpperCase()}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Target<span className="block text-sm font-bold text-[#00e676] mt-0.5">{s.tgt}</span></div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Stop Loss<span className="block text-sm font-bold text-[#ff4466] mt-0.5">{s.stop}</span></div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Confidence<span className="block text-sm font-bold text-[#00c8f8] mt-0.5">{s.conf}%</span></div>
      </div>
      <div className="conf-bar mb-3"><div className="conf-fill" style={{ width: `${s.conf}%`, background: confGradient }} /></div>
      <div className="text-xs text-muted-foreground leading-relaxed border-t border-white/[0.06] pt-2.5 mb-2.5">{s.reason}</div>
      <div className="bg-[#0f0f22] border border-white/[0.06] rounded-xl p-3">
        <div className="ind-row">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">RSI (14)</span>
          <span className="text-sm font-bold" style={{ color: rsiColor }}>{s.rsi}</span>
          <span className={`ind-signal ${rsiClass}`}>{rsiLabel}</span>
        </div>
        <div className="ind-row">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">MACD</span>
          <span className="text-sm font-bold text-white">{s.macd}</span>
          <span className={`ind-signal ${macdClass}`}>{s.macd.includes("Bull") ? "BULL" : s.macd.includes("Bear") ? "BEAR" : "NEUT"}</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nodeGlow, setNodeGlow] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNodeGlow((p) => (p + 1) % 6), 1500);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <Layout>
      <section className="relative min-h-[80vh] lg:min-h-[90vh] flex flex-col items-center justify-center pt-12 lg:pt-20 pb-16 lg:pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 scan-line pointer-events-none opacity-30" />

        <div className="container relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-6 lg:space-y-8">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-mono text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            6 Analysis Models Running Simultaneously
          </div>

          <h1 className="text-4xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white">
            Institutional Intelligence<br />
            <span className="electric-text">For Everyone.</span>
          </h1>

          <p className="max-w-2xl text-sm md:text-lg lg:text-xl text-muted-foreground leading-relaxed">
            Real-time signals powered by 6 cross-verifying models. Stock alerts, options flow, tax tools, and gig income — all in one place.
          </p>

          <div className="grid grid-cols-3 gap-3 w-full max-w-sm md:max-w-lg mt-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl p-3 md:p-4 text-center">
                <div className={`text-xl md:text-2xl font-mono font-bold ${stat.color} stat-value`}>{stat.value}</div>
                <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-4">
            {submitted ? (
              <div className="w-full p-4 rounded-xl glass-panel text-primary text-center font-medium text-sm">
                You're on the list. We'll be in touch.
              </div>
            ) : (
              <>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  className="h-12 bg-black/50 border-white/20 focus-visible:ring-primary text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" size="lg" className="h-12 px-8 bg-gradient-to-r from-[#f5c842] to-[#cc9900] text-black font-bold hover:opacity-90">
                  Start Free Trial →
                </Button>
              </>
            )}
          </form>
        </div>
      </section>

      <MarketTicker />

      <section className="py-8 lg:py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mobile-card-glow p-6 text-center mb-8">
            <div className="text-[11px] text-[#00c8f8] font-bold tracking-[1px] uppercase mb-4">⚛ Quantum Entanglement Matrix</div>
            <QuantumCanvas className="mx-auto mb-4" />
            <div className="max-w-md mx-auto space-y-2">
              {modelScores.map((m) => (
                <div key={m.name} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white flex-shrink-0 w-28 text-left">{m.name}</span>
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#00c8f8] to-[#00e676]" style={{ width: `${m.pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-[#00c8f8] w-10 text-right">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Live Signals</h2>
            <span className="live-dot">LIVE</span>
          </div>
          <div className="space-y-3 mb-8">
            {liveSignals.map((s) => (
              <SignalCard key={s.sym} s={s} />
            ))}
          </div>

          <div className="text-center">
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black font-bold h-12 px-8 hover:opacity-90">
                View All Signals →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="text-2xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">Multiple analysis models run simultaneously. They cross-verify each other. Only when multiple methods agree does a signal fire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12 lg:mb-16">
            {[
              { num: "01", title: "Analyze", desc: "Price action, volume, options flow, Greeks, sentiment, and institutional data are processed simultaneously across 6 independent models.", icon: BarChart3 },
              { num: "02", title: "Cross-Check", desc: "Each analysis method challenges the others. Disagreements are flagged. Only consensus signals pass through — like quantum entanglement.", icon: Target },
              { num: "03", title: "Deliver", desc: "You get a clear signal with a confidence score, the reasoning behind it, and specific risk parameters. No guessing.", icon: ArrowRight },
            ].map((step) => (
              <div key={step.num} className="glass-panel p-5 md:p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 group">
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <span className="text-primary font-mono font-bold text-xl md:text-2xl">{step.num}</span>
                  <step.icon className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-2">{step.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="relative glass-panel rounded-2xl p-6 md:p-8 mb-12 lg:mb-16 overflow-hidden">
            <div className="absolute inset-0 scan-line pointer-events-none opacity-20" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">Quantum Entanglement — Live Preview</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                {["Price Action", "Volume", "Options Flow", "Greeks", "Sentiment", "Risk Mgmt"].map((name, i) => (
                  <div
                    key={name}
                    className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full border transition-all duration-500 ${nodeGlow === i ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,212,255,0.3)]" : "border-white/10 bg-white/[0.02]"}`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${nodeGlow === i ? "bg-primary" : "bg-white/20"}`} />
                    <span className={`text-xs font-mono transition-colors duration-500 ${nodeGlow === i ? "text-primary" : "text-muted-foreground"}`}>{name}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground/50 mt-4">Models cross-check continuously. Signal fires only on consensus agreement.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="text-2xl md:text-5xl font-bold mb-4">What You Get</h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">Everything you need to trade smarter — one platform.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {[
              { icon: BarChart3, color: "text-primary", title: "Stock Signals", desc: "BUY, SELL, or HOLD — with a confidence percentage and the specific technical reasoning behind each call." },
              { icon: TrendingUp, color: "text-secondary", title: "Options Flow", desc: "See where big money is moving. Large premium sweeps, unusual volume, institutional block trades." },
              { icon: DollarSign, color: "text-green-400", title: "Income Opportunities", desc: "Gig economy, freelance work, and options income strategies — all filtered for your situation." },
              { icon: Eye, color: "text-green-400", title: "Greeks Dashboard", desc: "Delta, Gamma, Theta, IV Rank — displayed clearly on every options contract. Know your exposure." },
              { icon: Activity, color: "text-red-400", title: "Risk Management", desc: "Every signal comes with position sizing. Risk capped at 2% per trade. Capital preservation first." },
              { icon: Terminal, color: "text-purple-400", title: "Analysis Terminal", desc: "Bloomberg-style multi-panel terminal with live order flow, news feed, and command interface." },
            ].map((item) => (
              <div key={item.title} className="glass-panel p-5 md:p-6 rounded-2xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300 group">
                <item.icon className={`w-6 md:w-7 h-6 md:h-7 ${item.color} group-hover:scale-110 transition-transform`} />
                <h3 className="text-base md:text-lg font-bold">{item.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center max-w-3xl">
          <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6">
            Built for people who need results,<br />
            <span className="gold-text">not entertainment.</span>
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground mb-3 md:mb-4">This is a financial analysis tool. It won't guarantee profits — nothing can. But it gives you the same data and analysis that institutional traders use, presented clearly so you can make better decisions faster.</p>
          <p className="text-xs text-muted-foreground/60 mb-8 md:mb-10 max-w-xl">Trading involves real risk. Past signals are not guarantees of future results. Only trade with money you can afford to lose.</p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full shadow-[0_0_30px_rgba(0,212,255,0.3)] w-full sm:w-auto">
                See the Dashboard
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="h-12 md:h-14 px-8 md:px-10 text-base md:text-lg border-white/20 hover:bg-white/5 font-bold rounded-full w-full sm:w-auto">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
