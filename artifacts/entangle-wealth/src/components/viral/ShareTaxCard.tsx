import { useRef, useCallback } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaxSavingsData {
  savings: number;
  deductionsFound: number;
  strategiesUsed: number;
}

interface Props {
  data: TaxSavingsData;
  referralLink?: string;
}

export function ShareTaxCard({ data, referralLink }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const formatDollar = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  const generate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = 600;
    canvas.height = 400;

    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, "#020204");
    grad.addColorStop(1, "#0a1a0a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = "rgba(0,230,118,0.06)";
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

    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("EntangleWealth TaxFlow", 30, 40);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px sans-serif";
    ctx.fillText("AI-Powered Tax Optimization", 30, 58);

    ctx.fillStyle = "rgba(0,230,118,0.1)";
    ctx.beginPath();
    ctx.roundRect(30, 80, 540, 120, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,230,118,0.2)";
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ESTIMATED TAX SAVINGS", 300, 110);

    ctx.fillStyle = "#00e676";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(formatDollar(data.savings), 300, 170);

    ctx.fillStyle = "rgba(0,212,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(30, 220, 260, 80, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px sans-serif";
    ctx.fillText("DEDUCTIONS FOUND", 160, 248);
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(formatDollar(data.deductionsFound), 160, 282);

    ctx.fillStyle = "rgba(255,215,0,0.08)";
    ctx.beginPath();
    ctx.roundRect(310, 220, 260, 80, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px sans-serif";
    ctx.fillText("STRATEGIES APPLIED", 440, 248);
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(String(data.strategiesUsed), 440, 282);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px sans-serif";
    ctx.fillText("Scan your taxes at EntangleWealth — find deductions you're missing.", 30, 340);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "10px sans-serif";
    ctx.fillText("For educational purposes only. Consult a licensed CPA for professional tax advice.", 30, 380);

    ctx.textAlign = "left";
    return canvas.toDataURL("image/png");
  }, [data]);

  const handleDownload = useCallback(() => {
    const dataUrl = generate();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "entanglewealth-tax-savings.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [generate]);

  const handleShare = useCallback(async () => {
    const dataUrl = generate();
    if (!dataUrl) return;
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "tax-savings.png", { type: "image/png" });

    const caption = `I just found ${formatDollar(data.savings)} in potential tax savings using EntangleWealth TaxFlow!`;
    const url = referralLink || window.location.origin;
    const shareText = `${caption} ${url}`;

    if (navigator.share) {
      try {
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My Tax Savings — EntangleWealth", text: shareText });
          return;
        }
        await navigator.share({ title: "My Tax Savings — EntangleWealth", text: shareText, url });
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
          className="border-[#00e676]/30 text-[#00e676] gap-1 text-xs"
          onClick={handleDownload}
        >
          <Download className="w-3.5 h-3.5" /> Save Card
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-primary/30 text-primary gap-1 text-xs"
          onClick={handleShare}
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </Button>
      </div>
    </div>
  );
}
