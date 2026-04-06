import { useMemo } from "react";
import type { StockData } from "@/lib/indicators";

interface CandlestickChartProps {
  data: StockData;
  symbol: string;
  width?: number;
  height?: number;
}

interface Bar {
  idx: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bullish: boolean;
}

function smaArray(prices: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = prices.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function CandlestickChart({ data, symbol, width = 800, height = 380 }: CandlestickChartProps) {
  const bars: Bar[] = useMemo(() => {
    const ohlcv = (data as any).ohlcv as { open: number; high: number; low: number; close: number; volume: number }[] | undefined;
    return data.closes.map((close, i) => ({
      idx: i,
      open: ohlcv?.[i]?.open ?? (i === 0 ? close * (1 + (Math.random() - 0.5) * 0.01) : data.closes[i - 1]),
      high: data.highs[i],
      low: data.lows[i],
      close,
      volume: data.volumes[i],
      bullish: ohlcv ? ohlcv[i].close >= ohlcv[i].open : (i === 0 ? true : close >= data.closes[i - 1]),
    }));
  }, [data]);

  const sma20 = useMemo(() => smaArray(data.closes, 20), [data]);
  const sma50 = useMemo(() => smaArray(data.closes, 50), [data]);

  const chartPadding = { top: 20, right: 60, bottom: 50, left: 10 };
  const chartW = width - chartPadding.left - chartPadding.right;
  const priceH = height * 0.7;
  const volH = height * 0.2;
  const gapH = height * 0.04;

  const priceMin = Math.min(...bars.map(b => b.low)) * 0.998;
  const priceMax = Math.max(...bars.map(b => b.high)) * 1.002;
  const priceRange = priceMax - priceMin || 1;
  const volMax = Math.max(...bars.map(b => b.volume));

  const barW = Math.max(1, (chartW / bars.length) * 0.7);
  const gap = (chartW / bars.length) * 0.3;

  function priceY(p: number) {
    return chartPadding.top + priceH - ((p - priceMin) / priceRange) * priceH;
  }
  function volY(v: number) {
    return chartPadding.top + priceH + gapH + volH - (v / volMax) * volH;
  }
  function barX(i: number) {
    return chartPadding.left + (i / bars.length) * chartW + gap / 2;
  }

  const gridLines = useMemo(() => {
    const lines: number[] = [];
    const step = priceRange / 5;
    for (let i = 0; i <= 5; i++) lines.push(priceMin + step * i);
    return lines;
  }, [priceMin, priceRange]);

  const xLabels = useMemo(() => {
    const step = Math.max(1, Math.floor(bars.length / 6));
    return bars.filter((_, i) => i % step === 0).map(b => ({
      idx: b.idx,
      label: `D${b.idx + 1}`,
    }));
  }, [bars]);

  const smaPath = (arr: (number | null)[], color: string) => {
    const pts = arr.map((v, i) => v != null ? `${barX(i) + barW / 2},${priceY(v)}` : null).filter(Boolean) as string[];
    if (pts.length < 2) return null;
    return <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1" opacity="0.5" />;
  };

  const lastBar = bars[bars.length - 1];
  const lastPrice = lastBar?.close ?? 0;
  const firstPrice = bars[0]?.close ?? 0;
  const pctChange = firstPrice ? ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2) : "0";
  const isUp = lastPrice >= firstPrice;

  return (
    <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold font-mono">{symbol}</span>
          <span className="text-[11px] font-mono text-white/30">OHLCV</span>
          <span className="text-[10px] text-white/15 font-mono">60 bars</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold">${lastPrice.toFixed(2)}</span>
          <span className={`text-[10px] font-mono font-bold ${isUp ? "text-[#00ff88]" : "text-[#ff3366]"}`}>
            {isUp ? "+" : ""}{pctChange}%
          </span>
          <div className="flex items-center gap-2 text-[9px] text-white/15">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#ffd700] inline-block rounded" />SMA20</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#a855f7] inline-block rounded" />SMA50</span>
          </div>
        </div>
      </div>
      <div className="p-2">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {gridLines.map((p, i) => (
            <g key={i}>
              <line x1={chartPadding.left} x2={width - chartPadding.right} y1={priceY(p)} y2={priceY(p)} stroke="white" strokeOpacity="0.03" strokeDasharray="2,4" />
              <text x={width - chartPadding.right + 4} y={priceY(p) + 3} fill="white" fillOpacity="0.12" fontSize="8" fontFamily="JetBrains Mono, monospace">{p.toFixed(2)}</text>
            </g>
          ))}

          <line x1={chartPadding.left} x2={width - chartPadding.right} y1={chartPadding.top + priceH + gapH / 2} y2={chartPadding.top + priceH + gapH / 2} stroke="white" strokeOpacity="0.04" />

          {bars.map(bar => {
            const x = barX(bar.idx);
            const cx = x + barW / 2;
            const bodyTop = priceY(Math.max(bar.open, bar.close));
            const bodyBot = priceY(Math.min(bar.open, bar.close));
            const bodyH = Math.max(1, bodyBot - bodyTop);
            const wickTop = priceY(bar.high);
            const wickBot = priceY(bar.low);
            const vTop = volY(bar.volume);
            const vBot = chartPadding.top + priceH + gapH + volH;
            return (
              <g key={bar.idx}>
                <line x1={cx} x2={cx} y1={wickTop} y2={wickBot} stroke={bar.bullish ? "#00ff88" : "#ff3366"} strokeWidth="0.8" opacity="0.6" />
                <rect x={x} y={bodyTop} width={barW} height={bodyH} fill={bar.bullish ? "#00ff88" : "#ff3366"} opacity={bar.bullish ? 0.8 : 0.9} rx="0.5" />
                <rect x={x} y={vTop} width={barW} height={Math.max(0, vBot - vTop)} fill={bar.bullish ? "#00ff88" : "#ff3366"} opacity="0.15" rx="0.5" />
              </g>
            );
          })}

          {smaPath(sma20, "#ffd700")}
          {smaPath(sma50, "#a855f7")}

          {xLabels.map(xl => (
            <text key={xl.idx} x={barX(xl.idx) + barW / 2} y={height - 8} fill="white" fillOpacity="0.08" fontSize="7" fontFamily="JetBrains Mono, monospace" textAnchor="middle">{xl.label}</text>
          ))}

          <text x={width - chartPadding.right + 4} y={chartPadding.top + priceH + gapH + 10} fill="white" fillOpacity="0.08" fontSize="7" fontFamily="JetBrains Mono, monospace">Vol</text>
        </svg>
      </div>
    </div>
  );
}
