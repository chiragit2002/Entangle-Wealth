import {
  ema, emaArray, sma, rsi, macdParams, stochastic, bollinger,
  williamsr, cci, roc, cmf, obv, adx,
} from "./indicators.js";
import { executeStrategy } from "./strategyGenerator.js";
import type { OHLCVData, StrategyAction, StrategyDescriptor } from "./strategyGenerator.js";

export interface CustomStrategyLogic {
  entry: string[];
  exit: string[];
}

export interface CustomStrategyConfig {
  id: string | number;
  name: string;
  type: string;
  assets: string[];
  timeframes: string[];
  parameters: Record<string, number>;
  logic: CustomStrategyLogic;
  metadata?: Record<string, unknown>;
}

export interface BacktestPoint {
  bar: number;
  equity: number;
}

export interface BacktestResult {
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  totalTrades: number;
  equityCurve: BacktestPoint[];
}

type ConditionEvaluator = (data: OHLCVData, params: Record<string, number>) => boolean;

function safeEma(closes: number[], period: number): number {
  return closes.length >= period ? ema(closes, period) : ema(closes, Math.min(period, closes.length));
}

function prevEma(closes: number[], period: number): number {
  return closes.length > 1 ? safeEma(closes.slice(0, -1), period) : safeEma(closes, period);
}

