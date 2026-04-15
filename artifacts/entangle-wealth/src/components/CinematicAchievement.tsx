import { useEffect, useRef, useState } from "react";
import { playMilestoneSonic } from "@/lib/sonicBrand";

export interface AchievementCelebration {
  title: string;
  subtitle?: string;
  tier?: "gold" | "platinum" | "diamond";
}

interface CinematicAchievementProps {
  achievement: AchievementCelebration | null;
  onComplete: () => void;
}

const TIER_CONFIG = {
  gold: {
    colors: ["#FFD700", "#FFA500", "#FFEC6E"],
    glow: "rgba(255,215,0,0.4)",
    label: "Achievement Unlocked",
  },
  platinum: {
    colors: ["#00B4D8", "#7B61FF", "#00FF88"],
    glow: "rgba(0,180,216,0.4)",
    label: "Milestone Reached",
  },
  diamond: {
    colors: ["#00B4D8", "#FFFFFF", "#7B61FF", "#00FF88"],
    glow: "rgba(123,97,255,0.5)",
    label: "Legendary Achievement",
  },
};

export function CinematicAchievement({ achievement, onComplete }: CinematicAchievementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<"enter" | "celebrate" | "exit">("enter");
  const startRef = useRef(0);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!achievement) return;
    playMilestoneSonic();
    setPhase("enter");

    const enterTimer = setTimeout(() => setPhase("celebrate"), 600);
    const exitTimer = setTimeout(() => setPhase("exit"), 3200);
    const doneTimer = setTimeout(onComplete, 3800);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [achievement, onComplete]);

  useEffect(() => {
    if (!achievement || prefersReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const tier = achievement.tier ?? "gold";
    const colors = TIER_CONFIG[tier].colors;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
      color: string;
      gravity: number;
    }

    const particles: Particle[] = [];
    const spawnBurst = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 4;
        particles.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - Math.random() * 4,
          alpha: 1,
          size: Math.random() * 5 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          gravity: 0.15 + Math.random() * 0.1,
        });
      }
    };

    spawnBurst();
    setTimeout(spawnBurst, 200);
    setTimeout(spawnBurst, 500);

    startRef.current = performance.now();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.alpha -= 0.008;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (particles.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [achievement, prefersReduced]);

  if (!achievement) return null;

  const tier = achievement.tier ?? "gold";
  const config = TIER_CONFIG[tier];

  const containerStyle: React.CSSProperties = {
    opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1,
    transform:
      phase === "enter"
        ? "scale(0.85) translateY(20px)"
        : phase === "exit"
          ? "scale(1.05) translateY(-10px)"
          : "scale(1) translateY(0)",
    transition:
      phase === "enter"
        ? "opacity 0.5s ease-out, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
        : "opacity 0.5s ease-in, transform 0.4s ease-in",
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      {!prefersReduced && <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />}

      <div
        className="relative z-10 flex flex-col items-center text-center px-8"
        style={containerStyle}
      >
        <div
          className="text-[10px] tracking-[0.4em] uppercase mb-4 font-semibold"
          style={{ color: config.colors[0] }}
        >
          {config.label}
        </div>

        <div
          className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3 leading-none"
          style={{
            background: `linear-gradient(135deg, ${config.colors.join(", ")})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: `drop-shadow(0 0 30px ${config.glow})`,
          }}
        >
          {achievement.title}
        </div>

        {achievement.subtitle && (
          <div className="text-base text-white/60 max-w-sm">{achievement.subtitle}</div>
        )}

        <div
          className="mt-6 w-16 h-0.5 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.colors[0]}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
