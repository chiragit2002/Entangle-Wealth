import type { StockData } from "./indicators";

export interface IndicatorSeries {
  name: string;
  type: "overlay" | "subpane";
  lines: { label: string; data: (number | null)[]; color: string; width?: number; style?: "solid" | "dashed" | "dotted" }[];
  fills?: { upper: (number | null)[]; lower: (number | null)[]; color: string }[];
  markers?: { index: number; value: number; shape: "up" | "down" | "circle"; color: string; label: string }[];
  histograms?: { label: string; data: (number | null)[]; colors: (string | null)[] }[];
  zones?: { value: number; color: string; style: "dashed" | "solid" }[];
  yRange?: { min: number; max: number };
}

function smaArr(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

function emaArr(data: number[], period: number): (number | null)[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let val = data[0];
  result.push(val);
  for (let i = 1; i < data.length; i++) {
    val = data[i] * k + val * (1 - k);
    result.push(i < period - 1 ? null : val);
  }
  return result;
}

function emaArrFull(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function wmaArr(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - period + 1 + j] * (j + 1);
    }
    result.push(sum / denom);
  }
  return result;
}

function smmaArr(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[j];
      result.push(sum / period);
    } else {
      const prev = result[i - 1] as number;
      result.push((prev * (period - 1) + data[i]) / period);
    }
  }
  return result;
}

function stdDevArr(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    const mean = sum / period;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (data[j] - mean) ** 2;
    result.push(Math.sqrt(sq / period));
  }
  return result;
}

function trueRange(highs: number[], lows: number[], closes: number[]): number[] {
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < highs.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  return tr;
}

function atrArr(highs: number[], lows: number[], closes: number[], period: number): (number | null)[] {
  const tr = trueRange(highs, lows, closes);
  return smmaArr(tr, period);
}

export function calcSMASeries(prices: number[], period: number, color: string = "#2196F3"): IndicatorSeries {
  return {
    name: `SMA (${period})`,
    type: "overlay",
    lines: [{ label: `SMA ${period}`, data: smaArr(prices, period), color, width: 1.5 }],
  };
}

export function calcEMASeries(prices: number[], period: number, color: string = "#FF9800"): IndicatorSeries {
  return {
    name: `EMA (${period})`,
    type: "overlay",
    lines: [{ label: `EMA ${period}`, data: emaArr(prices, period), color, width: 1.5 }],
  };
}

export function calcWMASeries(prices: number[], period: number, color: string = "#9C27B0"): IndicatorSeries {
  return {
    name: `WMA (${period})`,
    type: "overlay",
    lines: [{ label: `WMA ${period}`, data: wmaArr(prices, period), color, width: 1.5 }],
  };
}

export function calcDEMASeries(prices: number[], period: number, color: string = "#00BCD4"): IndicatorSeries {
  const e1 = emaArrFull(prices, period);
  const e2 = emaArrFull(e1, period);
  const data: (number | null)[] = prices.map((_, i) =>
    i < period * 2 - 2 ? null : 2 * e1[i] - e2[i]
  );
  return { name: `DEMA (${period})`, type: "overlay", lines: [{ label: `DEMA ${period}`, data, color, width: 1.5 }] };
}

export function calcTEMASeries(prices: number[], period: number, color: string = "#FFEB3B"): IndicatorSeries {
  const e1 = emaArrFull(prices, period);
  const e2 = emaArrFull(e1, period);
  const e3 = emaArrFull(e2, period);
  const data: (number | null)[] = prices.map((_, i) =>
    i < period * 3 - 3 ? null : 3 * e1[i] - 3 * e2[i] + e3[i]
  );
  return { name: `TEMA (${period})`, type: "overlay", lines: [{ label: `TEMA ${period}`, data, color, width: 1.5 }] };
}

export function calcHMASeries(prices: number[], period: number, color: string = "#E91E63"): IndicatorSeries {
  const half = Math.floor(period / 2);
  const sqrtP = Math.floor(Math.sqrt(period));
  const wmaHalf = wmaArr(prices, half);
  const wmaFull = wmaArr(prices, period);
  const diff: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    const h = wmaHalf[i], f = wmaFull[i];
    diff.push(h != null && f != null ? 2 * h - f : prices[i]);
  }
  const hma = wmaArr(diff, sqrtP);
  return { name: `HMA (${period})`, type: "overlay", lines: [{ label: `HMA ${period}`, data: hma, color, width: 1.5 }] };
}

