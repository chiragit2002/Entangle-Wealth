import { useState } from "react";
import { analyzeStock, type FullAnalysis } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, Shield, Zap, Target } from "lucide-react";
import { useUpgradePrompt, UpgradePrompt } from "@/components/UpgradePrompt";

interface StockAnalysisPanelProps {
  symbol: string;
  name: string;
}

function SignalBadge({ signal }: { signal: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    STRONG_BUY: { color: "bg-green-500/20 text-green-400 border-green-500/50", icon: <TrendingUp className="w-3 h-3" /> },
    BUY: { color: "bg-green-500/10 text-green-300 border-green-500/30", icon: <TrendingUp className="w-3 h-3" /> },
    BULLISH: { color: "bg-green-500/10 text-green-300 border-green-500/30", icon: <TrendingUp className="w-3 h-3" /> },
    NEUTRAL: { color: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30", icon: <Minus className="w-3 h-3" /> },
    SELL: { color: "bg-red-500/10 text-red-300 border-red-500/30", icon: <TrendingDown className="w-3 h-3" /> },
    BEARISH: { color: "bg-red-500/10 text-red-300 border-red-500/30", icon: <TrendingDown className="w-3 h-3" /> },
    STRONG_SELL: { color: "bg-red-500/20 text-red-400 border-red-500/50", icon: <TrendingDown className="w-3 h-3" /> },
  };
  const c = config[signal] || config.NEUTRAL;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${c.color}`}>
      {c.icon} {signal.replace("_", " ")}
    </span>
  );
}

export function StockAnalysisPanel({ symbol, name }: StockAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { promptConfig, showUpgradePrompt, closePrompt } = useUpgradePrompt();

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeStock(symbol);
      setAnalysis(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("please wait")) {
        showUpgradePrompt({
          limitType: "signals",
          limitLabel: "Daily signal cap",
          unlocks: [
            "Unlimited AI signal analyses",
            "Priority quantum processing",
            "All 7 AI agent reports",
            "Historical signal archive",
          ],
        });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading && !error) {
    return (
      <>
        {promptConfig && <UpgradePrompt config={promptConfig} onClose={closePrompt} />}
        <div className="glass-panel p-6 text-center">
          <Brain className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse-glow" />
          <h3 className="text-lg font-bold mb-2">Quantum Entanglement Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            7 specialized AI agents will simultaneously analyze <span className="text-primary font-mono">{symbol}</span> and cross-check each other.
            Signal fires only on consensus.
          </p>
          <Button onClick={runAnalysis} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Zap className="w-4 h-4" />
            Run Quantum Analysis
          </Button>
          <p className="text-xs text-muted-foreground mt-3">AI-generated analysis for educational purposes only. Not financial advice.</p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="relative inline-block mb-4">
          <Brain className="w-16 h-16 text-primary animate-pulse-glow" />
          <Loader2 className="w-6 h-6 text-gold absolute -top-1 -right-1 animate-spin" />
        </div>
        <h3 className="text-lg font-bold mb-2 animate-pulse">Flash Council Convening...</h3>
        <p className="text-sm text-muted-foreground">7 agents analyzing {symbol} simultaneously</p>
        <div className="mt-4 space-y-2">
          {["Price Action Surgeon", "Volume Profile Architect", "Sentiment Engine", "Risk Manager", "Options Flow", "Sector Rotation", "Devil's Advocate"].map((agent, i) => (
            <div key={agent} className="flex items-center gap-2 text-xs text-muted-foreground" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              <span>{agent}</span>
              <span className="ml-auto font-mono text-primary animate-blink">analyzing...</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        {promptConfig && <UpgradePrompt config={promptConfig} onClose={closePrompt} />}
        <div className="glass-panel p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Analysis Failed</h3>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <Button onClick={runAnalysis} variant="outline" className="border-primary/50 text-primary">
            Retry Analysis
          </Button>
        </div>
      </>
    );
  }

  if (!analysis) return null;

  return (
    <>
      {promptConfig && <UpgradePrompt config={promptConfig} onClose={closePrompt} />}
      <div className="space-y-4">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Quantum Council Verdict
              </h3>
              <p className="text-sm text-muted-foreground">{name}</p>
            </div>
            <div className="text-right">
              <SignalBadge signal={analysis.overallSignal} />
              <div className="mt-1 font-mono text-sm">
                <span className="text-muted-foreground">Confidence: </span>
                <span className={analysis.confidenceScore >= 70 ? "text-green-400" : analysis.confidenceScore >= 40 ? "text-yellow-400" : "text-red-400"}>
                  {analysis.confidenceScore}%
                </span>
              </div>
              {analysis.consensusReached && (
                <div className="text-xs text-green-400 flex items-center gap-1 justify-end mt-1">
                  <Shield className="w-3 h-3" /> Consensus Reached
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded bg-white/5 border border-white/10 mb-4">
            <p className="text-sm">{analysis.flashCouncilSummary}</p>
          </div>

          {analysis.priceTargets && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded bg-red-500/10 border border-red-500/20">
                <div className="text-xs text-red-400">Bear</div>
                <div className="font-mono font-bold text-red-300">${analysis.priceTargets.bear}</div>
              </div>
              <div className="text-center p-2 rounded bg-primary/10 border border-primary/20">
                <div className="text-xs text-primary">Base</div>
                <div className="font-mono font-bold text-primary">${analysis.priceTargets.base}</div>
              </div>
              <div className="text-center p-2 rounded bg-green-500/10 border border-green-500/20">
                <div className="text-xs text-green-400">Bull</div>
                <div className="font-mono font-bold text-green-300">${analysis.priceTargets.bull}</div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel p-4">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-gold" />
            Agent Reports ({analysis.agents?.length || 0} agents)
          </h4>
          <div className="space-y-2">
            {analysis.agents?.map((agent) => (
              <div key={agent.id} className="p-3 rounded bg-white/5 border border-white/5 hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{String(agent.id).padStart(3, "0")}</span>
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SignalBadge signal={agent.signal} />
                    <span className="font-mono text-xs text-muted-foreground">{agent.confidence}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{agent.reasoning}</p>
                {agent.keyMetric && (
                  <div className="mt-1 text-xs font-mono text-primary">{agent.keyMetric}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-4">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              Catalysts
            </h4>
            <ul className="space-y-1">
              {analysis.catalysts?.map((c, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-green-400 mt-0.5">+</span> {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-panel p-4">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Risk Factors
            </h4>
            <ul className="space-y-1">
              {analysis.riskFactors?.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-red-400 mt-0.5">!</span> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Button onClick={runAnalysis} variant="outline" size="sm" className="border-primary/30 text-primary text-xs gap-1">
            <Zap className="w-3 h-3" /> Re-run Analysis
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {analysis.disclaimer || "AI-generated analysis for educational purposes only. Not financial advice."}
        </p>
      </div>
    </>
  );
}
