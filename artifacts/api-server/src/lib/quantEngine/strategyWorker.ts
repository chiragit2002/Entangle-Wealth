import { workerData, parentPort } from "node:worker_threads";
import { executeStrategy } from "./strategyGenerator.js";
import type { OHLCVData, StrategyDescriptor } from "./strategyGenerator.js";

interface WorkerInput {
  stocks: { symbol: string; data: OHLCVData }[];
  strategies: StrategyDescriptor[];
  workerId: number;
}

interface WorkerResult {
  symbol: string;
  strategyId: string;
  strategyName: string;
  action: string;
  confidence: number;
  expectedReturn: number;
  riskScore: number;
  winRate: number;
  maxDrawdown: number;
}

async function run() {
  const { stocks, strategies, workerId } = workerData as WorkerInput;
  const results: WorkerResult[] = [];
  const startTime = Date.now();

  for (const { symbol, data } of stocks) {
    for (const strategy of strategies) {
      try {
        const result = executeStrategy(strategy, data);
        if (result.action !== "HOLD") {
          results.push({
            symbol,
            strategyId: strategy.id,
            strategyName: strategy.name,
            action: result.action,
            confidence: result.confidence,
            expectedReturn: result.expectedReturn,
            riskScore: result.riskScore,
            winRate: result.winRate,
            maxDrawdown: result.maxDrawdown,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[strategyWorker ${workerId}] strategy=${strategy.id} symbol=${symbol} error: ${msg}`);
      }
    }
  }

  const elapsed = Date.now() - startTime;
  parentPort?.postMessage({ results, workerId, elapsed, stockCount: stocks.length, strategyCount: strategies.length });
}

run().catch(err => {
  parentPort?.postMessage({ error: String(err), results: [] });
});
