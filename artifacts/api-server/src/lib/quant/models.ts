import type { NormalizedStrategy, ModelScore } from "./types";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function sma(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const slice = data.slice(-Math.min(period, data.length));
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function stdDev(data: number[], period: number): number {
  const slice = data.slice(-Math.min(period, data.length));
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
  return Math.sqrt(variance);
}

function momentum(data: number[], lookback: number): number {
  if (data.length < lookback + 1) return 0;
  const prev = data[data.length - 1 - lookback];
  const curr = data[data.length - 1];
  return prev === 0 ? 0 : (curr - prev) / prev;
}

function maxDrawdown(data: number[]): number {
  if (data.length < 2) return 0;
  let peak = data[0];
  let maxDD = 0;
  for (const v of data) {
    if (v > peak) peak = v;
    const dd = peak === 0 ? 0 : (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function scoreM1TrendAlignment(s: NormalizedStrategy): ModelScore {
  const prices = s.priceHistory;
  const price = s.price;
  const sma20 = sma(prices, 20);
  const sma50 = sma(prices, 50);
  const mom10 = momentum(prices, 10);
  const mom20 = momentum(prices, 20);

  const aboveSma20 = price > sma20 ? 1 : 0;
  const aboveSma50 = price > sma50 ? 1 : 0;
  const goldenTrend = sma20 > sma50 ? 1 : 0;
  const macdBullish = s.macd > s.macdSignal ? 1 : 0;

  let raw = 0;
  raw += aboveSma20 * 20;
  raw += aboveSma50 * 20;
  raw += goldenTrend * 20;
  raw += macdBullish * 15;
  raw += clamp((mom10 + 0.1) / 0.2 * 15, 0, 15);
  raw += clamp((mom20 + 0.1) / 0.2 * 10, 0, 10);

  if (s.action === "sell") raw = 100 - raw;

  const score = clamp(raw);
  const confidence = clamp(50 + Math.abs(s.macd - s.macdSignal) * 10 + (aboveSma20 + aboveSma50) * 10);

  return {
    modelId: "M1",
    modelName: "Trend Alignment",
    score,
    confidence: clamp(confidence),
    details: { aboveSma20: !!aboveSma20, aboveSma50: !!aboveSma50, goldenTrend: !!goldenTrend, macdBullish: !!macdBullish, mom10: +mom10.toFixed(4), mom20: +mom20.toFixed(4) },
  };
}

export function scoreM2MeanReversion(s: NormalizedStrategy): ModelScore {
  const prices = s.priceHistory;
  const price = s.price;
  const sma20 = sma(prices, 20);
  const std20 = stdDev(prices, 20);
  const zscore = std20 === 0 ? 0 : (price - sma20) / std20;

  const rsi = s.rsi;
  const bBPosition = (s.bollingerUpper - s.bollingerLower) === 0 ? 0.5
    : (price - s.bollingerLower) / (s.bollingerUpper - s.bollingerLower);

  let reversionPotential = 0;
  if (s.action === "buy") {
    reversionPotential = clamp((-zscore + 2) / 4 * 40, 0, 40);
    reversionPotential += rsi < 30 ? 30 : rsi < 40 ? 20 : rsi < 50 ? 10 : 0;
    reversionPotential += bBPosition < 0.2 ? 30 : bBPosition < 0.4 ? 15 : 0;
  } else {
    reversionPotential = clamp((zscore + 2) / 4 * 40, 0, 40);
    reversionPotential += rsi > 70 ? 30 : rsi > 60 ? 20 : rsi > 50 ? 10 : 0;
    reversionPotential += bBPosition > 0.8 ? 30 : bBPosition > 0.6 ? 15 : 0;
  }

  const score = clamp(reversionPotential);
  const distanceFromMean = Math.abs(zscore);
  const confidence = clamp(40 + distanceFromMean * 15);

  return {
    modelId: "M2",
    modelName: "Mean Reversion Potential",
    score,
    confidence: clamp(confidence),
    details: { zscore: +zscore.toFixed(3), rsi, bollingerPosition: +bBPosition.toFixed(3), sma20: +sma20.toFixed(2), std20: +std20.toFixed(4) },
  };
}

export function scoreM3MomentumQuality(s: NormalizedStrategy): ModelScore {
  const prices = s.priceHistory;
  const mom5 = momentum(prices, 5);
  const mom10 = momentum(prices, 10);
  const mom20 = momentum(prices, 20);

  const macdHistogram = s.macd - s.macdSignal;
  const rsi = s.rsi;

  const momConsistency = [mom5, mom10, mom20].every((m) => m > 0)
    ? 1 : [mom5, mom10, mom20].every((m) => m < 0) ? 1 : 0;

  let raw = 0;
  if (s.action === "buy") {
    raw += clamp((mom5 + 0.05) / 0.1 * 20, 0, 20);
    raw += clamp((mom10 + 0.05) / 0.1 * 20, 0, 20);
    raw += clamp((mom20 + 0.05) / 0.1 * 15, 0, 15);
    raw += macdHistogram > 0 ? 20 : 0;
    raw += rsi > 50 && rsi < 70 ? 15 : rsi > 40 ? 5 : 0;
    raw += momConsistency * 10;
  } else {
    raw += clamp((-mom5 + 0.05) / 0.1 * 20, 0, 20);
    raw += clamp((-mom10 + 0.05) / 0.1 * 20, 0, 20);
    raw += clamp((-mom20 + 0.05) / 0.1 * 15, 0, 15);
    raw += macdHistogram < 0 ? 20 : 0;
    raw += rsi < 50 && rsi > 30 ? 15 : rsi < 60 ? 5 : 0;
    raw += momConsistency * 10;
  }

  const score = clamp(raw);
  const strength = Math.abs(mom5) + Math.abs(mom10);
  const confidence = clamp(40 + strength * 200 + (momConsistency ? 15 : 0));

  return {
    modelId: "M3",
    modelName: "Momentum Quality",
    score,
    confidence: clamp(confidence),
    details: { mom5: +mom5.toFixed(4), mom10: +mom10.toFixed(4), mom20: +mom20.toFixed(4), macdHistogram: +macdHistogram.toFixed(4), consistent: momConsistency === 1 },
  };
}

export function scoreM4RiskAdjustedReturn(s: NormalizedStrategy): ModelScore {
  const prices = s.priceHistory;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const avgReturn = returns.length === 0 ? 0 : returns.reduce((a, b) => a + b, 0) / returns.length;
  const returnStd = returns.length < 2 ? 0.01 : Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length);
  const sharpe = returnStd === 0 ? 0 : (avgReturn / returnStd) * Math.sqrt(252);
  const maxDD = maxDrawdown(prices);

  const calmar = maxDD === 0 ? sharpe : (avgReturn * 252) / maxDD;

  let raw = 0;
  raw += clamp((sharpe + 1) / 3 * 40, 0, 40);
  raw += clamp((1 - maxDD * 3) * 30, 0, 30);
  raw += clamp((calmar + 1) / 3 * 30, 0, 30);

  if (s.action === "sell") raw = Math.max(100 - raw, 30);

  const score = clamp(raw);
  const confidence = clamp(50 + Math.abs(sharpe) * 10 + (1 - maxDD) * 20);

  return {
    modelId: "M4",
    modelName: "Risk-Adjusted Return",
    score,
    confidence: clamp(confidence),
    details: { sharpe: +sharpe.toFixed(3), maxDrawdown: +maxDD.toFixed(4), calmar: +calmar.toFixed(3), avgReturn: +avgReturn.toFixed(6), returnStd: +returnStd.toFixed(6) },
  };
}

export function scoreM5VolumeLiquidity(s: NormalizedStrategy): ModelScore {
  const volume = s.volume;
  const avgVolume = s.avgVolume || volume;
  const volumeRatio = avgVolume === 0 ? 1 : volume / avgVolume;

  const volHistory = s.volumeHistory;
  const recentAvgVol = sma(volHistory, 5);
  const olderAvgVol = sma(volHistory.slice(0, -5), 20);
  const volumeTrend = olderAvgVol === 0 ? 1 : recentAvgVol / olderAvgVol;

  let raw = 0;
  raw += clamp(Math.min(volumeRatio, 3) / 3 * 40, 0, 40);
  raw += clamp(Math.min(volumeTrend, 2) / 2 * 30, 0, 30);
  raw += volume > 500_000 ? 20 : volume > 100_000 ? 10 : 0;
  raw += volumeRatio > 1.5 && s.action !== "hold" ? 10 : 0;

  const score = clamp(raw);
  const confidence = clamp(40 + (volumeRatio > 1 ? 20 : 0) + (volume > 1_000_000 ? 20 : 10));

  return {
    modelId: "M5",
    modelName: "Volume/Liquidity Confirmation",
    score,
    confidence: clamp(confidence),
    details: { volumeRatio: +volumeRatio.toFixed(3), volumeTrend: +volumeTrend.toFixed(3), volume, avgVolume, adequate: volume > 100_000 },
  };
}

export function scoreM6CrossTimeframeConsistency(s: NormalizedStrategy): ModelScore {
  const prices = s.priceHistory;
  const price = s.price;

  const sma5 = sma(prices, 5);
  const sma10 = sma(prices, 10);
  const sma20 = sma(prices, 20);
  const sma50 = sma(prices, 50);

  const tf5 = price > sma5 ? "bull" : "bear";
  const tf10 = price > sma10 ? "bull" : "bear";
  const tf20 = price > sma20 ? "bull" : "bear";
  const tf50 = price > sma50 ? "bull" : "bear";

  const tfs = [tf5, tf10, tf20, tf50];
  const bullCount = tfs.filter((t) => t === "bull").length;
  const bearCount = tfs.filter((t) => t === "bear").length;
  const consistency = Math.max(bullCount, bearCount) / tfs.length;

  const aligned = (s.action === "buy" && bullCount >= 3) || (s.action === "sell" && bearCount >= 3) || s.action === "hold";

  const mom5 = momentum(prices, 5);
  const mom10 = momentum(prices, 10);
  const mom20 = momentum(prices, 20);
  const momConsistent = [mom5, mom10, mom20].every((m) => m > 0) || [mom5, mom10, mom20].every((m) => m < 0);

  let raw = 0;
  raw += consistency * 60;
  raw += aligned ? 25 : 0;
  raw += momConsistent ? 15 : 0;

  const score = clamp(raw);
  const confidence = clamp(40 + consistency * 40 + (momConsistent ? 15 : 0));

  return {
    modelId: "M6",
    modelName: "Cross-Timeframe Consistency",
    score,
    confidence: clamp(confidence),
    details: { tf5, tf10, tf20, tf50, bullCount, bearCount, consistency: +consistency.toFixed(3), aligned, momConsistent },
  };
}

export async function runAllModels(s: NormalizedStrategy): Promise<ModelScore[]> {
  const [m1, m2, m3, m4, m5, m6] = await Promise.all([
    Promise.resolve(scoreM1TrendAlignment(s)),
    Promise.resolve(scoreM2MeanReversion(s)),
    Promise.resolve(scoreM3MomentumQuality(s)),
    Promise.resolve(scoreM4RiskAdjustedReturn(s)),
    Promise.resolve(scoreM5VolumeLiquidity(s)),
    Promise.resolve(scoreM6CrossTimeframeConsistency(s)),
  ]);
  return [m1, m2, m3, m4, m5, m6];
}
