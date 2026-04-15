import { useEffect, useState, memo } from "react";
import { Link } from "wouter";
import { marketTickerData } from "@/lib/mock-data";

const MARKET_STATS = [
  { label: "S&P 500", value: "5,127.45", change: "+1.2%", positive: true },
  { label: "NASDAQ", value: "16,438.12", change: "+1.5%", positive: true },
  { label: "BTC/USD", value: "68,245.30", change: "+2.8%", positive: true },
  { label: "VIX", value: "14.32", change: "-3.1%", positive: false },
];

const TERMINAL_LINES = [
  { label: "MONTE CARLO PROBABILITY ENGINE", status: "ACTIVE" },
  { label: "FLASH COUNCIL AI ANALYSIS", status: "ACTIVE" },
  { label: "PAPER TRADING TERMINAL", status: "ACTIVE" },
  { label: "TAXFLOW REAL-TIME CALCULATOR", status: "ACTIVE" },
];

function TickerTape() {
  return (
    <div className="w-full overflow-hidden py-1.5 flex items-center"
      style={{ background: "#060910", borderBottom: "1px solid rgba(0,180,216,0.15)" }}>
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
        {[...marketTickerData, ...marketTickerData, ...marketTickerData, ...marketTickerData].map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-1.5 mx-4 text-xs tracking-wider" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>{item.symbol}</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>${item.price.toFixed(2)}</span>
            <span style={{ color: item.isPositive ? "#00B4D8" : "#FF3B3B" }}>
              {item.isPositive ? "\u25B2" : "\u25BC"} {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlinkingCursor() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, []);
  return (
    <span style={{
      display: "inline-block",
      width: "10px",
      height: "20px",
      background: visible ? "#00B4D8" : "transparent",
      marginLeft: "4px",
      verticalAlign: "middle",
      transition: "background 0.1s",
    }} />
  );
}

function MarketStatTile({ label, value, change, positive }: { label: string; value: string; change: string; positive: boolean }) {
  return (
    <div style={{
      background: "#0D1321",
      border: "1px solid rgba(0,180,216,0.12)",
      padding: "12px 14px",
      flex: "1 1 0",
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        color: "rgba(255,255,255,0.4)",
        letterSpacing: "0.08em",
        marginBottom: "4px",
        textTransform: "uppercase",
      }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "16px",
          color: "#ffffff",
          fontWeight: 600,
        }}>{value}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          color: positive ? "#00B4D8" : "#FF3B3B",
          fontWeight: 500,
        }}>{change}</span>
      </div>
    </div>
  );
}

function TerminalLine({ label, status, delay }: { label: string; status: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  const dots = ".".repeat(Math.max(2, 50 - label.length));
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "12px",
      color: "rgba(255,255,255,0.5)",
      lineHeight: "1.8",
    }}>
      <span style={{ color: "#00B4D8" }}>{"> "}</span>
      {label}
      <span style={{ color: "rgba(255,255,255,0.15)" }}>{dots}</span>
      <span style={{ color: "#00B4D8", fontWeight: 600 }}>{status}</span>
    </div>
  );
}

const TerminalAuthShellBase = memo(function TerminalAuthShell({
  children,
  reason,
  mode = "sign-in",
}: {
  children: React.ReactNode;
  reason?: string | null;
  mode?: "sign-in" | "sign-up";
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0E1A",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <TickerTape />

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}>
        <div className="hidden lg:flex" style={{
          width: "50%",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 56px",
        }}>
          <div style={{ marginBottom: "36px" }}>
            <h1 style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: "32px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.06em",
              lineHeight: 1.2,
              display: "flex",
              alignItems: "center",
            }}>
              ENTANGLE WEALTH
              <BlinkingCursor />
            </h1>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              color: "rgba(255,255,255,0.35)",
              letterSpacing: "0.12em",
              marginTop: "8px",
              textTransform: "uppercase",
            }}>
              Institutional-Grade Trading. Gamified.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            marginBottom: "36px",
          }}>
            {MARKET_STATS.map(s => (
              <MarketStatTile key={s.label} {...s} />
            ))}
          </div>

          <div style={{
            background: "#0D1321",
            border: "1px solid rgba(0,180,216,0.12)",
            padding: "16px 18px",
          }}>
            {TERMINAL_LINES.map((line, i) => (
              <TerminalLine key={line.label} label={line.label} status={line.status} delay={i * 400} />
            ))}
          </div>
        </div>

        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
        }}>
          {reason === "protected" && (
            <div style={{
              marginBottom: "16px",
              padding: "8px 16px",
              border: "1px solid rgba(0,180,216,0.2)",
              background: "rgba(0,180,216,0.05)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: "#00B4D8",
              maxWidth: "420px",
              width: "100%",
            }}>
              {"> "}ACCESS DENIED — AUTHENTICATION REQUIRED
            </div>
          )}

          <div style={{ width: "100%", maxWidth: "420px" }}>
            {children}
          </div>

          <p style={{
            marginTop: "20px",
            fontSize: "10px",
            color: "rgba(255,255,255,0.25)",
            textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.04em",
          }}>
            By continuing, you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(0,180,216,0.5)", textDecoration: "none" }}>Terms</Link>
            {" "}&{" "}
            <Link href="/privacy" style={{ color: "rgba(0,180,216,0.5)", textDecoration: "none" }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
});

export { TerminalAuthShellBase as TerminalAuthShell };
