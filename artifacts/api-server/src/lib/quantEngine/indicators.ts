export function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] ?? 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(data: number[], period: number): number {
  if (data.length === 0) return 0;
  const k = 2 / (period + 1);
  let val = data[0];
  for (let i = 1; i < data.length; i++) val = data[i] * k + val * (1 - k);
  return val;
}

export function emaArray(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k));
  return result;
}

export function stdDev(data: number[], period: number): number {
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  return Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length);
}

export function rsi(data: number[], period: number): number {
  if (data.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(data: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = emaArray(data, 12);
  const ema26 = emaArray(data, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < ema12.length; i++) macdLine.push(ema12[i] - ema26[i]);
  const signalLine = emaArray(macdLine, 9);
  const m = macdLine[macdLine.length - 1];
  const s = signalLine[signalLine.length - 1];
  return { macd: m, signal: s, histogram: m - s };
}

export function macdParams(data: number[], fast: number, slow: number, sig: number): { macd: number; signal: number; histogram: number } {
  const emaFast = emaArray(data, fast);
  const emaSlow = emaArray(data, slow);
  const macdLine: number[] = [];
  for (let i = 0; i < emaFast.length; i++) macdLine.push(emaFast[i] - emaSlow[i]);
  const signalLine = emaArray(macdLine, sig);
  const m = macdLine[macdLine.length - 1];
  const s = signalLine[signalLine.length - 1];
  return { macd: m, signal: s, histogram: m - s };
}

export function stochastic(highs: number[], lows: number[], closes: number[], period: number): number {
  const hSlice = highs.slice(-period);
  const lSlice = lows.slice(-period);
  const hh = Math.max(...hSlice);
  const ll = Math.min(...lSlice);
  return hh === ll ? 50 : ((closes[closes.length - 1] - ll) / (hh - ll)) * 100;
}

export function bollinger(data: number[], period: number, mult: number): { upper: number; lower: number; mid: number; pctB: number } {
  const mid = sma(data, period);
  const sd = stdDev(data, period);
  const upper = mid + mult * sd;
  const lower = mid - mult * sd;
  const price = data[data.length - 1];
  const pctB = upper === lower ? 50 : ((price - lower) / (upper - lower)) * 100;
  return { upper, lower, mid, pctB };
}

export function atr(highs: number[], lows: number[], closes: number[], period: number): number {
  let sum = 0;
  const n = Math.min(period, highs.length - 1);
  for (let i = highs.length - n; i < highs.length; i++) {
    sum += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }
  return sum / n;
}

export function obv(closes: number[], volumes: number[]): number {
  let o = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) o += volumes[i];
    else if (closes[i] < closes[i - 1]) o -= volumes[i];
  }
  return o;
}

export function williamsr(highs: number[], lows: number[], closes: number[], period: number): number {
  const hSlice = highs.slice(-period);
  const lSlice = lows.slice(-period);
  const hh = Math.max(...hSlice);
  const ll = Math.min(...lSlice);
  return hh === ll ? -50 : ((hh - closes[closes.length - 1]) / (hh - ll)) * -100;
}

export function cci(highs: number[], lows: number[], closes: number[], period: number): number {
  const tps: number[] = [];
  for (let i = 0; i < closes.length; i++) tps.push((highs[i] + lows[i] + closes[i]) / 3);
  const avg = sma(tps, period);
  const slice = tps.slice(-period);
  const meanDev = slice.reduce((a, b) => a + Math.abs(b - avg), 0) / period;
  return meanDev === 0 ? 0 : (tps[tps.length - 1] - avg) / (0.015 * meanDev);
}

export function roc(data: number[], period: number): number {
  if (data.length < period + 1) return 0;
  const prev = data[data.length - 1 - period];
  const curr = data[data.length - 1];
  return prev === 0 ? 0 : ((curr - prev) / prev) * 100;
}

export function cmf(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number {
  let mfv = 0, vol = 0;
  const start = Math.max(0, closes.length - period);
  for (let i = start; i < closes.length; i++) {
    const mfm = highs[i] === lows[i] ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
    mfv += mfm * volumes[i];
    vol += volumes[i];
  }
  return vol === 0 ? 0 : mfv / vol;
}

export function adx(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < period + 1) return 25;
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
  return diPlus + diMinus === 0 ? 0 : Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
}