export function calcVWMASeries(prices: number[], volumes: number[], period: number, color: string = "#4CAF50"): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { data.push(null); continue; }
    let pv = 0, v = 0;
    for (let j = i - period + 1; j <= i; j++) {
      pv += prices[j] * volumes[j];
      v += volumes[j];
    }
    data.push(v === 0 ? prices[i] : pv / v);
  }
  return { name: `VWMA (${period})`, type: "overlay", lines: [{ label: `VWMA ${period}`, data, color, width: 1.5 }] };
}

export function calcSMMASeries(prices: number[], period: number, color: string = "#787B86"): IndicatorSeries {
  return { name: `SMMA (${period})`, type: "overlay", lines: [{ label: `SMMA ${period}`, data: smmaArr(prices, period), color, width: 1.5 }] };
}

export function calcLSMASeries(prices: number[], period: number, color: string = "#00E676"): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { data.push(null); continue; }
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < period; j++) {
      const x = j + 1;
      const y = prices[i - period + 1 + j];
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    }
    const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / period;
    data.push(intercept + slope * period);
  }
  return { name: `LSMA (${period})`, type: "overlay", lines: [{ label: `LSMA ${period}`, data, color, width: 1.5 }] };
}

export function calcALMASeries(prices: number[], period: number = 20, offset: number = 0.85, sigma: number = 6, color: string = "#FF6D00"): IndicatorSeries {
  const data: (number | null)[] = [];
  const m = offset * (period - 1);
  const s = period / sigma;
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { data.push(null); continue; }
    let wSum = 0, sum = 0;
    for (let j = 0; j < period; j++) {
      const w = Math.exp(-((j - m) ** 2) / (2 * s * s));
      sum += prices[i - period + 1 + j] * w;
      wSum += w;
    }
    data.push(wSum === 0 ? prices[i] : sum / wSum);
  }
  return { name: `ALMA (${period})`, type: "overlay", lines: [{ label: `ALMA ${period}`, data, color, width: 1.5 }] };
}

export function calcMcGinleySeries(prices: number[], period: number = 14, color: string = "#2962FF"): IndicatorSeries {
  const data: (number | null)[] = [];
  let md = prices[0];
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      md = prices[0];
    } else {
      const ratio = md === 0 ? 1 : prices[i] / md;
      md = md + (prices[i] - md) / (period * Math.pow(ratio, 4));
    }
    data.push(i < period - 1 ? null : md);
  }
  return { name: `McGinley (${period})`, type: "overlay", lines: [{ label: `McGinley ${period}`, data, color, width: 1.5 }] };
}

export function calcBollingerSeries(prices: number[], period: number = 20, mult: number = 2): IndicatorSeries {
  const mid = smaArr(prices, period);
  const sd = stdDevArr(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (mid[i] == null || sd[i] == null) { upper.push(null); lower.push(null); continue; }
    upper.push(mid[i]! + mult * sd[i]!);
    lower.push(mid[i]! - mult * sd[i]!);
  }
  return {
    name: `Bollinger Bands (${period})`,
    type: "overlay",
    lines: [
      { label: "BB Upper", data: upper, color: "#2196F3", width: 1, style: "dashed" },
      { label: "BB Mid", data: mid, color: "#2196F3", width: 1 },
      { label: "BB Lower", data: lower, color: "#2196F3", width: 1, style: "dashed" },
    ],
    fills: [{ upper, lower, color: "rgba(33,150,243,0.08)" }],
  };
}

export function calcKeltnerSeries(prices: number[], highs: number[], lows: number[], closes: number[], period: number = 20): IndicatorSeries {
  const mid = emaArr(prices, period);
  const atr = atrArr(highs, lows, closes, 10);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (mid[i] == null || atr[i] == null) { upper.push(null); lower.push(null); continue; }
    upper.push(mid[i]! + 2 * atr[i]!);
    lower.push(mid[i]! - 2 * atr[i]!);
  }
  return {
    name: `Keltner Channel (${period})`,
    type: "overlay",
    lines: [
      { label: "KC Upper", data: upper, color: "#9C27B0", width: 1, style: "dashed" },
      { label: "KC Mid", data: mid, color: "#9C27B0", width: 1 },
      { label: "KC Lower", data: lower, color: "#9C27B0", width: 1, style: "dashed" },
    ],
  };
}

export function calcDonchianSeries(highs: number[], lows: number[], period: number = 20): IndicatorSeries {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const mid: (number | null)[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); mid.push(null); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (highs[j] > hh) hh = highs[j];
      if (lows[j] < ll) ll = lows[j];
    }
    upper.push(hh);
    lower.push(ll);
    mid.push((hh + ll) / 2);
  }
  return {
    name: `Donchian (${period})`,
    type: "overlay",
    lines: [
      { label: "DC Upper", data: upper, color: "#00BCD4", width: 1 },
      { label: "DC Mid", data: mid, color: "#00BCD4", width: 1, style: "dashed" },
      { label: "DC Lower", data: lower, color: "#00BCD4", width: 1 },
    ],
  };
}

