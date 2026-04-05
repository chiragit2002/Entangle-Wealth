import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Target, Zap, TrendingUp, ShieldAlert, Brain, Network, Cpu, BarChart3, Eye, Radio, Lock, Users } from "lucide-react";
import { agentSwarmData, flashCouncilData } from "@/lib/mock-data";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeAgentCount, setActiveAgentCount] = useState(agentSwarmData.activeAgents);
  const [signalsCount, setSignalsCount] = useState(2400000);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAgentCount(prev => {
        const delta = Math.random() > 0.3 ? 1 : -1;
        return Math.max(agentSwarmData.activeAgents - 2, Math.min(agentSwarmData.totalAgents, prev + delta));
      });
      setSignalsCount(prev => prev + Math.floor(Math.random() * 1200 + 400));
    }, 2000);
    return () => clearInterval(interval);
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
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="container relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-700" data-testid="badge-alpha">
            <Network className="w-4 h-4" />
            <span>300 Quantum-Entangled Agents. One Unified Signal.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-1000" data-testid="text-headline">
            Trade Smarter.<br />
            Live Better.<br />
            <span className="electric-text">Feed Your Family.</span>
          </h1>
          
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150" data-testid="text-description">
            Step into the cockpit of the Quantum Orchestrator. 300 AI agents analyze every price action pattern, options flow, volume profile, and market structure shift simultaneously — collapsing into one unified, high-conviction signal every 2 seconds.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300" data-testid="form-waitlist">
            {submitted ? (
              <div className="w-full p-4 rounded-md bg-primary/10 border border-primary/30 text-primary text-center font-medium" data-testid="text-success">
                You're on the list. The swarm is preparing your station.
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
                  data-testid="input-email"
                />
                <Button type="submit" size="lg" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.6)]" data-testid="button-join">
                  Join Waitlist
                </Button>
              </>
            )}
          </form>

          <div className="mt-12 grid grid-cols-3 gap-8 text-center animate-in fade-in duration-1000 delay-500">
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold font-mono electric-text">{activeAgentCount}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Agents Active</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold font-mono gold-text">30/min</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Flash Councils</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-bold font-mono electric-text">{(signalsCount / 1000000).toFixed(1)}M</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Signals Processed</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black border-t border-white/10 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Hyperspeed Council Protocol
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Every 2 Seconds, 300 Agents Convene</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">No debate. No hesitation. Pure signal. Pure execution. When one agent discovers a signal, all entangled agents instantly know.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16">
            {flashCouncilData.map((step, i) => (
              <div key={i} className="glass-panel p-4 rounded-xl text-center relative group hover:border-primary/30 transition-colors">
                <div className="text-primary font-mono font-bold text-lg mb-2">{step.time}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.action}</p>
                {i < flashCouncilData.length - 1 && (
                  <div className="hidden md:block absolute right-[-10px] top-1/2 -translate-y-1/2 text-primary/50 z-20">
                    <Zap className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-black border-t border-white/10 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">The Quantum Swarm Architecture</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">300 specialized agents operating under quantum entanglement principles. When one updates its state, all entangled agents instantly reflect the change.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Stock Market Mastery</h3>
              <p className="text-sm text-muted-foreground font-mono mb-2">AGENTS 201-230</p>
              <p className="text-muted-foreground">30 agents mastering price action, volume profiles, VWAP, RSI divergences, Fibonacci, Ichimoku, market structure, institutional order flow, and algorithmic pattern recognition.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold">Options Mastery</h3>
              <p className="text-sm text-muted-foreground font-mono mb-2">AGENTS 231-260</p>
              <p className="text-muted-foreground">30 agents commanding the Greeks: Delta, Gamma, Theta, Vega. Scanning unusual options activity, building iron condors, calendar spreads, and tracking smart money flow across all exchanges.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold">Predictive Intelligence</h3>
              <p className="text-sm text-muted-foreground font-mono mb-2">AGENTS 39-52</p>
              <p className="text-muted-foreground">14 agents running sentiment analysis, behavioral economics modeling, geopolitical risk assessment, black swan detection, and quantum probability synthesis across all data streams.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold">Devil's Advocate / Red Team</h3>
              <p className="text-sm text-muted-foreground font-mono mb-2">AGENT 06 + 49</p>
              <p className="text-muted-foreground">Challenges every prediction and design decision. Stress tests assumptions, finds blind spots, and argues the opposite position to surface hidden risks before capital is deployed.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold">Economic Survival</h3>
              <p className="text-sm text-muted-foreground font-mono mb-2">AGENTS 13-25</p>
              <p className="text-muted-foreground">13 agents dedicated to empowering families: income opportunity hunting, financial literacy coaching, gig economy strategy, entrepreneurship acceleration, and government benefits navigation.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold">Quantum Command</h3>
              <p className="text-sm text-muted-foreground font-mono mb-2">AGENTS 281-300</p>
              <p className="text-muted-foreground">The Hyperspeed Council. Conflict resolution, consensus engine, and the final decision authority. Every 2 seconds, all agents collapse into a unified, actionable signal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black border-t border-white/10 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Agent Swarm Status</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">15 specialized divisions. All entangled. All active.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agentSwarmData.categories.map((cat, i) => (
              <div key={i} className="glass-panel rounded-lg p-4 flex items-center gap-4 hover:border-white/20 transition-colors group">
                <div className="w-2 h-12 rounded-full" style={{ backgroundColor: cat.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white truncate">{cat.name}</span>
                    <span className="text-xs font-mono text-muted-foreground ml-2 shrink-0">{cat.range}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{cat.description}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: cat.color }} />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: cat.color }} />
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: cat.color }}>{cat.count} AGENTS ACTIVE</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-black border-t border-white/10 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Capabilities</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to locate opportunities and execute with conviction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300">
              <TrendingUp className="w-8 h-8 text-primary" />
              <h3 className="font-bold">Unusual Options Flow</h3>
              <p className="text-sm text-muted-foreground">AGENT 236 scans for massive premium sweeps, block trades, and unusual volume spikes in real-time before the market reacts.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300">
              <Activity className="w-8 h-8 text-secondary" />
              <h3 className="font-bold">Greeks Mastery</h3>
              <p className="text-sm text-muted-foreground">AGENTS 232-235 command Delta, Gamma, Theta, and Vega. They manage portfolio exposure and predict where price pins based on dealer gamma.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300">
              <Eye className="w-8 h-8 text-green-400" />
              <h3 className="font-bold">Institutional Order Flow</h3>
              <p className="text-sm text-muted-foreground">AGENT 216 reads dark pool prints, block trades, and follows smart money footprints before retail catches on.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300">
              <Lock className="w-8 h-8 text-red-400" />
              <h3 className="font-bold">Risk Management</h3>
              <p className="text-sm text-muted-foreground">AGENT 240 implements Kelly Criterion for position sizing. Never risks more than 2% of portfolio on any single trade.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-6">
            Primary Mission
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-4">Help real people earn more money<br /><span className="gold-text">to feed their families.</span></h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">This isn't a game. This is about financial freedom for everyday families in today's brutal economic reality.</p>
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 font-bold rounded-full" data-testid="button-enter-dashboard">
              Enter the Command Center
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
