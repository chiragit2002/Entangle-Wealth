import { useEffect, useState, memo } from "react";
import { Link } from "wouter";
import { useTheme } from "next-themes";

const MARKET_STATS = [
  { label: "S&P 500", value: "5,127.45", change: "+1.2%", positive: true },
  { label: "NASDAQ", value: "16,438.12", change: "+1.5%", positive: true },
  { label: "BTC/USD", value: "97,420.00", change: "+2.46%", positive: true },
  { label: "VIX", value: "14.32", change: "-0.8%", positive: false },
];

const TERMINAL_LINES = [
  { label: "MONTE CARLO PROBABILITY ENGINE", status: "ACTIVE" },
  { label: "FLASH COUNCIL AI ANALYSIS", status: "ACTIVE" },
  { label: "PAPER TRADING TERMINAL", status: "ACTIVE" },
  { label: "TAXFLOW REAL-TIME CALCULATOR", status: "ACTIVE" },
];

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  isPositive: boolean;
}

interface ThemeColors {
  bg: string;
  bgPanel: string;
  bgTicker: string;
  tickerBorder: string;
  accent: string;
  accentMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  borderSubtle: string;
  negativeColor: string;
  protectedBg: string;
  protectedBorder: string;
}

const darkColors: ThemeColors = {
  bg: "hsl(var(--card))",
  bgPanel: "#0D1321",
  bgTicker: "#060910",
  tickerBorder: "rgba(0,180,216,0.15)",
  accent: "#00B4D8",
  accentMuted: "rgba(0,180,216,0.5)",
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.6)",
  textMuted: "rgba(255,255,255,0.5)",
  textFaint: "rgba(255,255,255,0.25)",
  borderSubtle: "rgba(0,180,216,0.12)",
  negativeColor: "#FF3B3B",
  protectedBg: "rgba(0,180,216,0.05)",
  protectedBorder: "rgba(0,180,216,0.2)",
};

const lightColors: ThemeColors = {
  bg: "hsl(210, 20%, 96%)",
  bgPanel: "hsl(0, 0%, 100%)",
  bgTicker: "hsl(210, 20%, 98%)",
  tickerBorder: "rgba(0,180,216,0.15)",
  accent: "#00B4D8",
  accentMuted: "rgba(0,180,216,0.5)",
  textPrimary: "#1a1a2e",
  textSecondary: "rgba(0,0,0,0.6)",
  textMuted: "rgba(0,0,0,0.5)",
  textFaint: "rgba(0,0,0,0.3)",
  borderSubtle: "rgba(0,0,0,0.08)",
  negativeColor: "#DC2626",
  protectedBg: "rgba(0,180,216,0.05)",
  protectedBorder: "rgba(0,180,216,0.2)",
};

function TickerTape({ colors }: { colors: ThemeColors }) {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch("/api/alpaca/movers")
      .then(r => r.ok ? r.json() : null)
      .then((data: { all?: { symbol: string; price: number; change: number }[] } | null) => {
        if (!data?.all?.length) return;
        setItems(data.all.slice(0, 15).map(m => ({
          symbol: m.symbol,
          price: m.price,
          changePercent: m.change,
          isPositive: m.change >= 0,
        })));
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items, ...items, ...items];

  return (
    <div className="w-full overflow-hidden py-1.5 flex items-center"
      style={{ background: colors.bgTicker, borderBottom: `1px solid ${colors.tickerBorder}` }}>
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
        {doubled.map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-1.5 mx-4 text-xs tracking-wider" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}>
            <span style={{ color: colors.textPrimary, fontWeight: 700 }}>{item.symbol}</span>
            <span style={{ color: colors.textSecondary }}>${item.price.toFixed(2)}</span>
            <span style={{ color: item.isPositive ? colors.accent : colors.negativeColor }}>
              {item.isPositive ? "\u25B2" : "\u25BC"} {item.isPositive ? "+" : ""}{item.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlinkingCursor({ color }: { color: string }) {
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
      background: visible ? color : "transparent",
      marginLeft: "4px",
      verticalAlign: "middle",
      transition: "background 0.1s",
    }} />
  );
}

function MarketStatTile({ label, value, change, positive, colors }: { label: string; value: string; change: string; positive: boolean; colors: ThemeColors }) {
  return (
    <div style={{
      background: colors.bgPanel,
      border: `1px solid ${colors.borderSubtle}`,
      padding: "12px 14px",
      flex: "1 1 0",
      minWidth: 0,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "10px",
        color: colors.textMuted,
        letterSpacing: "0.08em",
        marginBottom: "4px",
        textTransform: "uppercase",
      }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "16px",
          color: colors.textPrimary,
          fontWeight: 600,
        }}>{value}</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "12px",
          color: positive ? colors.accent : colors.negativeColor,
          fontWeight: 500,
        }}>{change}</span>
      </div>
    </div>
  );
}

function TerminalLine({ label, status, delay, colors }: { label: string; status: string; delay: number; colors: ThemeColors }) {
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
      color: colors.textMuted,
      lineHeight: "1.8",
    }}>
      <span style={{ color: colors.accent }}>{"> "}</span>
      {label}
      <span style={{ color: colors.textFaint }}>{dots}</span>
      <span style={{ color: colors.accent, fontWeight: 600 }}>{status}</span>
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
  const { resolvedTheme } = useTheme();
  const colors = resolvedTheme === "dark" ? darkColors : lightColors;

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <TickerTape colors={colors} />

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
              color: colors.textPrimary,
              letterSpacing: "0.06em",
              lineHeight: 1.2,
              display: "flex",
              alignItems: "center",
            }}>
              ENTANGLE WEALTH
              <BlinkingCursor color={colors.accent} />
            </h1>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              color: colors.textFaint,
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
              <MarketStatTile key={s.label} {...s} colors={colors} />
            ))}
          </div>

          <div style={{
            background: colors.bgPanel,
            border: `1px solid ${colors.borderSubtle}`,
            padding: "16px 18px",
          }}>
            {TERMINAL_LINES.map((line, i) => (
              <TerminalLine key={line.label} label={line.label} status={line.status} delay={i * 400} colors={colors} />
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
              border: `1px solid ${colors.protectedBorder}`,
              background: colors.protectedBg,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "12px",
              color: colors.accent,
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
            color: colors.textFaint,
            textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.04em",
          }}>
            By continuing, you agree to our{" "}
            <Link href="/terms" style={{ color: colors.accentMuted, textDecoration: "none" }}>Terms</Link>
            {" "}&{" "}
            <Link href="/privacy" style={{ color: colors.accentMuted, textDecoration: "none" }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
});

export { TerminalAuthShellBase as TerminalAuthShell };