export function calcIchimokuSeries(highs: number[], lows: number[], closes: number[]): IndicatorSeries {
  const tenkan: (number | null)[] = [];
  const kijun: (number | null)[] = [];
  const spanA: (number | null)[] = [];
  const spanB: (number | null)[] = [];
  const chikou: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i >= 8) {
      let hh = -Infinity, ll = Infinity;
      for (let j = i - 8; j <= i; j++) { hh = Math.max(hh, highs[j]); ll = Math.min(ll, lows[j]); }
      tenkan.push((hh + ll) / 2);
    } else tenkan.push(null);

    if (i >= 25) {
      let hh = -Infinity, ll = Infinity;
      for (let j = i - 25; j <= i; j++) { hh = Math.max(hh, highs[j]); ll = Math.min(ll, lows[j]); }
      kijun.push((hh + ll) / 2);
    } else kijun.push(null);
  }

  for (let i = 0; i < closes.length; i++) {
    if (tenkan[i] != null && kijun[i] != null) {
      spanA.push((tenkan[i]! + kijun[i]!) / 2);
    } else spanA.push(null);

    if (i >= 51) {
      let hh = -Infinity, ll = Infinity;
      for (let j = i - 51; j <= i; j++) { hh = Math.max(hh, highs[j]); ll = Math.min(ll, lows[j]); }
      spanB.push((hh + ll) / 2);
    } else spanB.push(null);

    chikou.push(i >= 26 ? closes[i - 26] : null);
  }

  return {
    name: "Ichimoku Cloud",
    type: "overlay",
    lines: [
      { label: "Tenkan", data: tenkan, color: "#2196F3", width: 1 },
      { label: "Kijun", data: kijun, color: "#F44336", width: 1 },
      { label: "Span A", data: spanA, color: "#4CAF50", width: 1 },
      { label: "Span B", data: spanB, color: "#FF5722", width: 1 },
      { label: "Chikou", data: chikou, color: "#9C27B0", width: 1, style: "dashed" },
    ],
    fills: [{ upper: spanA, lower: spanB, color: "rgba(76,175,80,0.06)" }],
  };
}

export function calcParabolicSARSeries(highs: number[], lows: number[], step: number = 0.02, max: number = 0.2): IndicatorSeries {
  const data: (number | null)[] = [null];
  let af = step;
  let uptrend = true;
  let sar = lows[0];
  let ep = highs[0];
  const markers: IndicatorSeries["markers"] = [];

  for (let i = 1; i < highs.length; i++) {
    sar = sar + af * (ep - sar);
    let prevUp: boolean = uptrend;
    if (uptrend) {
      if (lows[i] < sar) { uptrend = false; sar = ep; ep = lows[i]; af = step; }
      else { if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + step, max); } }
    } else {
      if (highs[i] > sar) { uptrend = true; sar = ep; ep = highs[i]; af = step; }
      else { if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + step, max); } }
    }
    data.push(sar);
    if (prevUp !== uptrend) {
      markers.push({
        index: i, value: sar,
        shape: uptrend ? "up" : "down",
        color: uptrend ? "#26A69A" : "#EF5350",
        label: uptrend ? "BUY" : "SELL",
      });
    }
  }
  return {
    name: "Parabolic SAR",
    type: "overlay",
    lines: [{ label: "SAR", data, color: "#FFEB3B", width: 0, style: "dotted" }],
    markers,
  };
}

export function calcSupertrendSeries(highs: number[], lows: number[], closes: number[], period: number = 10, multiplier: number = 3): IndicatorSeries {
  const atr = atrArr(highs, lows, closes, period);
  const data: (number | null)[] = [];
  const colors: string[] = [];
  let upperBand = 0, lowerBand = 0;
  let prevUpperBand = 0, prevLowerBand = 0;
  let up = true;

  for (let i = 0; i < closes.length; i++) {
    if (atr[i] == null) { data.push(null); colors.push("#787B86"); continue; }
    const hl2 = (highs[i] + lows[i]) / 2;
    const basicUpper = hl2 + multiplier * atr[i]!;
    const basicLower = hl2 - multiplier * atr[i]!;

    const prevClose = i > 0 ? closes[i - 1] : closes[0];
    upperBand = basicUpper < prevUpperBand || prevClose > prevUpperBand ? basicUpper : prevUpperBand;
    lowerBand = basicLower > prevLowerBand || prevClose < prevLowerBand ? basicLower : prevLowerBand;

    if (closes[i] > upperBand) up = true;
    else if (closes[i] < lowerBand) up = false;

    data.push(up ? lowerBand : upperBand);
    colors.push(up ? "#26A69A" : "#EF5350");
    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
  }
  return { name: "Supertrend", type: "overlay", lines: [{ label: "Supertrend", data, color: colors[colors.length - 1] || "#26A69A", width: 2 }] };
}

