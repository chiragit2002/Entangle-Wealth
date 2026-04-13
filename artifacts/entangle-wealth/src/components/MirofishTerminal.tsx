import { useState, useEffect, useRef } from "react";
import { terminalOrderFlow, terminalSystemLog, marketTickerData } from "@/lib/mock-data";
import { quickAnalyzeStock, fetchStocks, fetchNews, type NewsItem } from "@/lib/api";

interface TerminalNewsItem {
  time: string;
  source: string;
  headline: string;
  sentiment: "positive" | "negative" | "neutral";
}

export function MirofishTerminal() {
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<{ input: string; output: string }[]>([]);
  const [visibleOrders, setVisibleOrders] = useState(6);
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
      setVisibleOrders(v => (v >= terminalOrderFlow.length ? 6 : v + 1));
      setVisibleLogs(v => (v >= terminalSystemLog.length ? 6 : v + 1));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadNews() {
      try {
        const data = await fetchNews({ limit: 12 });
        if (cancelled) return;
        const mapped: TerminalNewsItem[] = data.items.slice(0, 8).map((item: NewsItem) => {
          const d = new Date(item.published || Date.now());
          const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          return {
            time,
            source: item.source.split(" ").slice(0, 2).join(" ").slice(0, 15),
            headline: item.title.slice(0, 100),
            sentiment: item.sentiment,
          };
        });
        setLiveNews(mapped);
      } catch {
        setLiveNews([
          { time: "00:00", source: "System", headline: "News feeds loading...", sentiment: "neutral" },
        ]);
      }
    }
    loadNews();
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const addOutput = (input: string, output: string) => {
    setCommandHistory(prev => [...prev, { input, output }]);
    setCommandInput("");
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = commandInput;
    const cmd = commandInput.trim().toUpperCase();
    if (!cmd) return;

    if (cmd === "HELP") {
      addOutput(rawInput, "Commands: QUOTE <SYM> | ANALYZE <SYM> | SEARCH <QUERY> | NEWS [TOPIC] | RISK | STATUS | SIGNALS | PORTFOLIO | CLEAR\n\nAI-Powered:\n  ANALYZE <SYM>: Run quantum AI analysis on any of 5,000 NASDAQ stocks\n  SEARCH <QUERY>: Search stocks by symbol or name\n  NEWS [TOPIC]: Fetch live intelligence (Microelectronics, Geopolitics, Supply Chain, Tech Policy)");
      return;
    }

    if (cmd === "NEWS" || cmd.startsWith("NEWS ")) {
      const rawTopicArg = rawInput.trim().slice(4).trim();
      const topicMap: Record<string, string> = {
        MICROELECTRONICS: "Microelectronics",
        GEOPOLITICS: "Geopolitics",
        "SUPPLY CHAIN": "Supply Chain",
        "TECH POLICY": "Tech Policy",
      };
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
            return `  ${i + 1}. [${sent}] ${item.title.slice(0, 70)}${tickers}\n     Score: ${item.score} | ${item.source} | ${item.topic}`;
          });
          setCommandHistory(prev => [...prev, { input: "", output: `[NEWS INTELLIGENCE] ${data.total} articles from ${data.feedCount} feeds:\n${lines.join("\n")}` }]);
        }
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch {
        setCommandHistory(prev => [...prev, { input: "", output: "[ERROR] Failed to fetch news. Try again." }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd.startsWith("ANALYZE ") || cmd.startsWith("AI ")) {
      const sym = cmd.split(" ")[1];
      if (!sym) { addOutput(rawInput, "Usage: ANALYZE <SYMBOL>  (e.g. ANALYZE AAPL)"); return; }
      addOutput(rawInput, `[QUANTUM] Dispatching 7 agents to analyze ${sym}... please wait.`);
      try {
        const result = await quickAnalyzeStock(sym);
        const out = `[QUANTUM ANALYSIS] ${sym}\n  Signal: ${result.signal} | Confidence: ${result.confidence}% | Risk: ${result.risk}\n  Key Level: $${result.keyLevel}\n  ${result.summary}\n  ⚠ ${result.disclaimer}`;
        setCommandHistory(prev => [...prev, { input: "", output: out }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      } catch {
        setCommandHistory(prev => [...prev, { input: "", output: `[ERROR] Analysis failed for ${sym}. Check symbol and try again.` }]);
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
      return;
    }

    if (cmd.startsWith("SEARCH ")) {
      const q = cmd.slice(7).trim();
      if (!q) { addOutput(rawInput, "Usage: SEARCH <QUERY>  (e.g. SEARCH APPLE)"); return; }
      try {
        const data = await fetchStocks({ q, limit: 8 });
        if (data.stocks.length === 0) {
          addOutput(rawInput, `No stocks found for "${q}". Try a different query.`);
        } else {
          const lines = data.stocks.map(s =>
            `  ${s.symbol.padEnd(6)} $${s.price.toFixed(2).padStart(8)} ${(s.changePercent >= 0 ? "+" : "") + Math.abs(s.changePercent).toFixed(2) + "%"} ${s.name.slice(0, 25)}`
          );
          addOutput(rawInput, `[SEARCH] Found ${data.pagination.total} results for "${q}" (showing ${data.stocks.length}):\n${lines.join("\n")}`);
        }
      } catch {
        addOutput(rawInput, `[ERROR] Search failed. Try again.`);
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
            addOutput(rawInput, `${s.symbol} | $${s.price.toFixed(2)} | ${s.changePercent >= 0 ? "+" : ""}${Math.abs(s.changePercent).toFixed(2)}% | Vol: ${(s.volume / 1e6).toFixed(1)}M | ${s.sector}`);
          } else {
            addOutput(rawInput, `Symbol ${sym} not found in 5,000 NASDAQ stocks.`);
          }
        } catch {
          addOutput(rawInput, `Symbol ${sym} not found.`);
        }
      }
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
          <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">EntangleWealth Terminal v3.0</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-green-400">7 MODELS ONLINE</span>
          <span className="text-muted-foreground">{clock}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="border-r border-primary/10 p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] font-mono text-green-400/70 uppercase tracking-wider">Live Order Flow</span>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {terminalOrderFlow.slice(0, visibleOrders).map((order, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] font-mono py-1 border-b border-white/[0.03] animate-in fade-in duration-500">
                <span className="text-white/30 w-16">{order.time}</span>
                <span className={`w-8 font-bold ${order.action === "BUY" ? "text-green-400" : "text-red-400"}`}>{order.action}</span>
                <span className="text-white font-bold w-10">{order.symbol}</span>
                <span className="text-white/50 w-12 text-right">{order.size}</span>
                <span className="text-white/70 w-14 text-right">${order.price}</span>
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
          <span className="text-[8px] font-mono text-muted-foreground ml-auto">Type HELP for commands</span>
        </div>
        <div ref={scrollRef} className="max-h-32 overflow-y-auto mb-2 space-y-1">
          {commandHistory.map((cmd, i) => (
            <div key={i} className="text-[10px] font-mono">
              <div className="text-primary">
                <span className="text-primary/40">entangle@core:~$ </span>{cmd.input}
              </div>
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
            className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-primary caret-primary"
            placeholder="Type a command..."
            autoComplete="off"
          />
          <span className="text-primary animate-blink">_</span>
        </form>
      </div>
    </div>
  );
}
