import {
  sma, ema, emaArray, rsiArray, smaArray, bollingerArray, stochasticArray,
  williamsRArray, cciArray, rocArray, cmfArray, obvArray, macdParamsArray, adxArray,
  macd, macdParams, bollinger, rsi,
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
  timeframe?: string;
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

function generateSignalsArray(descriptor: StrategyDescriptor, data: OHLCVData): StrategyAction[] {
  const { closes, highs, lows, volumes } = data;
  const n = closes.length;
  const { type, params } = descriptor;
  const signals: StrategyAction[] = new Array(n).fill("HOLD") as StrategyAction[];

  if (type === "RSI_OVERSOLD") {
    const period = params.period || 14;
    const threshold = params.threshold || 30;
    const rsiArr = rsiArray(closes, period);
    for (let i = period + 1; i < n; i++) {
      if (rsiArr[i] < threshold) signals[i] = "BUY";
    }
  } else if (type === "RSI_OVERBOUGHT") {
    const period = params.period || 14;
    const threshold = params.threshold || 70;
    const rsiArr = rsiArray(closes, period);
    for (let i = period + 1; i < n; i++) {
      if (rsiArr[i] > threshold) signals[i] = "SELL";
    }
  } else if (type === "EMA_CROSSOVER") {
    const fast = params.fast || 9;
    const slow = params.slow || 21;
    const fastArr = emaArray(closes, fast);
    const slowArr = emaArray(closes, slow);
    for (let i = slow + 1; i < n; i++) {
      if (fastArr[i] > slowArr[i] && fastArr[i - 1] <= slowArr[i - 1]) signals[i] = "BUY";
      else if (fastArr[i] < slowArr[i] && fastArr[i - 1] >= slowArr[i - 1]) signals[i] = "SELL";
    }
  } else if (type === "SMA_CROSSOVER") {
    const fast = params.fast || 10;
    const slow = params.slow || 20;
    const fastArr = smaArray(closes, fast);
    const slowArr = smaArray(closes, slow);
    for (let i = slow + 1; i < n; i++) {
      if (fastArr[i] > slowArr[i] && fastArr[i - 1] <= slowArr[i - 1]) signals[i] = "BUY";
      else if (fastArr[i] < slowArr[i] && fastArr[i - 1] >= slowArr[i - 1]) signals[i] = "SELL";
    }
  } else if (type === "MACD_SIGNAL") {
    const fast = params.fast || 12;
    const slow = params.slow || 26;
    const sig = params.signal || 9;
    const macdArr = macdParamsArray(closes, fast, slow, sig);
    for (let i = slow + sig + 1; i < n; i++) {
      if (macdArr[i].histogram > 0 && macdArr[i - 1].histogram <= 0) signals[i] = "BUY";
      else if (macdArr[i].histogram < 0 && macdArr[i - 1].histogram >= 0) signals[i] = "SELL";
    }
  } else if (type === "BOLLINGER_BOUNCE") {
    const period = params.period || 20;
    const mult = params.mult || 2;
    const bbArr = bollingerArray(closes, period, mult);
    for (let i = period; i < n; i++) {
      if (bbArr[i].pctB < 15) signals[i] = "BUY";
      else if (bbArr[i].pctB > 85) signals[i] = "SELL";
    }
  } else if (type === "BOLLINGER_BREAKOUT") {
    const period = params.period || 20;
    const mult = params.mult || 2;
    const bbArr = bollingerArray(closes, period, mult);
    for (let i = period + 1; i < n; i++) {
      if (closes[i] > bbArr[i].upper && closes[i - 1] <= bbArr[i - 1].upper) signals[i] = "BUY";
      else if (closes[i] < bbArr[i].lower && closes[i - 1] >= bbArr[i - 1].lower) signals[i] = "SELL";
    }
  } else if (type === "STOCHASTIC_OVERSOLD") {
    const period = params.period || 14;
    const threshold = params.threshold || 20;
    const stochArr = stochasticArray(highs, lows, closes, period);
    for (let i = period; i < n; i++) {
      if (stochArr[i] < threshold) signals[i] = "BUY";
    }
  } else if (type === "STOCHASTIC_OVERBOUGHT") {
    const period = params.period || 14;
    const threshold = params.threshold || 80;
    const stochArr = stochasticArray(highs, lows, closes, period);
    for (let i = period; i < n; i++) {
      if (stochArr[i] > threshold) signals[i] = "SELL";
    }
  } else if (type === "WILLIAMS_R_OVERSOLD") {
    const period = params.period || 14;
    const wrArr = williamsRArray(highs, lows, closes, period);
    for (let i = period; i < n; i++) {
      if (wrArr[i] < -80) signals[i] = "BUY";
    }
  } else if (type === "CCI_EXTREME") {
    const period = params.period || 20;
    const threshold = params.threshold || 100;
    const cciArr = cciArray(highs, lows, closes, period);
    for (let i = period; i < n; i++) {
      if (cciArr[i] < -threshold) signals[i] = "BUY";
      else if (cciArr[i] > threshold) signals[i] = "SELL";
    }
  } else if (type === "ROC_MOMENTUM") {
    const period = params.period || 12;
    const threshold = params.threshold || 5;
    const rocArr = rocArray(closes, period);
    for (let i = period; i < n; i++) {
      if (rocArr[i] > threshold) signals[i] = "BUY";
      else if (rocArr[i] < -threshold) signals[i] = "SELL";
    }
  } else if (type === "CMF_FLOW") {
    const period = params.period || 20;
    const cmfArr = cmfArray(highs, lows, closes, volumes, period);
    for (let i = period; i < n; i++) {
      if (cmfArr[i] > 0.05) signals[i] = "BUY";
      else if (cmfArr[i] < -0.05) signals[i] = "SELL";
    }
  } else if (type === "OBV_TREND") {
    const obvArr = obvArray(closes, volumes);
    for (let i = 6; i < n; i++) {
      const priceUp = closes[i] > closes[i - 5];
      if (obvArr[i] > obvArr[i - 5] && priceUp) signals[i] = "BUY";
      else if (obvArr[i] < obvArr[i - 5] && !priceUp) signals[i] = "SELL";
    }
  } else if (type === "RSI_MACD_COMBO") {
    const rsiPeriod = params.rsiPeriod || 14;
    const rsiThreshold = params.rsiThreshold || 35;
    const rsiArr = rsiArray(closes, rsiPeriod);
    const macdArr = macdParamsArray(closes, 12, 26, 9);
    for (let i = 35; i < n; i++) {
      if (rsiArr[i] < rsiThreshold && macdArr[i].histogram > 0) signals[i] = "BUY";
      else if (rsiArr[i] > (100 - rsiThreshold) && macdArr[i].histogram < 0) signals[i] = "SELL";
    }
  } else if (type === "EMA_RSI_COMBO") {
    const rsiPeriod = params.rsiPeriod || 14;
    const emaPeriod = params.emaPeriod || 21;
    const rsiArr = rsiArray(closes, rsiPeriod);
    const emaArr = emaArray(closes, emaPeriod);
    for (let i = emaPeriod; i < n; i++) {
      if (closes[i] > emaArr[i] && rsiArr[i] < 50 && rsiArr[i] > 30) signals[i] = "BUY";
      else if (closes[i] < emaArr[i] && rsiArr[i] > 50 && rsiArr[i] < 70) signals[i] = "SELL";
    }
  } else if (type === "BOLLINGER_RSI_COMBO") {
    const bbPeriod = params.bbPeriod || 20;
    const rsiPeriod = params.rsiPeriod || 14;
    const bbArr = bollingerArray(closes, bbPeriod, 2);
    const rsiArr = rsiArray(closes, rsiPeriod);
    for (let i = Math.max(bbPeriod, rsiPeriod); i < n; i++) {
      if (bbArr[i].pctB < 20 && rsiArr[i] < 40) signals[i] = "BUY";
      else if (bbArr[i].pctB > 80 && rsiArr[i] > 60) signals[i] = "SELL";
    }
  } else if (type === "STOCH_RSI_COMBO") {
    const stochPeriod = params.stochPeriod || 14;
    const rsiPeriod = params.rsiPeriod || 14;
    const stochArr = stochasticArray(highs, lows, closes, stochPeriod);
    const rsiArr = rsiArray(closes, rsiPeriod);
    for (let i = Math.max(stochPeriod, rsiPeriod); i < n; i++) {
      if (stochArr[i] < 25 && rsiArr[i] < 40) signals[i] = "BUY";
      else if (stochArr[i] > 75 && rsiArr[i] > 60) signals[i] = "SELL";
    }
  } else if (type === "EMA_MACD_COMBO") {
    const emaPeriod = params.emaPeriod || 50;
    const fast = params.macdFast || 12;
    const slow = params.macdSlow || 26;
    const sig = params.macdSig || 9;
    const emaArr = emaArray(closes, emaPeriod);
    const macdArr = macdParamsArray(closes, fast, slow, sig);
    for (let i = emaPeriod; i < n; i++) {
      if (closes[i] > emaArr[i] && macdArr[i].histogram > 0) signals[i] = "BUY";
      else if (closes[i] < emaArr[i] && macdArr[i].histogram < 0) signals[i] = "SELL";
    }
  } else if (type === "TRIPLE_EMA") {
    const fast = params.fast || 9;
    const mid = params.mid || 21;
    const slow = params.slow || 50;
    const fastArr = emaArray(closes, fast);
    const midArr = emaArray(closes, mid);
    const slowArr = emaArray(closes, slow);
    for (let i = slow; i < n; i++) {
      if (fastArr[i] > midArr[i] && midArr[i] > slowArr[i]) signals[i] = "BUY";
      else if (fastArr[i] < midArr[i] && midArr[i] < slowArr[i]) signals[i] = "SELL";
    }
  } else if (type === "ADX_TREND") {
    const period = params.period || 14;
    const threshold = params.threshold || 25;
    const adxArr = adxArray(highs, lows, closes, period);
    const emaFastArr = emaArray(closes, 9);
    const emaSlowArr = emaArray(closes, 21);
    for (let i = period + 1; i < n; i++) {
      if (adxArr[i] > threshold && emaFastArr[i] > emaSlowArr[i]) signals[i] = "BUY";
      else if (adxArr[i] > threshold && emaFastArr[i] < emaSlowArr[i]) signals[i] = "SELL";
    }
  } else if (type === "PRICE_SMA_DISTANCE") {
    const period = params.period || 50;
    const threshold = params.threshold || 5;
    const smaArr = smaArray(closes, period);
    for (let i = period; i < n; i++) {
      if (smaArr[i] === 0) continue;
      const pct = ((closes[i] - smaArr[i]) / smaArr[i]) * 100;
      if (pct < -threshold) signals[i] = "BUY";
      else if (pct > threshold) signals[i] = "SELL";
    }
  } else if (type === "RSI_EMA_GRID") {
    const rsiPeriod = params.rsiPeriod || 14;
    const emaShort = params.emaShort || 9;
    const emaLong = params.emaLong || 50;
    const oversold = params.oversold || 30;
    const overbought = params.overbought || 70;
    const rsiArr = rsiArray(closes, rsiPeriod);
    const emaShortArr = emaArray(closes, emaShort);
    const emaLongArr = emaArray(closes, emaLong);
    for (let i = Math.max(rsiPeriod + 1, emaLong + 1); i < n; i++) {
      if (rsiArr[i] < oversold && emaShortArr[i] > emaLongArr[i]) signals[i] = "BUY";
      else if (rsiArr[i] > overbought && emaShortArr[i] < emaLongArr[i]) signals[i] = "SELL";
    }
  }

  return signals;
}

function backtest(
  closes: number[],
  signals: StrategyAction[],
  holdBars: number,
): { winRate: number; avgReturn: number; maxDrawdown: number; trades: number } {
  const trades: number[] = [];
  let equity = 100;
  let equity_peak = 100;
  let maxDD = 0;

  for (let i = 50; i < closes.length - holdBars; i++) {
    const action = signals[i];
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

export function executeStrategy(descriptor: StrategyDescriptor, data: OHLCVData): StrategyResult {
  const { closes, highs, lows, volumes } = data;

  if (closes.length < 60) {
    return { action: "HOLD", confidence: 0, expectedReturn: 0, riskScore: 50, winRate: 50, maxDrawdown: 0 };
  }

  const vol = computeVolatility(closes);
  const { type, params } = descriptor;
  const holdBars = params.holdBars || 10;

  const signals = generateSignalsArray(descriptor, data);
  const lastSignal = signals[signals.length - 1];
  const action = lastSignal;

  if (action === "HOLD") {
    return { action, confidence: 0, expectedReturn: 0, riskScore: Math.min(100, vol), winRate: 50, maxDrawdown: 0 };
  }

  let rawConfidence = 0;

  if (type === "RSI_OVERSOLD") {
    const period = params.period || 14;
    const threshold = params.threshold || 30;
    const currentRSI = rsi(closes, period);
    const prevRSI = rsi(closes.slice(0, -1), period);
    if (currentRSI < threshold && currentRSI > prevRSI) {
      rawConfidence = Math.min(100, (threshold - currentRSI) / threshold * 150 + 40);
    } else {
      rawConfidence = Math.min(80, (threshold - currentRSI) / threshold * 100 + 30);
    }
  } else if (type === "RSI_OVERBOUGHT") {
    const period = params.period || 14;
    const threshold = params.threshold || 70;
    const currentRSI = rsi(closes, period);
    rawConfidence = Math.min(80, (currentRSI - threshold) / (100 - threshold) * 100 + 30);
  } else if (type === "EMA_CROSSOVER") {
    const fast = params.fast || 9;
    const slow = params.slow || 21;
    const fastArr = emaArray(closes, fast);
    const slowArr = emaArray(closes, slow);
    const fastCurr = fastArr[fastArr.length - 1];
    const slowCurr = slowArr[slowArr.length - 1];
    rawConfidence = 65 + Math.abs(fastCurr - slowCurr) / slowCurr * 200;
  } else if (type === "SMA_CROSSOVER") {
    const fast = params.fast || 10;
    const slow = params.slow || 20;
    const fastCurr = sma(closes, fast);
    const slowCurr = sma(closes, slow);
    rawConfidence = 60 + Math.abs(fastCurr - slowCurr) / slowCurr * 150;
  } else if (type === "MACD_SIGNAL") {
    const fast = params.fast || 12;
    const slow = params.slow || 26;
    const sig = params.signal || 9;
    const curr = macdParams(closes, fast, slow, sig);
    rawConfidence = 60 + Math.min(30, Math.abs(curr.histogram) * 10);
  } else if (type === "BOLLINGER_BOUNCE") {
    const period = params.period || 20;
    const mult = params.mult || 2;
    const bands = bollinger(closes, period, mult);
    if (bands.pctB < 5) rawConfidence = Math.min(85, 70 + (5 - bands.pctB) * 2);
    else if (bands.pctB > 95) rawConfidence = Math.min(85, 70 + (bands.pctB - 95) * 2);
    else if (bands.pctB < 15) rawConfidence = 55 + (15 - bands.pctB) * 2;
    else rawConfidence = 55 + (bands.pctB - 85) * 2;
  } else if (type === "BOLLINGER_BREAKOUT") {
    rawConfidence = 65;
  } else if (type === "STOCHASTIC_OVERSOLD") {
    const period = params.period || 14;
    const threshold = params.threshold || 20;
    const stochArr = stochasticArray(highs, lows, closes, period);
    const k = stochArr[stochArr.length - 1];
    rawConfidence = Math.min(80, 50 + (threshold - k) * 1.5);
  } else if (type === "STOCHASTIC_OVERBOUGHT") {
    const period = params.period || 14;
    const threshold = params.threshold || 80;
    const stochArr = stochasticArray(highs, lows, closes, period);
    const k = stochArr[stochArr.length - 1];
    rawConfidence = Math.min(80, 50 + (k - threshold) * 1.5);
  } else if (type === "WILLIAMS_R_OVERSOLD") {
    const period = params.period || 14;
    const wrArr = williamsRArray(highs, lows, closes, period);
    const wr = wrArr[wrArr.length - 1];
    rawConfidence = Math.min(80, 50 + Math.abs(wr + 80) * 2);
  } else if (type === "CCI_EXTREME") {
    const period = params.period || 20;
    const threshold = params.threshold || 100;
    const cciArr = cciArray(highs, lows, closes, period);
    const c = cciArr[cciArr.length - 1];
    rawConfidence = Math.min(80, 50 + (Math.abs(c) - threshold) / threshold * 30);
  } else if (type === "ROC_MOMENTUM") {
    const period = params.period || 12;
    const threshold = params.threshold || 5;
    const rocArr = rocArray(closes, period);
    const r = rocArr[rocArr.length - 1];
    rawConfidence = Math.min(75, 50 + (Math.abs(r) - threshold) * 2);
  } else if (type === "CMF_FLOW") {
    const period = params.period || 20;
    const cmfArr = cmfArray(highs, lows, closes, volumes, period);
    const c = cmfArr[cmfArr.length - 1];
    rawConfidence = Math.min(80, 50 + Math.abs(c) * 200);
  } else if (type === "OBV_TREND") {
    rawConfidence = 60;
  } else if (type === "RSI_MACD_COMBO") {
    const rsiPeriod = params.rsiPeriod || 14;
    const rsiThreshold = params.rsiThreshold || 35;
    const currentRSI = rsi(closes, rsiPeriod);
    const macdData = macd(closes);
    rawConfidence = Math.min(90, 60 + Math.abs(currentRSI - (action === "BUY" ? rsiThreshold : 100 - rsiThreshold)) * 1.5 + Math.abs(macdData.histogram) * 5);
  } else if (type === "EMA_RSI_COMBO") {
    const rsiPeriod = params.rsiPeriod || 14;
    const currentRSI = rsi(closes, rsiPeriod);
    rawConfidence = 65 + (action === "BUY" ? (50 - currentRSI) * 0.5 : (currentRSI - 50) * 0.5);
  } else if (type === "BOLLINGER_RSI_COMBO") {
    const bbPeriod = params.bbPeriod || 20;
    const rsiPeriod = params.rsiPeriod || 14;
    const bands = bollinger(closes, bbPeriod, 2);
    const currentRSI = rsi(closes, rsiPeriod);
    rawConfidence = Math.min(90, 70 + Math.abs(currentRSI - 50) * 0.5 + Math.abs(bands.pctB - 50) * 0.5);
  } else if (type === "STOCH_RSI_COMBO") {
    const stochPeriod = params.stochPeriod || 14;
    const rsiPeriod = params.rsiPeriod || 14;
    const stochArr = stochasticArray(highs, lows, closes, stochPeriod);
    const k = stochArr[stochArr.length - 1];
    const currentRSI = rsi(closes, rsiPeriod);
    rawConfidence = Math.min(88, 65 + Math.abs(currentRSI - 50) + Math.abs(k - 50) * 0.5);
  } else if (type === "EMA_MACD_COMBO") {
    rawConfidence = 72;
  } else if (type === "TRIPLE_EMA") {
    const fast = params.fast || 9;
    const slow = params.slow || 50;
    const fastVal = ema(closes, fast);
    const slowVal = ema(closes, slow);
    rawConfidence = 70 + Math.abs(fastVal - slowVal) / slowVal * 100;
  } else if (type === "ADX_TREND") {
    const period = params.period || 14;
    const threshold = params.threshold || 25;
    const adxArr = adxArray(highs, lows, closes, period);
    const adxVal = adxArr[adxArr.length - 1];
    rawConfidence = Math.min(85, 55 + (adxVal - threshold) * 1.2);
  } else if (type === "PRICE_SMA_DISTANCE") {
    const period = params.period || 50;
    const threshold = params.threshold || 5;
    const smaVal = sma(closes, period);
    const pct = ((closes[closes.length - 1] - smaVal) / smaVal) * 100;
    rawConfidence = Math.min(80, 55 + Math.abs(Math.abs(pct) - threshold) * 2);
  } else if (type === "RSI_EMA_GRID") {
    const rsiPeriod = params.rsiPeriod || 14;
    const emaShort = params.emaShort || 9;
    const emaLong = params.emaLong || 50;
    const oversold = params.oversold || 30;
    const overbought = params.overbought || 70;
    const currentRSI = rsi(closes, rsiPeriod);
    const emaShortVal = ema(closes, emaShort);
    const emaLongVal = ema(closes, emaLong);
    if (action === "BUY") {
      rawConfidence = Math.min(90, 55 + (oversold - currentRSI) / oversold * 120 + (emaShortVal - emaLongVal) / emaLongVal * 200);
    } else if (action === "SELL") {
      rawConfidence = Math.min(90, 55 + (currentRSI - overbought) / (100 - overbought) * 120 + (emaLongVal - emaShortVal) / emaLongVal * 200);
    }
  } else {
    rawConfidence = 55;
  }

  const confidence = Math.min(100, Math.max(0, rawConfidence));

  const bt = backtest(closes, signals, holdBars);

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

  const intradayEmaConfigs: [number, number][] = [[9, 21], [12, 26], [20, 50]];
  for (const [fast, slow] of intradayEmaConfigs) {
    for (const hold of [3, 6, 12]) {
      strategies.push({
        id: `1h_ema_cross_${fast}_${slow}_h${hold}`,
        name: `1H EMA(${fast}/${slow}) Crossover / hold ${hold}h`,
        type: "EMA_CROSSOVER",
        params: { fast, slow, holdBars: hold },
        timeframe: "1Hour",
      });
    }
  }

  for (const period of [7, 14]) {
    for (const threshold of [25, 30]) {
      for (const hold of [3, 6]) {
        strategies.push({
          id: `1h_rsi_os_${period}_${threshold}_h${hold}`,
          name: `1H RSI(${period}) Oversold < ${threshold} / hold ${hold}h`,
          type: "RSI_OVERSOLD",
          params: { period, threshold, holdBars: hold },
          timeframe: "1Hour",
        });
      }
    }
    for (const threshold of [70, 75]) {
      for (const hold of [3, 6]) {
        strategies.push({
          id: `1h_rsi_ob_${period}_${threshold}_h${hold}`,
          name: `1H RSI(${period}) Overbought > ${threshold} / hold ${hold}h`,
          type: "RSI_OVERBOUGHT",
          params: { period, threshold, holdBars: hold },
          timeframe: "1Hour",
        });
      }
    }
  }

  for (const [fast, slow, sig] of [[12, 26, 9], [8, 21, 5]] as [number, number, number][]) {
    for (const hold of [3, 6]) {
      strategies.push({
        id: `1h_macd_${fast}_${slow}_${sig}_h${hold}`,
        name: `1H MACD(${fast},${slow},${sig}) Signal / hold ${hold}h`,
        type: "MACD_SIGNAL",
        params: { fast, slow, signal: sig, holdBars: hold },
        timeframe: "1Hour",
      });
    }
  }

  for (const period of [14, 20]) {
    for (const hold of [3, 6]) {
      strategies.push({
        id: `1h_bb_bounce_${period}_h${hold}`,
        name: `1H Bollinger(${period}) Bounce / hold ${hold}h`,
        type: "BOLLINGER_BOUNCE",
        params: { period, mult: 2, holdBars: hold },
        timeframe: "1Hour",
      });
    }
  }

  return strategies;
}
