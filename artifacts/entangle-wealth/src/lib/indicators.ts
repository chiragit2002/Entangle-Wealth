export interface IndicatorResult {
  name: string;
  category: "trend" | "momentum" | "volatility" | "volume" | "oscillator";
  value: number | string;
  signal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  description: string;
}

function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  let val = data[0];
  for (let i = 1; i < data.length; i++) {
    val = data[i] * k + val * (1 - k);
  }
  return val;
}

function emaArray(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function wma(data: number[], period: number): number {
  const slice = data.slice(-period);
  const denom = (period * (period + 1)) / 2;
  return slice.reduce((sum, val, i) => sum + val * (i + 1), 0) / denom;
}

function stdDev(data: number[], period: number): number {
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  return Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length);
}

function trendSignal(price: number, indicator: number): IndicatorResult["signal"] {
  const diff = ((price - indicator) / indicator) * 100;
  if (diff > 3) return "STRONG_BUY";
  if (diff > 1) return "BUY";
  if (diff < -3) return "STRONG_SELL";
  if (diff < -1) return "SELL";
  return "NEUTRAL";
}

// ─── TREND INDICATORS ─────────────────────────────────

export function calcSMA(prices: number[], period: number): IndicatorResult {
  const val = sma(prices, period);
  const price = prices[prices.length - 1];
  return { name: `SMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Simple Moving Average over ${period} periods` };
}

export function calcEMA(prices: number[], period: number): IndicatorResult {
  const val = ema(prices, period);
  const price = prices[prices.length - 1];
  return { name: `EMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Exponential Moving Average over ${period} periods` };
}

export function calcWMA(prices: number[], period: number): IndicatorResult {
  const val = wma(prices, period);
  const price = prices[prices.length - 1];
  return { name: `WMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Weighted Moving Average over ${period} periods` };
}

export function calcDEMA(prices: number[], period: number): IndicatorResult {
  const ema1 = emaArray(prices, period);
  const ema2 = ema(ema1, period);
  const val = 2 * ema1[ema1.length - 1] - ema2;
  const price = prices[prices.length - 1];
  return { name: `DEMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Double Exponential Moving Average: reduces lag` };
}

export function calcTEMA(prices: number[], period: number): IndicatorResult {
  const ema1 = emaArray(prices, period);
  const ema2 = emaArray(ema1, period);
  const ema3 = ema(ema2, period);
  const val = 3 * ema1[ema1.length - 1] - 3 * ema2[ema2.length - 1] + ema3;
  const price = prices[prices.length - 1];
  return { name: `TEMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Triple Exponential Moving Average: minimal lag` };
}

export function calcHMA(prices: number[], period: number): IndicatorResult {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  function wmaArr(data: number[], p: number): number[] {
    const out: number[] = [];
    for (let i = p - 1; i < data.length; i++) {
      const sl = data.slice(i - p + 1, i + 1);
      const d = (p * (p + 1)) / 2;
      out.push(sl.reduce((s, v, j) => s + v * (j + 1), 0) / d);
    }
    return out;
  }
  const wmaHalfArr = wmaArr(prices, halfPeriod);
  const wmaFullArr = wmaArr(prices, period);
  const minLen = Math.min(wmaHalfArr.length, wmaFullArr.length);
  const diffSeries: number[] = [];
  for (let i = 0; i < minLen; i++) {
    diffSeries.push(2 * wmaHalfArr[wmaHalfArr.length - minLen + i] - wmaFullArr[wmaFullArr.length - minLen + i]);
  }
  const hmaArr = wmaArr(diffSeries, sqrtPeriod);
  const val = hmaArr.length > 0 ? hmaArr[hmaArr.length - 1] : prices[prices.length - 1];
  const price = prices[prices.length - 1];
  return { name: `HMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Hull Moving Average: fast trend following (${sqrtPeriod} period smoothing)` };
}

export function calcKAMA(prices: number[], period: number = 10): IndicatorResult {
  if (prices.length < period + 1) {
    return { name: `KAMA (${period})`, category: "trend", value: prices[prices.length - 1], signal: "NEUTRAL", description: "Kaufman Adaptive Moving Average" };
  }
  const fastSC = 2 / (2 + 1);
  const slowSC = 2 / (30 + 1);
  const direction = Math.abs(prices[prices.length - 1] - prices[prices.length - 1 - period]);
  let volatility = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    volatility += Math.abs(prices[i] - prices[i - 1]);
  }
  const er = volatility === 0 ? 0 : direction / volatility;
  const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
  let val = prices[prices.length - 1 - period];
  for (let i = prices.length - period; i < prices.length; i++) {
    val = val + sc * (prices[i] - val);
  }
  const price = prices[prices.length - 1];
  return { name: `KAMA (${period})`, category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: `Kaufman Adaptive Moving Average: adjusts to volatility` };
}

export function calcVWAP(prices: number[], volumes: number[]): IndicatorResult {
  let cumPV = 0, cumV = 0;
  const len = Math.min(prices.length, volumes.length);
  for (let i = 0; i < len; i++) {
    cumPV += prices[i] * volumes[i];
    cumV += volumes[i];
  }
  const val = cumV === 0 ? prices[prices.length - 1] : cumPV / cumV;
  const price = prices[prices.length - 1];
  return { name: "VWAP", category: "trend", value: +val.toFixed(2), signal: trendSignal(price, val), description: "Volume Weighted Average Price" };
}

