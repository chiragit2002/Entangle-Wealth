import { Layout } from "@/components/layout/Layout";
import { Shield, Target, TrendingUp, Users, Brain, Network, Heart, Zap, BookOpen, Home, DollarSign, GraduationCap, Briefcase } from "lucide-react";
import { agentSwarmData } from "@/lib/mock-data";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-6">
            Primary Mission
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6" data-testid="text-headline">
            Empowering everyday families through <span className="electric-text">smarter trading.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Wall Street has had the edge for too long. We built EntangleWealth to democratize access to institutional-grade data, algorithmic analysis, and the power of 300 quantum-entangled AI agents — all in service of one mission: help real people earn more money to feed and sustain their families.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-24">
          <div className="flex flex-col justify-center gap-6">
            <h2 className="text-3xl font-bold">The Mission</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Trading isn't just about moving numbers on a screen; it's about freedom. It's about taking control of your financial destiny, paying off debt, and feeding your family in today's brutal economic reality.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              We built the Quantum Orchestrator — 300 specialized AI agents operating under quantum entanglement principles. When one agent discovers a signal, all entangled agents instantly reflect that change. Every 2 seconds, the entire swarm convenes a Flash Council, resolves conflicts, and delivers one unified, high-conviction signal.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              No debate. No hesitation. Pure signal. Pure execution.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden glass-panel border-white/10 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/10 to-secondary/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50 mix-blend-overlay"></div>
            <div className="relative z-10 text-center">
              <Network className="w-24 h-24 text-primary mb-4 mx-auto opacity-80" />
              <div className="text-5xl font-bold font-mono electric-text mb-2">300</div>
              <div className="text-lg font-medium text-muted-foreground">Quantum-Entangled Agents</div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono gold-text">30/min</div>
                  <div className="text-xs text-muted-foreground">Flash Councils</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono electric-text">94.7%</div>
                  <div className="text-xs text-muted-foreground">Consensus Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Quantum Entanglement Protocol</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Every agent shares a quantum state with its paired agents. Contradictions create quantum interference — and must be resolved before any signal reaches you.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Brain className="w-8 h-8 text-primary" />
              <h3 className="text-lg font-bold">Instant Propagation</h3>
              <p className="text-sm text-muted-foreground">When AGENT 201 (Price Action Surgeon) spots a structure break, AGENTS 202-230 instantly update their models. No latency. No lag.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Zap className="w-8 h-8 text-secondary" />
              <h3 className="text-lg font-bold">Conflict Resolution</h3>
              <p className="text-sm text-muted-foreground">AGENT 06 (Devil's Advocate) challenges every prediction. AGENT 09 (Triage Commander) resolves contradictions. Only consensus signals survive.</p>
            </div>
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-3">
              <Shield className="w-8 h-8 text-green-400" />
              <h3 className="text-lg font-bold">Black Swan Protection</h3>
              <p className="text-sm text-muted-foreground">AGENT 49 monitors for low-probability, high-impact events. Contingency plans activate before economic shocks can destroy portfolios.</p>
            </div>
          </div>
        </div>

        <div className="mb-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-4">
              Economic Survival Agents 13-25
            </div>
            <h2 className="text-3xl font-bold mb-4">More Than Trading. Economic Empowerment.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">13 agents dedicated entirely to helping families survive and thrive in today's economy. Because the mission is bigger than just markets.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl flex items-start gap-3">
              <DollarSign className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">AGENT 14 - Income Opportunity Hunter</h3>
                <p className="text-xs text-muted-foreground mt-1">Scans every legitimate income stream: gig economy, remote work, freelance, passive income. Ranked by effort-to-income ratio.</p>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-xl flex items-start gap-3">
              <BookOpen className="w-6 h-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">AGENT 15 - Financial Literacy Coach</h3>
                <p className="text-xs text-muted-foreground mt-1">Teaches budgeting, debt reduction, credit building, savings strategies. Complex finance translated into actionable steps.</p>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-xl flex items-start gap-3">
              <Briefcase className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">AGENT 17 - Entrepreneurship Accelerator</h3>
                <p className="text-xs text-muted-foreground mt-1">Low-capital business ideas with high survival rates. Businesses families can start with under $500.</p>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-xl flex items-start gap-3">
              <GraduationCap className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">AGENT 21 - Free Education Curator</h3>
                <p className="text-xs text-muted-foreground mt-1">Best free courses, certifications, and bootcamps. Credentials that lead directly to income.</p>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-xl flex items-start gap-3">
              <Home className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">AGENT 23 - Food & Housing Security</h3>
                <p className="text-xs text-muted-foreground mt-1">Food banks, rental assistance, utility programs. Local resources mapped by zip code for immediate family relief.</p>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-xl flex items-start gap-3">
              <Heart className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">AGENT 25 - Benefits Navigator</h3>
                <p className="text-xs text-muted-foreground mt-1">Every federal, state, and local program: SNAP, WIC, Medicaid, EITC, childcare subsidies, housing vouchers.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-24">
          <div className="glass-panel p-8 rounded-xl flex flex-col gap-4">
            <Users className="w-8 h-8 text-secondary" />
            <h3 className="text-xl font-bold">Built for Retail</h3>
            <p className="text-muted-foreground">
              You don't need a Bloomberg terminal or a PhD in quantitative finance. 300 agents do the work. You get the signal. Our interface distills institutional-grade analysis into clear, actionable intelligence.
            </p>
          </div>
          
          <div className="glass-panel p-8 rounded-xl flex flex-col gap-4">
            <Target className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-bold">Uncompromising Precision</h3>
            <p className="text-muted-foreground">
              AGENT 06 (Devil's Advocate) challenges every signal. AGENT 230 backtests every strategy across multiple market regimes. Only signals with proven statistical edge reach your dashboard.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="glass-panel rounded-xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 gold-text">The Swarm Works for You</h2>
            <p className="text-muted-foreground leading-relaxed">
              {agentSwarmData.totalAgents} agents. {agentSwarmData.categories.length} specialized divisions. One mission: predict the highest probability income opportunities and build the tools that make it happen. For your family.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
