import { Layout } from "@/components/layout/Layout";
import { Shield, Target, Users, AlertTriangle, BarChart3, Activity, DollarSign } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            What EntangleWealth <span className="electric-text">actually is.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A financial analysis platform that runs multiple AI models simultaneously, cross-checks their outputs, and only surfaces signals when there's real agreement. Built for people who trade to support their families — not to gamble.
          </p>
        </div>

        <div className="flex flex-col gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-4">The idea is simple.</h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>One analysis method can be wrong. Two can still be wrong. But when price action, volume analysis, options flow, sentiment, and risk modeling all point the same direction at the same time — the probability goes up.</p>
              <p>That's what we do. We run multiple independent analysis methods on every ticker, every few seconds. When they disagree, we say nothing. When they agree, we tell you — with a confidence score and the specific reasoning.</p>
              <p>We don't predict the future. Nobody can. But we can show you where the data is converging, and let you decide what to do with it.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">More than just trading signals.</h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>We also surface income opportunities beyond the market — gig work, freelance openings, and options income strategies like covered calls and cash-secured puts. Because building wealth isn't just about one thing.</p>
              <p>The goal is to put more tools in your hands so you can make better decisions across the board — not just in your brokerage account.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">What we don't do.</h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>We don't guarantee returns. We don't promise you'll get rich. We don't show you cherry-picked screenshots of winning trades and pretend the losses don't exist.</p>
              <p>Trading is hard. Most retail traders lose money. That's a fact, and we won't sugarcoat it. What we can do is give you better information, better analysis, and better risk management than trying to do it alone with a chart and gut feeling.</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">How the analysis works.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              <h3 className="font-bold">Price Action</h3>
              <p className="text-sm text-muted-foreground">Reads candlestick patterns, support and resistance levels, and market structure. Identifies breakouts, reversals, and continuation patterns.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Activity className="w-7 h-7 text-secondary" />
              <h3 className="font-bold">Volume Analysis</h3>
              <p className="text-sm text-muted-foreground">Tracks where institutional money is actually flowing. Volume profiles, VWAP levels, and accumulation/distribution patterns.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Target className="w-7 h-7 text-primary" />
              <h3 className="font-bold">Options Flow</h3>
              <p className="text-sm text-muted-foreground">Monitors large premium sweeps, block trades, and unusual open interest changes across all major exchanges.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Shield className="w-7 h-7 text-green-400" />
              <h3 className="font-bold">Greeks Analysis</h3>
              <p className="text-sm text-muted-foreground">Evaluates Delta, Gamma, Theta, and Vega on every options contract. Tracks dealer gamma exposure and IV rank.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Users className="w-7 h-7 text-purple-400" />
              <h3 className="font-bold">Sentiment</h3>
              <p className="text-sm text-muted-foreground">Gauges market mood from news flow, social data, and put/call ratios. Helps identify crowd extremes.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <AlertTriangle className="w-7 h-7 text-red-400" />
              <h3 className="font-bold">Risk Management</h3>
              <p className="text-sm text-muted-foreground">Every signal includes position sizing guidance. Risk is capped at 2% per trade using Kelly Criterion. Capital preservation first.</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Why we built this.</h2>
          <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
            <p>Because the tools that actually work — the ones hedge funds and institutions use — have always been too expensive or too complicated for regular people.</p>
            <p>We wanted to build something that a working parent could open on their phone during lunch break and get real, useful information — whether it's a trading signal, a gig opportunity, or a way to generate income from shares they already own.</p>
            <p>The goal is simple: help people make better financial decisions so they can take better care of their families.</p>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            EntangleWealth is not a registered investment advisor. Nothing on this platform is financial advice. All analysis is algorithmic and informational. You are responsible for your own trading decisions. Past performance — ours or anyone else's — does not predict future results. Please only trade with capital you can afford to lose.
          </p>
        </div>
      </div>
    </Layout>
  );
}