export function calcVWAPSeries(closes: number[], highs: number[], lows: number[], volumes: number[]): IndicatorSeries {
  const data: (number | null)[] = [];
  let cumPV = 0, cumV = 0;
  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumPV += tp * volumes[i];
    cumV += volumes[i];
    data.push(cumV === 0 ? closes[i] : cumPV / cumV);
  }
  return { name: "VWAP", type: "overlay", lines: [{ label: "VWAP", data, color: "#AA00FF", width: 2 }] };
}

export function calcAlligatorSeries(closes: number[]): IndicatorSeries {
  const jaw = smmaArr(closes, 13);
  const teeth = smmaArr(closes, 8);
  const lips = smmaArr(closes, 5);
  const shiftedJaw: (number | null)[] = new Array(8).fill(null).concat(jaw.slice(0, -8));
  const shiftedTeeth: (number | null)[] = new Array(5).fill(null).concat(teeth.slice(0, -5));
  const shiftedLips: (number | null)[] = new Array(3).fill(null).concat(lips.slice(0, -3));
  return {
    name: "Alligator",
    type: "overlay",
    lines: [
      { label: "Jaw (13,8)", data: shiftedJaw, color: "#2196F3", width: 1.5 },
      { label: "Teeth (8,5)", data: shiftedTeeth, color: "#F44336", width: 1.5 },
      { label: "Lips (5,3)", data: shiftedLips, color: "#4CAF50", width: 1.5 },
    ],
  };
}

export function calcRSISeries(prices: number[], period: number = 14): IndicatorSeries {
  const data: (number | null)[] = [null];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (i <= period) {
      if (diff > 0) avgGain += diff; else avgLoss += Math.abs(diff);
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        data.push(100 - 100 / (1 + rs));
      } else {
        data.push(null);
      }
    } else {
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      data.push(100 - 100 / (1 + rs));
    }
  }
  return {
    name: `RSI (${period})`,
    type: "subpane",
    lines: [{ label: `RSI ${period}`, data, color: "#9C27B0", width: 1.5 }],
    zones: [
      { value: 70, color: "#EF5350", style: "dashed" },
      { value: 50, color: "#787B86", style: "dashed" },
      { value: 30, color: "#26A69A", style: "dashed" },
    ],
    yRange: { min: 0, max: 100 },
  };
}

