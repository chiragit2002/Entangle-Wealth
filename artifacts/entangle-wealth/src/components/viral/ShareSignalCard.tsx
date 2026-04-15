import { useRef, useCallback } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignalData {
  symbol: string;
  signal: string;
  confidence: number;
  price: string;
  target: string;
  change: string;
}

interface Props {
  data: SignalData;
  referralLink?: string;
}

export function ShareSignalCard({ data, referralLink }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 600;
    canvas.height = 400;

    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, "#020204");
    grad.addColorStop(1, "#0a0a1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = "rgba(0,180,216,0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 600; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }
    for (let y = 0; y < 400; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(600, y);
      ctx.stroke();
    }

    ctx.fillStyle = "#00B4D8";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("EntangleWealth", 30, 40);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px sans-serif";
    ctx.fillText("Institutional Intelligence For Everyone", 30, 58);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(data.symbol, 30, 120);

    ctx.fillStyle = data.change.startsWith("+") ? "#00B4D8" : "#ff3366";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(data.change, 30, 150);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "16px sans-serif";
    ctx.fillText(data.price, 200, 150);

    const sigColor = data.signal.toLowerCase() === "buy" ? "#00B4D8" : data.signal.toLowerCase() === "sell" ? "#ff3366" : "#FFB800";
    ctx.fillStyle = sigColor + "22";
    ctx.beginPath();
    ctx.roundRect(30, 180, 120, 44, 12);
    ctx.fill();
    ctx.fillStyle = sigColor;
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.signal.toUpperCase(), 90, 210);
    ctx.textAlign = "left";

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px sans-serif";
    ctx.fillText("CONFIDENCE", 200, 195);
    ctx.fillStyle = "#00B4D8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(`${data.confidence}%`, 200, 225);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px sans-serif";
    ctx.fillText("TARGET", 350, 195);
    ctx.fillStyle = "#00B4D8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(data.target, 350, 225);

    ctx.fillStyle = "rgba(0,180,216,0.08)";
    ctx.beginPath();
    ctx.roundRect(30, 260, 540, 60, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px sans-serif";
    ctx.fillText("Signal powered by 6 AI models cross-verifying in real-time.", 50, 285);
    ctx.fillText("Join EntangleWealth for institutional-grade analysis.", 50, 305);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "10px sans-serif";
    ctx.fillText("Not financial advice. Past signals are not guarantees of future results.", 30, 380);

    return canvas.toDataURL("image/png");
  }, [data]);

  const handleDownload = useCallback(() => {
    const dataUrl = generate();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `entanglewealth-signal-${data.symbol}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [generate, data.symbol]);

  const handleShare = useCallback(async () => {
    const dataUrl = generate();
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `signal-${data.symbol}.png`, { type: "image/png" });

    const caption = `${data.signal.toUpperCase()} signal on ${data.symbol} | ${data.confidence}% confidence. Check out EntangleWealth for institutional-grade AI signals!`;
    const url = referralLink || window.location.origin;
    const shareText = `${caption} ${url}`;

    if (navigator.share) {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `${data.symbol} Signal | EntangleWealth`, text: shareText });
          return;
        }
        await navigator.share({ title: `${data.symbol} Signal | EntangleWealth`, text: shareText, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      handleDownload();
    }
  }, [generate, data, referralLink, handleDownload]);

  return (
    <div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-primary/30 text-primary gap-1 text-xs"
          onClick={handleDownload}
        >
          <Download className="w-3.5 h-3.5" /> Save Card
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-[#00B4D8]/30 text-[#00B4D8] gap-1 text-xs"
          onClick={handleShare}
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </Button>
      </div>
    </div>
  );
}
