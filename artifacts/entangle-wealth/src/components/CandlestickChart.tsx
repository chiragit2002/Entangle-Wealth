import { useEffect, useRef, useMemo } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData, ColorType, CrosshairMode, type Time } from "lightweight-charts";
import type { StockData } from "@/lib/indicators";

interface CandlestickChartProps {
  data: StockData;
  symbol: string;
  width?: number;
  height?: number;
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

export function CandlestickChart({ data, symbol, height = 380 }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const bars = useMemo(() => {
    const ohlcv = (data as any).ohlcv as { open: number; high: number; low: number; close: number; volume: number }[] | undefined;
    const timestamps = (data as any).timestamps as string[] | undefined;

    return data.closes.map((close, i) => {
      const open = ohlcv?.[i]?.open ?? (i === 0 ? close * (1 + (Math.random() - 0.5) * 0.01) : data.closes[i - 1]);
      const ts = timestamps?.[i];
      let time: string;
      if (ts) {
        time = ts.slice(0, 10);
      } else {
        const d = new Date();
        d.setDate(d.getDate() - (data.closes.length - 1 - i));
        time = d.toISOString().slice(0, 10);
      }
      return {
        time,
        open,
        high: data.highs[i],
        low: data.lows[i],
        close,
        volume: data.volumes[i],
        bullish: close >= open,
      };
    });
  }, [data]);

  const sma20Data = useMemo(() => {
    const sma = smaArray(data.closes, 20);
    return bars.map((b, i) => sma[i] != null ? { time: b.time, value: sma[i]! } : null).filter(Boolean) as { time: string; value: number }[];
  }, [data, bars]);

  const sma50Data = useMemo(() => {
    const sma = smaArray(data.closes, 50);
    return bars.map((b, i) => sma[i] != null ? { time: b.time, value: sma[i]! } : null).filter(Boolean) as { time: string; value: number }[];
  }, [data, bars]);

  const lastBar = bars[bars.length - 1];
  const firstBar = bars[0];
  const lastPrice = lastBar?.close ?? 0;
  const firstPrice = firstBar?.close ?? 0;
  const pctChangeNum = firstPrice ? Math.abs((lastPrice - firstPrice) / firstPrice * 100) : 0;
  const pctChange = pctChangeNum.toFixed(2);
  const isUp = lastPrice >= firstPrice;

  useEffect(() => {
    if (!containerRef.current || !bars.length) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a16" },
        textColor: "rgba(255, 255, 255, 0.35)",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { color: "rgba(255, 255, 255, 0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(0, 212, 255, 0.25)", width: 1, style: 2, labelBackgroundColor: "#0a0a16" },
        horzLine: { color: "rgba(0, 212, 255, 0.25)", width: 1, style: 2, labelBackgroundColor: "#0a0a16" },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00ff88",
      downColor: "#ff3366",
      borderUpColor: "#00ff88",
      borderDownColor: "#ff3366",
      wickUpColor: "#00ff88",
      wickDownColor: "#ff3366",
    });

    const deduped = deduplicateByTime(bars);
    const candleData: CandlestickData[] = deduped.map((b) => ({
      time: b.time as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
    candleSeries.setData(candleData);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    const volumeData: HistogramData[] = deduped.map((b) => ({
      time: b.time as Time,
      value: b.volume,
      color: b.bullish ? "rgba(0, 255, 136, 0.15)" : "rgba(255, 51, 102, 0.15)",
    }));
    volumeSeries.setData(volumeData);

    if (sma20Data.length >= 2) {
      const sma20Series = chart.addSeries(LineSeries, {
        color: "#ffd700",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      sma20Series.setData(deduplicateByTime(sma20Data).map(d => ({ time: d.time as Time, value: d.value })));
    }

    if (sma50Data.length >= 2) {
      const sma50Series = chart.addSeries(LineSeries, {
        color: "#a855f7",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      sma50Series.setData(deduplicateByTime(sma50Data).map(d => ({ time: d.time as Time, value: d.value })));
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, sma20Data, sma50Data, height]);

  return (
    <div className="bg-[#0a0a16] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold font-mono">{symbol}</span>
          <span className="text-[11px] font-mono text-white/30">OHLCV</span>
          <span className="text-[10px] text-white/15 font-mono">{bars.length} bars</span>
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
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

function deduplicateByTime<T extends { time: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.time)) return false;
    seen.add(item.time);
    return true;
  });
}