export function calcIchimoku(highs: number[], lows: number[], closes: number[]): IndicatorResult {
  const tenkanPeriod = Math.min(9, highs.length);
  const kijunPeriod = Math.min(26, highs.length);
  const tenkan = (Math.max(...highs.slice(-tenkanPeriod)) + Math.min(...lows.slice(-tenkanPeriod))) / 2;
  const kijun = (Math.max(...highs.slice(-kijunPeriod)) + Math.min(...lows.slice(-kijunPeriod))) / 2;
  const price = closes[closes.length - 1];
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (price > tenkan && tenkan > kijun) sig = "STRONG_BUY";
  else if (price > kijun) sig = "BUY";
  else if (price < tenkan && tenkan < kijun) sig = "STRONG_SELL";
  else if (price < kijun) sig = "SELL";
  return { name: "Ichimoku Cloud", category: "trend", value: `T:${tenkan.toFixed(0)} K:${kijun.toFixed(0)}`, signal: sig, description: "Ichimoku Kinko Hyo: Tenkan/Kijun crossover system" };
}

export function calcParabolicSAR(highs: number[], lows: number[], step: number = 0.02, max: number = 0.2): IndicatorResult {
  let af = step;
  let uptrend = true;
  let sar = lows[0];
  let ep = highs[0];
  for (let i = 1; i < highs.length; i++) {
    sar = sar + af * (ep - sar);
    if (uptrend) {
      if (lows[i] < sar) { uptrend = false; sar = ep; ep = lows[i]; af = step; }
      else { if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + step, max); } }
    } else {
      if (highs[i] > sar) { uptrend = true; sar = ep; ep = highs[i]; af = step; }
      else { if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + step, max); } }
    }
  }
  return { name: "Parabolic SAR", category: "trend", value: +sar.toFixed(2), signal: uptrend ? "BUY" : "SELL", description: "Stop And Reverse: trend direction and trailing stop" };
}

export function calcSupertrend(highs: number[], lows: number[], closes: number[], period: number = 10, multiplier: number = 3): IndicatorResult {
  const atrVal = calcATRRaw(highs, lows, closes, period);
  const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
  const upperBand = hl2 + multiplier * atrVal;
  const lowerBand = hl2 - multiplier * atrVal;
  const price = closes[closes.length - 1];
  const uptrend = price > lowerBand;
  return { name: "Supertrend", category: "trend", value: +(uptrend ? lowerBand : upperBand).toFixed(2), signal: uptrend ? "BUY" : "SELL", description: "Supertrend: ATR-based trend following" };
}