export function calcMACDSeries(prices: number[]): IndicatorSeries {
  const ema12 = emaArrFull(prices, 12);
  const ema26 = emaArrFull(prices, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = emaArrFull(macdLine, 9);
  const histogram: (number | null)[] = [];
  const histColors: (string | null)[] = [];
  const macdData: (number | null)[] = [];
  const sigData: (number | null)[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < 33) {
      macdData.push(null);
      sigData.push(null);
      histogram.push(null);
      histColors.push(null);
    } else {
      macdData.push(macdLine[i]);
      sigData.push(signalLine[i]);
      const h = macdLine[i] - signalLine[i];
      histogram.push(h);
      const prevH = i > 0 ? (macdLine[i - 1] - signalLine[i - 1]) : 0;
      if (h >= 0) {
        histColors.push(h > prevH ? "#26A69A" : "#1a7a70");
      } else {
        histColors.push(h < prevH ? "#EF5350" : "#b33e3e");
      }
    }
  }
  return {
    name: "MACD (12,26,9)",
    type: "subpane",
    lines: [
      { label: "MACD", data: macdData, color: "#2196F3", width: 1.5 },
      { label: "Signal", data: sigData, color: "#FF9800", width: 1.5 },
    ],
    histograms: [{ label: "Histogram", data: histogram, colors: histColors }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export function calcStochasticSeries(highs: number[], lows: number[], closes: number[], period: number = 14, smoothK: number = 3, smoothD: number = 3): IndicatorSeries {
  const rawK: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { rawK.push(50); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, highs[j]);
      ll = Math.min(ll, lows[j]);
    }
    rawK.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
  }
  const kData = smaArr(rawK, smoothK);
  const dValues = kData.filter(v => v != null) as number[];
  const dSmoothed = smaArr(dValues, smoothD);
  const dData: (number | null)[] = [];
  let di = 0;
  for (let i = 0; i < closes.length; i++) {
    if (kData[i] == null) { dData.push(null); continue; }
    dData.push(di < dSmoothed.length ? dSmoothed[di] : null);
    di++;
  }
  return {
    name: `Stochastic (${period},${smoothK},${smoothD})`,
    type: "subpane",
    lines: [
      { label: "%K", data: kData, color: "#2196F3", width: 1.5 },
      { label: "%D", data: dData, color: "#FF9800", width: 1.5 },
    ],
    zones: [
      { value: 80, color: "#EF5350", style: "dashed" },
      { value: 20, color: "#26A69A", style: "dashed" },
    ],
    yRange: { min: 0, max: 100 },
  };
}

export function calcADXSeries(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorSeries {
  const diPlus: (number | null)[] = [];
  const diMinus: (number | null)[] = [];
  const adx: (number | null)[] = [];

  const dmPlusArr: number[] = [0];
  const dmMinusArr: number[] = [0];
  const trArr: number[] = [highs[0] - lows[0]];

  for (let i = 1; i < closes.length; i++) {
    const up = highs[i] - highs[i - 1];
    const down = lows[i - 1] - lows[i];
    dmPlusArr.push(up > down && up > 0 ? up : 0);
    dmMinusArr.push(down > up && down > 0 ? down : 0);
    trArr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }

  const smoothTR = smmaArr(trArr, period);
  const smoothDMPlus = smmaArr(dmPlusArr, period);
  const smoothDMMinus = smmaArr(dmMinusArr, period);

  const dxValues: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (smoothTR[i] == null || smoothTR[i] === 0) {
      diPlus.push(null);
      diMinus.push(null);
      dxValues.push(null);
      continue;
    }
    const dp = (smoothDMPlus[i]! / smoothTR[i]!) * 100;
    const dm = (smoothDMMinus[i]! / smoothTR[i]!) * 100;
    diPlus.push(dp);
    diMinus.push(dm);
    const sum = dp + dm;
    dxValues.push(sum === 0 ? 0 : Math.abs(dp - dm) / sum * 100);
  }

  let adxSum = 0;
  let adxCount = 0;
  let adxVal: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (dxValues[i] == null) {
      adx.push(null);
      continue;
    }
    adxCount++;
    if (adxCount <= period) {
      adxSum += dxValues[i]!;
      adx.push(adxCount === period ? adxSum / period : null);
      if (adxCount === period) adxVal = adxSum / period;
    } else {
      adxVal = (adxVal! * (period - 1) + dxValues[i]!) / period;
      adx.push(adxVal);
    }
  }

  return {
    name: `ADX (${period})`,
    type: "subpane",
    lines: [
      { label: "ADX", data: adx, color: "#FFFFFF", width: 2 },
      { label: "+DI", data: diPlus, color: "#26A69A", width: 1 },
      { label: "-DI", data: diMinus, color: "#EF5350", width: 1 },
    ],
    zones: [{ value: 25, color: "#787B86", style: "dashed" }],
    yRange: { min: 0, max: 100 },
  };
}

export function calcCCISeries(highs: number[], lows: number[], closes: number[], period: number = 20): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { data.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += (highs[j] + lows[j] + closes[j]) / 3;
    const mean = sum / period;
    let md = 0;
    for (let j = i - period + 1; j <= i; j++) md += Math.abs((highs[j] + lows[j] + closes[j]) / 3 - mean);
    md /= period;
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    data.push(md === 0 ? 0 : (tp - mean) / (0.015 * md));
  }
  return {
    name: `CCI (${period})`,
    type: "subpane",
    lines: [{ label: `CCI ${period}`, data, color: "#00BCD4", width: 1.5 }],
    zones: [
      { value: 100, color: "#EF5350", style: "dashed" },
      { value: 0, color: "#787B86", style: "dashed" },
      { value: -100, color: "#26A69A", style: "dashed" },
    ],
  };
}

export function calcWilliamsRSeries(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { data.push(null); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, highs[j]);
      ll = Math.min(ll, lows[j]);
    }
    data.push(hh === ll ? -50 : ((hh - closes[i]) / (hh - ll)) * -100);
  }
  return {
    name: `Williams %R (${period})`,
    type: "subpane",
    lines: [{ label: `%R ${period}`, data, color: "#E91E63", width: 1.5 }],
    zones: [
      { value: -20, color: "#EF5350", style: "dashed" },
      { value: -80, color: "#26A69A", style: "dashed" },
    ],
    yRange: { min: -100, max: 0 },
  };
}

