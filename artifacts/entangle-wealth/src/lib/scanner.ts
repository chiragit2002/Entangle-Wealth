import type { StockData, IndicatorResult } from "./indicators";
import { runAllIndicators, getOverallSignal, generateMockOHLCV } from "./indicators";
import { fetchBars, barsToStockData, type AlpacaBar } from "./alpaca";

export interface ScanResult {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  score: number;
  signal: IndicatorResult["signal"];
  buyCount: number;
  sellCount: number;
  neutralCount: number;
  confidence: number;
  bullPoints: string[];
  bearPoints: string[];
  optionSetup?: OptionSignal;
}

export interface OptionSignal {
  type: "CALL" | "PUT";
  strategy: string;
  confidence: number;
  entry: string;
  target: string;
  stop: string;
  riskReward: string;
  reasoning: string;
}

export interface ClaudeAnalysis {
  summary: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  entry: string;
  target: string;
  stop: string;
  riskReward: string;
  callSetup?: string;
  putSetup?: string;
  keyLevels: string[];
  risks: string[];
  catalysts: string[];
}

export const SCAN_TICKERS: { symbol: string; name: string; sector: string }[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology" },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer" },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology" },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Communication" },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication" },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology" },
  { symbol: "RKLB", name: "Rocket Lab USA Inc.", sector: "Industrials" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology" },
  { symbol: "SOFI", name: "SoFi Technologies Inc.", sector: "Financial" },
  { symbol: "RIVN", name: "Rivian Automotive Inc.", sector: "Consumer" },
  { symbol: "COIN", name: "Coinbase Global Inc.", sector: "Financial" },
  { symbol: "SNOW", name: "Snowflake Inc.", sector: "Technology" },
  { symbol: "SQ", name: "Block Inc.", sector: "Financial" },
  { symbol: "SHOP", name: "Shopify Inc.", sector: "Technology" },
  { symbol: "ROKU", name: "Roku Inc.", sector: "Communication" },
  { symbol: "DKNG", name: "DraftKings Inc.", sector: "Consumer" },
  { symbol: "HOOD", name: "Robinhood Markets Inc.", sector: "Financial" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial" },
  { symbol: "V", name: "Visa Inc.", sector: "Financial" },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "DIS", name: "Walt Disney Co.", sector: "Communication" },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Financial" },
  { symbol: "BA", name: "Boeing Co.", sector: "Industrials" },
  { symbol: "UBER", name: "Uber Technologies Inc.", sector: "Technology" },
  { symbol: "ABNB", name: "Airbnb Inc.", sector: "Consumer" },
  { symbol: "SPOT", name: "Spotify Technology S.A.", sector: "Communication" },
  { symbol: "SNAP", name: "Snap Inc.", sector: "Communication" },
  { symbol: "BABA", name: "Alibaba Group", sector: "Consumer" },
  { symbol: "TSM", name: "Taiwan Semiconductor", sector: "Technology" },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology" },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology" },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology" },
  { symbol: "PEP", name: "PepsiCo Inc.", sector: "Consumer" },
  { symbol: "KO", name: "Coca-Cola Co.", sector: "Consumer" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer" },
  { symbol: "GS", name: "Goldman Sachs Group", sector: "Financial" },
  { symbol: "BAC", name: "Bank of America Corp.", sector: "Financial" },
  { symbol: "QCOM", name: "QUALCOMM Inc.", sector: "Technology" },
  { symbol: "MU", name: "Micron Technology", sector: "Technology" },
  { symbol: "PANW", name: "Palo Alto Networks", sector: "Technology" },
  { symbol: "CRWD", name: "CrowdStrike Holdings", sector: "Technology" },
  { symbol: "NET", name: "Cloudflare Inc.", sector: "Technology" },
  { symbol: "DDOG", name: "Datadog Inc.", sector: "Technology" },
  { symbol: "NOW", name: "ServiceNow Inc.", sector: "Technology" },
  { symbol: "ISRG", name: "Intuitive Surgical", sector: "Healthcare" },
  { symbol: "LLY", name: "Eli Lilly and Co.", sector: "Healthcare" },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare" },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare" },
  { symbol: "MRNA", name: "Moderna Inc.", sector: "Healthcare" },
  { symbol: "XOM", name: "Exxon Mobil Corp.", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corporation", sector: "Energy" },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials" },
  { symbol: "DE", name: "Deere & Co.", sector: "Industrials" },
  { symbol: "LMT", name: "Lockheed Martin Corp.", sector: "Industrials" },
  { symbol: "RTX", name: "RTX Corporation", sector: "Industrials" },
  { symbol: "GME", name: "GameStop Corp.", sector: "Consumer" },
  { symbol: "AMC", name: "AMC Entertainment", sector: "Communication" },
  { symbol: "SMCI", name: "Super Micro Computer", sector: "Technology" },
  { symbol: "ARM", name: "Arm Holdings PLC", sector: "Technology" },
  { symbol: "IONQ", name: "IonQ Inc.", sector: "Technology" },
  { symbol: "AI", name: "C3.ai Inc.", sector: "Technology" },
  { symbol: "MELI", name: "MercadoLibre Inc.", sector: "Consumer" },
  { symbol: "NU", name: "Nu Holdings Ltd.", sector: "Financial" },
  { symbol: "UPST", name: "Upstart Holdings Inc.", sector: "Financial" },
  { symbol: "AFRM", name: "Affirm Holdings Inc.", sector: "Financial" },
  { symbol: "TTD", name: "The Trade Desk Inc.", sector: "Technology" },
  { symbol: "ZM", name: "Zoom Video Comm.", sector: "Technology" },
  { symbol: "DOCU", name: "DocuSign Inc.", sector: "Technology" },
  { symbol: "OKTA", name: "Okta Inc.", sector: "Technology" },
  { symbol: "FSLR", name: "First Solar Inc.", sector: "Technology" },
  { symbol: "ENPH", name: "Enphase Energy Inc.", sector: "Technology" },
  { symbol: "PLUG", name: "Plug Power Inc.", sector: "Industrials" },
  { symbol: "LCID", name: "Lucid Group Inc.", sector: "Consumer" },
  { symbol: "NIO", name: "NIO Inc.", sector: "Consumer" },
  { symbol: "MARA", name: "Marathon Digital Holdings", sector: "Financial" },
  { symbol: "RIOT", name: "Riot Platforms Inc.", sector: "Financial" },
  { symbol: "PINS", name: "Pinterest Inc.", sector: "Communication" },
  { symbol: "TWLO", name: "Twilio Inc.", sector: "Technology" },
  { symbol: "MDB", name: "MongoDB Inc.", sector: "Technology" },
  { symbol: "WDAY", name: "Workday Inc.", sector: "Technology" },
  { symbol: "INTU", name: "Intuit Inc.", sector: "Technology" },
  { symbol: "REGN", name: "Regeneron Pharmaceuticals", sector: "Healthcare" },
  { symbol: "VRTX", name: "Vertex Pharmaceuticals", sector: "Healthcare" },
  { symbol: "GILD", name: "Gilead Sciences", sector: "Healthcare" },
  { symbol: "AMGN", name: "Amgen Inc.", sector: "Healthcare" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy" },
  { symbol: "DVN", name: "Devon Energy Corp.", sector: "Energy" },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials" },
  { symbol: "HON", name: "Honeywell International", sector: "Industrials" },
  { symbol: "COST", name: "Costco Wholesale Corp.", sector: "Consumer" },
  { symbol: "SBUX", name: "Starbucks Corp.", sector: "Consumer" },
  { symbol: "MCD", name: "McDonald's Corp.", sector: "Consumer" },
  { symbol: "T", name: "AT&T Inc.", sector: "Communication" },
  { symbol: "VZ", name: "Verizon Communications", sector: "Communication" },
  { symbol: "SE", name: "Sea Limited", sector: "Consumer" },
  { symbol: "RBLX", name: "Roblox Corporation", sector: "Communication" },
  { symbol: "EA", name: "Electronic Arts Inc.", sector: "Communication" },
  { symbol: "U", name: "Unity Software Inc.", sector: "Technology" },
  { symbol: "PATH", name: "UiPath Inc.", sector: "Technology" },
  { symbol: "BILL", name: "BILL Holdings Inc.", sector: "Technology" },
  { symbol: "HUBS", name: "HubSpot Inc.", sector: "Technology" },
];