export function calcADX(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorResult {
  if (highs.length < period + 1) return { name: `ADX (${period})`, category: "trend", value: 25, signal: "NEUTRAL", description: "Average Directional Index" };
  let sumDMplus = 0, sumDMminus = 0, sumTR = 0;
  for (let i = 1; i <= period; i++) {
    const dmPlus = Math.max(highs[i] - highs[i - 1], 0);
    const dmMinus = Math.max(lows[i - 1] - lows[i], 0);
    sumDMplus += dmPlus > dmMinus ? dmPlus : 0;
    sumDMminus += dmMinus > dmPlus ? dmMinus : 0;
    sumTR += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }
  const diPlus = sumTR === 0 ? 0 : (sumDMplus / sumTR) * 100;
  const diMinus = sumTR === 0 ? 0 : (sumDMminus / sumTR) * 100;
  const dx = diPlus + diMinus === 0 ? 0 : Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (dx > 25 && diPlus > diMinus) sig = "BUY";
  if (dx > 40 && diPlus > diMinus) sig = "STRONG_BUY";
  if (dx > 25 && diMinus > diPlus) sig = "SELL";
  if (dx > 40 && diMinus > diPlus) sig = "STRONG_SELL";
  return { name: `ADX (${period})`, category: "trend", value: +dx.toFixed(1), signal: sig, description: "Average Directional Index: trend strength (not direction)" };
}

export function calcAroon(highs: number[], lows: number[], period: number = 25): IndicatorResult {
  const hSlice = highs.slice(-period);
  const lSlice = lows.slice(-period);
  const highIdx = hSlice.indexOf(Math.max(...hSlice));
  const lowIdx = lSlice.indexOf(Math.min(...lSlice));
  const up = ((period - (period - 1 - highIdx)) / period) * 100;
  const down = ((period - (period - 1 - lowIdx)) / period) * 100;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (up > 70 && down < 30) sig = "STRONG_BUY";
  else if (up > 50 && up > down) sig = "BUY";
  else if (down > 70 && up < 30) sig = "STRONG_SELL";
  else if (down > 50 && down > up) sig = "SELL";
  return { name: `Aroon (${period})`, category: "trend", value: `↑${up.toFixed(0)} ↓${down.toFixed(0)}`, signal: sig, description: "Aroon Indicator: time since highest high / lowest low" };
}

export function calcTRIX(prices: number[], period: number = 15): IndicatorResult {
  const e1 = emaArray(prices, period);
  const e2 = emaArray(e1, period);
  const e3 = emaArray(e2, period);
  if (e3.length < 2) return { name: `TRIX (${period})`, category: "trend", value: 0, signal: "NEUTRAL", description: "Triple Smoothed EMA Rate of Change" };
  const val = ((e3[e3.length - 1] - e3[e3.length - 2]) / e3[e3.length - 2]) * 100;
  return { name: `TRIX (${period})`, category: "trend", value: +val.toFixed(4), signal: val > 0.01 ? "BUY" : val < -0.01 ? "SELL" : "NEUTRAL", description: "TRIX: triple smoothed EMA rate of change, filters noise" };
}

export function calcDPO(prices: number[], period: number = 20): IndicatorResult {
  const shift = Math.floor(period / 2) + 1;
  if (prices.length < period + shift) return { name: `DPO (${period})`, category: "trend", value: 0, signal: "NEUTRAL", description: "Detrended Price Oscillator" };
  const price = prices[prices.length - 1 - shift] || prices[prices.length - 1];
  const avg = sma(prices.slice(0, -shift), period);
  const val = price - avg;
  return { name: `DPO (${period})`, category: "trend", value: +val.toFixed(2), signal: val > 0 ? "BUY" : val < 0 ? "SELL" : "NEUTRAL", description: "Detrended Price Oscillator: removes trend to identify cycles" };
}

export function calcMassIndex(highs: number[], lows: number[], period: number = 25): IndicatorResult {
  const ranges: number[] = [];
  for (let i = 0; i < highs.length; i++) ranges.push(highs[i] - lows[i]);
  const e1 = emaArray(ranges, 9);
  const e2 = emaArray(e1, 9);
  let sum = 0;
  const len = Math.min(period, e2.length);
  for (let i = e2.length - len; i < e2.length; i++) {
    sum += e2[i] === 0 ? 1 : e1[i] / e2[i];
  }
  return { name: `Mass Index (${period})`, category: "trend", value: +sum.toFixed(2), signal: sum > 27 ? "SELL" : sum < 26.5 && sum > 25 ? "BUY" : "NEUTRAL", description: "Mass Index: detects trend reversals via range expansion" };
}

export function calcVortex(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorResult {
  let sumVMplus = 0, sumVMminus = 0, sumTR = 0;
  const len = Math.min(period, highs.length - 1);
  for (let i = highs.length - len; i < highs.length; i++) {
    sumVMplus += Math.abs(highs[i] - lows[i - 1]);
    sumVMminus += Math.abs(lows[i] - highs[i - 1]);
    sumTR += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }
  const viPlus = sumTR === 0 ? 1 : sumVMplus / sumTR;
  const viMinus = sumTR === 0 ? 1 : sumVMminus / sumTR;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (viPlus > viMinus + 0.1) sig = "BUY";
  if (viPlus > viMinus + 0.2) sig = "STRONG_BUY";
  if (viMinus > viPlus + 0.1) sig = "SELL";
  if (viMinus > viPlus + 0.2) sig = "STRONG_SELL";
  return { name: `Vortex (${period})`, category: "trend", value: `VI.up ${viPlus.toFixed(2)} VI.dn ${viMinus.toFixed(2)}`, signal: sig, description: "Vortex Indicator: identifies trend direction and strength" };
}

// ─── MOMENTUM INDICATORS ──────────────────────────────

export function calcRSI(prices: number[], period: number = 14): IndicatorResult {
  if (prices.length < period + 1) return { name: `RSI (${period})`, category: "momentum", value: 50, signal: "NEUTRAL", description: "Relative Strength Index" };
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const val = 100 - 100 / (1 + rs);
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (val < 20) sig = "STRONG_BUY";
  else if (val < 30) sig = "BUY";
  else if (val > 80) sig = "STRONG_SELL";
  else if (val > 70) sig = "SELL";
  return { name: `RSI (${period})`, category: "momentum", value: +val.toFixed(1), signal: sig, description: "Relative Strength Index: overbought >70, oversold <30" };
}

export function calcMACD(prices: number[]): IndicatorResult {
  const ema12Arr = emaArray(prices, 12);
  const ema26Arr = emaArray(prices, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < ema12Arr.length; i++) {
    macdLine.push(ema12Arr[i] - ema26Arr[i]);
  }
  const signalArr = emaArray(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const signalLine = signalArr[signalArr.length - 1];
  const histogram = macd - signalLine;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (macd > 0 && histogram > 0) sig = "BUY";
  if (macd > 0 && histogram > 0.5) sig = "STRONG_BUY";
  if (macd < 0 && histogram < 0) sig = "SELL";
  if (macd < 0 && histogram < -0.5) sig = "STRONG_SELL";
  return { name: "MACD (12,26,9)", category: "momentum", value: +macd.toFixed(3), signal: sig, description: "Moving Average Convergence Divergence: trend momentum" };
}

export function calcStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorResult {
  const hSlice = highs.slice(-period);
  const lSlice = lows.slice(-period);
  const hh = Math.max(...hSlice);
  const ll = Math.min(...lSlice);
  const k = hh === ll ? 50 : ((closes[closes.length - 1] - ll) / (hh - ll)) * 100;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (k < 20) sig = "STRONG_BUY";
  else if (k < 30) sig = "BUY";
  else if (k > 80) sig = "STRONG_SELL";
  else if (k > 70) sig = "SELL";
  return { name: `Stochastic %K (${period})`, category: "momentum", value: +k.toFixed(1), signal: sig, description: "Stochastic Oscillator: %K position in range" };
}

export function calcWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorResult {
  const hSlice = highs.slice(-period);
  const lSlice = lows.slice(-period);
  const hh = Math.max(...hSlice);
  const ll = Math.min(...lSlice);
  const wr = hh === ll ? -50 : ((hh - closes[closes.length - 1]) / (hh - ll)) * -100;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (wr < -80) sig = "STRONG_BUY";
  else if (wr < -60) sig = "BUY";
  else if (wr > -20) sig = "STRONG_SELL";
  else if (wr > -40) sig = "SELL";
  return { name: `Williams %R (${period})`, category: "momentum", value: +Math.abs(wr).toFixed(1), signal: sig, description: "Williams %R: overbought near 0, oversold near 100" };
}

export function calcCCI(highs: number[], lows: number[], closes: number[], period: number = 20): IndicatorResult {
  const tps: number[] = [];
  for (let i = 0; i < closes.length; i++) tps.push((highs[i] + lows[i] + closes[i]) / 3);
  const avg = sma(tps, period);
  const slice = tps.slice(-period);
  const meanDev = slice.reduce((a, b) => a + Math.abs(b - avg), 0) / period;
  const cci = meanDev === 0 ? 0 : (tps[tps.length - 1] - avg) / (0.015 * meanDev);
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (cci > 200) sig = "STRONG_BUY";
  else if (cci > 100) sig = "BUY";
  else if (cci < -200) sig = "STRONG_SELL";
  else if (cci < -100) sig = "SELL";
  return { name: `CCI (${period})`, category: "momentum", value: +cci.toFixed(1), signal: sig, description: "Commodity Channel Index: measures deviation from average" };
}

export function calcROC(prices: number[], period: number = 12): IndicatorResult {
  if (prices.length < period + 1) return { name: `ROC (${period})`, category: "momentum", value: 0, signal: "NEUTRAL", description: "Rate of Change" };
  const prev = prices[prices.length - 1 - period];
  const curr = prices[prices.length - 1];
  const roc = prev === 0 ? 0 : ((curr - prev) / prev) * 100;
  let rocSig: IndicatorResult["signal"] = "NEUTRAL";
  if (roc > 10) rocSig = "STRONG_BUY";
  else if (roc > 5) rocSig = "BUY";
  else if (roc < -10) rocSig = "STRONG_SELL";
  else if (roc < -5) rocSig = "SELL";
  return { name: `ROC (${period})`, category: "momentum", value: +roc.toFixed(2), signal: rocSig, description: "Rate of Change: momentum as percentage price change" };
}

export function calcMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): IndicatorResult {
  if (closes.length < period + 1) return { name: `MFI (${period})`, category: "momentum", value: 50, signal: "NEUTRAL", description: "Money Flow Index" };
  let posFlow = 0, negFlow = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    const prevTP = (highs[i - 1] + lows[i - 1] + closes[i - 1]) / 3;
    const mf = tp * volumes[i];
    if (tp > prevTP) posFlow += mf; else negFlow += mf;
  }
  const mfi = negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow);
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (mfi < 20) sig = "STRONG_BUY";
  else if (mfi < 30) sig = "BUY";
  else if (mfi > 80) sig = "STRONG_SELL";
  else if (mfi > 70) sig = "SELL";
  return { name: `MFI (${period})`, category: "momentum", value: +mfi.toFixed(1), signal: sig, description: "Money Flow Index: volume-weighted RSI" };
}

