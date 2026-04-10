export interface PatternResult {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  index: number;
  reliability: "high" | "medium" | "low";
  description: string;
}

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function bodySize(c: Candle): number {
  return Math.abs(c.close - c.open);
}

function totalRange(c: Candle): number {
  return c.high - c.low;
}

function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

function isBearish(c: Candle): boolean {
  return c.close < c.open;
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close);
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low;
}

function isDoji(c: Candle): boolean {
  return bodySize(c) < totalRange(c) * 0.1;
}

export function detectCandlestickPatterns(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): PatternResult[] {
  const results: PatternResult[] = [];
  const len = opens.length;
  if (len < 3) return results;

  for (let i = 0; i < len; i++) {
    const c: Candle = { open: opens[i], high: highs[i], low: lows[i], close: closes[i], volume: volumes[i] };
    const body = bodySize(c);
    const range = totalRange(c);
    if (range === 0) continue;

    if (isDoji(c)) {
      results.push({ name: "Doji", type: "neutral", index: i, reliability: "medium", description: "Indecision candle — body < 10% of range" });
    }

    if (i > 0) {
      const prev: Candle = { open: opens[i - 1], high: highs[i - 1], low: lows[i - 1], close: closes[i - 1], volume: volumes[i - 1] };

      if (isBullish(c) && body > range * 0.6 && lowerWick(c) > body * 1.5 && upperWick(c) < body * 0.3 && isBearish(prev)) {
        results.push({ name: "Hammer", type: "bullish", index: i, reliability: "high", description: "Bullish reversal — long lower wick after downtrend" });
      }

      if (isBearish(c) && upperWick(c) > body * 2 && lowerWick(c) < body * 0.3 && isBullish(prev)) {
        results.push({ name: "Shooting Star", type: "bearish", index: i, reliability: "high", description: "Bearish reversal — long upper wick after uptrend" });
      }

      if (body > range * 0.8 && isBullish(c)) {
        results.push({ name: "Marubozu", type: "bullish", index: i, reliability: "medium", description: "Strong bullish — body > 80% of range, minimal wicks" });
      }
      if (body > range * 0.8 && isBearish(c)) {
        results.push({ name: "Marubozu", type: "bearish", index: i, reliability: "medium", description: "Strong bearish — body > 80% of range, minimal wicks" });
      }

      if (isBullish(c) && isBearish(prev) && c.close > prev.open && c.open < prev.close && bodySize(c) > bodySize(prev)) {
        results.push({ name: "Bullish Engulfing", type: "bullish", index: i, reliability: "high", description: "Bullish reversal — current candle engulfs previous bearish candle" });
      }
      if (isBearish(c) && isBullish(prev) && c.open > prev.close && c.close < prev.open && bodySize(c) > bodySize(prev)) {
        results.push({ name: "Bearish Engulfing", type: "bearish", index: i, reliability: "high", description: "Bearish reversal — current candle engulfs previous bullish candle" });
      }

      if (isBullish(c) && isBearish(prev) && bodySize(c) < bodySize(prev) * 0.5 && c.open > prev.close && c.close < prev.open) {
        results.push({ name: "Bullish Harami", type: "bullish", index: i, reliability: "medium", description: "Potential bullish reversal — small body inside previous large body" });
      }
      if (isBearish(c) && isBullish(prev) && bodySize(c) < bodySize(prev) * 0.5 && c.close > prev.open && c.open < prev.close) {
        results.push({ name: "Bearish Harami", type: "bearish", index: i, reliability: "medium", description: "Potential bearish reversal — small body inside previous large body" });
      }

      if (isBullish(c) && isBearish(prev) && c.open < prev.close && c.close > (prev.open + prev.close) / 2 && c.close < prev.open) {
        results.push({ name: "Piercing Line", type: "bullish", index: i, reliability: "medium", description: "Bullish reversal — closes above midpoint of previous bearish candle" });
      }

      if (isBearish(c) && isBullish(prev) && c.open > prev.close && c.close < (prev.open + prev.close) / 2 && c.close > prev.open) {
        results.push({ name: "Dark Cloud Cover", type: "bearish", index: i, reliability: "medium", description: "Bearish reversal — closes below midpoint of previous bullish candle" });
      }
    }

    if (i >= 2) {
      const c1: Candle = { open: opens[i - 2], high: highs[i - 2], low: lows[i - 2], close: closes[i - 2], volume: volumes[i - 2] };
      const c2: Candle = { open: opens[i - 1], high: highs[i - 1], low: lows[i - 1], close: closes[i - 1], volume: volumes[i - 1] };

      if (isBearish(c1) && isDoji(c2) && c2.low < c1.close && isBullish(c) && c.close > (c1.open + c1.close) / 2) {
        results.push({ name: "Morning Star", type: "bullish", index: i, reliability: "high", description: "Strong bullish reversal — 3-candle pattern with doji star" });
      }

      if (isBullish(c1) && isDoji(c2) && c2.high > c1.close && isBearish(c) && c.close < (c1.open + c1.close) / 2) {
        results.push({ name: "Evening Star", type: "bearish", index: i, reliability: "high", description: "Strong bearish reversal — 3-candle pattern with doji star" });
      }

      if (isBullish(c1) && isBullish(c2) && isBullish(c) && c2.close > c1.close && c.close > c2.close && c2.open > c1.open && c.open > c2.open) {
        results.push({ name: "Three White Soldiers", type: "bullish", index: i, reliability: "high", description: "Strong bullish continuation — three consecutive higher closing bullish candles" });
      }

      if (isBearish(c1) && isBearish(c2) && isBearish(c) && c2.close < c1.close && c.close < c2.close && c2.open < c1.open && c.open < c2.open) {
        results.push({ name: "Three Black Crows", type: "bearish", index: i, reliability: "high", description: "Strong bearish continuation — three consecutive lower closing bearish candles" });
      }
    }
  }

  return results;
}