const CONDITION_EVALUATORS: Record<string, ConditionEvaluator> = {
  ema_fast_crosses_above_ema_slow: (data, p) => {
    const f = p.fast ?? 10; const s = p.slow ?? 26;
    return safeEma(data.closes, f) > safeEma(data.closes, s) &&
           prevEma(data.closes, f) <= prevEma(data.closes, s);
  },
  ema_fast_above_ema_slow: (data, p) =>
    safeEma(data.closes, p.fast ?? 10) > safeEma(data.closes, p.slow ?? 26),

  ema_fast_crosses_below_ema_slow: (data, p) => {
    const f = p.fast ?? 10; const s = p.slow ?? 26;
    return safeEma(data.closes, f) < safeEma(data.closes, s) &&
           prevEma(data.closes, f) >= prevEma(data.closes, s);
  },
  ema_fast_below_ema_slow: (data, p) =>
    safeEma(data.closes, p.fast ?? 10) < safeEma(data.closes, p.slow ?? 26),

  sma_fast_crosses_above_sma_slow: (data, p) => {
    const f = p.fast ?? 10; const s = p.slow ?? 20; const cl = data.closes;
    return sma(cl, f) > sma(cl, s) && sma(cl.slice(0, -1), f) <= sma(cl.slice(0, -1), s);
  },
  sma_fast_above_sma_slow: (data, p) =>
    sma(data.closes, p.fast ?? 10) > sma(data.closes, p.slow ?? 20),
  sma_fast_crosses_below_sma_slow: (data, p) => {
    const f = p.fast ?? 10; const s = p.slow ?? 20; const cl = data.closes;
    return sma(cl, f) < sma(cl, s) && sma(cl.slice(0, -1), f) >= sma(cl.slice(0, -1), s);
  },
  sma_fast_below_sma_slow: (data, p) =>
    sma(data.closes, p.fast ?? 10) < sma(data.closes, p.slow ?? 20),

  rsi_below_threshold: (data, p) => rsi(data.closes, p.period ?? 14) < (p.threshold ?? 30),
  rsi_crosses_above_threshold_from_below: (data, p) => {
    const per = p.period ?? 14; const thr = p.threshold ?? 30;
    return rsi(data.closes, per) >= thr && rsi(data.closes.slice(0, -1), per) < thr;
  },
  rsi_above_50: (data, p) => rsi(data.closes, p.period ?? 14) > 50,
  rsi_above_60: (data, p) => rsi(data.closes, p.period ?? 14) > 60,

  rsi_above_threshold: (data, p) => rsi(data.closes, p.period ?? 14) > (p.threshold ?? 70),
  rsi_crosses_below_threshold_from_above: (data, p) => {
    const per = p.period ?? 14; const thr = p.threshold ?? 70;
    return rsi(data.closes, per) <= thr && rsi(data.closes.slice(0, -1), per) > thr;
  },
  rsi_below_50: (data, p) => rsi(data.closes, p.period ?? 14) < 50,
  rsi_below_40: (data, p) => rsi(data.closes, p.period ?? 14) < 40,

  macd_histogram_crosses_above_zero: (data, p) => {
    const curr = macdParams(data.closes, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9).histogram;
    const prev = macdParams(data.closes.slice(0, -1), p.fast ?? 12, p.slow ?? 26, p.signal ?? 9).histogram;
    return curr > 0 && prev <= 0;
  },
  macd_above_signal_line: (data, p) => {
    const m = macdParams(data.closes, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9);
    return m.macd > m.signal;
  },
  macd_histogram_crosses_below_zero: (data, p) => {
    const curr = macdParams(data.closes, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9).histogram;
    const prev = macdParams(data.closes.slice(0, -1), p.fast ?? 12, p.slow ?? 26, p.signal ?? 9).histogram;
    return curr < 0 && prev >= 0;
  },
  macd_below_signal_line: (data, p) => {
    const m = macdParams(data.closes, p.fast ?? 12, p.slow ?? 26, p.signal ?? 9);
    return m.macd < m.signal;
  },

  price_below_lower_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return data.closes[data.closes.length - 1] < b.lower;
  },
  price_near_lower_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return b.pctB < 20;
  },
  price_touches_mid_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return b.pctB >= 45 && b.pctB <= 55;
  },
  price_near_upper_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return b.pctB > 80;
  },
  price_breaks_above_upper_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return data.closes[data.closes.length - 1] > b.upper;
  },
  price_breaks_below_lower_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return data.closes[data.closes.length - 1] < b.lower;
  },
  price_returns_to_mid_band: (data, p) => {
    const b = bollinger(data.closes, p.period ?? 20, p.mult ?? 2);
    return Math.abs(b.pctB - 50) < 10;
  },

  stochastic_below_threshold: (data, p) => {
    const k = stochastic(data.highs, data.lows, data.closes, p.period ?? 14);
    return k < (p.threshold ?? 20);
  },
  stochastic_crosses_above_threshold: (data, p) => {
    const thr = p.threshold ?? 20; const per = p.period ?? 14;
    const curr = stochastic(data.highs, data.lows, data.closes, per);
    const prev = stochastic(data.highs.slice(0, -1), data.lows.slice(0, -1), data.closes.slice(0, -1), per);
    return curr >= thr && prev < thr;
  },
  stochastic_above_50: (data, p) => stochastic(data.highs, data.lows, data.closes, p.period ?? 14) > 50,
  stochastic_above_70: (data, p) => stochastic(data.highs, data.lows, data.closes, p.period ?? 14) > 70,
  stochastic_above_threshold: (data, p) => stochastic(data.highs, data.lows, data.closes, p.period ?? 14) > (p.threshold ?? 80),
  stochastic_crosses_below_threshold: (data, p) => {
    const thr = p.threshold ?? 80; const per = p.period ?? 14;
    const curr = stochastic(data.highs, data.lows, data.closes, per);
    const prev = stochastic(data.highs.slice(0, -1), data.lows.slice(0, -1), data.closes.slice(0, -1), per);
    return curr <= thr && prev > thr;
  },
  stochastic_below_50: (data, p) => stochastic(data.highs, data.lows, data.closes, p.period ?? 14) < 50,
  stochastic_below_30: (data, p) => stochastic(data.highs, data.lows, data.closes, p.period ?? 14) < 30,

  williams_r_below_neg80: (data, p) => williamsr(data.highs, data.lows, data.closes, p.period ?? 14) < -80,
  williams_r_oversold: (data, p) => williamsr(data.highs, data.lows, data.closes, p.period ?? 14) < -80,
  williams_r_above_neg20: (data, p) => williamsr(data.highs, data.lows, data.closes, p.period ?? 14) > -20,

  cci_below_negative_threshold: (data, p) => cci(data.highs, data.lows, data.closes, p.period ?? 20) < -(p.threshold ?? 100),
  cci_above_positive_threshold: (data, p) => cci(data.highs, data.lows, data.closes, p.period ?? 20) > (p.threshold ?? 100),
  cci_returns_to_zero: (data, p) => Math.abs(cci(data.highs, data.lows, data.closes, p.period ?? 20)) < 25,

  roc_above_positive_threshold: (data, p) => roc(data.closes, p.period ?? 12) > (p.threshold ?? 5),
  roc_below_negative_threshold: (data, p) => roc(data.closes, p.period ?? 12) < -(p.threshold ?? 5),
  roc_crosses_zero: (data, p) => {
    const curr = roc(data.closes, p.period ?? 12);
    const prev = roc(data.closes.slice(0, -1), p.period ?? 12);
    return (curr > 0 && prev <= 0) || (curr < 0 && prev >= 0);
  },

  cmf_above_zero_threshold: (data, p) => cmf(data.highs, data.lows, data.closes, data.volumes, p.period ?? 20) > 0.05,
  cmf_below_negative_threshold: (data, p) => cmf(data.highs, data.lows, data.closes, data.volumes, p.period ?? 20) < -0.05,
  cmf_crosses_zero: (data, p) => {
    const curr = cmf(data.highs, data.lows, data.closes, data.volumes, p.period ?? 20);
    const prev = cmf(data.highs.slice(0, -1), data.lows.slice(0, -1), data.closes.slice(0, -1), data.volumes.slice(0, -1), p.period ?? 20);
    return (curr > 0 && prev <= 0) || (curr < 0 && prev >= 0);
  },

  obv_rising_with_price: (data) => {
    const o = obv(data.closes, data.volumes);
    return data.closes[data.closes.length - 1] > data.closes[data.closes.length - 2] && o > 0;
  },
  obv_falling_with_price: (data) => {
    const o = obv(data.closes, data.volumes);
    return data.closes[data.closes.length - 1] < data.closes[data.closes.length - 2] && o < 0;
  },
  obv_diverges_from_price: (data) => {
    const o = obv(data.closes, data.volumes);
    const priceUp = data.closes[data.closes.length - 1] > data.closes[data.closes.length - 2];
    return priceUp ? o < 0 : o > 0;
  },

  rsi_oversold_and_macd_positive: (data, p) =>
    rsi(data.closes, p.rsiPeriod ?? 14) < (p.rsiThreshold ?? 35) &&
    macdParams(data.closes, 12, 26, 9).histogram > 0,
  rsi_overbought_and_macd_negative: (data, p) =>
    rsi(data.closes, p.rsiPeriod ?? 14) > (100 - (p.rsiThreshold ?? 35)) &&
    macdParams(data.closes, 12, 26, 9).histogram < 0,
  rsi_normalizes: (data, p) => {
    const r = rsi(data.closes, p.rsiPeriod ?? 14);
    return r > 40 && r < 60;
  },
  macd_reverses: (data) => {
    const curr = macdParams(data.closes, 12, 26, 9).histogram;
    const prev = macdParams(data.closes.slice(0, -1), 12, 26, 9).histogram;
    return (curr > 0 && prev < 0) || (curr < 0 && prev > 0);
  },

  price_above_ema_and_rsi_in_range: (data, p) => {
    const cl = data.closes; const price = cl[cl.length - 1];
    const emaVal = safeEma(cl, p.emaPeriod ?? 21);
    const r = rsi(cl, p.rsiPeriod ?? 14);
    return price > emaVal && r > 40 && r < 65;
  },
  price_below_ema_and_rsi_in_range: (data, p) => {
    const cl = data.closes; const price = cl[cl.length - 1];
    const emaVal = safeEma(cl, p.emaPeriod ?? 21);
    const r = rsi(cl, p.rsiPeriod ?? 14);
    return price < emaVal && r > 35 && r < 60;
  },
  price_crosses_ema: (data, p) => {
    const cl = data.closes; const per = p.emaPeriod ?? 21;
    const curr = cl[cl.length - 1] > safeEma(cl, per);
    const prev = cl[cl.length - 2] > safeEma(cl.slice(0, -1), per);
    return curr !== prev;
  },
  rsi_reaches_extreme: (data, p) => {
    const r = rsi(data.closes, p.rsiPeriod ?? 14);
    return r < 25 || r > 75;
  },

  bb_lower_and_rsi_oversold: (data, p) => {
    const b = bollinger(data.closes, p.bbPeriod ?? 20, 2);
    return b.pctB < 10 && rsi(data.closes, p.rsiPeriod ?? 14) < 35;
  },
  bb_upper_and_rsi_overbought: (data, p) => {
    const b = bollinger(data.closes, p.bbPeriod ?? 20, 2);
    return b.pctB > 90 && rsi(data.closes, p.rsiPeriod ?? 14) > 65;
  },
  bb_mid_and_rsi_neutral: (data, p) => {
    const b = bollinger(data.closes, p.bbPeriod ?? 20, 2);
    const r = rsi(data.closes, p.rsiPeriod ?? 14);
    return Math.abs(b.pctB - 50) < 15 && r > 40 && r < 60;
  },

  stoch_oversold_and_rsi_oversold: (data, p) =>
    stochastic(data.highs, data.lows, data.closes, p.stochPeriod ?? 14) < 25 &&
    rsi(data.closes, p.rsiPeriod ?? 14) < 35,
  stoch_overbought_and_rsi_overbought: (data, p) =>
    stochastic(data.highs, data.lows, data.closes, p.stochPeriod ?? 14) > 75 &&
    rsi(data.closes, p.rsiPeriod ?? 14) > 65,
  both_indicators_normalize: (data, p) => {
    const s = stochastic(data.highs, data.lows, data.closes, p.stochPeriod ?? 14);
    const r = rsi(data.closes, p.rsiPeriod ?? 14);
    return s > 35 && s < 65 && r > 40 && r < 60;
  },

  price_above_ema_and_macd_positive: (data, p) => {
    const price = data.closes[data.closes.length - 1];
    return price > safeEma(data.closes, p.emaPeriod ?? 50) &&
           macdParams(data.closes, p.macdFast ?? 12, p.macdSlow ?? 26, p.macdSig ?? 9).histogram > 0;
  },
  price_below_ema_and_macd_negative: (data, p) => {
    const price = data.closes[data.closes.length - 1];
    return price < safeEma(data.closes, p.emaPeriod ?? 50) &&
           macdParams(data.closes, p.macdFast ?? 12, p.macdSlow ?? 26, p.macdSig ?? 9).histogram < 0;
  },
  macd_histogram_reverses: (data, p) => {
    const curr = macdParams(data.closes, p.macdFast ?? 12, p.macdSlow ?? 26, p.macdSig ?? 9).histogram;
    const prev = macdParams(data.closes.slice(0, -1), p.macdFast ?? 12, p.macdSlow ?? 26, p.macdSig ?? 9).histogram;
    return (curr > 0 && prev < 0) || (curr < 0 && prev > 0);
  },

  fast_above_mid_above_slow: (data, p) => {
    const f = safeEma(data.closes, p.fast ?? 9);
    const m = safeEma(data.closes, p.mid ?? 21);
    const s = safeEma(data.closes, p.slow ?? 50);
    return f > m && m > s;
  },
  fast_below_mid_below_slow: (data, p) => {
    const f = safeEma(data.closes, p.fast ?? 9);
    const m = safeEma(data.closes, p.mid ?? 21);
    const s = safeEma(data.closes, p.slow ?? 50);
    return f < m && m < s;
  },
  fast_crosses_below_mid: (data, p) => {
    const f = safeEma(data.closes, p.fast ?? 9);
    const m = safeEma(data.closes, p.mid ?? 21);
    const pf = prevEma(data.closes, p.fast ?? 9);
    const pm = prevEma(data.closes, p.mid ?? 21);
    return f < m && pf >= pm;
  },
  fast_crosses_above_mid: (data, p) => {
    const f = safeEma(data.closes, p.fast ?? 9);
    const m = safeEma(data.closes, p.mid ?? 21);
    const pf = prevEma(data.closes, p.fast ?? 9);
    const pm = prevEma(data.closes, p.mid ?? 21);
    return f > m && pf <= pm;
  },

  adx_strong_and_ema_bullish: (data, p) =>
    adx(data.highs, data.lows, data.closes, p.period ?? 14) > (p.threshold ?? 25) &&
    safeEma(data.closes, 20) > safeEma(data.closes, 50),
  adx_strong_and_ema_bearish: (data, p) =>
    adx(data.highs, data.lows, data.closes, p.period ?? 14) > (p.threshold ?? 25) &&
    safeEma(data.closes, 20) < safeEma(data.closes, 50),
  adx_weakens_below_threshold: (data, p) =>
    adx(data.highs, data.lows, data.closes, p.period ?? 14) < (p.threshold ?? 25),
  ema_crossover_reversal: (data) => {
    const f = safeEma(data.closes, 20); const s = safeEma(data.closes, 50);
    const pf = prevEma(data.closes, 20); const ps = prevEma(data.closes, 50);
    return (f > s && pf <= ps) || (f < s && pf >= ps);
  },

  price_below_sma_by_threshold: (data, p) => {
    const smaVal = sma(data.closes, p.period ?? 50);
    const price = data.closes[data.closes.length - 1];
    return price < smaVal * (1 - (p.threshold ?? 5) / 100);
  },
  price_above_sma_by_threshold: (data, p) => {
    const smaVal = sma(data.closes, p.period ?? 50);
    const price = data.closes[data.closes.length - 1];
    return price > smaVal * (1 + (p.threshold ?? 5) / 100);
  },
  price_returns_to_sma: (data, p) => {
    const smaVal = sma(data.closes, p.period ?? 50);
    const price = data.closes[data.closes.length - 1];
    return Math.abs(price - smaVal) / smaVal < 0.01;
  },

};

