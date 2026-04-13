import { Layout } from "@/components/layout/Layout";
import { Plane, Clock } from "lucide-react";

export default function Travel() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Plane className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Travel & Trip Planner</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto mb-8">
            IRS-compliant business travel deduction tracking and trip planning.
          </p>
        </div>

        <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#00FF41]/10 border border-[#00FF41]/20 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-[#00FF41]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Coming Soon</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            The Travel & Trip Planner with IRS deduction tracking, itinerary builder,
            and compliance scoring is currently under development. Check back soon.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00FF41]/20 bg-[#00FF41]/5 text-[#00FF41] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
            In Development
          </div>
        </div>
      </div>
    </Layout>
  );
}