export function calcOBVSeries(closes: number[], volumes: number[]): IndicatorSeries {
  const data: (number | null)[] = [0];
  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    data.push(obv);
  }
  return {
    name: "OBV",
    type: "subpane",
    lines: [{ label: "OBV", data, color: "#4CAF50", width: 1.5 }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export function calcATRSeries(highs: number[], lows: number[], closes: number[], period: number = 14): IndicatorSeries {
  return {
    name: `ATR (${period})`,
    type: "subpane",
    lines: [{ label: `ATR ${period}`, data: atrArr(highs, lows, closes, period), color: "#FF9800", width: 1.5 }],
  };
}

export function calcMomentumSeries(prices: number[], period: number = 10): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    data.push(i < period ? null : prices[i] - prices[i - period]);
  }
  return {
    name: `Momentum (${period})`,
    type: "subpane",
    lines: [{ label: `Mom ${period}`, data, color: "#2196F3", width: 1.5 }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export function calcROCSeries(prices: number[], period: number = 12): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) { data.push(null); continue; }
    data.push(prices[i - period] === 0 ? 0 : ((prices[i] - prices[i - period]) / prices[i - period]) * 100);
  }
  return {
    name: `ROC (${period})`,
    type: "subpane",
    lines: [{ label: `ROC ${period}`, data, color: "#FF6D00", width: 1.5 }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export function calcCMFSeries(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 20): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { data.push(null); continue; }
    let mfv = 0, vol = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const hl = highs[j] - lows[j];
      const mfm = hl === 0 ? 0 : ((closes[j] - lows[j]) - (highs[j] - closes[j])) / hl;
      mfv += mfm * volumes[j];
      vol += volumes[j];
    }
    data.push(vol === 0 ? 0 : mfv / vol);
  }
  return {
    name: `CMF (${period})`,
    type: "subpane",
    lines: [{ label: `CMF ${period}`, data, color: "#4CAF50", width: 1.5 }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
    yRange: { min: -1, max: 1 },
  };
}

export function calcMFISeries(highs: number[], lows: number[], closes: number[], volumes: number[], period: number = 14): IndicatorSeries {
  const data: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { data.push(null); continue; }
    let posFlow = 0, negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tp = (highs[j] + lows[j] + closes[j]) / 3;
      const prevTp = j > 0 ? (highs[j - 1] + lows[j - 1] + closes[j - 1]) / 3 : tp;
      const mf = tp * volumes[j];
      if (tp > prevTp) posFlow += mf; else negFlow += mf;
    }
    data.push(negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow));
  }
  return {
    name: `MFI (${period})`,
    type: "subpane",
    lines: [{ label: `MFI ${period}`, data, color: "#9C27B0", width: 1.5 }],
    zones: [
      { value: 80, color: "#EF5350", style: "dashed" },
      { value: 20, color: "#26A69A", style: "dashed" },
    ],
    yRange: { min: 0, max: 100 },
  };
}

