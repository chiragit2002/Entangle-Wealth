import { useState, useEffect, useRef } from "react";
import { terminalOrderFlow, terminalNewsFeed, terminalSystemLog, marketTickerData } from "@/lib/mock-data";

export function MirofishTerminal() {
  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<{ input: string; output: string }[]>([]);
  const [visibleOrders, setVisibleOrders] = useState(6);
  const [visibleLogs, setVisibleLogs] = useState(6);
  const [clock, setClock] = useState(new Date().toLocaleTimeString());
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

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toUpperCase();
    let output = "";
    if (cmd === "HELP") {
      output = "Commands: QUOTE <SYMBOL> | RISK | STATUS | SIGNALS | PORTFOLIO | CLEAR";
    } else if (cmd.startsWith("QUOTE")) {
      const sym = cmd.split(" ")[1] || "SPY";
      const stock = marketTickerData.find(s => s.symbol === sym);
      output = stock
        ? `${stock.symbol} | $${stock.price.toFixed(2)} | ${stock.change} | Vol: ${(Math.random() * 50 + 10).toFixed(1)}M`
        : `Symbol ${sym} not found. Try: SPY, QQQ, NVDA, AAPL, TSLA, META, AMD, MSFT`;
    } else if (cmd === "RISK") {
      output = "Portfolio Risk: 8.4% | Max Drawdown: -0.8% | Beta: 1.35 | Sharpe: 2.1 | Kelly: 14.2%";
    } else if (cmd === "STATUS") {
      output = "ENTANGLE-CORE: ONLINE | 6 Models Active | Consensus: 87% | Uptime: 99.97%";
    } else if (cmd === "SIGNALS") {
      output = "Active: NVDA BUY 87% | AMD BUY 83% | PLTR BUY 79% | TSLA SELL 74% | AAPL HOLD 52%";
    } else if (cmd === "PORTFOLIO") {
      output = "Value: $15,620 | Day P&L: +$1,420 (+10.0%) | Open Positions: 5 | Cash: $8,380";
    } else if (cmd === "CLEAR") {
      setCommandHistory([]);
      setCommandInput("");
      return;
    } else if (cmd) {
      output = `Unknown command: ${cmd}. Type HELP for available commands.`;
    }
    if (cmd) {
      setCommandHistory(prev => [...prev, { input: commandInput, output }]);
      setCommandInput("");
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
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

  return (
    <div className="rounded-2xl overflow-hidden border border-primary/20 bg-[#000810]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10 bg-primary/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">EntangleWealth Terminal v2.4</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="text-green-400">6 MODELS ONLINE</span>
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
            <span className="text-[9px] font-mono text-blue-400/70 uppercase tracking-wider">News Feed</span>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {terminalNewsFeed.map((item, i) => (
              <div key={i} className="py-1.5 border-b border-white/[0.03]">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-mono text-white/30">{item.time}</span>
                  <span className="text-[9px] font-mono text-primary/50">{item.source}</span>
                  <span className={`text-[8px] font-mono ml-auto ${getSentimentColor(item.sentiment)}`}>
                    {item.sentiment === "positive" ? "+" : item.sentiment === "negative" ? "-" : "~"}
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
                  <span className="text-white/20 text-[8px]">{log.module}</span>
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
              <div className="text-white/60 pl-4">{cmd.output}</div>
            </div>
          ))}
        </div>
        <form onSubmit={handleCommand} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-primary/40">entangle@core:~$</span>
          <input
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
