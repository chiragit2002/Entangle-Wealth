import { Layout } from "@/components/layout/Layout";
import { Shield, Target, Users, AlertTriangle, BarChart3, Activity, DollarSign } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Built for people who <span className="electric-text">can't afford to get this wrong.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            EntangleWealth runs multiple AI models simultaneously, cross-checks their outputs, and only surfaces signals when there's real agreement across the board. We built it for people who trade to take care of their families — not to chase dopamine.
          </p>
        </div>

        <div className="flex flex-col gap-12 mb-16">
          <div>
            <h2 className="text-2xl font-bold mb-4">Here's the honest truth about trading tools.</h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>One analysis method can be wrong. Two can still be wrong. Cherry-picked chart patterns can tell you whatever story you want to believe. We got tired of that.</p>
              <p>So we built something different: multiple independent analysis methods running on every ticker, every few seconds. Price action, volume, options flow, sentiment, risk modeling — all at once. When they disagree, we say nothing. When they converge, we tell you — with a confidence score and the specific reasoning, not just an arrow pointing up.</p>
              <p>We don't predict the future. Nobody can, and anyone who claims otherwise is selling something. What we can do is show you where the data is piling up — and let you decide what to do with it.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">The market isn't the only way to build wealth.</h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>We also surface income opportunities beyond your brokerage account — gig work, freelance openings, and options income strategies like covered calls and cash-secured puts. Because the people we built this for don't have the luxury of putting everything in one basket.</p>
              <p>The goal is to give you more angles, more information, and better tools than you'd have trying to piece it together alone at midnight with 14 browser tabs open.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">What we won't do.</h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>We won't promise you returns. We won't show you a highlight reel of winning trades and pretend the losses don't exist. We won't tell you this is easy, because it isn't.</p>
              <p>Most retail traders lose money. That's a documented fact, not a disclaimer we hide in fine print. What we offer is better information, better analysis, and better risk management than going it alone. That's it. You still have to make the decisions.</p>
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
            <p>Because the tools that actually work — the institutional-grade ones — have always been locked behind fees that would eat a working person's entire trading account before they ever placed a trade.</p>
            <p>We wanted to build something a parent could open on their phone at lunch, get real information, and close it knowing what to do next. A trading signal. A covered call opportunity on shares they already own. A gig that pays out this week. Something useful, not just interesting.</p>
            <p>That's the whole point. Help people make better decisions with the money they have — so they can take better care of the people who depend on them.</p>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            EntangleWealth is not a registered investment advisor. Nothing on this platform is financial advice. All analysis is algorithmic and informational. You are responsible for your own trading decisions. Past performance | ours or anyone else's | does not predict future results. Please only trade with capital you can afford to lose.
          </p>
        </div>
      </div>
    </Layout>
  );
}
