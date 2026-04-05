import { Layout } from "@/components/layout/Layout";
import { Shield, Target, TrendingUp, Users } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Empowering everyday families through <span className="electric-text">smarter trading.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Wall Street has had the edge for too long. We built EntangleWealth to democratize access to institutional-grade data and algorithmic analysis.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-24">
          <div className="flex flex-col justify-center gap-6">
            <h2 className="text-3xl font-bold">The Mission</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Trading isn't just about moving numbers on a screen; it's about freedom. It's about taking control of your financial destiny, paying off debt, and feeding your family.
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg">
              We aggregate millions of data points per second—dark pool prints, massive options sweeps, and algorithmic technical patterns—and distill them into clear, actionable signals.
            </p>
          </div>
          <div className="relative rounded-2xl overflow-hidden glass-panel border-white/10 aspect-square flex items-center justify-center p-8 bg-gradient-to-br from-primary/10 to-transparent">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-50 mix-blend-overlay"></div>
             <Shield className="w-32 h-32 text-primary opacity-80 relative z-10" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="glass-panel p-8 rounded-xl flex flex-col gap-4">
            <Users className="w-8 h-8 text-secondary" />
            <h3 className="text-xl font-bold">Built for Retail</h3>
            <p className="text-muted-foreground">
              You don't need a Bloomberg terminal or a PhD in quantitative finance. Our interface is designed to be powerful yet instantly understandable.
            </p>
          </div>
          
          <div className="glass-panel p-8 rounded-xl flex flex-col gap-4">
            <Target className="w-8 h-8 text-primary" />
            <h3 className="text-xl font-bold">Uncompromising Precision</h3>
            <p className="text-muted-foreground">
              Our algorithms filter out the noise. If a signal doesn't meet our rigorous confidence thresholds, it doesn't make it to your dashboard.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
