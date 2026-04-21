import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, ArrowLeft, Activity, TrendingUp, BarChart3, HelpCircle } from "lucide-react";

const QUICK_LINKS = [
  { href: "/dashboard", label: "Command Center", icon: Activity, desc: "Back to mission control" },
  { href: "/technical", label: "Technical Analysis", icon: TrendingUp, desc: "55+ indicators & AI signals" },
  { href: "/screener", label: "Signal Screener", icon: BarChart3, desc: "Find the next move" },
  { href: "/help", label: "Help Portal", icon: HelpCircle, desc: "Reach the support team" },
];

const WITTY_LINES = [
  "Even quantum computers can't locate this timeline.",
  "The particles that made this page have since entangled elsewhere.",
  "Our agents searched 55+ dimensions. Nothing.",
  "This URL exists in a parallel universe — not this one.",
  "Signal lost. The data streams don't flow here.",
];

interface LostParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export default function NotFound() {
  const [wittyLine] = useState(() => WITTY_LINES[Math.floor(Math.random() * WITTY_LINES.length)]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<LostParticle[]>([]);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height / 2 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 0.3,
      alpha: 0.8,
      size: Math.random() * 3 + 1,
      color: "#00B4D8",
    });

    particlesRef.current = Array.from({ length: 40 }, spawn);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let tick = 0;
    const animate = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (tick % 4 === 0 && particlesRef.current.length < 60) {
        particlesRef.current.push(spawn());
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.004;
        p.vx *= 0.999;
        p.vy *= 0.999;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [prefersReduced]);

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="relative mb-10">
          {!prefersReduced && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ width: "200px", height: "160px", top: "-30px", left: "50%", transform: "translateX(-50%)" }}
            />
          )}

          <div
            className="relative w-36 h-36 flex flex-col items-center justify-center mx-auto"
            style={{
              borderRadius: 0,
              background: "linear-gradient(135deg, rgba(0,180,216,0.06), rgba(0,180,216,0.03))",
              border: "1px solid rgba(0,180,216,0.18)",
              boxShadow: "0 0 40px rgba(0,180,216,0.08)",
            }}
          >
            <span
              className="text-5xl font-black font-mono"
              style={{
                WebkitTextFillColor: "#00B4D8",
              }}
            >
              404
            </span>
            <div
              className="text-[9px] tracking-[0.25em] uppercase mt-1"
              style={{ color: "rgba(0,180,216,0.4)" }}
            >
              Timeline Lost
            </div>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          This timeline doesn't exist.
        </h1>
        <p className="text-base text-muted-foreground/70 mb-2 max-w-md leading-relaxed">{wittyLine}</p>
        <p className="text-sm text-muted-foreground/40 mb-10 max-w-sm">
          Navigate back to a known dimension using the links below.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-12">
          <Link href="/">
            <Button
              className="bg-[#00B4D8] text-black hover:bg-[#00B4D8]/90 gap-2 font-semibold shadow-[0_0_24px_rgba(0,180,216,0.2)]"
            >
              <Home className="w-4 h-4" /> Return to Origin
            </Button>
          </Link>
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted/50 gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4" /> Previous Dimension
          </Button>
        </div>

        <div className="w-full max-w-lg">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40 mb-4 font-semibold">
            Known Coordinates
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer group transition-all duration-200"
                  style={{
                    borderRadius: 0,
                    background: "rgba(10,14,26,0.9)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(0,180,216,0.25)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(0,180,216,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLDivElement).style.background = "rgba(10,14,26,0.9)";
                  }}
                >
                  <div
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderRadius: 0 }}
                  >
                    <link.icon className="w-4 h-4 text-muted-foreground/70 group-hover:text-[#00B4D8] transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-foreground group-hover:text-[#00B4D8] transition-colors uppercase font-mono">
                      {link.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground/50 font-mono">{link.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2 text-[11px] text-muted-foreground/40 font-mono">
          <span>SIGNAL://LOST</span>
          <span className="opacity-50">·</span>
          <span>EntangleWealth Quantum OS</span>
        </div>
      </div>
    </Layout>
  );
}