export function calcForceIndexSeries(closes: number[], volumes: number[], period: number = 13): IndicatorSeries {
  const raw: number[] = [0];
  for (let i = 1; i < closes.length; i++) raw.push((closes[i] - closes[i - 1]) * volumes[i]);
  const data = emaArr(raw, period);
  return {
    name: `Force Index (${period})`,
    type: "subpane",
    lines: [{ label: `FI ${period}`, data, color: "#2196F3", width: 1.5 }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export function calcADLineSeries(highs: number[], lows: number[], closes: number[], volumes: number[]): IndicatorSeries {
  const data: (number | null)[] = [];
  let ad = 0;
  for (let i = 0; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const mfm = hl === 0 ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / hl;
    ad += mfm * volumes[i];
    data.push(ad);
  }
  return { name: "A/D Line", type: "subpane", lines: [{ label: "A/D", data, color: "#FF9800", width: 1.5 }] };
}

export function calcChaikinOscSeries(highs: number[], lows: number[], closes: number[], volumes: number[]): IndicatorSeries {
  const adValues: number[] = [];
  let ad = 0;
  for (let i = 0; i < closes.length; i++) {
    const hl = highs[i] - lows[i];
    const mfm = hl === 0 ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / hl;
    ad += mfm * volumes[i];
    adValues.push(ad);
  }
  const ema3 = emaArrFull(adValues, 3);
  const ema10 = emaArrFull(adValues, 10);
  const data: (number | null)[] = adValues.map((_, i) => i < 9 ? null : ema3[i] - ema10[i]);
  return {
    name: "Chaikin Oscillator",
    type: "subpane",
    lines: [{ label: "Chaikin", data, color: "#00BCD4", width: 1.5 }],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export function calcTSISeries(prices: number[], longP: number = 25, shortP: number = 13): IndicatorSeries {
  const diffs: number[] = [0];
  for (let i = 1; i < prices.length; i++) diffs.push(prices[i] - prices[i - 1]);
  const absDiffs = diffs.map(Math.abs);
  const ds1 = emaArrFull(diffs, longP);
  const ds2 = emaArrFull(ds1, shortP);
  const as1 = emaArrFull(absDiffs, longP);
  const as2 = emaArrFull(as1, shortP);
  const data: (number | null)[] = prices.map((_, i) =>
    i < longP + shortP || as2[i] === 0 ? null : (ds2[i] / as2[i]) * 100
  );
  return {
    name: `TSI (${longP},${shortP})`,
    type: "subpane",
    lines: [{ label: "TSI", data, color: "#E91E63", width: 1.5 }],
    zones: [
      { value: 25, color: "#26A69A", style: "dashed" },
      { value: 0, color: "#787B86", style: "dashed" },
      { value: -25, color: "#EF5350", style: "dashed" },
    ],
  };
}

export function calcAwesomeOscSeries(highs: number[], lows: number[]): IndicatorSeries {
  const medians: number[] = [];
  for (let i = 0; i < highs.length; i++) medians.push((highs[i] + lows[i]) / 2);
  const sma5 = smaArr(medians, 5);
  const sma34 = smaArr(medians, 34);
  const data: (number | null)[] = [];
  const colors: (string | null)[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (sma5[i] == null || sma34[i] == null) { data.push(null); colors.push(null); continue; }
    const v = sma5[i]! - sma34[i]!;
    data.push(v);
    const prev = i > 0 && data[i - 1] != null ? data[i - 1]! : 0;
    colors.push(v >= prev ? "#26A69A" : "#EF5350");
  }
  return {
    name: "Awesome Oscillator",
    type: "subpane",
    histograms: [{ label: "AO", data, colors }],
    lines: [],
    zones: [{ value: 0, color: "#787B86", style: "dashed" }],
  };
}

export const AVAILABLE_INDICATORS = [
  { id: "sma20", name: "SMA (20)", group: "Moving Averages", type: "overlay" as const },
  { id: "sma50", name: "SMA (50)", group: "Moving Averages", type: "overlay" as const },
  { id: "sma200", name: "SMA (200)", group: "Moving Averages", type: "overlay" as const },
  { id: "ema9", name: "EMA (9)", group: "Moving Averages", type: "overlay" as const },
  { id: "ema21", name: "EMA (21)", group: "Moving Averages", type: "overlay" as const },
  { id: "ema55", name: "EMA (55)", group: "Moving Averages", type: "overlay" as const },
  { id: "wma14", name: "WMA (14)", group: "Moving Averages", type: "overlay" as const },
  { id: "dema21", name: "DEMA (21)", group: "Moving Averages", type: "overlay" as const },
  { id: "tema21", name: "TEMA (21)", group: "Moving Averages", type: "overlay" as const },
  { id: "hma16", name: "HMA (16)", group: "Moving Averages", type: "overlay" as const },
  { id: "vwma20", name: "VWMA (20)", group: "Moving Averages", type: "overlay" as const },
  { id: "smma14", name: "SMMA (14)", group: "Moving Averages", type: "overlay" as const },
  { id: "lsma25", name: "LSMA (25)", group: "Moving Averages", type: "overlay" as const },
  { id: "alma20", name: "ALMA (20)", group: "Moving Averages", type: "overlay" as const },
  { id: "mcginley14", name: "McGinley (14)", group: "Moving Averages", type: "overlay" as const },
  { id: "bb", name: "Bollinger Bands", group: "Channels", type: "overlay" as const },
  { id: "keltner", name: "Keltner Channel", group: "Channels", type: "overlay" as const },
  { id: "donchian", name: "Donchian Channel", group: "Channels", type: "overlay" as const },
  { id: "ichimoku", name: "Ichimoku Cloud", group: "Trend", type: "overlay" as const },
  { id: "psar", name: "Parabolic SAR", group: "Trend", type: "overlay" as const },
  { id: "supertrend", name: "Supertrend", group: "Trend", type: "overlay" as const },
  { id: "vwap", name: "VWAP", group: "Trend", type: "overlay" as const },
  { id: "alligator", name: "Alligator", group: "Trend", type: "overlay" as const },
  { id: "rsi", name: "RSI (14)", group: "Momentum", type: "subpane" as const },
  { id: "macd", name: "MACD", group: "Momentum", type: "subpane" as const },
  { id: "stochastic", name: "Stochastic", group: "Momentum", type: "subpane" as const },
  { id: "adx", name: "ADX / DMI", group: "Momentum", type: "subpane" as const },
  { id: "cci", name: "CCI (20)", group: "Momentum", type: "subpane" as const },
  { id: "williamsR", name: "Williams %R", group: "Momentum", type: "subpane" as const },
  { id: "momentum", name: "Momentum", group: "Momentum", type: "subpane" as const },
  { id: "roc", name: "ROC (12)", group: "Momentum", type: "subpane" as const },
  { id: "tsi", name: "TSI", group: "Momentum", type: "subpane" as const },
  { id: "ao", name: "Awesome Oscillator", group: "Momentum", type: "subpane" as const },
  { id: "obv", name: "OBV", group: "Volume", type: "subpane" as const },
  { id: "cmf", name: "CMF (20)", group: "Volume", type: "subpane" as const },
  { id: "mfi", name: "MFI (14)", group: "Volume", type: "subpane" as const },
  { id: "atr", name: "ATR (14)", group: "Volatility", type: "subpane" as const },
  { id: "forceIndex", name: "Force Index", group: "Volume", type: "subpane" as const },
  { id: "adLine", name: "A/D Line", group: "Volume", type: "subpane" as const },
  { id: "chaikinOsc", name: "Chaikin Oscillator", group: "Volume", type: "subpane" as const },
];

export function computeIndicator(id: string, data: StockData): IndicatorSeries | null {
  const { prices, highs, lows, closes, volumes } = data;
  switch (id) {
    case "sma20": return calcSMASeries(closes, 20, "#2196F3");
    case "sma50": return calcSMASeries(closes, 50, "#FF9800");
    case "sma200": return calcSMASeries(closes, 200, "#F44336");
    case "ema9": return calcEMASeries(closes, 9, "#00BCD4");
    case "ema21": return calcEMASeries(closes, 21, "#FFEB3B");
    case "ema55": return calcEMASeries(closes, 55, "#E91E63");
    case "wma14": return calcWMASeries(closes, 14);
    case "dema21": return calcDEMASeries(closes, 21);
    case "tema21": return calcTEMASeries(closes, 21);
    case "hma16": return calcHMASeries(closes, 16);
    case "vwma20": return calcVWMASeries(closes, volumes, 20);
    case "smma14": return calcSMMASeries(closes, 14);
    case "lsma25": return calcLSMASeries(closes, 25);
    case "alma20": return calcALMASeries(closes, 20);
    case "mcginley14": return calcMcGinleySeries(closes, 14);
    case "bb": return calcBollingerSeries(closes, 20, 2);
    case "keltner": return calcKeltnerSeries(closes, highs, lows, closes, 20);
    case "donchian": return calcDonchianSeries(highs, lows, 20);
    case "ichimoku": return calcIchimokuSeries(highs, lows, closes);
    case "psar": return calcParabolicSARSeries(highs, lows);
    case "supertrend": return calcSupertrendSeries(highs, lows, closes);
    case "vwap": return calcVWAPSeries(closes, highs, lows, volumes);
    case "alligator": return calcAlligatorSeries(closes);
    case "rsi": return calcRSISeries(closes, 14);
    case "macd": return calcMACDSeries(closes);
    case "stochastic": return calcStochasticSeries(highs, lows, closes);
    case "adx": return calcADXSeries(highs, lows, closes);
    case "cci": return calcCCISeries(highs, lows, closes);
    case "williamsR": return calcWilliamsRSeries(highs, lows, closes);
    case "momentum": return calcMomentumSeries(closes, 10);
    case "roc": return calcROCSeries(closes, 12);
    case "tsi": return calcTSISeries(closes);
    case "ao": return calcAwesomeOscSeries(highs, lows);
    case "obv": return calcOBVSeries(closes, volumes);
    case "cmf": return calcCMFSeries(highs, lows, closes, volumes);
    case "mfi": return calcMFISeries(highs, lows, closes, volumes);
    case "atr": return calcATRSeries(highs, lows, closes);
    case "forceIndex": return calcForceIndexSeries(closes, volumes);
    case "adLine": return calcADLineSeries(highs, lows, closes, volumes);
    case "chaikinOsc": return calcChaikinOscSeries(highs, lows, closes, volumes);
    default: return null;
  }
}
