import { Layout } from "@/components/layout/Layout";
import { Shield, Target, Users, AlertTriangle, BarChart3, Activity, DollarSign } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            We built this because we were <span className="electric-text">angry the alternative didn't exist.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EntangleWealth runs multiple AI models simultaneously, cross-checks their outputs, and only surfaces a signal when there's real consensus. Built for people who trade to take care of their families — not to chase dopamine.
          </p>
        </div>

        <div className="flex flex-col gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-4">One model can be wrong. Two can still be wrong. So we run six.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Every ticker gets analyzed by multiple independent methods simultaneously: price action, volume, options flow, sentiment, risk modeling — all at once, all cross-checking each other. When they disagree, we say nothing. When they converge, we tell you — with a confidence score and specific reasoning, not a colored arrow pointing up.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">The market is one way to build wealth. We cover the others too.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We surface income opportunities beyond your brokerage — gig work, freelance openings, and options income strategies like covered calls and cash-secured puts. More angles. Better tools. No more 14 browser tabs at midnight trying to assemble a picture that was never meant to fit together.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">What we won't do.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We won't promise returns. We won't show you a highlight reel of wins. We won't pretend this is easy — because it isn't. Most retail traders lose money. That's documented fact, not fine print we're hiding. We offer better information, better analysis, and better risk management than going it alone. You still make the decisions. That's how it should be.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8">How the analysis actually works.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              <h3 className="font-bold">Price Action</h3>
              <p className="text-sm text-muted-foreground">Candlestick patterns, support/resistance, breakouts, reversals, and continuation setups — the foundation every other signal builds on.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Activity className="w-7 h-7 text-secondary" />
              <h3 className="font-bold">Volume Analysis</h3>
              <p className="text-sm text-muted-foreground">Where institutional money is actually moving — VWAP, volume profiles, accumulation/distribution. Follow the real money, not the noise.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Target className="w-7 h-7 text-primary" />
              <h3 className="font-bold">Options Flow</h3>
              <p className="text-sm text-muted-foreground">Large premium sweeps, block trades, and unusual open interest across every major exchange. Whales leave footprints.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Shield className="w-7 h-7 text-green-400" />
              <h3 className="font-bold">Greeks Analysis</h3>
              <p className="text-sm text-muted-foreground">Delta, Gamma, Theta, and Vega on every contract. Dealer gamma exposure and IV rank — the data your brokerage doesn't surface.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Users className="w-7 h-7 text-purple-400" />
              <h3 className="font-bold">Sentiment</h3>
              <p className="text-sm text-muted-foreground">News flow, social data, and put/call ratios — used to identify crowd extremes before they reverse, not to chase them.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <AlertTriangle className="w-7 h-7 text-red-400" />
              <h3 className="font-bold">Risk Management</h3>
              <p className="text-sm text-muted-foreground">Position sizing baked into every signal. Risk capped at 2% per trade via Kelly Criterion. Capital preservation is the first priority, always.</p>
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Why we built this.</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Institutional-grade tools have always been locked behind fees that would consume a working person's entire trading account. We wanted to build something a parent could open on their phone at lunch, get real analysis, and close knowing exactly what to do next. That's the entire point. Nothing else.
          </p>
        </div>

        <div className="glass-panel rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            EntangleWealth is not a registered investment advisor. Nothing on this platform is financial advice. All analysis is algorithmic and informational. You are responsible for your own trading decisions. Past performance does not predict future results. Only trade with capital you can afford to lose.
          </p>
        </div>
      </div>
    </Layout>
  );
}
