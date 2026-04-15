import { useState, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit2, Trash2, Copy, Play, Power, PowerOff, ChevronLeft,
  BarChart3, TrendingUp, TrendingDown, Loader2, X, Check, Tag,
  Zap, Activity, Target, Shield, ArrowDownUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const INDICATOR_TYPES = [
  { value: "EMA_CROSSOVER", label: "EMA Crossover", description: "Fast/slow EMA crossover" },
  { value: "SMA_CROSSOVER", label: "SMA Crossover", description: "Fast/slow SMA crossover" },
  { value: "RSI_OVERSOLD", label: "RSI Oversold", description: "Buy when RSI below threshold" },
  { value: "RSI_OVERBOUGHT", label: "RSI Overbought", description: "Sell when RSI above threshold" },
  { value: "MACD_SIGNAL", label: "MACD Signal", description: "MACD histogram crossover" },
  { value: "BOLLINGER_BOUNCE", label: "Bollinger Bounce", description: "Mean-reversion at band extremes" },
  { value: "BOLLINGER_BREAKOUT", label: "Bollinger Breakout", description: "Breakout beyond Bollinger bands" },
  { value: "STOCHASTIC_OVERSOLD", label: "Stochastic Oversold", description: "Buy when stochastic oversold" },
  { value: "STOCHASTIC_OVERBOUGHT", label: "Stoch Overbought", description: "Sell when stochastic overbought" },
  { value: "WILLIAMS_R_OVERSOLD", label: "Williams %R", description: "Buy on oversold Williams %R" },
  { value: "CCI_EXTREME", label: "CCI Extreme", description: "CCI at extremes" },
  { value: "ROC_MOMENTUM", label: "ROC Momentum", description: "Rate of change momentum" },
  { value: "CMF_FLOW", label: "CMF Flow", description: "Chaikin Money Flow" },
  { value: "OBV_TREND", label: "OBV Trend", description: "On-Balance Volume trend" },
  { value: "RSI_MACD_COMBO", label: "RSI + MACD", description: "Combined RSI and MACD" },
  { value: "EMA_RSI_COMBO", label: "EMA + RSI", description: "EMA trend with RSI filter" },
  { value: "BOLLINGER_RSI_COMBO", label: "BB + RSI", description: "Bollinger + RSI confirmation" },
  { value: "STOCH_RSI_COMBO", label: "Stoch + RSI", description: "Dual oscillator confirmation" },
  { value: "EMA_MACD_COMBO", label: "EMA + MACD", description: "EMA trend + MACD confirmation" },
  { value: "TRIPLE_EMA", label: "Triple EMA", description: "Three EMA alignment" },
  { value: "ADX_TREND", label: "ADX Trend", description: "ADX-filtered trend following" },
  { value: "PRICE_SMA_DISTANCE", label: "Price/SMA Distance", description: "Mean reversion from SMA" },
] as const;

type IndicatorType = typeof INDICATOR_TYPES[number]["value"];

interface LogicConditions {
  entry: string[];
  exit: string[];
}

const LOGIC_CONDITIONS: Record<IndicatorType, LogicConditions> = {
  EMA_CROSSOVER: {
    entry: ["ema_fast_crosses_above_ema_slow", "ema_fast_above_ema_slow"],
    exit: ["ema_fast_crosses_below_ema_slow", "ema_fast_below_ema_slow"],
  },
  SMA_CROSSOVER: {
    entry: ["sma_fast_crosses_above_sma_slow", "sma_fast_above_sma_slow"],
    exit: ["sma_fast_crosses_below_sma_slow", "sma_fast_below_sma_slow"],
  },
  RSI_OVERSOLD: {
    entry: ["rsi_below_threshold", "rsi_crosses_above_threshold_from_below"],
    exit: ["rsi_above_50", "rsi_above_60"],
  },
  RSI_OVERBOUGHT: {
    entry: ["rsi_above_threshold", "rsi_crosses_below_threshold_from_above"],
    exit: ["rsi_below_50", "rsi_below_40"],
  },
  MACD_SIGNAL: {
    entry: ["macd_histogram_crosses_above_zero", "macd_above_signal_line"],
    exit: ["macd_histogram_crosses_below_zero", "macd_below_signal_line"],
  },
  BOLLINGER_BOUNCE: {
    entry: ["price_below_lower_band", "price_near_lower_band"],
    exit: ["price_touches_mid_band", "price_near_upper_band"],
  },
  BOLLINGER_BREAKOUT: {
    entry: ["price_breaks_above_upper_band", "price_breaks_below_lower_band"],
    exit: ["price_returns_to_mid_band"],
  },
  STOCHASTIC_OVERSOLD: {
    entry: ["stochastic_below_threshold", "stochastic_crosses_above_threshold"],
    exit: ["stochastic_above_50", "stochastic_above_70"],
  },
  STOCHASTIC_OVERBOUGHT: {
    entry: ["stochastic_above_threshold", "stochastic_crosses_below_threshold"],
    exit: ["stochastic_below_50", "stochastic_below_30"],
  },
  WILLIAMS_R_OVERSOLD: {
    entry: ["williams_r_below_neg80", "williams_r_oversold"],
    exit: ["williams_r_above_neg20"],
  },
  CCI_EXTREME: {
    entry: ["cci_below_negative_threshold", "cci_above_positive_threshold"],
    exit: ["cci_returns_to_zero"],
  },
  ROC_MOMENTUM: {
    entry: ["roc_above_positive_threshold", "roc_below_negative_threshold"],
    exit: ["roc_crosses_zero"],
  },
  CMF_FLOW: {
    entry: ["cmf_above_zero_threshold", "cmf_below_negative_threshold"],
    exit: ["cmf_crosses_zero"],
  },
  OBV_TREND: {
    entry: ["obv_rising_with_price", "obv_falling_with_price"],
    exit: ["obv_diverges_from_price"],
  },
  RSI_MACD_COMBO: {
    entry: ["rsi_oversold_and_macd_positive", "rsi_overbought_and_macd_negative"],
    exit: ["rsi_normalizes", "macd_reverses"],
  },
  EMA_RSI_COMBO: {
    entry: ["price_above_ema_and_rsi_in_range", "price_below_ema_and_rsi_in_range"],
    exit: ["price_crosses_ema", "rsi_reaches_extreme"],
  },
  BOLLINGER_RSI_COMBO: {
    entry: ["bb_lower_and_rsi_oversold", "bb_upper_and_rsi_overbought"],
    exit: ["bb_mid_and_rsi_neutral"],
  },
  STOCH_RSI_COMBO: {
    entry: ["stoch_oversold_and_rsi_oversold", "stoch_overbought_and_rsi_overbought"],
    exit: ["both_indicators_normalize"],
  },
  EMA_MACD_COMBO: {
    entry: ["price_above_ema_and_macd_positive", "price_below_ema_and_macd_negative"],
    exit: ["price_crosses_ema", "macd_histogram_reverses"],
  },
  TRIPLE_EMA: {
    entry: ["fast_above_mid_above_slow", "fast_below_mid_below_slow"],
    exit: ["fast_crosses_below_mid", "fast_crosses_above_mid"],
  },
  ADX_TREND: {
    entry: ["adx_strong_and_ema_bullish", "adx_strong_and_ema_bearish"],
    exit: ["adx_weakens_below_threshold", "ema_crossover_reversal"],
  },
  PRICE_SMA_DISTANCE: {
    entry: ["price_below_sma_by_threshold", "price_above_sma_by_threshold"],
    exit: ["price_returns_to_sma"],
  },
};

function conditionLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

const PARAM_DEFS: Record<IndicatorType, { key: string; label: string; default: number; min: number; max: number; step: number }[]> = {
  EMA_CROSSOVER: [
    { key: "fast", label: "Fast EMA", default: 12, min: 3, max: 50, step: 1 },
    { key: "slow", label: "Slow EMA", default: 26, min: 10, max: 200, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  SMA_CROSSOVER: [
    { key: "fast", label: "Fast SMA", default: 10, min: 3, max: 50, step: 1 },
    { key: "slow", label: "Slow SMA", default: 20, min: 10, max: 200, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  RSI_OVERSOLD: [
    { key: "period", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "Oversold Threshold", default: 30, min: 10, max: 45, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  RSI_OVERBOUGHT: [
    { key: "period", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "Overbought Threshold", default: 70, min: 55, max: 90, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  MACD_SIGNAL: [
    { key: "fast", label: "MACD Fast", default: 12, min: 5, max: 30, step: 1 },
    { key: "slow", label: "MACD Slow", default: 26, min: 15, max: 60, step: 1 },
    { key: "signal", label: "Signal Line", default: 9, min: 3, max: 20, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  BOLLINGER_BOUNCE: [
    { key: "period", label: "BB Period", default: 20, min: 10, max: 50, step: 1 },
    { key: "mult", label: "Std Dev Multiplier", default: 2, min: 1, max: 4, step: 0.5 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  BOLLINGER_BREAKOUT: [
    { key: "period", label: "BB Period", default: 20, min: 10, max: 50, step: 1 },
    { key: "mult", label: "Std Dev Multiplier", default: 2, min: 1, max: 4, step: 0.5 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  STOCHASTIC_OVERSOLD: [
    { key: "period", label: "Stoch Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "Oversold Level", default: 20, min: 5, max: 35, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  STOCHASTIC_OVERBOUGHT: [
    { key: "period", label: "Stoch Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "Overbought Level", default: 80, min: 65, max: 95, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  WILLIAMS_R_OVERSOLD: [
    { key: "period", label: "Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  CCI_EXTREME: [
    { key: "period", label: "CCI Period", default: 20, min: 10, max: 50, step: 1 },
    { key: "threshold", label: "Extreme Threshold", default: 100, min: 50, max: 200, step: 10 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  ROC_MOMENTUM: [
    { key: "period", label: "ROC Period", default: 12, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "Momentum Threshold %", default: 5, min: 1, max: 20, step: 0.5 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  CMF_FLOW: [
    { key: "period", label: "CMF Period", default: 20, min: 10, max: 40, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  OBV_TREND: [
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  RSI_MACD_COMBO: [
    { key: "rsiPeriod", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "rsiThreshold", label: "RSI Threshold", default: 35, min: 20, max: 50, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  EMA_RSI_COMBO: [
    { key: "emaPeriod", label: "EMA Period", default: 21, min: 5, max: 100, step: 1 },
    { key: "rsiPeriod", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  BOLLINGER_RSI_COMBO: [
    { key: "bbPeriod", label: "BB Period", default: 20, min: 10, max: 50, step: 1 },
    { key: "rsiPeriod", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  STOCH_RSI_COMBO: [
    { key: "stochPeriod", label: "Stoch Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "rsiPeriod", label: "RSI Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  EMA_MACD_COMBO: [
    { key: "emaPeriod", label: "EMA Period", default: 50, min: 20, max: 200, step: 1 },
    { key: "macdFast", label: "MACD Fast", default: 12, min: 5, max: 30, step: 1 },
    { key: "macdSlow", label: "MACD Slow", default: 26, min: 15, max: 60, step: 1 },
    { key: "macdSig", label: "Signal Line", default: 9, min: 3, max: 20, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  TRIPLE_EMA: [
    { key: "fast", label: "Fast EMA", default: 9, min: 3, max: 30, step: 1 },
    { key: "mid", label: "Mid EMA", default: 21, min: 10, max: 80, step: 1 },
    { key: "slow", label: "Slow EMA", default: 50, min: 30, max: 200, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  ADX_TREND: [
    { key: "period", label: "ADX Period", default: 14, min: 5, max: 30, step: 1 },
    { key: "threshold", label: "ADX Threshold", default: 25, min: 15, max: 50, step: 1 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
  PRICE_SMA_DISTANCE: [
    { key: "period", label: "SMA Period", default: 50, min: 20, max: 200, step: 1 },
    { key: "threshold", label: "Distance % Threshold", default: 5, min: 1, max: 20, step: 0.5 },
    { key: "holdBars", label: "Hold Bars", default: 10, min: 1, max: 60, step: 1 },
  ],
};

const POPULAR_ASSETS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO",
  "AMD", "NFLX", "ADBE", "CRM", "PLTR", "COIN", "SOFI", "SHOP",
];

const TIMEFRAMES = [
  { value: "1Day", label: "Daily" },
  { value: "1Hour", label: "1 Hour" },
  { value: "1Week", label: "Weekly" },
];

interface TemplateConfig {
  name: string;
  type: IndicatorType;
  assets: string[];
  timeframes: string[];
  parameters: Record<string, number>;
  logic: { entry: string[]; exit: string[] };
  metadata: { tags: string[]; author: string };
}

const TEMPLATES: TemplateConfig[] = [
  {
    name: "EMA Trend Rider",
    type: "EMA_CROSSOVER",
    assets: ["AAPL", "MSFT", "NVDA"],
    timeframes: ["1Day"],
    parameters: { fast: 12, slow: 26, holdBars: 10 },
    logic: { entry: ["ema_fast_crosses_above_ema_slow"], exit: ["ema_fast_crosses_below_ema_slow"] },
    metadata: { tags: ["trend", "ema", "swing"], author: "template" },
  },
  {
    name: "RSI Bounce",
    type: "RSI_OVERSOLD",
    assets: ["AAPL", "AMZN", "GOOGL"],
    timeframes: ["1Day"],
    parameters: { period: 14, threshold: 30, holdBars: 10 },
    logic: { entry: ["rsi_below_threshold"], exit: ["rsi_above_50"] },
    metadata: { tags: ["rsi", "mean-reversion", "oversold"], author: "template" },
  },
  {
    name: "MACD Momentum",
    type: "MACD_SIGNAL",
    assets: ["TSLA", "NVDA", "AMD"],
    timeframes: ["1Day"],
    parameters: { fast: 12, slow: 26, signal: 9, holdBars: 15 },
    logic: { entry: ["macd_histogram_crosses_above_zero"], exit: ["macd_histogram_crosses_below_zero"] },
    metadata: { tags: ["macd", "momentum", "trend"], author: "template" },
  },
  {
    name: "Bollinger Squeeze",
    type: "BOLLINGER_BOUNCE",
    assets: ["AAPL"],
    timeframes: ["1Day"],
    parameters: { period: 20, mult: 2, holdBars: 8 },
    logic: { entry: ["price_below_lower_band"], exit: ["price_touches_mid_band"] },
    metadata: { tags: ["bollinger", "mean-reversion", "volatility"], author: "template" },
  },
  {
    name: "Triple EMA Trend",
    type: "TRIPLE_EMA",
    assets: ["AAPL", "MSFT", "GOOGL", "AMZN"],
    timeframes: ["1Day"],
    parameters: { fast: 9, mid: 21, slow: 50, holdBars: 20 },
    logic: { entry: ["fast_above_mid_above_slow"], exit: ["fast_crosses_below_mid"] },
    metadata: { tags: ["ema", "trend", "triple"], author: "template" },
  },
];

interface Strategy {
  id: number;
  name: string;
  version: string;
  type: string;
  assets: string[];
  timeframes: string[];
  parameters: Record<string, number>;
  logic: { entry: string[]; exit: string[] };
  metadata: { tags?: string[]; author?: string };
  isActive: boolean;
  backtestResults?: {
    winRate: number;
    avgReturn: number;
    maxDrawdown: number;
    totalTrades: number;
    equityCurve: { bar: number; equity: number }[];
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  name: string;
  type: IndicatorType;
  assets: string[];
  timeframes: string[];
  parameters: Record<string, number>;
  logic: { entry: string[]; exit: string[] };
  tags: string;
}

function defaultParams(type: IndicatorType): Record<string, number> {
  const defs = PARAM_DEFS[type] ?? [];
  return Object.fromEntries(defs.map(d => [d.key, d.default]));
}

function emptyForm(): FormState {
  const type: IndicatorType = "EMA_CROSSOVER";
  return {
    name: "",
    type,
    assets: ["AAPL"],
    timeframes: ["1Day"],
    parameters: defaultParams(type),
    logic: { entry: [LOGIC_CONDITIONS[type].entry[0]], exit: [LOGIC_CONDITIONS[type].exit[0]] },
    tags: "",
  };
}

function BadgePill({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "red" | "purple" | "yellow" }) {
  const colors: Record<string, string> = {
    blue: "bg-[#00d4ff]/10 border-[#00d4ff]/20 text-[#00d4ff]",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}

function LogicRuleSelector({
  label,
  color,
  availableConditions,
  selected,
  onChange,
}: {
  label: string;
  color: "green" | "red";
  availableConditions: string[];
  selected: string[];
  onChange: (rules: string[]) => void;
}) {
  const colorClass = color === "green"
    ? "border-green-500/20 bg-green-500/5 text-green-400"
    : "border-red-500/20 bg-red-500/5 text-red-400";

  function toggle(cond: string) {
    if (selected.includes(cond)) {
      onChange(selected.filter(c => c !== cond));
    } else {
      onChange([...selected, cond]);
    }
  }

  return (
    <div>
      <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${color === "green" ? "text-green-400" : "text-red-400"}`}>
        {label}
      </label>
      <div className="space-y-1">
        {availableConditions.map(cond => (
          <button
            key={cond}
            type="button"
            onClick={() => toggle(cond)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${selected.includes(cond) ? colorClass : "border-white/8 bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/70"}`}
          >
            <div className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${selected.includes(cond) ? (color === "green" ? "border-green-500 bg-green-500/30" : "border-red-500 bg-red-500/30") : "border-white/20"}`}>
              {selected.includes(cond) && <Check className="w-2 h-2" />}
            </div>
            {conditionLabel(cond)}
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-white/25 mt-1 px-1">Select at least one condition</p>
      )}
    </div>
  );
}

export default function StrategyBuilder() {
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "form" | "backtest">("list");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [backtestTarget, setBacktestTarget] = useState<Strategy | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestResults, setBacktestResults] = useState<Strategy["backtestResults"] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/strategies`);
      if (!res.ok) throw new Error("Failed to load strategies");
      const data = await res.json() as { strategies: Strategy[] };
      setStrategies(data.strategies);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Failed to load strategies", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchStrategies(); }, [fetchStrategies]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setView("form");
  }

  function startEdit(s: Strategy) {
    const type = s.type as IndicatorType;
    setEditingId(s.id);
    setForm({
      name: s.name,
      type: PARAM_DEFS[type] ? type : "EMA_CROSSOVER",
      assets: s.assets,
      timeframes: s.timeframes,
      parameters: s.parameters,
      logic: s.logic,
      tags: (s.metadata?.tags ?? []).join(", "),
    });
    setView("form");
  }

  function loadTemplate(t: TemplateConfig) {
    setEditingId(null);
    setForm({
      name: t.name,
      type: t.type,
      assets: [...t.assets],
      timeframes: [...t.timeframes],
      parameters: { ...t.parameters },
      logic: { entry: [...t.logic.entry], exit: [...t.logic.exit] },
      tags: t.metadata.tags.join(", "),
    });
    setView("form");
  }

  function handleTypeChange(type: IndicatorType) {
    const conditions = LOGIC_CONDITIONS[type];
    setForm(f => ({
      ...f,
      type,
      parameters: defaultParams(type),
      logic: {
        entry: conditions.entry.length > 0 ? [conditions.entry[0]] : [],
        exit: conditions.exit.length > 0 ? [conditions.exit[0]] : [],
      },
    }));
  }

  function toggleAsset(asset: string) {
    setForm(f => {
      const has = f.assets.includes(asset);
      return { ...f, assets: has ? f.assets.filter(a => a !== asset) : [...f.assets, asset] };
    });
  }

  function toggleTimeframe(tf: string) {
    setForm(f => ({ ...f, timeframes: [tf] }));
  }

  function setParam(key: string, value: number) {
    setForm(f => ({ ...f, parameters: { ...f.parameters, [key]: value } }));
  }

  async function saveStrategy() {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Please give your strategy a name.", variant: "destructive" });
      return;
    }
    if (form.assets.length === 0) {
      toast({ title: "Assets required", description: "Select at least one asset.", variant: "destructive" });
      return;
    }
    if (form.logic.entry.length === 0) {
      toast({ title: "Entry condition required", description: "Select at least one entry rule.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const body = {
        name: form.name,
        type: form.type,
        assets: form.assets,
        timeframes: form.timeframes,
        parameters: form.parameters,
        logic: form.logic,
        metadata: { tags },
      };

      const url = editingId ? `${BASE_URL}/api/strategies/${editingId}` : `${BASE_URL}/api/strategies`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to save");
      }

      toast({ title: editingId ? "Strategy updated" : "Strategy created" });
      setView("list");
      fetchStrategies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteStrategy(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`${BASE_URL}/api/strategies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setStrategies(ss => ss.filter(s => s.id !== id));
      toast({ title: "Strategy deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  async function duplicateStrategy(id: number) {
    try {
      const res = await fetch(`${BASE_URL}/api/strategies/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Duplicate failed");
      toast({ title: "Strategy duplicated" });
      fetchStrategies();
    } catch {
      toast({ title: "Duplicate failed", variant: "destructive" });
    }
  }

  async function toggleActive(s: Strategy) {
    setTogglingId(s.id);
    try {
      const action = s.isActive ? "deactivate" : "activate";
      const res = await fetch(`${BASE_URL}/api/strategies/${s.id}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error("Toggle failed");
      const data = await res.json() as { strategy: Strategy };
      setStrategies(ss => ss.map(x => x.id === s.id ? data.strategy : x));
      toast({ title: s.isActive ? "Strategy deactivated" : "Strategy activated — now feeding into quant engine" });
    } catch {
      toast({ title: "Failed to toggle strategy", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  }

  async function runBacktest(s: Strategy) {
    setBacktestTarget(s);
    setBacktestResults(null);
    setView("backtest");
    setBacktestLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/strategies/${s.id}/backtest`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Backtest failed");
      }
      const data = await res.json() as { results: Strategy["backtestResults"] };
      setBacktestResults(data.results);
      setStrategies(ss => ss.map(x => x.id === s.id ? { ...x, backtestResults: data.results } : x));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backtest failed";
      toast({ title: "Backtest failed", description: msg, variant: "destructive" });
      setView("list");
    } finally {
      setBacktestLoading(false);
    }
  }

  const paramDefs = PARAM_DEFS[form.type] ?? [];
  const logicConditions = LOGIC_CONDITIONS[form.type] ?? { entry: [], exit: [] };
  const activeCount = strategies.filter(s => s.isActive).length;

  return (
    <PageErrorBoundary>
      <Layout>
        <div className="min-h-screen bg-black text-white">
          <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {view !== "list" && (
                    <button
                      onClick={() => setView("list")}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Strategy Builder</h1>
                    <p className="text-sm text-white/50">
                      {view === "list" ? "Create, backtest, and activate custom trading strategies" :
                       view === "form" ? (editingId ? "Edit Strategy" : "New Strategy") :
                       `Backtesting: ${backtestTarget?.name}`}
                    </p>
                  </div>
                </div>
              </div>
              {view === "list" && (
                <Button onClick={startCreate} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" /> New Strategy
                </Button>
              )}
              {view === "form" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setView("list")} className="border-white/10 text-white/70">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveStrategy} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                    {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                    {editingId ? "Save Changes" : "Create Strategy"}
                  </Button>
                </div>
              )}
            </div>

            {/* LIST VIEW */}
            {view === "list" && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                    <Activity className="w-6 h-6 text-purple-400" />
                    <div>
                      <div className="text-xl font-bold text-white">{strategies.length}</div>
                      <div className="text-xs text-white/40">Total Strategies</div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                    <Power className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="text-xl font-bold text-white">{activeCount}</div>
                      <div className="text-xs text-white/40">Active in Engine</div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                    <div>
                      <div className="text-xl font-bold text-white">{strategies.filter(s => s.backtestResults).length}</div>
                      <div className="text-xs text-white/40">Backtested</div>
                    </div>
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-white/40" />
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Pre-built Templates</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.name}
                        onClick={() => loadTemplate(t)}
                        className="text-left p-3 bg-white/[0.02] border border-white/8 rounded-xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group"
                      >
                        <div className="text-xs font-semibold text-white/80 group-hover:text-purple-300 mb-1">{t.name}</div>
                        <div className="text-xs text-white/30">{INDICATOR_TYPES.find(i => i.value === t.type)?.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strategy list */}
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : strategies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm">No strategies yet. Create one or load a template above.</p>
                    <Button onClick={startCreate} variant="outline" size="sm" className="border-white/10 text-white/60">
                      <Plus className="w-4 h-4 mr-1.5" /> Create First Strategy
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {strategies.map(s => (
                      <div key={s.id} className="bg-white/[0.02] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-white">{s.name}</span>
                              {s.isActive && <BadgePill color="green">Active</BadgePill>}
                              <BadgePill color="purple">
                                {INDICATOR_TYPES.find(i => i.value === s.type)?.label ?? s.type}
                              </BadgePill>
                              {(s.metadata?.tags ?? []).map(tag => (
                                <BadgePill key={tag} color="blue">{tag}</BadgePill>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-2">
                              <span>Assets: {s.assets.join(", ")}</span>
                              <span>Timeframe: {s.timeframes.join(", ")}</span>
                            </div>
                            {s.logic.entry.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                <span className="text-xs text-green-400/60">Entry:</span>
                                {s.logic.entry.map(e => (
                                  <span key={e} className="text-xs text-green-400/80 bg-green-500/5 border border-green-500/10 px-1.5 py-0.5 rounded">
                                    {conditionLabel(e)}
                                  </span>
                                ))}
                                {s.logic.exit.length > 0 && (
                                  <>
                                    <span className="text-xs text-red-400/60 ml-1">Exit:</span>
                                    {s.logic.exit.map(e => (
                                      <span key={e} className="text-xs text-red-400/80 bg-red-500/5 border border-red-500/10 px-1.5 py-0.5 rounded">
                                        {conditionLabel(e)}
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                            {s.backtestResults && (
                              <div className="flex flex-wrap gap-4 text-xs mt-1">
                                <div>
                                  <span className="text-white/40">Win Rate </span>
                                  <span className={`font-semibold ${s.backtestResults.winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                                    {s.backtestResults.winRate.toFixed(1)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-white/40">Avg Return </span>
                                  <span className={`font-semibold ${s.backtestResults.avgReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                                    {s.backtestResults.avgReturn >= 0 ? "+" : ""}{s.backtestResults.avgReturn.toFixed(2)}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-white/40">Max DD </span>
                                  <span className="font-semibold text-yellow-400">{s.backtestResults.maxDrawdown.toFixed(1)}%</span>
                                </div>
                                <div>
                                  <span className="text-white/40">Trades </span>
                                  <span className="font-semibold text-white/70">{s.backtestResults.totalTrades}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleActive(s)}
                              disabled={togglingId === s.id}
                              title={s.isActive ? "Deactivate" : "Activate"}
                              className={`p-1.5 rounded-lg transition-colors ${s.isActive ? "text-green-400 hover:bg-green-500/10" : "text-white/30 hover:text-white/60 hover:bg-white/5"}`}
                            >
                              {togglingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : s.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => runBacktest(s)}
                              title="Run Backtest"
                              className="p-1.5 rounded-lg text-white/30 hover:text-[#00d4ff] hover:bg-[#00d4ff]/10 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEdit(s)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => duplicateStrategy(s.id)}
                              title="Duplicate"
                              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStrategy(s.id)}
                              disabled={deletingId === s.id}
                              title="Delete"
                              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* FORM VIEW */}
            {view === "form" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Main form */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Name */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Strategy Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. My EMA Strategy"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  {/* Indicator type */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Indicator Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INDICATOR_TYPES.map(ind => (
                        <button
                          key={ind.value}
                          onClick={() => handleTypeChange(ind.value)}
                          className={`text-left p-2.5 rounded-lg border text-xs transition-all ${form.type === ind.value ? "border-purple-500/50 bg-purple-500/10 text-purple-300" : "border-white/8 bg-white/[0.02] text-white/50 hover:border-white/15 hover:text-white/80"}`}
                        >
                          <div className="font-medium">{ind.label}</div>
                          <div className="text-white/30 text-[10px] mt-0.5">{ind.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entry / Exit Logic Builder */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <ArrowDownUp className="w-4 h-4 text-white/40" />
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Entry / Exit Logic</label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <LogicRuleSelector
                        label="Entry Conditions (BUY trigger)"
                        color="green"
                        availableConditions={logicConditions.entry}
                        selected={form.logic.entry}
                        onChange={entry => setForm(f => ({ ...f, logic: { ...f.logic, entry } }))}
                      />
                      <LogicRuleSelector
                        label="Exit Conditions (SELL trigger)"
                        color="red"
                        availableConditions={logicConditions.exit}
                        selected={form.logic.exit}
                        onChange={exit => setForm(f => ({ ...f, logic: { ...f.logic, exit } }))}
                      />
                    </div>
                    <p className="text-xs text-white/25">
                      These conditions determine when the strategy triggers entry and exit signals. A signal fires when ANY selected condition is met (OR logic).
                    </p>
                  </div>

                  {/* Parameters */}
                  {paramDefs.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Parameters</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {paramDefs.map(def => (
                          <div key={def.key}>
                            <label className="text-xs text-white/40 mb-1 block">{def.label}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={def.min}
                                max={def.max}
                                step={def.step}
                                value={form.parameters[def.key] ?? def.default}
                                onChange={e => setParam(def.key, parseFloat(e.target.value))}
                                className="flex-1 accent-purple-500 h-1"
                              />
                              <span className="text-xs font-mono text-purple-300 w-8 text-right">
                                {form.parameters[def.key] ?? def.default}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Target Assets</label>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_ASSETS.map(asset => (
                        <button
                          key={asset}
                          onClick={() => toggleAsset(asset)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${form.assets.includes(asset) ? "border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]" : "border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/70"}`}
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add custom symbol (e.g. CRWD) — press Enter"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-primary/50"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                            if (val && !form.assets.includes(val)) {
                              setForm(f => ({ ...f, assets: [...f.assets, val] }));
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                    {form.assets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.assets.map(a => (
                          <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs">
                            {a}
                            <button onClick={() => setForm(f => ({ ...f, assets: f.assets.filter(x => x !== a) }))} className="hover:text-white">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timeframe */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Timeframe</label>
                    <div className="flex flex-wrap gap-2">
                      {TIMEFRAMES.map(tf => (
                        <button
                          key={tf.value}
                          onClick={() => toggleTimeframe(tf.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.timeframes.includes(tf.value) ? "border-purple-500/40 bg-purple-500/10 text-purple-300" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}
                        >
                          {tf.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                      placeholder="e.g. trend, momentum, swing"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Right: Summary */}
                <div className="space-y-4">
                  <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 sticky top-24">
                    <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Strategy Preview</div>
                    <div className="space-y-2.5 text-sm">
                      <div>
                        <span className="text-white/40 text-xs">Name</span>
                        <div className="text-white font-medium">{form.name || "—"}</div>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Type</span>
                        <div className="text-purple-300 font-medium">{INDICATOR_TYPES.find(i => i.value === form.type)?.label}</div>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Entry Rules</span>
                        <div className="text-green-400 text-xs">{form.logic.entry.map(conditionLabel).join(", ") || "None"}</div>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Exit Rules</span>
                        <div className="text-red-400 text-xs">{form.logic.exit.map(conditionLabel).join(", ") || "None"}</div>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Assets</span>
                        <div className="text-[#00d4ff] text-xs font-mono">{form.assets.join(", ") || "None selected"}</div>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Timeframe</span>
                        <div className="text-white/70 text-xs">{form.timeframes.join(", ") || "None"}</div>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Parameters</span>
                        <div className="space-y-1 mt-1">
                          {Object.entries(form.parameters).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-white/40">{k}</span>
                              <span className="text-white/70 font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <Button
                        onClick={saveStrategy}
                        disabled={saving}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                        size="sm"
                      >
                        {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                        {editingId ? "Save Changes" : "Create Strategy"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BACKTEST VIEW */}
            {view === "backtest" && backtestTarget && (
              <div className="space-y-5">
                {backtestLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                    <p className="text-white/50 text-sm">Running backtest against historical data…</p>
                    <p className="text-white/25 text-xs">This may take 20–40 seconds</p>
                  </div>
                ) : backtestResults ? (
                  <>
                    {/* Result cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={`bg-white/[0.02] border rounded-xl p-4 ${backtestResults.winRate >= 50 ? "border-green-500/20" : "border-red-500/20"}`}>
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Win Rate</div>
                        <div className={`text-2xl font-bold ${backtestResults.winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                          {backtestResults.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div className={`bg-white/[0.02] border rounded-xl p-4 ${backtestResults.avgReturn >= 0 ? "border-green-500/20" : "border-red-500/20"}`}>
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1">
                          {backtestResults.avgReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          Avg Return
                        </div>
                        <div className={`text-2xl font-bold ${backtestResults.avgReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {backtestResults.avgReturn >= 0 ? "+" : ""}{backtestResults.avgReturn.toFixed(2)}%
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-yellow-500/20 rounded-xl p-4">
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Max Drawdown</div>
                        <div className="text-2xl font-bold text-yellow-400">{backtestResults.maxDrawdown.toFixed(1)}%</div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4">
                        <div className="text-xs text-white/40 mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Total Trades</div>
                        <div className="text-2xl font-bold text-white">{backtestResults.totalTrades}</div>
                      </div>
                    </div>

                    {/* Equity curve */}
                    {backtestResults.equityCurve.length > 2 && (
                      <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4">
                        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Equity Curve</div>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={backtestResults.equityCurve}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="bar" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} />
                            <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                            <Tooltip
                              contentStyle={{ background: "#0a0e1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                              formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="equity"
                              stroke={backtestResults.avgReturn >= 0 ? "#22c55e" : "#ef4444"}
                              strokeWidth={1.5}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <Button
                        onClick={() => { setView("list"); }}
                        variant="outline"
                        className="border-white/10 text-white/70"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1.5" /> Back to Strategies
                      </Button>
                      <Button
                        onClick={() => startEdit(backtestTarget)}
                        variant="outline"
                        className="border-white/10 text-white/70"
                      >
                        <Edit2 className="w-4 h-4 mr-1.5" /> Edit Strategy
                      </Button>
                      {!backtestTarget.isActive && (
                        <Button
                          onClick={() => { toggleActive(backtestTarget); setView("list"); }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Power className="w-4 h-4 mr-1.5" /> Activate Strategy
                        </Button>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </PageErrorBoundary>
  );
}