export function customStrategyToDescriptor(config: Pick<CustomStrategyConfig, "id" | "name" | "type" | "parameters">): StrategyDescriptor {
  return {
    id: `custom_${config.id}`,
    name: config.name,
    type: config.type,
    params: config.parameters ?? {},
  };
}

export function buildCustomEvaluator(
  config: CustomStrategyConfig,
): (data: OHLCVData) => StrategyAction {
  const { logic, parameters } = config;
  const descriptor = customStrategyToDescriptor(config);

  return (data: OHLCVData): StrategyAction => {
    if (data.closes.length < 30) return "HOLD";

    const baseResult = executeStrategy(descriptor, data);
    const baseAction = baseResult.action;

    const entryConds = logic.entry;
    const exitConds = logic.exit;

    if (entryConds.length === 0 && exitConds.length === 0) {
      return baseAction;
    }

    const entryMet = entryConds.length === 0 || entryConds.some(cond => {
      const fn = CONDITION_EVALUATORS[cond];
      return fn ? fn(data, parameters) : false;
    });

    const exitMet = exitConds.length === 0 || exitConds.some(cond => {
      const fn = CONDITION_EVALUATORS[cond];
      return fn ? fn(data, parameters) : false;
    });

    if (baseAction === "BUY") return entryMet ? "BUY" : "HOLD";
    if (baseAction === "SELL") return exitMet ? "SELL" : "HOLD";

    if (entryMet && !exitMet) return "BUY";
    if (exitMet && !entryMet) return "SELL";

    return "HOLD";
  };
}