export interface ChartPattern {
  name: string;
  type: "bullish" | "bearish" | "neutral";
  startIndex: number;
  endIndex: number;
  reliability: "high" | "medium" | "low";
  description: string;
}

export function detectChartPatterns(
  highs: number[],
  lows: number[],
  closes: number[]
): ChartPattern[] {
  const results: ChartPattern[] = [];
  const len = closes.length;
  if (len < 20) return results;

  const peaks: number[] = [];
  const troughs: number[] = [];
  for (let i = 5; i < len - 5; i++) {
    let isPeak = true, isTrough = true;
    for (let j = 1; j <= 5; j++) {
      if (highs[i] <= highs[i - j] || highs[i] <= highs[i + j]) isPeak = false;
      if (lows[i] >= lows[i - j] || lows[i] >= lows[i + j]) isTrough = false;
    }
    if (isPeak) peaks.push(i);
    if (isTrough) troughs.push(i);
  }

  for (let i = 0; i < peaks.length - 1; i++) {
    const p1 = peaks[i], p2 = peaks[i + 1];
    const diff = Math.abs(highs[p1] - highs[p2]) / Math.max(highs[p1], highs[p2]);
    if (diff < 0.02 && p2 - p1 > 5) {
      const neckline = Math.min(...lows.slice(p1, p2 + 1));
      if (closes[closes.length - 1] < neckline) {
        results.push({
          name: "Double Top",
          type: "bearish",
          startIndex: p1,
          endIndex: p2,
          reliability: "high",
          description: `Double top at $${highs[p1].toFixed(2)} — bearish reversal pattern`,
        });
      }
    }
  }

  for (let i = 0; i < troughs.length - 1; i++) {
    const t1 = troughs[i], t2 = troughs[i + 1];
    const diff = Math.abs(lows[t1] - lows[t2]) / Math.max(lows[t1], lows[t2]);
    if (diff < 0.02 && t2 - t1 > 5) {
      const neckline = Math.max(...highs.slice(t1, t2 + 1));
      if (closes[closes.length - 1] > neckline) {
        results.push({
          name: "Double Bottom",
          type: "bullish",
          startIndex: t1,
          endIndex: t2,
          reliability: "high",
          description: `Double bottom at $${lows[t1].toFixed(2)} — bullish reversal pattern`,
        });
      }
    }
  }

  if (peaks.length >= 3) {
    for (let i = 0; i < peaks.length - 2; i++) {
      const p1 = peaks[i], p2 = peaks[i + 1], p3 = peaks[i + 2];
      if (highs[p2] > highs[p1] && highs[p2] > highs[p3] &&
        Math.abs(highs[p1] - highs[p3]) / highs[p2] < 0.03) {
        results.push({
          name: "Head & Shoulders",
          type: "bearish",
          startIndex: p1,
          endIndex: p3,
          reliability: "high",
          description: "Head and Shoulders top — strong bearish reversal pattern",
        });
      }
    }
  }

  if (troughs.length >= 3) {
    for (let i = 0; i < troughs.length - 2; i++) {
      const t1 = troughs[i], t2 = troughs[i + 1], t3 = troughs[i + 2];
      if (lows[t2] < lows[t1] && lows[t2] < lows[t3] &&
        Math.abs(lows[t1] - lows[t3]) / Math.abs(lows[t2]) < 0.03) {
        results.push({
          name: "Inv. Head & Shoulders",
          type: "bullish",
          startIndex: t1,
          endIndex: t3,
          reliability: "high",
          description: "Inverse Head and Shoulders — strong bullish reversal pattern",
        });
      }
    }
  }

  if (len >= 30) {
    const last30h = highs.slice(-30);
    const last30l = lows.slice(-30);
    const highSlope = (last30h[29] - last30h[0]) / 30;
    const lowSlope = (last30l[29] - last30l[0]) / 30;

    if (highSlope < 0 && lowSlope > 0) {
      results.push({
        name: "Symmetrical Triangle",
        type: "neutral",
        startIndex: len - 30,
        endIndex: len - 1,
        reliability: "medium",
        description: "Converging trendlines — breakout imminent in either direction",
      });
    }

    if (Math.abs(highSlope) < 0.01 && lowSlope > 0.01) {
      results.push({
        name: "Ascending Triangle",
        type: "bullish",
        startIndex: len - 30,
        endIndex: len - 1,
        reliability: "high",
        description: "Flat resistance with rising support — bullish breakout likely",
      });
    }

    if (highSlope < -0.01 && Math.abs(lowSlope) < 0.01) {
      results.push({
        name: "Descending Triangle",
        type: "bearish",
        startIndex: len - 30,
        endIndex: len - 1,
        reliability: "high",
        description: "Declining resistance with flat support — bearish breakdown likely",
      });
    }

    const last15h = highs.slice(-15);
    const last15l = lows.slice(-15);
    const rangeAvg = last15h.reduce((a, b) => a + b, 0) / 15 - last15l.reduce((a, b) => a + b, 0) / 15;
    const prevRangeAvg = highs.slice(-30, -15).reduce((a, b) => a + b, 0) / 15 - lows.slice(-30, -15).reduce((a, b) => a + b, 0) / 15;
    if (rangeAvg < prevRangeAvg * 0.6 && highSlope > 0 && lowSlope > 0) {
      results.push({
        name: "Bull Flag",
        type: "bullish",
        startIndex: len - 15,
        endIndex: len - 1,
        reliability: "medium",
        description: "Narrow consolidation after strong move up — bullish continuation",
      });
    }
    if (rangeAvg < prevRangeAvg * 0.6 && highSlope < 0 && lowSlope < 0) {
      results.push({
        name: "Bear Flag",
        type: "bearish",
        startIndex: len - 15,
        endIndex: len - 1,
        reliability: "medium",
        description: "Narrow consolidation after strong move down — bearish continuation",
      });
    }
  }

  return results;
}