export function calcCMO(prices: number[], period: number = 14): IndicatorResult {
  if (prices.length < period + 1) return { name: `CMO (${period})`, category: "momentum", value: 0, signal: "NEUTRAL", description: "Chande Momentum Oscillator" };
  let sumUp = 0, sumDown = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) sumUp += diff; else sumDown += Math.abs(diff);
  }
  const cmo = sumUp + sumDown === 0 ? 0 : ((sumUp - sumDown) / (sumUp + sumDown)) * 100;
  return { name: `CMO (${period})`, category: "momentum", value: +cmo.toFixed(1), signal: cmo > 50 ? "STRONG_BUY" : cmo > 20 ? "BUY" : cmo < -50 ? "STRONG_SELL" : cmo < -20 ? "SELL" : "NEUTRAL", description: "Chande Momentum Oscillator: unsmoothed momentum" };
}

export function calcUltimateOscillator(highs: number[], lows: number[], closes: number[]): IndicatorResult {
  const calcBP = (i: number) => closes[i] - Math.min(lows[i], closes[i - 1]);
  const calcTR = (i: number) => Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  let bp7 = 0, tr7 = 0, bp14 = 0, tr14 = 0, bp28 = 0, tr28 = 0;
  const len = closes.length;
  for (let i = Math.max(1, len - 28); i < len; i++) {
    const bp = calcBP(i); const tr = calcTR(i);
    bp28 += bp; tr28 += tr;
    if (i >= len - 14) { bp14 += bp; tr14 += tr; }
    if (i >= len - 7) { bp7 += bp; tr7 += tr; }
  }
  const avg7 = tr7 === 0 ? 0 : bp7 / tr7;
  const avg14 = tr14 === 0 ? 0 : bp14 / tr14;
  const avg28 = tr28 === 0 ? 0 : bp28 / tr28;
  const uo = ((4 * avg7 + 2 * avg14 + avg28) / 7) * 100;
  return { name: "Ultimate Oscillator", category: "momentum", value: +uo.toFixed(1), signal: uo > 70 ? "SELL" : uo < 30 ? "BUY" : "NEUTRAL", description: "Ultimate Oscillator: multi-timeframe momentum (7/14/28)" };
}

