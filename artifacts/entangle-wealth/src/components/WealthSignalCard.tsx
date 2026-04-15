import { useRef, useState, useCallback } from "react";
import { Share2, Download, X, TrendingUp, Zap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WealthSignalCardProps {
  userName?: string;
  portfolioValue?: number;
  portfolioChange?: number;
  streak?: number;
  level?: number;
  xp?: number;
  onClose?: () => void;
}

export function WealthSignalCard({
  userName = "Quantum Trader",
  portfolioValue = 100000,
  portfolioChange = 2.34,
  streak = 7,
  level = 12,
  xp = 4200,
  onClose,
}: WealthSignalCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const renderToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const W = 600;
    const H = 340;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0a18");
    bg.addColorStop(0.5, "#060d1a");
    bg.addColorStop(1, "#0a0a18");
    ctx.fillStyle = bg;
    ctx.roundRect(0, 0, W, H, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,180,216,0.25)";
    ctx.lineWidth = 1;
    ctx.roundRect(0.5, 0.5, W - 1, H - 1, 20);
    ctx.stroke();

    const grid = ctx.createLinearGradient(0, 0, W, 0);
    grid.addColorStop(0, "rgba(0,180,216,0.03)");
    grid.addColorStop(1, "rgba(0,180,216,0.01)");
    ctx.fillStyle = grid;
    for (let x = 0; x < W; x += 40) {
      ctx.fillRect(x, 0, 1, H);
    }
    for (let y = 0; y < H; y += 40) {
      ctx.fillRect(0, y, W, 1);
    }

    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, "#00B4D8");
    topGrad.addColorStop(1, "#00FF88");
    ctx.fillStyle = topGrad;
    ctx.roundRect(0, 0, W, 3, [20, 20, 0, 0]);
    ctx.fill();

    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(0,180,216,0.6)";
    ctx.letterSpacing = "3px";
    ctx.fillText("ENTANGLEWEALTH", 30, 38);

    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(0,180,216,0.4)";
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const dateWidth = ctx.measureText(dateStr).width;
    ctx.fillText(dateStr, W - 30 - dateWidth, 38);

    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(userName, 30, 78);

    const pValStr = "$" + portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const pValGrad = ctx.createLinearGradient(0, 0, 200, 0);
    pValGrad.addColorStop(0, "#FFFFFF");
    pValGrad.addColorStop(1, "rgba(255,255,255,0.8)");
    ctx.fillStyle = pValGrad;
    ctx.font = "bold 42px Inter, sans-serif";
    ctx.fillText(pValStr, 30, 140);

    const changeStr = `${portfolioChange >= 0 ? "+" : ""}${portfolioChange.toFixed(2)}%`;
    const changeColor = portfolioChange >= 0 ? "#00FF88" : "#FF4757";
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = changeColor;
    ctx.fillText(changeStr, 30, 168);

    const statsY = 218;
    const stats = [
      { label: "Streak", value: `${streak}d`, color: "#FFD700" },
      { label: "Level", value: `${level}`, color: "#00B4D8" },
      { label: "XP", value: `${xp.toLocaleString()}`, color: "#7B61FF" },
    ];

    stats.forEach((stat, i) => {
      const x = 30 + i * 180;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.roundRect(x, statsY, 160, 72, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.roundRect(x + 0.5, statsY + 0.5, 159, 71, 10);
      ctx.stroke();

      ctx.font = "500 10px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.letterSpacing = "2px";
      ctx.fillText(stat.label.toUpperCase(), x + 14, statsY + 22);

      ctx.font = "bold 28px Inter, sans-serif";
      ctx.letterSpacing = "0";
      ctx.fillStyle = stat.color;
      ctx.fillText(stat.value, x + 14, statsY + 54);
    });

    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(0,180,216,0.25)";
    ctx.letterSpacing = "1px";
    ctx.fillText("WEALTH SIGNAL", 30, H - 22);

    const tagLine = "entanglewealth.com";
    const tagW = ctx.measureText(tagLine).width;
    ctx.fillText(tagLine, W - 30 - tagW, H - 22);

    return canvas;
  }, [userName, portfolioValue, portfolioChange, streak, level, xp]);

  const handleDownload = () => {
    const canvas = renderToCanvas();
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "wealth-signal-card.png";
    a.click();
  };

  const handleShare = async () => {
    setSharing(true);
    const canvas = renderToCanvas();
    if (!canvas) { setSharing(false); return; }

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return; }
        const file = new File([blob], "wealth-signal.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Wealth Signal", text: "Check my portfolio performance on EntangleWealth!" });
        } else {
          const url = canvas.toDataURL("image/png");
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
        setSharing(false);
      });
    } catch {
      setSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{
          background: "#0a0a18",
          border: "1px solid rgba(0,180,216,0.2)",
          boxShadow: "0 0 60px rgba(0,180,216,0.1)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <div className="text-sm font-bold text-white">Wealth Signal Card</div>
            <div className="text-[11px] text-white/40 mt-0.5">Your shareable performance snapshot</div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-5">
          <div
            className="rounded-xl overflow-hidden mb-5"
            style={{
              background: "linear-gradient(135deg, #0a0a18, #060d1a)",
              border: "1px solid rgba(0,180,216,0.2)",
              padding: "28px 24px",
              position: "relative",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg, #00B4D8, #00FF88)" }}
            />

            <div className="text-[9px] tracking-[3px] font-bold text-[#00B4D8]/60 uppercase mb-3">
              EntangleWealth
            </div>

            <div className="text-[13px] text-white/50 mb-1">{userName}</div>

            <div className="text-4xl font-extrabold text-white mb-1">
              ${portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div
              className="text-sm font-bold font-mono"
              style={{ color: portfolioChange >= 0 ? "#00FF88" : "#FF4757" }}
            >
              {portfolioChange >= 0 ? "+" : ""}{portfolioChange.toFixed(2)}%
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div
                className="rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <Flame className="w-3 h-3 text-[#FFD700]" />
                  <span className="text-[9px] text-white/40 uppercase tracking-widest">Streak</span>
                </div>
                <div className="text-lg font-bold text-[#FFD700]">{streak}d</div>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-[#00B4D8]" />
                  <span className="text-[9px] text-white/40 uppercase tracking-widest">Level</span>
                </div>
                <div className="text-lg font-bold text-[#00B4D8]">{level}</div>
              </div>
              <div
                className="rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-[#7B61FF]" />
                  <span className="text-[9px] text-white/40 uppercase tracking-widest">XP</span>
                </div>
                <div className="text-lg font-bold text-[#7B61FF]">{xp.toLocaleString()}</div>
              </div>
            </div>

            <div className="absolute bottom-3 right-4 text-[9px] font-mono text-[#00B4D8]/20 tracking-wider">
              WEALTH SIGNAL
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 gap-2"
              style={{
                background: "linear-gradient(135deg, #00B4D8, #FF6600)",
                color: "#000",
                fontWeight: "700",
              }}
            >
              <Share2 className="w-4 h-4" />
              {sharing ? "Sharing..." : copied ? "Copied!" : "Share"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