export function runCustomStrategyBacktest(
  config: CustomStrategyConfig,
  data: OHLCVData,
): BacktestResult {
  const { closes } = data;

  if (closes.length < 60) {
    return { winRate: 50, avgReturn: 0, maxDrawdown: 0, totalTrades: 0, equityCurve: [{ bar: 0, equity: 100 }] };
  }

  const evaluate = buildCustomEvaluator(config);
  const holdBars = config.parameters.holdBars ?? 10;
  const trades: number[] = [];
  let equity = 100;
  let equityPeak = 100;
  let maxDD = 0;
  const equityCurve: BacktestPoint[] = [{ bar: 0, equity: 100 }];

  for (let i = 60; i < closes.length - holdBars; i++) {
    const sliceData: OHLCVData = {
      opens: data.opens.slice(0, i + 1),
      highs: data.highs.slice(0, i + 1),
      lows: data.lows.slice(0, i + 1),
      closes: closes.slice(0, i + 1),
      volumes: data.volumes.slice(0, i + 1),
    };

    const action = evaluate(sliceData);

    if (action !== "HOLD") {
      const entryPrice = closes[i];
      const exitPrice = closes[i + holdBars];
      const ret = action === "BUY"
        ? (exitPrice - entryPrice) / entryPrice * 100
        : (entryPrice - exitPrice) / entryPrice * 100;

      trades.push(ret);
      equity *= (1 + ret / 100);

      if (equity > equityPeak) equityPeak = equity;
      const dd = (equityPeak - equity) / equityPeak * 100;
      if (dd > maxDD) maxDD = dd;

      equityCurve.push({ bar: i, equity: parseFloat(equity.toFixed(2)) });
    }
  }

  if (trades.length === 0) {
    return { winRate: 50, avgReturn: 0, maxDrawdown: 0, totalTrades: 0, equityCurve };
  }

  const wins = trades.filter(r => r > 0).length;
  return {
    winRate: parseFloat(((wins / trades.length) * 100).toFixed(2)),
    avgReturn: parseFloat((trades.reduce((a, b) => a + b, 0) / trades.length).toFixed(3)),
    maxDrawdown: parseFloat(maxDD.toFixed(2)),
    totalTrades: trades.length,
    equityCurve,
  };
}

export function buildCustomSignal(
  config: CustomStrategyConfig,
  symbol: string,
  data: OHLCVData,
): { symbol: string; strategyId: string; strategyName: string; action: StrategyAction; confidence: number } {
  const evaluate = buildCustomEvaluator(config);
  const action = evaluate(data);
  return {
    symbol,
    strategyId: `custom_${config.id}`,
    strategyName: config.name,
    action,
    confidence: action === "HOLD" ? 0 : 65,
  };
}