export function calcTSI(prices: number[], longPeriod: number = 25, shortPeriod: number = 13): IndicatorResult {
  if (prices.length < 2) return { name: "TSI", category: "momentum", value: 0, signal: "NEUTRAL", description: "True Strength Index" };
  const diffs: number[] = [];
  for (let i = 1; i < prices.length; i++) diffs.push(prices[i] - prices[i - 1]);
  const absDiffs = diffs.map(Math.abs);
  const smoothed1 = ema(emaArray(diffs, longPeriod), shortPeriod);
  const smoothed2 = ema(emaArray(absDiffs, longPeriod), shortPeriod);
  const tsi = smoothed2 === 0 ? 0 : (smoothed1 / smoothed2) * 100;
  return { name: "TSI (25,13)", category: "momentum", value: +tsi.toFixed(1), signal: tsi > 25 ? "BUY" : tsi < -25 ? "SELL" : "NEUTRAL", description: "True Strength Index: double-smoothed momentum" };
}

export function calcPPO(prices: number[]): IndicatorResult {
  const e12 = ema(prices, 12);
  const e26 = ema(prices, 26);
  const ppo = e26 === 0 ? 0 : ((e12 - e26) / e26) * 100;
  return { name: "PPO (12,26)", category: "momentum", value: +ppo.toFixed(3), signal: ppo > 1 ? "BUY" : ppo < -1 ? "SELL" : "NEUTRAL", description: "Percentage Price Oscillator: normalized MACD" };
}

export function calcAwesomeOscillator(highs: number[], lows: number[]): IndicatorResult {
  const medians: number[] = [];
  for (let i = 0; i < highs.length; i++) medians.push((highs[i] + lows[i]) / 2);
  const sma5 = sma(medians, 5);
  const sma34 = sma(medians, 34);
  const ao = sma5 - sma34;
  return { name: "Awesome Oscillator", category: "momentum", value: +ao.toFixed(2), signal: ao > 0 ? "BUY" : ao < 0 ? "SELL" : "NEUTRAL", description: "Awesome Oscillator: 5/34 SMA of median price difference" };
}

export function calcCoppockCurve(prices: number[]): IndicatorResult {
  if (prices.length < 15) return { name: "Coppock Curve", category: "momentum", value: 0, signal: "NEUTRAL", description: "Coppock Curve" };
  const rocSeries: number[] = [];
  for (let i = 14; i < prices.length; i++) {
    const r14 = ((prices[i] - prices[i - 14]) / prices[i - 14]) * 100;
    const r11 = i >= 11 ? ((prices[i] - prices[i - 11]) / prices[i - 11]) * 100 : r14;
    rocSeries.push(r14 + r11);
  }
  const val = rocSeries.length >= 10 ? wma(rocSeries, 10) : rocSeries[rocSeries.length - 1] || 0;
  return { name: "Coppock Curve", category: "momentum", value: +val.toFixed(2), signal: val > 0 ? "BUY" : "SELL", description: "Coppock Curve: long-term momentum for buy signals" };
}

export function calcKST(prices: number[]): IndicatorResult {
  if (prices.length < 30) return { name: "KST", category: "momentum", value: 0, signal: "NEUTRAL", description: "Know Sure Thing" };
  const roc10 = ((prices[prices.length - 1] - prices[prices.length - 11]) / prices[prices.length - 11]) * 100;
  const roc15 = prices.length >= 16 ? ((prices[prices.length - 1] - prices[prices.length - 16]) / prices[prices.length - 16]) * 100 : roc10;
  const roc20 = prices.length >= 21 ? ((prices[prices.length - 1] - prices[prices.length - 21]) / prices[prices.length - 21]) * 100 : roc10;
  const roc30 = prices.length >= 31 ? ((prices[prices.length - 1] - prices[prices.length - 31]) / prices[prices.length - 31]) * 100 : roc10;
  const kst = roc10 * 1 + roc15 * 2 + roc20 * 3 + roc30 * 4;
  return { name: "KST", category: "momentum", value: +kst.toFixed(2), signal: kst > 0 ? "BUY" : "SELL", description: "Know Sure Thing: weighted sum of 4 ROC periods" };
}