function mockPrice(sym: string): number {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = ((h << 5) - h + sym.charCodeAt(i)) | 0;
  return 10 + Math.abs(h % 900) + Math.random() * 5;
}

function generateBullBearPoints(results: IndicatorResult[]): { bull: string[]; bear: string[] } {
  const bull: string[] = [];
  const bear: string[] = [];
  for (const r of results) {
    if (r.signal === "STRONG_BUY") bull.push(`${r.name}: Strong Buy (${r.value})`);
    else if (r.signal === "BUY") bull.push(`${r.name}: Buy (${r.value})`);
    else if (r.signal === "STRONG_SELL") bear.push(`${r.name}: Strong Sell (${r.value})`);
    else if (r.signal === "SELL") bear.push(`${r.name}: Sell (${r.value})`);
  }
  return { bull: bull.slice(0, 5), bear: bear.slice(0, 5) };
}

function generateOptionSignal(result: ScanResult, data: StockData): OptionSignal | undefined {
  const price = data.closes[data.closes.length - 1];
  const atr = calcATRSimple(data.highs, data.lows, data.closes, 14);

  if (result.score >= 65 && result.signal !== "SELL" && result.signal !== "STRONG_SELL") {
    const target = price + atr * 2;
    const stop = price - atr;
    return {
      type: "CALL",
      strategy: result.confidence >= 75 ? "Long Call" : "Bull Call Spread",
      confidence: result.confidence,
      entry: `$${price.toFixed(2)}`,
      target: `$${target.toFixed(2)}`,
      stop: `$${stop.toFixed(2)}`,
      riskReward: `1:${((target - price) / (price - stop)).toFixed(1)}`,
      reasoning: `${result.buyCount} buy signals, ${result.confidence}% confidence. ${result.bullPoints.slice(0, 2).join(". ")}`,
    };
  }

  if (result.score <= 35 && (result.signal === "SELL" || result.signal === "STRONG_SELL")) {
    const target = price - atr * 2;
    const stop = price + atr;
    return {
      type: "PUT",
      strategy: result.confidence >= 75 ? "Long Put" : "Bear Put Spread",
      confidence: result.confidence,
      entry: `$${price.toFixed(2)}`,
      target: `$${target.toFixed(2)}`,
      stop: `$${stop.toFixed(2)}`,
      riskReward: `1:${((price - target) / (stop - price)).toFixed(1)}`,
      reasoning: `${result.sellCount} sell signals, ${result.confidence}% confidence. ${result.bearPoints.slice(0, 2).join(". ")}`,
    };
  }

  return undefined;
}

