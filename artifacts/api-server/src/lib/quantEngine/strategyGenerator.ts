import {
  sma, ema, emaArray, rsi, macd, macdParams, stochastic, bollinger,
  atr, obv, williamsr, cci, roc, cmf, adx,
} from "./indicators.js";

export interface OHLCVData {
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}

export type StrategyAction = "BUY" | "SELL" | "HOLD";

export interface StrategyResult {
  action: StrategyAction;
  confidence: number;
  expectedReturn: number;
  riskScore: number;
  winRate: number;
  maxDrawdown: number;
}

export interface StrategyDescriptor {
  id: string;
  name: string;
  type: string;
  params: Record<string, number>;
}

function backtest(
  closes: number[],
  generateSignal: (idx: number) => StrategyAction,
  holdBars: number,
): { winRate: number; avgReturn: number; maxDrawdown: number; trades: number } {
  const trades: number[] = [];
  let peak = -Infinity;
  let maxDD = 0;
  let equity = 100;
  let equity_peak = 100;

  for (let i = 50; i < closes.length - holdBars; i++) {
    const action = generateSignal(i);
    if (action !== "HOLD") {
      const entryPrice = closes[i];
      const exitPrice = closes[i + holdBars];
      const ret = action === "BUY"
        ? (exitPrice - entryPrice) / entryPrice * 100
        : (entryPrice - exitPrice) / entryPrice * 100;
      trades.push(ret);
      equity *= (1 + ret / 100);
      if (equity > equity_peak) equity_peak = equity;
      const dd = (equity_peak - equity) / equity_peak * 100;
      if (dd > maxDD) maxDD = dd;
    }
  }

  if (trades.length === 0) {
    return { winRate: 50, avgReturn: 0, maxDrawdown: 0, trades: 0 };
  }

  const wins = trades.filter(r => r > 0).length;
  return {
    winRate: (wins / trades.length) * 100,
    avgReturn: trades.reduce((a, b) => a + b, 0) / trades.length,
    maxDrawdown: maxDD,
    trades: trades.length,
  };
}