export function calcStochRSI(prices: number[], period: number = 14): IndicatorResult {
  const rsiValues: number[] = [];
  for (let i = period + 1; i <= prices.length; i++) {
    const slice = prices.slice(i - period - 1, i);
    let g = 0, l = 0;
    for (let j = 1; j < slice.length; j++) {
      const d = slice[j] - slice[j - 1];
      if (d > 0) g += d; else l += Math.abs(d);
    }
    const ag = g / period, al = l / period;
    rsiValues.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  }
  if (rsiValues.length < period) return { name: "Stoch RSI", category: "momentum", value: 50, signal: "NEUTRAL", description: "Stochastic RSI" };
  const slice = rsiValues.slice(-period);
  const max = Math.max(...slice), min = Math.min(...slice);
  const stochRSI = max === min ? 50 : ((rsiValues[rsiValues.length - 1] - min) / (max - min)) * 100;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (stochRSI < 20) sig = "STRONG_BUY";
  else if (stochRSI < 30) sig = "BUY";
  else if (stochRSI > 80) sig = "STRONG_SELL";
  else if (stochRSI > 70) sig = "SELL";
  return { name: `Stoch RSI (${period})`, category: "momentum", value: +stochRSI.toFixed(1), signal: sig, description: "Stochastic RSI: RSI of RSI, ultra-sensitive" };
}

// ─── VOLATILITY INDICATORS ────────────────────────────

function calcATRRaw(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  let sum = 0;
  const start = Math.max(1, highs.length - period);
  for (let i = start; i < highs.length; i++) {
    sum += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }
  return sum / Math.min(period, highs.length - 1);
}

export function calcBollinger(prices: number[], period: number = 20): IndicatorResult {
  const mean = sma(prices, period);
  const sd = stdDev(prices, period);
  const upper = mean + 2 * sd;
  const lower = mean - 2 * sd;
  const price = prices[prices.length - 1];
  const pctB = upper === lower ? 50 : ((price - lower) / (upper - lower)) * 100;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (pctB < 10) sig = "STRONG_BUY";
  else if (pctB < 25) sig = "BUY";
  else if (pctB > 90) sig = "STRONG_SELL";
  else if (pctB > 75) sig = "SELL";
  return { name: `Bollinger Bands (${period})`, category: "volatility", value: `${lower.toFixed(0)} to ${upper.toFixed(0)}`, signal: sig, description: `Bollinger Bands: %B position ${Math.abs(pctB).toFixed(0)}% within bands` };
}

export function calcATR(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorResult {
  const val = calcATRRaw(highs, lows, closes, period);
  const price = closes[closes.length - 1];
  const pctATR = (val / price) * 100;
  return { name: `ATR (${period})`, category: "volatility", value: +val.toFixed(2), signal: pctATR > 5 ? "SELL" : pctATR > 3 ? "NEUTRAL" : "BUY", description: `Average True Range: ${pctATR.toFixed(1)}% of price` };
}

export function calcKeltner(prices: number[], highs: number[], lows: number[], closes: number[], period: number = 20): IndicatorResult {
  const mid = ema(prices, period);
  const atrVal = calcATRRaw(highs, lows, closes, 10);
  const upper = mid + 2 * atrVal;
  const lower = mid - 2 * atrVal;
  const price = prices[prices.length - 1];
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (price < lower) sig = "STRONG_BUY";
  else if (price < mid) sig = "BUY";
  else if (price > upper) sig = "STRONG_SELL";
  else if (price > mid + atrVal) sig = "SELL";
  return { name: `Keltner Channel (${period})`, category: "volatility", value: `${lower.toFixed(0)} to ${upper.toFixed(0)}`, signal: sig, description: "Keltner Channels: EMA ± 2×ATR" };
}

export function calcDonchian(highs: number[], lows: number[], period: number = 20): IndicatorResult {
  const hh = Math.max(...highs.slice(-period));
  const ll = Math.min(...lows.slice(-period));
  const mid = (hh + ll) / 2;
  const price = highs[highs.length - 1];
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (price >= hh * 0.98) sig = "STRONG_BUY";
  else if (price > mid) sig = "BUY";
  else if (price <= ll * 1.02) sig = "STRONG_SELL";
  else if (price < mid) sig = "SELL";
  return { name: `Donchian Channel (${period})`, category: "volatility", value: `${ll.toFixed(0)} to ${hh.toFixed(0)}`, signal: sig, description: "Donchian Channels: breakout trading system" };
}

export function calcStdDev(prices: number[], period: number = 20): IndicatorResult {
  const val = stdDev(prices, period);
  const price = prices[prices.length - 1];
  const pct = (val / price) * 100;
  return { name: `Std Dev (${period})`, category: "volatility", value: +val.toFixed(2), signal: pct > 5 ? "SELL" : "NEUTRAL", description: `Standard Deviation: ${pct.toFixed(1)}% of price` };
}

export function calcHistoricalVolatility(prices: number[], period: number = 20): IndicatorResult {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  const sd = stdDev(returns, period);
  const annualized = sd * Math.sqrt(252) * 100;
  return { name: `HV (${period})`, category: "volatility", value: +annualized.toFixed(1), signal: annualized > 50 ? "SELL" : annualized < 20 ? "BUY" : "NEUTRAL", description: `Historical Volatility: ${annualized.toFixed(1)}% annualized` };
}

export function calcChaikinVolatility(highs: number[], lows: number[], period: number = 10): IndicatorResult {
  const ranges: number[] = [];
  for (let i = 0; i < highs.length; i++) ranges.push(highs[i] - lows[i]);
  const emaRanges = emaArray(ranges, period);
  if (emaRanges.length < period + 1) return { name: `Chaikin Vol (${period})`, category: "volatility", value: 0, signal: "NEUTRAL", description: "Chaikin Volatility" };
  const curr = emaRanges[emaRanges.length - 1];
  const prev = emaRanges[emaRanges.length - 1 - period];
  const val = prev === 0 ? 0 : ((curr - prev) / prev) * 100;
  return { name: `Chaikin Vol (${period})`, category: "volatility", value: +val.toFixed(1), signal: val > 25 ? "SELL" : val < -25 ? "BUY" : "NEUTRAL", description: "Chaikin Volatility: rate of change of ATR" };
}

export function calcUlcerIndex(prices: number[], period: number = 14): IndicatorResult {
  const slice = prices.slice(-period);
  let sumSq = 0;
  const maxPrice = Math.max(...slice);
  for (const p of slice) {
    const pctDrawdown = ((p - maxPrice) / maxPrice) * 100;
    sumSq += pctDrawdown * pctDrawdown;
  }
  const ui = Math.sqrt(sumSq / period);
  return { name: `Ulcer Index (${period})`, category: "volatility", value: +ui.toFixed(2), signal: ui > 10 ? "SELL" : ui > 5 ? "NEUTRAL" : "BUY", description: "Ulcer Index: measures downside risk/drawdown" };
}

// ─── VOLUME INDICATORS ────────────────────────────────

export function calcOBV(closes: number[], volumes: number[]): IndicatorResult {
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
  }
  const obvM = obv / 1e6;
  const recentTrend = closes.length >= 5 ? closes[closes.length - 1] > closes[closes.length - 5] : false;
  return { name: "OBV", category: "volume", value: `${obvM > 0 ? "+" : ""}${Math.abs(obvM).toFixed(1)}M`, signal: obv > 0 && recentTrend ? "BUY" : obv < 0 ? "SELL" : "NEUTRAL", description: "On-Balance Volume: cumulative volume flow" };
}

