import { toast } from "sonner";

export interface BloombergToastOptions {
  badgeIcon?: string;
  badgeName?: string;
  xpAmount?: number;
  message?: string;
  accentColor?: "cyan" | "gold";
}

function BloombergToastContent({ badgeIcon, badgeName, xpAmount, message, accentColor = "cyan" }: BloombergToastOptions) {
  const borderColor = accentColor === "gold" ? "#FFD700" : "#00c8f8";
  const accentText = accentColor === "gold" ? "#FFD700" : "#00c8f8";

  return (
    <div
      style={{
        background: "#0a0a14",
        borderLeft: `3px solid ${borderColor}`,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        padding: "10px 14px",
        minWidth: "260px",
        maxWidth: "340px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        {badgeIcon && (
          <span style={{ fontSize: "18px", lineHeight: 1 }}>{badgeIcon}</span>
        )}
        <span style={{ color: accentText, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {badgeName ? `BADGE UNLOCKED` : "XP AWARDED"}
        </span>
        {xpAmount !== undefined && (
          <span style={{ marginLeft: "auto", color: "#FFD700", fontSize: "11px", fontWeight: 700 }}>
            +{xpAmount} XP
          </span>
        )}
      </div>
      {badgeName && (
        <div style={{ color: "#ffffff", fontSize: "13px", fontWeight: 700, marginBottom: "2px" }}>
          {badgeName}
        </div>
      )}
      {message && (
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px" }}>
          {message}
        </div>
      )}
    </div>
  );
}

export function showBloombergToast(options: BloombergToastOptions) {
  toast.custom(
    () => <BloombergToastContent {...options} />,
    {
      duration: 5000,
      style: {
        background: "transparent",
        border: "none",
        padding: 0,
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
      },
    }
  );
}

export function showBacktestXpToast(xpEarned: number) {
  showBloombergToast({
    xpAmount: xpEarned,
    message: "Backtest completed",
    accentColor: "cyan",
  });
}

export function showBadgeUnlockToast(badge: { name: string; icon: string; xpReward: number }) {
  showBloombergToast({
    badgeIcon: badge.icon,
    badgeName: badge.name,
    xpAmount: badge.xpReward,
    accentColor: "gold",
  });
}
