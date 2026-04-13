import { useState, useEffect, useRef, useCallback } from "react";
import { terminalOrderFlow, terminalSystemLog, marketTickerData } from "@/lib/mock-data";
import { quickAnalyzeStock, fetchStocks, fetchNews, type NewsItem } from "@/lib/api";
import { useAuth } from "@clerk/react";

interface TerminalNewsItem {
  time: string;
  source: string;
  headline: string;
  sentiment: "positive" | "negative" | "neutral";
}

interface OrderFlowItem {
  time: string;
  action: string;
  symbol: string;
  size: string;
  price: string;
  exchange: string;
  type: string;
}

const HISTORY_KEY = "mirofish_cmd_history";
const WATCHLIST_KEY = "mirofish_watchlist";
const ALERTS_KEY = "mirofish_price_alerts";
const MACROS_KEY = "mirofish_macros";

const ST_RATE = 0.37;
const LT_RATE = 0.20;
const NIIT_RATE = 0.038;

function formatTaxImpact(side: "buy" | "sell", qty: number, sym: string, fillPrice: number, position?: { avg_entry_price: string; qty: string; unrealized_pl: string } | null): string {
  const totalValue = qty * fillPrice;
  const lines: string[] = [];
  lines.push(`─── Real-Time Tax Impact ───`);

  if (side === "buy") {
    const costBasis = totalValue;
    const hypothetical5pct = totalValue * 0.05;
    const hypothetical20pct = totalValue * 0.20;
    const stTax5 = hypothetical5pct * ST_RATE;
    const ltTax5 = hypothetical5pct * LT_RATE;
    const stTax20 = hypothetical20pct * ST_RATE;
    const ltTax20 = hypothetical20pct * LT_RATE;
    lines.push(`  Cost Basis: ${qty} × $${fillPrice.toFixed(2)} = $${costBasis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    lines.push(`  ┌─────────────────────────────────────────────┐`);
    lines.push(`  │ IF SOLD @ +5%  ($${(fillPrice * 1.05).toFixed(2)})                    │`);
    lines.push(`  │   Gain: $${hypothetical5pct.toFixed(2).padStart(10)}                          │`);
    lines.push(`  │   Short-Term Tax (${(ST_RATE * 100).toFixed(0)}%): $${stTax5.toFixed(2).padStart(8)}  (<1 yr)   │`);
    lines.push(`  │   Long-Term Tax  (${(LT_RATE * 100).toFixed(0)}%): $${ltTax5.toFixed(2).padStart(8)}  (>1 yr)   │`);
    lines.push(`  │   Tax Savings by Holding: $${(stTax5 - ltTax5).toFixed(2).padStart(7)}          │`);
    lines.push(`  ├─────────────────────────────────────────────┤`);
    lines.push(`  │ IF SOLD @ +20% ($${(fillPrice * 1.20).toFixed(2)})                    │`);
    lines.push(`  │   Gain: $${hypothetical20pct.toFixed(2).padStart(10)}                          │`);
    lines.push(`  │   Short-Term Tax (${(ST_RATE * 100).toFixed(0)}%): $${stTax20.toFixed(2).padStart(8)}  (<1 yr)   │`);
    lines.push(`  │   Long-Term Tax  (${(LT_RATE * 100).toFixed(0)}%): $${ltTax20.toFixed(2).padStart(8)}  (>1 yr)   │`);
    lines.push(`  │   Tax Savings by Holding: $${(stTax20 - ltTax20).toFixed(2).padStart(7)}          │`);
    lines.push(`  └─────────────────────────────────────────────┘`);
    lines.push(`  Tip: Hold >1 year to qualify for long-term rates.`);
  } else {
    const proceeds = totalValue;
    lines.push(`  Proceeds: ${qty} × $${fillPrice.toFixed(2)} = $${proceeds.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    const rawEntry = position ? parseFloat(position.avg_entry_price) : NaN;
    if (!position || isNaN(rawEntry)) {
      lines.push(`  Cost Basis: unavailable (no matching position found)`);
      lines.push(`  ┌─────────────────────────────────────────────┐`);
      lines.push(`  │ Cannot compute realized gain/loss without   │`);
      lines.push(`  │ a cost basis. Check POSITIONS after fill.   │`);
      lines.push(`  └─────────────────────────────────────────────┘`);
    } else {
      const entryPrice = rawEntry;
      const costBasis = entryPrice * qty;
      const gain = proceeds - costBasis;
      const isGain = gain >= 0;
      const stTax = Math.max(0, gain * ST_RATE);
      const ltTax = Math.max(0, gain * LT_RATE);
      const niit = Math.max(0, gain * NIIT_RATE);
      const netAfterST = proceeds - stTax - niit;
      const netAfterLT = proceeds - ltTax - niit;
      lines.push(`  Cost Basis: ${qty} × $${entryPrice.toFixed(2)} = $${costBasis.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      lines.push(`  ${isGain ? "Realized Gain" : "Realized Loss"}: ${isGain ? "+" : "-"}$${Math.abs(gain).toFixed(2)}`);
      if (isGain) {
        lines.push(`  ┌─────────────────────────────────────────────┐`);
        lines.push(`  │ SHORT-TERM (held <1 yr)                     │`);
        lines.push(`  │   Federal Tax (${(ST_RATE * 100).toFixed(0)}%):    $${stTax.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   NIIT (3.8%):          $${niit.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   Net After Tax:        $${netAfterST.toFixed(2).padStart(10)}         │`);
        lines.push(`  ├─────────────────────────────────────────────┤`);
        lines.push(`  │ LONG-TERM (held >1 yr)                     │`);
        lines.push(`  │   Federal Tax (${(LT_RATE * 100).toFixed(0)}%):    $${ltTax.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   NIIT (3.8%):          $${niit.toFixed(2).padStart(10)}         │`);
        lines.push(`  │   Net After Tax:        $${netAfterLT.toFixed(2).padStart(10)}         │`);
        lines.push(`  └─────────────────────────────────────────────┘`);
        lines.push(`  Tax Savings (LT vs ST): $${(stTax - ltTax).toFixed(2)}`);
      } else {
        lines.push(`  ┌─────────────────────────────────────────────┐`);
        lines.push(`  │ TAX-LOSS HARVESTING OPPORTUNITY             │`);
        lines.push(`  │   Deductible Loss: $${Math.abs(gain).toFixed(2).padStart(10)}              │`);
        lines.push(`  │   Max Annual Offset: $3,000 vs income       │`);
        lines.push(`  │   Remaining Carry-Forward: $${Math.max(0, Math.abs(gain) - 3000).toFixed(2).padStart(8)}     │`);
        lines.push(`  └─────────────────────────────────────────────┘`);
        lines.push(`  Note: Loss offsets gains first, then up to $3k income/yr.`);
      }
    }
  }
  lines.push(`  ⚠ Estimates only — consult a tax professional.`);
  return lines.join("\n");
}

function loadLS<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function MirofishTerminal() {
  const { getToken, isSignedIn } = useAuth();
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<{ input: string; output: string }[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>(() => loadLS(HISTORY_KEY, []));
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [watchlist, setWatchlist] = useState<string[]>(() => loadLS(WATCHLIST_KEY, ["AAPL", "NVDA", "TSLA"]));
  const [alerts, setAlerts] = useState<{ symbol: string; price: number; dir: "above" | "below" }[]>(() => loadLS(ALERTS_KEY, []));
  const [macros, setMacros] = useState<Record<string, string[]>>(() => loadLS(MACROS_KEY, {}));
  const [liveOrderFlow, setLiveOrderFlow] = useState<OrderFlowItem[]>(terminalOrderFlow as OrderFlowItem[]);
  const [visibleLogs, setVisibleLogs] = useState(6);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
  const [liveNews, setLiveNews] = useState<TerminalNewsItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setVisibleLogs(v => (v >= terminalSystemLog.length ? 6 : v + 1));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { saveLS(WATCHLIST_KEY, watchlist); }, [watchlist]);
  useEffect(() => { saveLS(ALERTS_KEY, alerts); }, [alerts]);
  useEffect(() => { saveLS(MACROS_KEY, macros); }, [macros]);

  useEffect(() => {
    let cancelled = false;
    async function loadNews() {
      try {
        const data = await fetchNews({ limit: 12 });
        if (cancelled) return;
        const mapped: TerminalNewsItem[] = data.items.slice(0, 8).map((item: NewsItem) => {
          const d = new Date(item.published || Date.now());
          const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          return { time, source: item.source.split(" ").slice(0, 2).join(" ").slice(0, 15), headline: item.title.slice(0, 100), sentiment: item.sentiment };
        });
        setLiveNews(mapped);
      } catch {
        setLiveNews([{ time: "00:00", source: "System", headline: "News feeds loading...", sentiment: "neutral" }]);
      }
    }
    loadNews();
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      if (!isSignedIn) return;
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/orders?status=filled&limit=10", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLiveOrderFlow(data.map((o: any) => ({
            time: new Date(o.filled_at || o.submitted_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            action: (o.side || "").toUpperCase(),
            symbol: o.symbol || "",
            size: o.filled_qty || o.qty || "0",
            price: o.filled_avg_price ? `$${parseFloat(o.filled_avg_price).toFixed(2)}` : "MKT",
            exchange: "PAPER",
            type: o.type?.toUpperCase() || "MKT",
          })));
        }
      } catch {}
    }
    loadOrders();
    const interval = setInterval(loadOrders, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isSignedIn, getToken]);

  const addOutput = useCallback((input: string, output: string) => {
    setCommandHistory(prev => [...prev, { input, output }]);
    setCommandInput("");
    setHistoryIdx(-1);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
  }, []);

  const persistCmd = useCallback((cmd: string) => {
    setCmdHistory(prev => {
      const next = [cmd, ...prev.filter(c => c !== cmd)].slice(0, 100);
      saveLS(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const runCommand = useCallback(async (rawInput: string) => {
    const cmd = rawInput.trim().toUpperCase();
    if (!cmd) return;
    persistCmd(rawInput.trim());

    if (cmd === "HELP") {
      addOutput(rawInput, `Commands:
  QUOTE <SYM>               — Get stock quote
  ANALYZE <SYM>             — AI analysis (7 agents)
  SEARCH <QUERY>            — Search stocks
  NEWS [TOPIC]              — Live news feed
  BUY <QTY> <SYM>          — Paper buy order + TaxFlow impact
  SELL <QTY> <SYM>         — Paper sell order + TaxFlow impact
  POSITIONS                 — View open positions
  ORDERS                    — View recent orders
  WATCHLIST                 — Show watchlist
  WATCHLIST ADD <SYM>       — Add to watchlist
  WATCHLIST REMOVE <SYM>   — Remove from watchlist
  ALERTS                    — Show price alerts
  ALERTS SET <SYM> <PRICE> — Set price alert
  HISTORY                   — Show command history
  MACRO <NAME> <CMDS>      — Save command macro
  MACRO RUN <NAME>          — Run a saved macro
  RISK                      — Portfolio risk metrics
  STATUS                    — System status
  SIGNALS                   — Active signals
  PORTFOLIO                 — Portfolio summary
  CLEAR                     — Clear terminal`);
      return;
    }

    if (cmd === "NEWS" || cmd.startsWith("NEWS ")) {
      const rawTopicArg = rawInput.trim().slice(4).trim();
      const topicMap: Record<string, string> = { MICROELECTRONICS: "Microelectronics", GEOPOLITICS: "Geopolitics", "SUPPLY CHAIN": "Supply Chain", "TECH POLICY": "Tech Policy" };
      const topicArg = topicMap[rawTopicArg.toUpperCase()] || rawTopicArg;
      addOutput(rawInput, `[NEWS] Fetching live intelligence${topicArg ? ` for ${topicArg}` : ""}...`);
      try {
        const data = await fetchNews({ topic: topicArg || undefined, limit: 8 });
        if (data.items.length === 0) {
          setCommandHistory(prev => [...prev, { input: "", output: "[NEWS] No articles found. Try: NEWS Microelectronics" }]);
        } else {
          const lines = data.items.map((item: NewsItem, i: number) => {
            const sent = item.sentiment === "positive" ? "+" : item.sentiment === "negative" ? "▼" : "~";
            const tickers = item.tickers.length > 0 ? ` [${item.tickers.join(",")}]` : "";
            return `  ${i + 1}. [${sent}] ${item.title.slice(0, 70)}${tickers}\n     ${item.source} | ${item.topic}`;
          });
          setCommandHistory(prev => [...prev, { input: "", output: `[NEWS] ${data.total} articles:\n${lines.join("\n")}` }]);
        }
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch {
        setCommandHistory(prev => [...prev, { input: "", output: "[ERROR] Failed to fetch news." }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd.startsWith("ANALYZE ") || cmd.startsWith("AI ")) {
      const sym = cmd.split(" ")[1];
      if (!sym) { addOutput(rawInput, "Usage: ANALYZE <SYMBOL>"); return; }
      addOutput(rawInput, `[QUANTUM] Dispatching 7 agents to analyze ${sym}...`);
      try {
        const result = await quickAnalyzeStock(sym);
        const out = `[QUANTUM] ${sym} — ${result.signal} @ ${result.confidence}% confidence | Risk: ${result.risk}\nKey Level: $${result.keyLevel}\n${result.summary}\n⚠ ${result.disclaimer}`;
        setCommandHistory(prev => [...prev, { input: "", output: out }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch {
        setCommandHistory(prev => [...prev, { input: "", output: `[ERROR] Analysis failed for ${sym}.` }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd.startsWith("SEARCH ")) {
      const q = cmd.slice(7).trim();
      if (!q) { addOutput(rawInput, "Usage: SEARCH <QUERY>"); return; }
      try {
        const data = await fetchStocks({ q, limit: 8 });
        if (data.stocks.length === 0) {
          addOutput(rawInput, `No stocks found for "${q}".`);
        } else {
          const lines = data.stocks.map((s: any) =>
            `  ${s.symbol.padEnd(6)} $${s.price.toFixed(2).padStart(8)} ${(s.changePercent >= 0 ? "+" : "") + Math.abs(s.changePercent).toFixed(2) + "%"} ${s.name.slice(0, 25)}`
          );
          addOutput(rawInput, `[SEARCH] ${data.stocks.length} results:\n${lines.join("\n")}`);
        }
      } catch {
        addOutput(rawInput, `[ERROR] Search failed.`);
      }
      return;
    }

    if (cmd.startsWith("QUOTE")) {
      const sym = cmd.split(" ")[1] || "SPY";
      const stock = marketTickerData.find(s => s.symbol === sym);
      if (stock) {
        addOutput(rawInput, `${stock.symbol} | $${stock.price.toFixed(2)} | ${stock.change} | Vol: ${(Math.random() * 50 + 10).toFixed(1)}M`);
      } else {
        try {
          const data = await fetchStocks({ q: sym, limit: 1 });
          if (data.stocks.length > 0) {
            const s = data.stocks[0];
            addOutput(rawInput, `${s.symbol} | $${s.price.toFixed(2)} | ${s.changePercent >= 0 ? "+" : ""}${Math.abs(s.changePercent).toFixed(2)}% | ${s.sector}`);
          } else {
            addOutput(rawInput, `Symbol ${sym} not found.`);
          }
        } catch {
          addOutput(rawInput, `Symbol ${sym} not found.`);
        }
      }
      return;
    }

    if (cmd.startsWith("BUY ") || cmd.startsWith("SELL ")) {
      const parts = cmd.split(" ");
      const side = parts[0].toLowerCase() as "buy" | "sell";
      const qty = parseInt(parts[1]);
      const sym = parts[2];
      if (!sym || isNaN(qty) || qty <= 0) {
        addOutput(rawInput, `Usage: ${side.toUpperCase()} <QTY> <SYM>  (e.g. ${side.toUpperCase()} 10 AAPL)`);
        return;
      }
      if (!isSignedIn) {
        addOutput(rawInput, "[ERROR] You must be signed in to execute paper trades.");
        return;
      }
      addOutput(rawInput, `[PAPER] Submitting ${side.toUpperCase()} order: ${qty} shares of ${sym}...`);
      try {
        const token = await getToken();

        let existingPosition: { avg_entry_price: string; qty: string; unrealized_pl: string } | null = null;
        if (side === "sell") {
          try {
            const posRes = await fetch("/api/alpaca/positions", { headers: { Authorization: `Bearer ${token}` } });
            if (posRes.ok) {
              const positions = await posRes.json();
              if (Array.isArray(positions)) {
                existingPosition = positions.find((p: any) => p.symbol === sym) || null;
              }
            }
          } catch {}
        }

        const res = await fetch("/api/alpaca/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ symbol: sym, qty, side, type: "market" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCommandHistory(prev => [...prev, { input: "", output: `[ERROR] Order failed: ${data.error || "Unknown error"}` }]);
        } else {
          const fillPrice = data.filled_avg_price ? parseFloat(data.filled_avg_price) : 0;

          let estimatedPrice = fillPrice;
          if (!estimatedPrice) {
            try {
              const quoteRes = await fetch(`/api/alpaca/snapshot/${sym}`);
              if (quoteRes.ok) {
                const snap = await quoteRes.json();
                estimatedPrice = snap?.latestTrade?.p || snap?.minuteBar?.c || snap?.dailyBar?.c || 0;
              }
            } catch {}
          }
          if (!estimatedPrice) {
            const localStock = marketTickerData.find(s => s.symbol === sym);
            estimatedPrice = localStock ? localStock.price : 150;
          }

          const isFilled = data.status === "filled" && fillPrice > 0;
          const statusLabel = isFilled ? "FILLED" : "SUBMITTED";
          const priceLabel = isFilled ? `$${fillPrice.toFixed(2)}` : "MARKET (pending)";
          const fillLine = `[${statusLabel}] ${data.side?.toUpperCase()} ${data.qty} ${data.symbol} @ ${priceLabel} | Status: ${data.status} | ID: ${data.id?.slice(0, 8)}`;
          const taxLabel = isFilled ? "Realized" : "Projected";
          const taxLine = `[TAXFLOW ${taxLabel}]\n` + formatTaxImpact(side, qty, sym, estimatedPrice, existingPosition);
          setCommandHistory(prev => [...prev, { input: "", output: fillLine + "\n" + taxLine }]);
        }
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch (err: any) {
        setCommandHistory(prev => [...prev, { input: "", output: `[ERROR] Order failed: ${err.message}` }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd === "POSITIONS") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[PAPER] Fetching open positions...");
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/positions", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          setCommandHistory(prev => [...prev, { input: "", output: `[ERROR] ${data.error}` }]);
        } else if (!Array.isArray(data) || data.length === 0) {
          setCommandHistory(prev => [...prev, { input: "", output: "[POSITIONS] No open positions." }]);
        } else {
          const lines = data.map((p: any) =>
            `  ${(p.symbol || "").padEnd(6)} ${p.qty} shares @ $${parseFloat(p.avg_entry_price || 0).toFixed(2)} | MV: $${parseFloat(p.market_value || 0).toFixed(2)} | P/L: ${parseFloat(p.unrealized_pl || 0) >= 0 ? "+" : ""}$${parseFloat(p.unrealized_pl || 0).toFixed(2)} (${(parseFloat(p.unrealized_plpc || 0) * 100).toFixed(2)}%)`
          );
          setCommandHistory(prev => [...prev, { input: "", output: `[POSITIONS] ${data.length} open:\n${lines.join("\n")}` }]);
        }
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch {
        setCommandHistory(prev => [...prev, { input: "", output: "[ERROR] Could not fetch positions." }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd === "ORDERS") {
      if (!isSignedIn) { addOutput(rawInput, "[ERROR] Sign in required."); return; }
      addOutput(rawInput, "[PAPER] Fetching recent orders...");
      try {
        const token = await getToken();
        const res = await fetch("/api/alpaca/orders?status=all&limit=10", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          setCommandHistory(prev => [...prev, { input: "", output: `[ERROR] ${data.error}` }]);
        } else if (!Array.isArray(data) || data.length === 0) {
          setCommandHistory(prev => [...prev, { input: "", output: "[ORDERS] No recent orders." }]);
        } else {
          const lines = data.slice(0, 8).map((o: any) =>
            `  ${(o.side || "").toUpperCase().padEnd(5)} ${(o.qty || "").toString().padEnd(4)} ${(o.symbol || "").padEnd(6)} ${o.status?.padEnd(10)} ${o.filled_avg_price ? "$" + parseFloat(o.filled_avg_price).toFixed(2) : "PENDING"}`
          );
          setCommandHistory(prev => [...prev, { input: "", output: `[ORDERS] Recent ${data.length} orders:\n${lines.join("\n")}` }]);
        }
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch {
        setCommandHistory(prev => [...prev, { input: "", output: "[ERROR] Could not fetch orders." }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd === "WATCHLIST") {
      addOutput(rawInput, watchlist.length === 0 ? "[WATCHLIST] Empty. Use: WATCHLIST ADD <SYM>" : `[WATCHLIST] ${watchlist.join("  |  ")}`);
      return;
    }

    if (cmd.startsWith("WATCHLIST ADD ")) {
      const sym = cmd.slice(14).trim();
      if (!sym) { addOutput(rawInput, "Usage: WATCHLIST ADD <SYM>"); return; }
      if (!watchlist.includes(sym)) {
        setWatchlist(prev => [...prev, sym]);
        addOutput(rawInput, `[WATCHLIST] Added ${sym}. Now tracking: ${[...watchlist, sym].join(", ")}`);
      } else {
        addOutput(rawInput, `[WATCHLIST] ${sym} already in watchlist.`);
      }
      return;
    }

    if (cmd.startsWith("WATCHLIST REMOVE ")) {
      const sym = cmd.slice(17).trim();
      if (!watchlist.includes(sym)) { addOutput(rawInput, `[WATCHLIST] ${sym} not in watchlist.`); return; }
      setWatchlist(prev => prev.filter(s => s !== sym));
      addOutput(rawInput, `[WATCHLIST] Removed ${sym}.`);
      return;
    }

    if (cmd === "ALERTS") {
      if (alerts.length === 0) {
        addOutput(rawInput, "[ALERTS] None set. Use: ALERTS SET <SYM> <PRICE>");
      } else {
        const lines = alerts.map((a, i) => `  ${i + 1}. ${a.symbol} ${a.dir} $${a.price}`);
        addOutput(rawInput, `[ALERTS] ${alerts.length} active:\n${lines.join("\n")}`);
      }
      return;
    }

    if (cmd.startsWith("ALERTS SET ")) {
      const parts = cmd.slice(11).trim().split(" ");
      const sym = parts[0];
      const price = parseFloat(parts[1]);
      if (!sym || isNaN(price)) { addOutput(rawInput, "Usage: ALERTS SET <SYM> <PRICE>  (e.g. ALERTS SET AAPL 200)"); return; }
      const dir = "above";
      setAlerts(prev => [...prev, { symbol: sym, price, dir }]);
      addOutput(rawInput, `[ALERTS] Set: Alert when ${sym} goes ${dir} $${price}`);
      return;
    }

    if (cmd === "HISTORY") {
      if (cmdHistory.length === 0) { addOutput(rawInput, "[HISTORY] No commands yet."); return; }
      const lines = cmdHistory.slice(0, 20).map((c, i) => `  ${i + 1}. ${c}`);
      addOutput(rawInput, `[HISTORY] Last ${Math.min(cmdHistory.length, 20)} commands:\n${lines.join("\n")}`);
      return;
    }

    if (cmd.startsWith("MACRO ")) {
      const rest = rawInput.trim().slice(6).trim();
      if (rest.toUpperCase().startsWith("RUN ")) {
        const macroName = rest.slice(4).trim().toUpperCase();
        const macro = macros[macroName];
        if (!macro) { addOutput(rawInput, `[MACRO] "${macroName}" not found. Use MACRO to see saved macros.`); return; }
        addOutput(rawInput, `[MACRO] Running "${macroName}" (${macro.length} commands)...`);
        for (const c of macro) {
          await runCommand(c);
          await new Promise(r => setTimeout(r, 100));
        }
        return;
      }
      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx === -1) {
        const names = Object.keys(macros);
        addOutput(rawInput, names.length === 0 ? "[MACRO] None saved. Use: MACRO <NAME> <CMD1>; <CMD2>" : `[MACROS] Saved: ${names.join(", ")}`);
        return;
      }
      const macroName = rest.slice(0, spaceIdx).toUpperCase();
      const cmds = rest.slice(spaceIdx + 1).split(";").map((c: string) => c.trim()).filter(Boolean);
      setMacros(prev => ({ ...prev, [macroName]: cmds }));
      addOutput(rawInput, `[MACRO] Saved "${macroName}" with ${cmds.length} command(s): ${cmds.join(" → ")}`);
      return;
    }

    if (cmd === "RISK") {
      addOutput(rawInput, "Portfolio Risk: 8.4% | Max Drawdown: 0.8% | Beta: 1.35 | Sharpe: 2.1 | Kelly: 14.2%");
    } else if (cmd === "STATUS") {
      addOutput(rawInput, "ENTANGLE-CORE: ONLINE | 7 AI Models Active | 5,000 NASDAQ Stocks | Consensus: 87% | Uptime: 99.97%");
    } else if (cmd === "SIGNALS") {
      addOutput(rawInput, "Active: NVDA BUY 87% | AMD BUY 83% | PLTR BUY 79% | TSLA SELL 74% | AAPL HOLD 52%");
    } else if (cmd === "PORTFOLIO") {
      addOutput(rawInput, "Value: $15,620 | Day P&L: +$1,420 (+10.0%) | Open Positions: 5 | Cash: $8,380");
    } else if (cmd === "CLEAR") {
      setCommandHistory([]);
      setCommandInput("");
    } else {
      addOutput(rawInput, `Unknown command: ${cmd}. Type HELP for available commands.`);
    }
  }, [addOutput, persistCmd, isSignedIn, getToken, watchlist, alerts, macros, cmdHistory]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = commandInput;
    setCommandInput("");
    await runCommand(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      setCommandInput(cmdHistory[nextIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setCommandInput(nextIdx === -1 ? "" : cmdHistory[nextIdx] || "");
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "WARN": return "text-yellow-400";
      case "DATA": return "text-purple-400";
      default: return "text-primary";
    }
  };

  const getSentimentColor = (s: string) => {
    switch (s) {
      case "positive": return "text-green-400";
      case "negative": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const newsItems = liveNews.length > 0 ? liveNews : [
    { time: "00:00", source: "Loading", headline: "Fetching live news feeds...", sentiment: "neutral" as const },
  ];

  return (
    <div className="overflow-hidden bg-[#000810]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10 bg-primary/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">EntangleWealth Terminal v4.0</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-green-400">7 MODELS ONLINE</span>
          <span className="text-amber-400/60">{watchlist.length} WATCHING</span>
          <span className="text-muted-foreground">{clock}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="border-r border-primary/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400/70 uppercase tracking-wider">
              {isSignedIn ? "Live Paper Order Flow" : "Order Flow (Demo)"}
            </span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {liveOrderFlow.slice(0, 8).map((order, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-1 border-b border-white/[0.03] animate-in fade-in duration-500">
                <span className="text-white/30 w-16">{order.time}</span>
                <span className={`w-8 font-bold ${order.action === "BUY" ? "text-green-400" : "text-red-400"}`}>{order.action}</span>
                <span className="text-white font-bold w-10">{order.symbol}</span>
                <span className="text-white/50 w-12 text-right">{order.size}</span>
                <span className="text-white/70 w-14 text-right">{order.price}</span>
                <span className="text-primary/40 text-[8px] w-10">{order.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-r border-primary/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">News Feed | Live</span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {newsItems.map((item, i) => (
              <div key={i} className="py-1.5 border-b border-white/[0.03]">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-white/30">{item.time}</span>
                  <span className="text-[9px] font-mono text-primary/50">{item.source}</span>
                  <span className={`text-[8px] font-mono ml-auto ${getSentimentColor(item.sentiment)}`}>
                    {item.sentiment === "positive" ? "+" : item.sentiment === "negative" ? "▼" : "~"}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/70 leading-tight">{item.headline}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[9px] font-mono text-purple-400/70 uppercase tracking-wider">System Log</span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {terminalSystemLog.slice(0, visibleLogs).map((log, i) => (
              <div key={i} className="text-[10px] font-mono py-1 border-b border-white/[0.03] animate-in fade-in duration-500">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white/30">{log.time}</span>
                  <span className={`text-[8px] font-bold ${getLevelColor(log.level)}`}>{log.level}</span>
                  <span className="text-white/50 text-[8px]">{log.module}</span>
                </div>
                <p className="text-white/60 leading-tight">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-primary/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[9px] font-mono text-primary/60 uppercase tracking-wider">Command Interface</span>
          <span className="text-[8px] font-mono text-muted-foreground ml-auto">↑↓ history · BUY/SELL/POSITIONS/ORDERS/WATCHLIST</span>
        </div>
        <div ref={scrollRef} className="max-h-40 overflow-y-auto mb-2 space-y-1">
          {commandHistory.map((cmd, i) => (
            <div key={i} className="text-[10px] font-mono">
              {cmd.input && (
                <div className="text-primary">
                  <span className="text-primary/40">entangle@core:~$ </span>{cmd.input}
                </div>
              )}
              <div className="text-white/60 pl-4 whitespace-pre-wrap">{cmd.output}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleCommand} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-primary/40">entangle@core:~$</span>
          <input
            data-tour="terminal-input"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-primary caret-primary"
            placeholder="Type a command... (HELP for all commands)"
            autoComplete="off"
          />
          <span className="text-primary animate-blink">_</span>
        </form>
      </div>
    </div>
  );
}