export function calcADLine(highs: number[], lows: number[], closes: number[], volumes: number[]): IndicatorResult {
  let ad = 0;
  for (let i = 0; i < closes.length; i++) {
    const mfm = highs[i] === lows[i] ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
    ad += mfm * volumes[i];
  }
  const adM = ad / 1e6;
  return { name: "A/D Line", category: "volume", value: `${adM > 0 ? "+" : ""}${Math.abs(adM).toFixed(1)}M`, signal: ad > 0 ? "BUY" : ad < 0 ? "SELL" : "NEUTRAL", description: "Accumulation/Distribution Line: buying vs selling pressure" };
}

export function calcCMF(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 20): IndicatorResult {
  let mfv = 0, vol = 0;
  const start = Math.max(0, closes.length - period);
  for (let i = start; i < closes.length; i++) {
    const mfm = highs[i] === lows[i] ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
    mfv += mfm * volumes[i];
    vol += volumes[i];
  }
  const cmf = vol === 0 ? 0 : mfv / vol;
  return { name: `CMF (${period})`, category: "volume", value: +cmf.toFixed(3), signal: cmf > 0.1 ? "STRONG_BUY" : cmf > 0.05 ? "BUY" : cmf < -0.1 ? "STRONG_SELL" : cmf < -0.05 ? "SELL" : "NEUTRAL", description: "Chaikin Money Flow: volume-weighted buying/selling" };
}

export function calcForceIndex(closes: number[], volumes: number[], period: number = 13): IndicatorResult {
  const forces: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    forces.push((closes[i] - closes[i - 1]) * volumes[i]);
  }
  const val = ema(forces, period);
  const norm = val / 1e6;
  return { name: `Force Index (${period})`, category: "volume", value: `${norm > 0 ? "+" : ""}${Math.abs(norm).toFixed(1)}M`, signal: val > 0 ? "BUY" : "SELL", description: "Force Index: price change × volume" };
}

export function calcEMV(highs: number[], lows: number[], volumes: number[], period: number = 14): IndicatorResult {
  const emvValues: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const dm = ((highs[i] + lows[i]) / 2) - ((highs[i - 1] + lows[i - 1]) / 2);
    const br = volumes[i] === 0 ? 0 : (volumes[i] / 1e6) / (highs[i] - lows[i] || 1);
    emvValues.push(br === 0 ? 0 : dm / br);
  }
  const val = sma(emvValues, period);
  return { name: `EMV (${period})`, category: "volume", value: +val.toFixed(2), signal: val > 0 ? "BUY" : val < 0 ? "SELL" : "NEUTRAL", description: "Ease of Movement: relates price change to volume" };
}

