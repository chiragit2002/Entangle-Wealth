import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Target, Zap, TrendingUp, ShieldAlert } from "lucide-react";

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
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-32 px-4 overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <div className="container relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Activity className="w-4 h-4" />
            <span>Institutional Grade Alpha. Now for Everyone.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Trade Smarter.<br />
            Live Better.<br />
            <span className="electric-text">Feed Your Family.</span>
          </h1>
          
          <p className="max-w-2xl text-lg md:text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-150">
            Step into the cockpit. EntangleWealth delivers lightning-fast options flow, AI-driven stock alerts, and precise market data directly to your screen.
          </p>

          <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col sm:flex-row gap-3 mt-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
            {submitted ? (
              <div className="w-full p-4 rounded-md bg-primary/10 border border-primary/30 text-primary text-center font-medium">
                You're on the list. Keep an eye on your inbox.
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

          <div className="mt-16 flex items-center gap-8 text-sm text-muted-foreground animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-secondary" /> Real-time Data</div>
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Precision Alerts</div>
            <div className="flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-destructive" /> Risk Managed</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-black border-t border-white/10 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Command the Markets</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to locate opportunities and execute with conviction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Unusual Options Flow</h3>
              <p className="text-muted-foreground">Follow the smart money. Spot massive premium sweeps and unusual volume spikes in real-time before the market reacts.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-bold">Algorithmic Alerts</h3>
              <p className="text-muted-foreground">Our proprietary models scan thousands of tickers per second, delivering high-confidence BUY/SELL signals directly to your dashboard.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-xl flex flex-col gap-4 hover:-translate-y-2 transition-transform duration-300 group">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-bold">Live Greek Tracking</h3>
              <p className="text-muted-foreground">Monitor Delta, Gamma, Theta, and IV Rank on the fly. Make data-driven decisions based on pure mathematics, not emotion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to upgrade your edge?</h2>
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 font-bold rounded-full">
              Enter Dashboard Demo
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
