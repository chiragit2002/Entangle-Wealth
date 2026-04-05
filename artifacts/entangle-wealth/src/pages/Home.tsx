import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Target, Zap, TrendingUp, ShieldAlert, BarChart3, Eye } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <Layout>
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-20 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="container relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Trade Smarter.<br />
            Live Better.<br />
            <span className="electric-text">Feed Your Family.</span>
          </h1>
          
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
            Multiple AI analysis models working together — cross-checking each other in real time. When they agree, you get a signal. When they don't, you get warned. No black boxes. No hype.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            {submitted ? (
              <div className="w-full p-4 rounded-md bg-primary/10 border border-primary/30 text-primary text-center font-medium">
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
                <Button type="submit" size="lg" className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all hover:shadow-[0_0_30px_rgba(0,212,255,0.6)]">
                  Join Waitlist
                </Button>
              </>
            )}
          </form>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Real-time Analysis</div>
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> High-Conviction Signals</div>
            <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-400" /> Built-in Risk Controls</div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Multiple analysis models run simultaneously on every ticker. They cross-verify each other. Only when multiple methods agree does a signal fire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <div className="glass-panel p-6 rounded-xl text-center">
              <div className="text-primary font-mono font-bold text-3xl mb-3">1</div>
              <h3 className="font-bold mb-2">Analyze</h3>
              <p className="text-sm text-muted-foreground">Price action, volume, options flow, Greeks, sentiment, and institutional data are all processed at the same time.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl text-center">
              <div className="text-primary font-mono font-bold text-3xl mb-3">2</div>
              <h3 className="font-bold mb-2">Cross-Check</h3>
              <p className="text-sm text-muted-foreground">Each analysis method challenges the others. Disagreements are flagged. Only consensus signals pass through.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl text-center">
              <div className="text-primary font-mono font-bold text-3xl mb-3">3</div>
              <h3 className="font-bold mb-2">Deliver</h3>
              <p className="text-sm text-muted-foreground">You get a clear signal with a confidence score, the reasoning behind it, and specific risk parameters. No guessing.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-black border-t border-white/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What You Get</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Straightforward tools that give you an actual edge.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
              <BarChart3 className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-bold">Stock Signals</h3>
              <p className="text-muted-foreground">BUY, SELL, or HOLD — with a confidence percentage and the specific technical reasoning behind each call. You always know why.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
              <TrendingUp className="w-8 h-8 text-secondary" />
              <h3 className="text-xl font-bold">Options Flow Tracking</h3>
              <p className="text-muted-foreground">See where big money is moving. Large premium sweeps, unusual volume, institutional block trades — before the market reacts.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
              <Eye className="w-8 h-8 text-green-400" />
              <h3 className="text-xl font-bold">Greeks Dashboard</h3>
              <p className="text-muted-foreground">Delta, Gamma, Theta, IV Rank — all displayed clearly on every options contract. Know your exposure before you enter.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300">
              <Activity className="w-8 h-8 text-red-400" />
              <h3 className="text-xl font-bold">Risk Management</h3>
              <p className="text-muted-foreground">Every signal comes with position sizing guidance. We cap risk at 2% per trade. Because protecting your capital is the first priority.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for people who need results,<br /><span className="gold-text">not entertainment.</span></h2>
          <p className="text-lg text-muted-foreground mb-4">This is a financial analysis tool. It won't guarantee profits — nothing can. But it gives you the same data and analysis that institutional traders use, presented clearly so you can make better decisions faster.</p>
          <p className="text-sm text-muted-foreground/70 mb-10 max-w-xl">Trading involves real risk. Past signals are not guarantees of future results. Only trade with money you can afford to lose.</p>
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 font-bold rounded-full">
              See the Dashboard
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
