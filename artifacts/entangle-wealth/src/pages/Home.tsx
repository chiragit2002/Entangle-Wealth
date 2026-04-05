import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Target, Zap, TrendingUp, ShieldAlert, BarChart3, Eye, DollarSign, ArrowRight, Terminal } from "lucide-react";

const heroStats = [
  { value: "6", label: "AI Models", color: "text-primary" },
  { value: "87%", label: "Avg Confidence", color: "text-primary" },
  { value: "80%", label: "Win Rate", color: "text-green-400" },
  { value: "2%", label: "Max Risk/Trade", color: "text-secondary" },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nodeGlow, setNodeGlow] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNodeGlow(p => (p + 1) % 6), 1500);
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
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        <div className="absolute inset-0 scan-line pointer-events-none opacity-30" />
        
        <div className="container relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-mono text-primary animate-in fade-in duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            6 Analysis Models Running Simultaneously
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Trade Smarter.<br />
            Live Better.<br />
            <span className="electric-text">Feed Your Family.</span>
          </h1>
          
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
            Multiple AI models working together — cross-checking each other in real time. Stock signals, options flow, income opportunities, and risk management. All in one place. No black boxes. No hype.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
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
                <Button type="submit" size="lg" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(0,212,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.5)]">
                  Join Waitlist
                </Button>
              </>
            )}
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 w-full max-w-lg animate-in fade-in duration-1000 delay-500">
            {heroStats.map((stat) => (
              <div key={stat.label} className="glass-panel rounded-xl p-3 text-center">
                <div className={`text-xl font-mono font-bold ${stat.color} stat-value`}>{stat.value}</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Multiple analysis models run simultaneously. They cross-verify each other. Only when multiple methods agree does a signal fire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { num: "01", title: "Analyze", desc: "Price action, volume, options flow, Greeks, sentiment, and institutional data are processed simultaneously across 6 independent models.", icon: BarChart3 },
              { num: "02", title: "Cross-Check", desc: "Each analysis method challenges the others. Disagreements are flagged. Only consensus signals pass through — like quantum entanglement.", icon: Target },
              { num: "03", title: "Deliver", desc: "You get a clear signal with a confidence score, the reasoning behind it, and specific risk parameters. No guessing.", icon: ArrowRight },
            ].map((step) => (
              <div key={step.num} className="glass-panel p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300 group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-primary font-mono font-bold text-2xl">{step.num}</span>
                  <step.icon className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="relative glass-panel rounded-2xl p-8 mb-16 overflow-hidden">
            <div className="absolute inset-0 scan-line pointer-events-none opacity-20" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">Quantum Entanglement — Live Preview</span>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {["Price Action", "Volume", "Options Flow", "Greeks", "Sentiment", "Risk Mgmt"].map((name, i) => (
                  <div
                    key={name}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-500 ${nodeGlow === i ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'border-white/10 bg-white/[0.02]'}`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${nodeGlow === i ? 'bg-primary' : 'bg-white/20'}`} />
                    <span className={`text-xs font-mono transition-colors duration-500 ${nodeGlow === i ? 'text-primary' : 'text-muted-foreground'}`}>{name}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground/50 mt-4">Models cross-check continuously. Signal fires only on consensus agreement.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black border-t border-white/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What You Get</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Straightforward tools that give you an actual edge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BarChart3, color: "text-primary", title: "Stock Signals", desc: "BUY, SELL, or HOLD — with a confidence percentage and the specific technical reasoning behind each call." },
              { icon: TrendingUp, color: "text-secondary", title: "Options Flow", desc: "See where big money is moving. Large premium sweeps, unusual volume, institutional block trades." },
              { icon: DollarSign, color: "text-green-400", title: "Income Opportunities", desc: "Gig economy, freelance work, and options income strategies — all filtered for your situation." },
              { icon: Eye, color: "text-green-400", title: "Greeks Dashboard", desc: "Delta, Gamma, Theta, IV Rank — displayed clearly on every options contract. Know your exposure." },
              { icon: Activity, color: "text-red-400", title: "Risk Management", desc: "Every signal comes with position sizing. Risk capped at 2% per trade. Capital preservation first." },
              { icon: Terminal, color: "text-purple-400", title: "Analysis Terminal", desc: "Bloomberg-style multi-panel terminal with live order flow, news feed, and command interface." },
            ].map((item) => (
              <div key={item.title} className="glass-panel p-6 rounded-2xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300 group">
                <item.icon className={`w-7 h-7 ${item.color} group-hover:scale-110 transition-transform`} />
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for people who need results,<br /><span className="gold-text">not entertainment.</span></h2>
          <p className="text-lg text-muted-foreground mb-4">This is a financial analysis tool. It won't guarantee profits — nothing can. But it gives you the same data and analysis that institutional traders use, presented clearly so you can make better decisions faster.</p>
          <p className="text-sm text-muted-foreground/60 mb-10 max-w-xl">Trading involves real risk. Past signals are not guarantees of future results. Only trade with money you can afford to lose.</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-10 text-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full shadow-[0_0_30px_rgba(0,212,255,0.3)]">
                See the Dashboard
              </Button>
            </Link>
            <Link href="/terminal">
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-white/20 hover:bg-white/5 font-bold rounded-full">
                Open Terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