export function calcVolumeRSI(volumes: number[], period: number = 14): IndicatorResult {
  if (volumes.length < period + 1) return { name: `Vol RSI (${period})`, category: "volume", value: 50, signal: "NEUTRAL", description: "Volume RSI" };
  let gains = 0, losses = 0;
  for (let i = volumes.length - period; i < volumes.length; i++) {
    const diff = volumes[i] - volumes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  const ag = gains / period, al = losses / period;
  const val = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  return { name: `Volume RSI (${period})`, category: "volume", value: +val.toFixed(1), signal: val > 70 ? "BUY" : val < 30 ? "SELL" : "NEUTRAL", description: "Volume RSI: RSI applied to volume data" };
}

export function calcPivotPoints(high: number, low: number, close: number): IndicatorResult {
  const pp = (high + low + close) / 3;
  const r1 = 2 * pp - low;
  const s1 = 2 * pp - high;
  const price = close;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (price > r1) sig = "STRONG_BUY";
  else if (price > pp) sig = "BUY";
  else if (price < s1) sig = "STRONG_SELL";
  else if (price < pp) sig = "SELL";
  return { name: "Pivot Points", category: "volume", value: `P:${pp.toFixed(0)} R1:${r1.toFixed(0)} S1:${s1.toFixed(0)}`, signal: sig, description: "Pivot Points: support/resistance levels" };
}

export function calcFibonacci(high: number, low: number, close: number): IndicatorResult {
  const diff = high - low;
  const fib236 = high - diff * 0.236;
  const fib382 = high - diff * 0.382;
  const fib500 = high - diff * 0.5;
  const fib618 = high - diff * 0.618;
  let sig: IndicatorResult["signal"] = "NEUTRAL";
  if (close > fib236) sig = "STRONG_BUY";
  else if (close > fib382) sig = "BUY";
  else if (close < fib618) sig = "STRONG_SELL";
  else if (close < fib500) sig = "SELL";
  return { name: "Fibonacci Retracement", category: "volume", value: `23.6%:${fib236.toFixed(0)} 61.8%:${fib618.toFixed(0)}`, signal: sig, description: "Fibonacci levels: key support/resistance zones" };
}

// ─── MAIN ANALYSIS FUNCTION ───────────────────────────

export interface StockData {
  prices: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}

export function generateMockOHLCV(basePrice: number, days: number = 60): StockData {
  const prices: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  let price = basePrice * 0.9;
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.48) * basePrice * 0.03;
    price = Math.max(price + change, basePrice * 0.5);
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const close = low + Math.random() * (high - low);
    const vol = Math.floor(1e6 + Math.random() * 5e6);
    prices.push(close);
    highs.push(high);
    lows.push(low);
    closes.push(close);
    volumes.push(vol);
  }
  return { prices, highs, lows, closes, volumes };
}

export function runAllIndicators(data: StockData): IndicatorResult[] {
  const { prices, highs, lows, closes, volumes } = data;
  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  const lastClose = closes[closes.length - 1];

  return [
    calcSMA(prices, 10), calcSMA(prices, 20), calcSMA(prices, 50), calcSMA(prices, 200),
    calcEMA(prices, 9), calcEMA(prices, 21), calcEMA(prices, 50),
    calcWMA(prices, 14), calcDEMA(prices, 21), calcTEMA(prices, 21),
    calcHMA(prices, 16), calcKAMA(prices, 10), calcVWAP(prices, volumes),
    calcIchimoku(highs, lows, closes), calcParabolicSAR(highs, lows),
    calcSupertrend(highs, lows, closes), calcADX(highs, lows, closes),
    calcAroon(highs, lows), calcTRIX(prices), calcDPO(prices),
    calcMassIndex(highs, lows), calcVortex(highs, lows, closes),
    calcRSI(prices, 14), calcRSI(prices, 7),
    calcMACD(prices), calcStochastic(highs, lows, closes),
    calcWilliamsR(highs, lows, closes), calcCCI(highs, lows, closes),
    calcROC(prices), calcMFI(highs, lows, closes, volumes),
    calcCMO(prices), calcUltimateOscillator(highs, lows, closes),
    calcTSI(prices), calcPPO(prices), calcAwesomeOscillator(highs, lows),
    calcCoppockCurve(prices), calcKST(prices), calcStochRSI(prices),
    calcBollinger(prices), calcATR(highs, lows, closes),
    calcKeltner(prices, highs, lows, closes), calcDonchian(highs, lows),
    calcStdDev(prices), calcHistoricalVolatility(prices),
    calcChaikinVolatility(highs, lows), calcUlcerIndex(prices),
    calcOBV(closes, volumes), calcADLine(highs, lows, closes, volumes),
    calcCMF(highs, lows, closes, volumes), calcForceIndex(closes, volumes),
    calcEMV(highs, lows, volumes), calcVolumeRSI(volumes),
    calcPivotPoints(lastHigh, lastLow, lastClose),
    calcFibonacci(Math.max(...highs.slice(-52)), Math.min(...lows.slice(-52)), lastClose),
  ];
}

export function getOverallSignal(results: IndicatorResult[]): { signal: IndicatorResult["signal"]; buyCount: number; sellCount: number; neutralCount: number; confidence: number } {
  let buyCount = 0, sellCount = 0, neutralCount = 0;
  for (const r of results) {
    if (r.signal === "STRONG_BUY" || r.signal === "BUY") buyCount++;
    else if (r.signal === "STRONG_SELL" || r.signal === "SELL") sellCount++;
    else neutralCount++;
  }
  const total = results.length;
  const confidence = Math.max(buyCount, sellCount) / total * 100;
  let signal: IndicatorResult["signal"] = "NEUTRAL";
  if (buyCount > sellCount + neutralCount) signal = "STRONG_BUY";
  else if (buyCount > sellCount) signal = "BUY";
  else if (sellCount > buyCount + neutralCount) signal = "STRONG_SELL";
  else if (sellCount > buyCount) signal = "SELL";
  return { signal, buyCount, sellCount, neutralCount, confidence: +confidence.toFixed(0) };
}