function calcATRSimple(highs: number[], lows: number[], closes: number[], period: number): number {
  if (highs.length < 2) return highs.length > 0 ? highs[0] - lows[0] : 0;
  let sum = 0;
  const start = Math.max(1, highs.length - period);
  for (let i = start; i < highs.length; i++) {
    sum += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }
  const count = Math.max(1, Math.min(period, highs.length - 1));
  return sum / count;
}

export async function runScanner(
  onProgress?: (done: number, total: number) => void
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  const total = SCAN_TICKERS.length;
  const batchSize = 10;

  for (let batchStart = 0; batchStart < total; batchStart += batchSize) {
    const batch = SCAN_TICKERS.slice(batchStart, batchStart + batchSize);
    const promises = batch.map(async (ticker) => {
      let stockData: StockData;
      try {
        const barsRes = await fetchBars(ticker.symbol, { timeframe: "1Day", limit: 120 });
        if (barsRes.bars && barsRes.bars.length >= 10) {
          const sd = barsToStockData(barsRes.bars);
          stockData = {
            ...sd,
            ohlcv: barsRes.bars.map((b: AlpacaBar) => ({
              open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
            })),
          } as StockData;
        } else {
          stockData = generateMockOHLCV(mockPrice(ticker.symbol), 60);
        }
      } catch {
        stockData = generateMockOHLCV(mockPrice(ticker.symbol), 60);
      }

      const indicators = runAllIndicators(stockData);
      const overall = getOverallSignal(indicators);
      const { bull, bear } = generateBullBearPoints(indicators);
      const price = stockData.closes[stockData.closes.length - 1];
      const prevPrice = stockData.closes.length > 1 ? stockData.closes[stockData.closes.length - 2] : price;
      const change = prevPrice === 0 ? 0 : ((price - prevPrice) / prevPrice) * 100;

      const total = overall.buyCount + overall.sellCount + overall.neutralCount;
      const score = total === 0 ? 50 : Math.round((overall.buyCount / total) * 100);

      const scanResult: ScanResult = {
        symbol: ticker.symbol,
        name: ticker.name,
        sector: ticker.sector,
        price: +price.toFixed(2),
        change: +change.toFixed(2),
        score,
        signal: overall.signal,
        buyCount: overall.buyCount,
        sellCount: overall.sellCount,
        neutralCount: overall.neutralCount,
        confidence: overall.confidence,
        bullPoints: bull,
        bearPoints: bear,
      };

      scanResult.optionSetup = generateOptionSignal(scanResult, stockData);
      return scanResult;
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    onProgress?.(Math.min(batchStart + batchSize, total), total);
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export async function runClaudeAnalysis(
  apiKey: string,
  symbol: string,
  scanResult: ScanResult
): Promise<ClaudeAnalysis | null> {
  try {
    const prompt = `Analyze ${symbol} stock. Technical indicators show: Score ${scanResult.score}/100, Signal: ${scanResult.signal}, ${scanResult.buyCount} buy / ${scanResult.sellCount} sell / ${scanResult.neutralCount} neutral signals, Confidence: ${scanResult.confidence}%.

Bull factors: ${scanResult.bullPoints.join(", ")}
Bear factors: ${scanResult.bearPoints.join(", ")}
Current price: $${scanResult.price}

Provide a JSON analysis with these exact fields:
{
  "summary": "2-3 sentence analysis",
  "direction": "BULLISH" or "BEARISH" or "NEUTRAL",
  "confidence": number 0-100,
  "entry": "$X.XX",
  "target": "$X.XX",
  "stop": "$X.XX",
  "riskReward": "1:X.X",
  "callSetup": "description or null",
  "putSetup": "description or null",
  "keyLevels": ["$X.XX support", "$X.XX resistance"],
  "risks": ["risk 1", "risk 2"],
  "catalysts": ["catalyst 1", "catalyst 2"]
}

Respond ONLY with the JSON object, no markdown.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    return JSON.parse(text) as ClaudeAnalysis;
  } catch {
    return null;
  }
}
