import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle, X } from "lucide-react";

interface FinancialDisclaimerBannerProps {
  pageKey: string;
}

export function FinancialDisclaimerBanner({ pageKey }: FinancialDisclaimerBannerProps) {
  const storageKey = `ew_disclaimer_dismissed_${pageKey}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-2 mb-0">
      <div className="max-w-7xl mx-auto bg-[#FFD700]/[0.04] border border-[#FFD700]/20 rounded-lg px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#FFD700]/70 leading-relaxed flex-1">
            <strong className="text-[#FFD700]/90">Not financial advice.</strong>{" "}
            All data, signals, and analysis on this page are for educational purposes only. Past performance does not guarantee future results. Trading involves substantial risk of loss.{" "}
            <Link href="/disclaimer" className="underline hover:text-[#FFD700]">Read full disclaimer</Link>
          </p>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-[#FFD700]/30 hover:text-[#FFD700]/60 transition-colors"
            aria-label="Dismiss disclaimer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
