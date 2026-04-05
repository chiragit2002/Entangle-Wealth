import { Layout } from "@/components/layout/Layout";
import { FlashCouncil } from "@/components/FlashCouncil";
import { MarketTicker } from "@/components/MarketTicker";
import { MirofishTerminal } from "@/components/MirofishTerminal";
import { PositionCalculator } from "@/components/PositionCalculator";
import { PLSimulator } from "@/components/PLSimulator";
import { RiskRadar } from "@/components/RiskRadar";
import { SignalHistory } from "@/components/SignalHistory";

export default function Terminal() {
  return (
    <Layout>
      <FlashCouncil />
      <MarketTicker />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analysis Terminal</h1>
            <p className="text-muted-foreground mt-1">
              Multi-panel monitoring and analysis tools. Demo data.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
              </span>
              <span className="text-sm font-mono text-green-400">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <MirofishTerminal />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PositionCalculator />
          <PLSimulator />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <SignalHistory />
          </div>
          <RiskRadar />
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-[10px] text-muted-foreground/50 text-center">Terminal data is simulated for demonstration purposes. Position calculations and P&L simulations are educational tools — not financial advice. Always verify calculations independently before trading.</p>
        </div>
      </div>
    </Layout>
  );
}
