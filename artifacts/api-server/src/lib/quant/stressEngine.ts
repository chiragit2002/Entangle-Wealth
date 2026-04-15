import type { NormalizedStrategy, StressResult, StressScenario } from "./types";
import { STRESS_SCENARIOS } from "./types";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function simulateFlashCrash(s: NormalizedStrategy): StressScenario {
  const crashDrop = 0.15;
  const priceAfterCrash = s.price * (1 - crashDrop);
  const stopLossEstimate = s.price * 0.93;
  const survived = priceAfterCrash > stopLossEstimate;
  const penalty = survived ? 5 : 20;
  const impactScore = clamp(survived ? 70 + s.rsi / 10 : 20 + s.rsi / 10);

  return {
    scenarioId: "flash_crash",
    scenarioName: "Flash Crash",
    description: "Sudden 15% price drop simulation",
    impactScore,
    survived,
    penalty,
  };
}

function simulateSustainedDrawdown(s: NormalizedStrategy): StressScenario {
  const prices = s.priceHistory;
  let peak = prices[0] ?? s.price;
  let maxDD = 0;
  for (const p of prices) {
    if (p > peak) peak = p;
    const dd = peak > 0 ? (peak - p) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const survived = maxDD < 0.30;
  const penalty = survived ? Math.round(maxDD * 20) : 25;
  const impactScore = clamp((1 - maxDD * 2) * 100);

  return {
    scenarioId: "sustained_drawdown",
    scenarioName: "Sustained Drawdown",
    description: "Historical max drawdown analysis",
    impactScore,
    survived,
    penalty,
  };
}

function simulateLiquidityDrought(s: NormalizedStrategy): StressScenario {
  const volRatio = s.avgVolume > 0 ? s.volume / s.avgVolume : 1;
  const hasAdequateLiquidity = s.volume > 200_000 && volRatio > 0.5;
  const survived = hasAdequateLiquidity;
  const penalty = survived ? 3 : 15;
  const impactScore = clamp(Math.min(volRatio, 2) / 2 * 100);

  return {
    scenarioId: "liquidity_drought",
    scenarioName: "Liquidity Drought",
    description: "80% volume reduction stress test",
    impactScore,
    survived,
    penalty,
  };
}

function simulateVolatilitySpike(s: NormalizedStrategy): StressScenario {
  const prices = s.priceHistory;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) returns.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
  }
  const avgDailyRange = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0.01;
  const spikedRange = avgDailyRange * 2.0;

  const stopDistance = Math.abs(s.price - s.bollingerLower) / s.price;
  const survived = spikedRange < stopDistance;
  const penalty = survived ? 5 : 18;
  const impactScore = clamp((1 - Math.min(spikedRange / 0.1, 1)) * 100);

  return {
    scenarioId: "volatility_spike",
    scenarioName: "Volatility Spike",
    description: "VIX-spike doubling price ranges",
    impactScore,
    survived,
    penalty,
  };
}

function simulateSectorRotation(s: NormalizedStrategy): StressScenario {
  const highBetaSectors = ["Technology", "Consumer Cyclical", "Communication Services", "Energy"];
  const isHighBeta = highBetaSectors.includes(s.sector);
  const survivalThreshold = isHighBeta ? 0.6 : 0.8;

  const sma20 = s.priceHistory.length >= 20
    ? s.priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20
    : s.price;

  const relativeStrength = s.price / sma20;
  const survived = relativeStrength > survivalThreshold;
  const penalty = survived ? 5 : (isHighBeta ? 18 : 12);
  const impactScore = clamp((relativeStrength - 0.8) / 0.4 * 100);

  return {
    scenarioId: "sector_rotation",
    scenarioName: "Sector Rotation",
    description: `Capital outflow from ${s.sector} sector`,
    impactScore,
    survived,
    penalty,
  };
}

export function runStressEngine(s: NormalizedStrategy): StressResult {
  const scenarios: StressScenario[] = [
    simulateFlashCrash(s),
    simulateSustainedDrawdown(s),
    simulateLiquidityDrought(s),
    simulateVolatilitySpike(s),
    simulateSectorRotation(s),
  ];

  const totalPenalty = scenarios.reduce((acc, sc) => acc + sc.penalty, 0);
  const failedScenarios = scenarios.filter((sc) => !sc.survived).length;
  const avgImpact = scenarios.reduce((acc, sc) => acc + sc.impactScore, 0) / scenarios.length;

  const resilienceScore = Math.max(0, avgImpact - totalPenalty);

  return {
    strategy_id: s.strategy_id,
    scenarios,
    resilienceScore: +resilienceScore.toFixed(1),
    totalPenalty,
    failedScenarios,
  };
}
