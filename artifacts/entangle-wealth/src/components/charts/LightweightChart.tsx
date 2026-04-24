import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData, ColorType, CrosshairMode, type Time } from "lightweight-charts";

interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface LightweightChartProps {
  data: ChartDataPoint[];
  height?: number;
  showVolume?: boolean;
  upColor?: string;
  downColor?: string;
}

export default function LightweightChart({
  data,
  height = 400,
  showVolume = true,
  upColor = "#00B4D8",
  downColor = "#ff3366",
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cs = getComputedStyle(document.documentElement);
    const hsl = (v: string) => `hsl(${cs.getPropertyValue(v).trim()})`;
    const textColor = hsl("--muted-foreground");
    const borderColor = hsl("--border");
    const cardColor = hsl("--card");

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(0,180,216, 0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(0,180,216, 0.3)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor,
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.25 : 0.1 },
      },
      timeScale: {
        borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
    candleSeriesRef.current = candleSeries;

    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeriesRef.current = volumeSeries;
    }

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
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, showVolume, upColor, downColor]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    if (!data.length) {
      candleSeriesRef.current.setData([]);
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
      return;
    }

    const candleData: CandlestickData[] = data.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeriesRef.current.setData(candleData);

    if (volumeSeriesRef.current && showVolume) {
      const volumeData: HistogramData[] = data.map((d) => ({
        time: d.time as Time,
        value: d.volume || 0,
        color: d.close >= d.open ? "rgba(0, 230, 118, 0.3)" : "rgba(255, 51, 102, 0.3)",
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, showVolume]);

  return (
    <div ref={containerRef} className="w-full rounded-lg overflow-hidden" style={{ height }} />
  );
}