function computeVolatility(closes: number[]): number {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function executeStrategy(descriptor: StrategyDescriptor, data: OHLCVData): StrategyResult {
  const { closes, highs, lows, volumes } = data;

  if (closes.length < 60) {
    return { action: "HOLD", confidence: 0, expectedReturn: 0, riskScore: 50, winRate: 50, maxDrawdown: 0 };
  }

  const vol = computeVolatility(closes);
  const { type, params } = descriptor;

  let action: StrategyAction = "HOLD";
  let rawConfidence = 0;
  let holdBars = params.holdBars || 10;

  if (type === "RSI_OVERSOLD") {
    const period = params.period || 14;
    const threshold = params.threshold || 30;
    const currentRSI = rsi(closes, period);
    const prevRSI = rsi(closes.slice(0, -1), period);
    if (currentRSI < threshold && currentRSI > prevRSI) {
      action = "BUY";
      rawConfidence = Math.min(100, (threshold - currentRSI) / threshold * 150 + 40);
    } else if (currentRSI < threshold) {
      action = "BUY";
      rawConfidence = Math.min(80, (threshold - currentRSI) / threshold * 100 + 30);
    }
  } else if (type === "RSI_OVERBOUGHT") {
    const period = params.period || 14;
    const threshold = params.threshold || 70;
    const currentRSI = rsi(closes, period);
    if (currentRSI > threshold) {
      action = "SELL";
      rawConfidence = Math.min(80, (currentRSI - threshold) / (100 - threshold) * 100 + 30);
    }
  } else if (type === "EMA_CROSSOVER") {
    const fast = params.fast || 9;
    const slow = params.slow || 21;
    const fastArr = emaArray(closes, fast);
    const slowArr = emaArray(closes, slow);
    const fastCurr = fastArr[fastArr.length - 1];
    const fastPrev = fastArr[fastArr.length - 2] ?? fastCurr;
    const slowCurr = slowArr[slowArr.length - 1];
    const slowPrev = slowArr[slowArr.length - 2] ?? slowCurr;
    if (fastCurr > slowCurr && fastPrev <= slowPrev) {
      action = "BUY";
      rawConfidence = 65 + Math.abs(fastCurr - slowCurr) / slowCurr * 200;
    } else if (fastCurr < slowCurr && fastPrev >= slowPrev) {
      action = "SELL";
      rawConfidence = 65 + Math.abs(fastCurr - slowCurr) / slowCurr * 200;
    }
  } else if (type === "SMA_CROSSOVER") {
    const fast = params.fast || 10;
    const slow = params.slow || 20;
    if (closes.length < slow + 2) return { action: "HOLD", confidence: 0, expectedReturn: 0, riskScore: vol, winRate: 50, maxDrawdown: 0 };
    const fastCurr = sma(closes, fast);
    const fastPrev = sma(closes.slice(0, -1), fast);
    const slowCurr = sma(closes, slow);
    const slowPrev = sma(closes.slice(0, -1), slow);
    if (fastCurr > slowCurr && fastPrev <= slowPrev) {
      action = "BUY";
      rawConfidence = 60 + Math.abs(fastCurr - slowCurr) / slowCurr * 150;
    } else if (fastCurr < slowCurr && fastPrev >= slowPrev) {
      action = "SELL";
      rawConfidence = 60 + Math.abs(fastCurr - slowCurr) / slowCurr * 150;
    }
  } else if (type === "MACD_SIGNAL") {
    const fast = params.fast || 12;
    const slow = params.slow || 26;
    const sig = params.signal || 9;
    const curr = macdParams(closes, fast, slow, sig);
    const prev = macdParams(closes.slice(0, -1), fast, slow, sig);
    if (curr.histogram > 0 && prev.histogram <= 0) {
      action = "BUY";
      rawConfidence = 60 + Math.min(30, Math.abs(curr.histogram) * 10);
    } else if (curr.histogram < 0 && prev.histogram >= 0) {
      action = "SELL";
      rawConfidence = 60 + Math.min(30, Math.abs(curr.histogram) * 10);
    }
  } else if (type === "BOLLINGER_BOUNCE") {
    const period = params.period || 20;
    const mult = params.mult || 2;
    const bands = bollinger(closes, period, mult);
    if (bands.pctB < 5) {
      action = "BUY";
      rawConfidence = Math.min(85, 70 + (5 - bands.pctB) * 2);
    } else if (bands.pctB > 95) {
      action = "SELL";
      rawConfidence = Math.min(85, 70 + (bands.pctB - 95) * 2);
    } else if (bands.pctB < 15) {
      action = "BUY";
      rawConfidence = 55 + (15 - bands.pctB) * 2;
    } else if (bands.pctB > 85) {
      action = "SELL";
      rawConfidence = 55 + (bands.pctB - 85) * 2;
    }
  } else if (type === "BOLLINGER_BREAKOUT") {
    const period = params.period || 20;
    const mult = params.mult || 2;
    const bands = bollinger(closes, period, mult);
    const prevBands = bollinger(closes.slice(0, -1), period, mult);
    const price = closes[closes.length - 1];
    const prevPrice = closes[closes.length - 2];
    if (price > bands.upper && prevPrice <= prevBands.upper) {
      action = "BUY";
      rawConfidence = 65;
    } else if (price < bands.lower && prevPrice >= prevBands.lower) {
      action = "SELL";
      rawConfidence = 65;
    }
  } else if (type === "STOCHASTIC_OVERSOLD") {
    const period = params.period || 14;
    const threshold = params.threshold || 20;
    const k = stochastic(highs, lows, closes, period);
    if (k < threshold) {
      action = "BUY";
      rawConfidence = Math.min(80, 50 + (threshold - k) * 1.5);
    }
  } else if (type === "STOCHASTIC_OVERBOUGHT") {
    const period = params.period || 14;
    const threshold = params.threshold || 80;
    const k = stochastic(highs, lows, closes, period);
    if (k > threshold) {
      action = "SELL";
      rawConfidence = Math.min(80, 50 + (k - threshold) * 1.5);
    }
  } else if (type === "WILLIAMS_R_OVERSOLD") {
    const period = params.period || 14;
    const wr = williamsr(highs, lows, closes, period);
    if (wr < -80) {
      action = "BUY";
      rawConfidence = Math.min(80, 50 + Math.abs(wr + 80) * 2);
    }
  } else if (type === "CCI_EXTREME") {
    const period = params.period || 20;
    const threshold = params.threshold || 100;
    const c = cci(highs, lows, closes, period);
    if (c < -threshold) {
      action = "BUY";
      rawConfidence = Math.min(80, 50 + (Math.abs(c) - threshold) / threshold * 30);
    } else if (c > threshold) {
      action = "SELL";
      rawConfidence = Math.min(80, 50 + (c - threshold) / threshold * 30);
    }
  } else if (type === "ROC_MOMENTUM") {
    const period = params.period || 12;
    const threshold = params.threshold || 5;
    const r = roc(closes, period);
    if (r > threshold) {
      action = "BUY";
      rawConfidence = Math.min(75, 50 + (r - threshold) * 2);
    } else if (r < -threshold) {
      action = "SELL";
      rawConfidence = Math.min(75, 50 + (Math.abs(r) - threshold) * 2);
    }
  } else if (type === "CMF_FLOW") {
    const period = params.period || 20;
    const c = cmf(highs, lows, closes, volumes, period);
    if (c > 0.05) {
      action = "BUY";
      rawConfidence = Math.min(80, 50 + c * 200);
    } else if (c < -0.05) {
      action = "SELL";
      rawConfidence = Math.min(80, 50 + Math.abs(c) * 200);
    }
  } else if (type === "OBV_TREND") {
    const obvVal = obv(closes, volumes);
    const prevObv = obv(closes.slice(0, -5), volumes.slice(0, -5));
    const priceUp = closes[closes.length - 1] > closes[closes.length - 6];
    if (obvVal > prevObv && priceUp) {
      action = "BUY";
      rawConfidence = 60;
    } else if (obvVal < prevObv && !priceUp) {
      action = "SELL";
      rawConfidence = 60;
    }
  } else if (type === "RSI_MACD_COMBO") {
    const rsiPeriod = params.rsiPeriod || 14;
    const rsiThreshold = params.rsiThreshold || 35;
    const currentRSI = rsi(closes, rsiPeriod);
    const macdData = macd(closes);
    if (currentRSI < rsiThreshold && macdData.histogram > 0) {
      action = "BUY";
      rawConfidence = Math.min(90, 60 + (rsiThreshold - currentRSI) * 1.5 + Math.abs(macdData.histogram) * 5);
    } else if (currentRSI > (100 - rsiThreshold) && macdData.histogram < 0) {
      action = "SELL";
      rawConfidence = Math.min(90, 60 + (currentRSI - (100 - rsiThreshold)) * 1.5 + Math.abs(macdData.histogram) * 5);
    }
  } else if (type === "EMA_RSI_COMBO") {
    const rsiPeriod = params.rsiPeriod || 14;
    const emaPeriod = params.emaPeriod || 21;
    const currentRSI = rsi(closes, rsiPeriod);
    const emaVal = ema(closes, emaPeriod);
    const price = closes[closes.length - 1];
    if (price > emaVal && currentRSI < 50 && currentRSI > 30) {
      action = "BUY";
      rawConfidence = 65 + (50 - currentRSI) * 0.5;
    } else if (price < emaVal && currentRSI > 50 && currentRSI < 70) {
      action = "SELL";
      rawConfidence = 65 + (currentRSI - 50) * 0.5;
    }
  } else if (type === "BOLLINGER_RSI_COMBO") {
    const bbPeriod = params.bbPeriod || 20;
    const rsiPeriod = params.rsiPeriod || 14;
    const bands = bollinger(closes, bbPeriod, 2);
    const currentRSI = rsi(closes, rsiPeriod);
    if (bands.pctB < 20 && currentRSI < 40) {
      action = "BUY";
      rawConfidence = Math.min(90, 70 + (40 - currentRSI) * 0.5 + (20 - bands.pctB) * 0.5);
    } else if (bands.pctB > 80 && currentRSI > 60) {
      action = "SELL";
      rawConfidence = Math.min(90, 70 + (currentRSI - 60) * 0.5 + (bands.pctB - 80) * 0.5);
    }
  } else if (type === "STOCH_RSI_COMBO") {
    const stochPeriod = params.stochPeriod || 14;
    const rsiPeriod = params.rsiPeriod || 14;
    const k = stochastic(highs, lows, closes, stochPeriod);
    const currentRSI = rsi(closes, rsiPeriod);
    if (k < 25 && currentRSI < 40) {
      action = "BUY";
      rawConfidence = Math.min(88, 65 + (40 - currentRSI) + (25 - k) * 0.5);
    } else if (k > 75 && currentRSI > 60) {
      action = "SELL";
      rawConfidence = Math.min(88, 65 + (currentRSI - 60) + (k - 75) * 0.5);
    }
  } else if (type === "EMA_MACD_COMBO") {
    const emaPeriod = params.emaPeriod || 50;
    const fast = params.macdFast || 12;
    const slow = params.macdSlow || 26;
    const sig = params.macdSig || 9;
    const emaVal = ema(closes, emaPeriod);
    const price = closes[closes.length - 1];
    const macdData = macdParams(closes, fast, slow, sig);
    if (price > emaVal && macdData.histogram > 0) {
      action = "BUY";
      rawConfidence = 72;
    } else if (price < emaVal && macdData.histogram < 0) {
      action = "SELL";
      rawConfidence = 72;
    }
  } else if (type === "TRIPLE_EMA") {
    const fast = params.fast || 9;
    const mid = params.mid || 21;
    const slow = params.slow || 50;
    const fastVal = ema(closes, fast);
    const midVal = ema(closes, mid);
    const slowVal = ema(closes, slow);
    if (fastVal > midVal && midVal > slowVal) {
      action = "BUY";
      rawConfidence = 70 + (fastVal - slowVal) / slowVal * 100;
    } else if (fastVal < midVal && midVal < slowVal) {
      action = "SELL";
      rawConfidence = 70 + (slowVal - fastVal) / slowVal * 100;
    }
  } else if (type === "ADX_TREND") {
    const period = params.period || 14;
    const threshold = params.threshold || 25;
    const adxVal = adx(highs, lows, closes, period);
    const emaFast = ema(closes, 9);
    const emaSlow = ema(closes, 21);
    if (adxVal > threshold && emaFast > emaSlow) {
      action = "BUY";
      rawConfidence = Math.min(85, 55 + (adxVal - threshold) * 1.2);
    } else if (adxVal > threshold && emaFast < emaSlow) {
      action = "SELL";
      rawConfidence = Math.min(85, 55 + (adxVal - threshold) * 1.2);
    }
  } else if (type === "PRICE_SMA_DISTANCE") {
    const period = params.period || 50;
    const threshold = params.threshold || 5;
    const smaVal = sma(closes, period);
    const price = closes[closes.length - 1];
    const pct = ((price - smaVal) / smaVal) * 100;
    if (pct < -threshold) {
      action = "BUY";
      rawConfidence = Math.min(80, 55 + Math.abs(pct - threshold) * 2);
    } else if (pct > threshold) {
      action = "SELL";
      rawConfidence = Math.min(80, 55 + (pct - threshold) * 2);
    }
  } else if (type === "RSI_EMA_GRID") {
    const rsiPeriod = params.rsiPeriod || 14;
    const emaShort = params.emaShort || 9;
    const emaLong = params.emaLong || 50;
    const oversold = params.oversold || 30;
    const overbought = params.overbought || 70;
    const currentRSI = rsi(closes, rsiPeriod);
    const emaShortVal = ema(closes, emaShort);
    const emaLongVal = ema(closes, emaLong);
    if (currentRSI < oversold && emaShortVal > emaLongVal) {
      action = "BUY";
      rawConfidence = Math.min(90, 55 + (oversold - currentRSI) / oversold * 120 + (emaShortVal - emaLongVal) / emaLongVal * 200);
    } else if (currentRSI > overbought && emaShortVal < emaLongVal) {
      action = "SELL";
      rawConfidence = Math.min(90, 55 + (currentRSI - overbought) / (100 - overbought) * 120 + (emaLongVal - emaShortVal) / emaLongVal * 200);
    }
  }

  if (action === "HOLD") {
    return { action, confidence: 0, expectedReturn: 0, riskScore: Math.min(100, vol), winRate: 50, maxDrawdown: 0 };
  }

  const confidence = Math.min(100, Math.max(0, rawConfidence));

  const bt = backtest(
    closes,
    (idx) => {
      const slicedCloses = closes.slice(0, idx + 1);
      const slicedHighs = highs.slice(0, idx + 1);
      const slicedLows = lows.slice(0, idx + 1);
      const slicedVols = volumes.slice(0, idx + 1);
      if (slicedCloses.length < 60) return "HOLD";

      return executeStrategySlice(descriptor, {
        opens: data.opens.slice(0, idx + 1),
        highs: slicedHighs,
        lows: slicedLows,
        closes: slicedCloses,
        volumes: slicedVols,
      }).action;
    },
    holdBars,
  );

  const expectedReturn = action === "BUY" ? bt.avgReturn : -bt.avgReturn;
  const riskScore = Math.min(100, vol * 0.7 + bt.maxDrawdown * 0.3);

  return {
    action,
    confidence,
    expectedReturn,
    riskScore,
    winRate: bt.winRate,
    maxDrawdown: bt.maxDrawdown,
  };
}

function executeStrategySlice(descriptor: StrategyDescriptor, data: OHLCVData): { action: StrategyAction } {
  const { closes, highs, lows, volumes } = data;
  const { type, params } = descriptor;

  if (type === "RSI_OVERSOLD") {
    const currentRSI = rsi(closes, params.period || 14);
    return { action: currentRSI < (params.threshold || 30) ? "BUY" : "HOLD" };
  }
  if (type === "RSI_OVERBOUGHT") {
    const currentRSI = rsi(closes, params.period || 14);
    return { action: currentRSI > (params.threshold || 70) ? "SELL" : "HOLD" };
  }
  if (type === "EMA_CROSSOVER") {
    const fastArr = emaArray(closes, params.fast || 9);
    const slowArr = emaArray(closes, params.slow || 21);
    const fc = fastArr[fastArr.length - 1], fp = fastArr[fastArr.length - 2] ?? fc;
    const sc = slowArr[slowArr.length - 1], sp = slowArr[slowArr.length - 2] ?? sc;
    if (fc > sc && fp <= sp) return { action: "BUY" };
    if (fc < sc && fp >= sp) return { action: "SELL" };
  }
  if (type === "SMA_CROSSOVER") {
    const fc = sma(closes, params.fast || 10), fp = sma(closes.slice(0, -1), params.fast || 10);
    const sc = sma(closes, params.slow || 20), sp = sma(closes.slice(0, -1), params.slow || 20);
    if (fc > sc && fp <= sp) return { action: "BUY" };
    if (fc < sc && fp >= sp) return { action: "SELL" };
  }
  if (type === "MACD_SIGNAL") {
    const curr = macdParams(closes, params.fast || 12, params.slow || 26, params.signal || 9);
    const prev = macdParams(closes.slice(0, -1), params.fast || 12, params.slow || 26, params.signal || 9);
    if (curr.histogram > 0 && prev.histogram <= 0) return { action: "BUY" };
    if (curr.histogram < 0 && prev.histogram >= 0) return { action: "SELL" };
  }
  if (type === "BOLLINGER_BOUNCE") {
    const bands = bollinger(closes, params.period || 20, params.mult || 2);
    if (bands.pctB < 15) return { action: "BUY" };
    if (bands.pctB > 85) return { action: "SELL" };
  }
  if (type === "STOCHASTIC_OVERSOLD") {
    const k = stochastic(highs, lows, closes, params.period || 14);
    return { action: k < (params.threshold || 20) ? "BUY" : "HOLD" };
  }
  if (type === "STOCHASTIC_OVERBOUGHT") {
    const k = stochastic(highs, lows, closes, params.period || 14);
    return { action: k > (params.threshold || 80) ? "SELL" : "HOLD" };
  }
  if (type === "RSI_MACD_COMBO") {
    const currentRSI = rsi(closes, params.rsiPeriod || 14);
    const macdData = macd(closes);
    if (currentRSI < (params.rsiThreshold || 35) && macdData.histogram > 0) return { action: "BUY" };
    if (currentRSI > (100 - (params.rsiThreshold || 35)) && macdData.histogram < 0) return { action: "SELL" };
  }
  if (type === "EMA_MACD_COMBO") {
    const emaVal = ema(closes, params.emaPeriod || 50);
    const price = closes[closes.length - 1];
    const macdData = macdParams(closes, params.macdFast || 12, params.macdSlow || 26, params.macdSig || 9);
    if (price > emaVal && macdData.histogram > 0) return { action: "BUY" };
    if (price < emaVal && macdData.histogram < 0) return { action: "SELL" };
  }
  if (type === "RSI_EMA_GRID") {
    const currentRSI = rsi(closes, params.rsiPeriod || 14);
    const emaShortVal = ema(closes, params.emaShort || 9);
    const emaLongVal = ema(closes, params.emaLong || 50);
    if (currentRSI < (params.oversold || 30) && emaShortVal > emaLongVal) return { action: "BUY" };
    if (currentRSI > (params.overbought || 70) && emaShortVal < emaLongVal) return { action: "SELL" };
  }
  return { action: "HOLD" };
}

export function generateAllStrategies(): StrategyDescriptor[] {
  const strategies: StrategyDescriptor[] = [];

  const rsiPeriods = [7, 10, 14, 21, 28];
  const rsiOversoldThresholds = [20, 25, 30, 35];
  const rsiOverboughtThresholds = [65, 70, 75, 80];

  for (const period of rsiPeriods) {
    for (const threshold of rsiOversoldThresholds) {
      for (const hold of [5, 10, 20]) {
        strategies.push({
          id: `rsi_os_${period}_${threshold}_h${hold}`,
          name: `RSI(${period}) Oversold < ${threshold} / hold ${hold}d`,
          type: "RSI_OVERSOLD",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
    for (const threshold of rsiOverboughtThresholds) {
      for (const hold of [5, 10, 20]) {
        strategies.push({
          id: `rsi_ob_${period}_${threshold}_h${hold}`,
          name: `RSI(${period}) Overbought > ${threshold} / hold ${hold}d`,
          type: "RSI_OVERBOUGHT",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
  }

  const emaCrossoverPairs: [number, number][] = [[9, 21], [12, 26], [20, 50], [50, 100], [50, 200], [21, 55]];
  for (const [fast, slow] of emaCrossoverPairs) {
    for (const hold of [5, 10, 20, 30]) {
      strategies.push({
        id: `ema_cross_${fast}_${slow}_h${hold}`,
        name: `EMA(${fast}/${slow}) Crossover / hold ${hold}d`,
        type: "EMA_CROSSOVER",
        params: { fast, slow, holdBars: hold },
      });
    }
  }

  const smaCrossoverPairs: [number, number][] = [[10, 20], [20, 50], [50, 100], [50, 200], [20, 100]];
  for (const [fast, slow] of smaCrossoverPairs) {
    for (const hold of [5, 10, 20, 30]) {
      strategies.push({
        id: `sma_cross_${fast}_${slow}_h${hold}`,
        name: `SMA(${fast}/${slow}) Crossover / hold ${hold}d`,
        type: "SMA_CROSSOVER",
        params: { fast, slow, holdBars: hold },
      });
    }
  }

  const macdCombos: [number, number, number][] = [[12, 26, 9], [8, 21, 5], [5, 34, 5], [3, 10, 16]];
  for (const [fast, slow, sig] of macdCombos) {
    for (const hold of [5, 10, 15]) {
      strategies.push({
        id: `macd_${fast}_${slow}_${sig}_h${hold}`,
        name: `MACD(${fast},${slow},${sig}) Signal Cross / hold ${hold}d`,
        type: "MACD_SIGNAL",
        params: { fast, slow, signal: sig, holdBars: hold },
      });
    }
  }

  const bbPeriods = [10, 15, 20, 25, 30];
  const bbMults = [1.5, 2.0, 2.5];
  for (const period of bbPeriods) {
    for (const mult of bbMults) {
      for (const hold of [5, 10, 20]) {
        strategies.push({
          id: `bb_bounce_${period}_${Math.round(mult * 10)}_h${hold}`,
          name: `Bollinger(${period},${mult}σ) Bounce / hold ${hold}d`,
          type: "BOLLINGER_BOUNCE",
          params: { period, mult, holdBars: hold },
        });
        strategies.push({
          id: `bb_break_${period}_${Math.round(mult * 10)}_h${hold}`,
          name: `Bollinger(${period},${mult}σ) Breakout / hold ${hold}d`,
          type: "BOLLINGER_BREAKOUT",
          params: { period, mult, holdBars: hold },
        });
      }
    }
  }

  const stochPeriods = [5, 9, 14, 21];
  const stochOversoldThresh = [15, 20, 25];
  const stochOverboughtThresh = [75, 80, 85];
  for (const period of stochPeriods) {
    for (const threshold of stochOversoldThresh) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `stoch_os_${period}_${threshold}_h${hold}`,
          name: `Stochastic(${period}) < ${threshold} / hold ${hold}d`,
          type: "STOCHASTIC_OVERSOLD",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
    for (const threshold of stochOverboughtThresh) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `stoch_ob_${period}_${threshold}_h${hold}`,
          name: `Stochastic(${period}) > ${threshold} / hold ${hold}d`,
          type: "STOCHASTIC_OVERBOUGHT",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
  }

  for (const period of [10, 14, 20]) {
    for (const hold of [5, 10]) {
      strategies.push({
        id: `wr_os_${period}_h${hold}`,
        name: `Williams %R(${period}) Oversold / hold ${hold}d`,
        type: "WILLIAMS_R_OVERSOLD",
        params: { period, holdBars: hold },
      });
    }
  }

  const cciPeriods = [14, 20, 40];
  const cciThresholds = [80, 100, 150, 200];
  for (const period of cciPeriods) {
    for (const threshold of cciThresholds) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `cci_${period}_${threshold}_h${hold}`,
          name: `CCI(${period}) Extreme ±${threshold} / hold ${hold}d`,
          type: "CCI_EXTREME",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
  }

  for (const period of [5, 9, 12, 20]) {
    for (const threshold of [3, 5, 8, 10]) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `roc_${period}_${threshold}_h${hold}`,
          name: `ROC(${period}) > ${threshold}% / hold ${hold}d`,
          type: "ROC_MOMENTUM",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
  }

  for (const period of [14, 20, 26]) {
    for (const hold of [5, 10]) {
      strategies.push({
        id: `cmf_${period}_h${hold}`,
        name: `CMF(${period}) Positive Flow / hold ${hold}d`,
        type: "CMF_FLOW",
        params: { period, holdBars: hold },
      });
    }
  }

  for (const hold of [5, 10, 20]) {
    strategies.push({
      id: `obv_trend_h${hold}`,
      name: `OBV Trend Confirmation / hold ${hold}d`,
      type: "OBV_TREND",
      params: { holdBars: hold },
    });
  }

  const rsiPeriodsCombo = [10, 14, 21];
  const rsiThresholdsCombo = [30, 35, 40];
  for (const rsiPeriod of rsiPeriodsCombo) {
    for (const rsiThreshold of rsiThresholdsCombo) {
      for (const hold of [5, 10, 15]) {
        strategies.push({
          id: `rsi_macd_${rsiPeriod}_${rsiThreshold}_h${hold}`,
          name: `RSI(${rsiPeriod})<${rsiThreshold} + MACD / hold ${hold}d`,
          type: "RSI_MACD_COMBO",
          params: { rsiPeriod, rsiThreshold, holdBars: hold },
        });
      }
    }
  }

  const emaPeriodsCombo = [21, 50, 100];
  const rsiPeriodsEma = [9, 14];
  for (const emaPeriod of emaPeriodsCombo) {
    for (const rsiPeriod of rsiPeriodsEma) {
      for (const hold of [5, 10, 20]) {
        strategies.push({
          id: `ema_rsi_${emaPeriod}_${rsiPeriod}_h${hold}`,
          name: `EMA(${emaPeriod}) + RSI(${rsiPeriod}) / hold ${hold}d`,
          type: "EMA_RSI_COMBO",
          params: { emaPeriod, rsiPeriod, holdBars: hold },
        });
      }
    }
  }

  const bbPeriodsCombo = [15, 20, 25];
  const rsiPeriodsB = [9, 14];
  for (const bbPeriod of bbPeriodsCombo) {
    for (const rsiPeriod of rsiPeriodsB) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `bb_rsi_${bbPeriod}_${rsiPeriod}_h${hold}`,
          name: `Bollinger(${bbPeriod}) + RSI(${rsiPeriod}) / hold ${hold}d`,
          type: "BOLLINGER_RSI_COMBO",
          params: { bbPeriod, rsiPeriod, holdBars: hold },
        });
      }
    }
  }

  for (const [stochPeriod, rsiPeriod] of [[14, 14], [9, 9], [5, 14]]) {
    for (const hold of [5, 10]) {
      strategies.push({
        id: `stoch_rsi_${stochPeriod}_${rsiPeriod}_h${hold}`,
        name: `Stoch(${stochPeriod}) + RSI(${rsiPeriod}) / hold ${hold}d`,
        type: "STOCH_RSI_COMBO",
        params: { stochPeriod, rsiPeriod, holdBars: hold },
      });
    }
  }

  const emaPeriodsM = [21, 50];
  for (const emaPeriod of emaPeriodsM) {
    for (const [mf, ms, msig] of [[12, 26, 9], [8, 21, 5]]) {
      for (const hold of [5, 10, 15]) {
        strategies.push({
          id: `ema_macd_${emaPeriod}_${mf}_${ms}_h${hold}`,
          name: `EMA(${emaPeriod}) + MACD(${mf},${ms}) / hold ${hold}d`,
          type: "EMA_MACD_COMBO",
          params: { emaPeriod, macdFast: mf, macdSlow: ms, macdSig: msig, holdBars: hold },
        });
      }
    }
  }

  const tripleEmaConfigs: [number, number, number][] = [[9, 21, 50], [5, 13, 34], [8, 21, 55]];
  for (const [fast, mid, slow] of tripleEmaConfigs) {
    for (const hold of [5, 10, 20]) {
      strategies.push({
        id: `triple_ema_${fast}_${mid}_${slow}_h${hold}`,
        name: `Triple EMA(${fast}/${mid}/${slow}) Alignment / hold ${hold}d`,
        type: "TRIPLE_EMA",
        params: { fast, mid, slow, holdBars: hold },
      });
    }
  }

  for (const period of [14, 21]) {
    for (const threshold of [20, 25, 30]) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `adx_${period}_${threshold}_h${hold}`,
          name: `ADX(${period}) > ${threshold} Trend / hold ${hold}d`,
          type: "ADX_TREND",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
  }

  for (const period of [20, 50, 100, 200]) {
    for (const threshold of [3, 5, 8, 10]) {
      for (const hold of [5, 10]) {
        strategies.push({
          id: `psma_${period}_${threshold}_h${hold}`,
          name: `Price SMA(${period}) Distance ${threshold}% / hold ${hold}d`,
          type: "PRICE_SMA_DISTANCE",
          params: { period, threshold, holdBars: hold },
        });
      }
    }
  }

  function seededRng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  const gridRsiPeriods = [7, 14, 21];
  const gridEmaShort = [9, 12, 20];
  const gridEmaLong = [50, 100, 200];
  const GRID_VARIATIONS_PER_COMBO = 450;

  for (const rsiPeriod of gridRsiPeriods) {
    for (const emaShort of gridEmaShort) {
      for (const emaLong of gridEmaLong) {
        if (emaShort >= emaLong) continue;
        const seed = rsiPeriod * 100000 + emaShort * 1000 + emaLong;
        const rng = seededRng(seed);
        for (let v = 0; v < GRID_VARIATIONS_PER_COMBO; v++) {
          const oversold = Math.round(20 + rng() * 20);
          const overbought = Math.round(60 + rng() * 20);
          const hold = Math.round(3 + rng() * 22);
          strategies.push({
            id: `rsi_ema_grid_${rsiPeriod}_${emaShort}_${emaLong}_v${v}`,
            name: `RSI(${rsiPeriod})<${oversold}+EMA(${emaShort}/${emaLong}) / hold ${hold}d`,
            type: "RSI_EMA_GRID",
            params: { rsiPeriod, emaShort, emaLong, oversold, overbought, holdBars: hold },
          });
        }
      }
    }
  }

  return strategies;
}
