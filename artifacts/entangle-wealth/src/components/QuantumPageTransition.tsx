import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const PARTICLE_COUNT = 60;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

const COLORS = ["#FF8C00", "#00FF88", "#7B61FF", "#FF8C00", "#FF8C00"];

export function QuantumPageTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [location] = useLocation();
  const prevLocationRef = useRef(location);
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef<"idle" | "dissolve" | "assemble">("idle");
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef(0);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) return;
    if (location === prevLocationRef.current) return;
    prevLocationRef.current = location;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      alpha: 1,
      size: Math.random() * 3 + 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    particlesRef.current = particles;
    phaseRef.current = "dissolve";
    startTimeRef.current = performance.now();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const DISSOLVE_DUR = 200;
      const ASSEMBLE_DUR = 200;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (phaseRef.current === "dissolve") {
        const progress = Math.min(elapsed / DISSOLVE_DUR, 1);
        particles.forEach((p) => {
          p.x += p.vx * 0.5;
          p.y += p.vy * 0.5;
          p.alpha = 1 - progress;
          ctx.globalAlpha = Math.max(0, p.alpha * 0.8);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

        if (progress >= 1) {
          phaseRef.current = "assemble";
          startTimeRef.current = now;
          particles.forEach((p) => {
            p.x = Math.random() * canvas.width;
            p.y = Math.random() * canvas.height;
            p.vx = (Math.random() - 0.5) * 4;
            p.vy = (Math.random() - 0.5) * 4;
            p.alpha = 0;
          });
        }
        animRef.current = requestAnimationFrame(animate);
      } else if (phaseRef.current === "assemble") {
        const progress = Math.min(elapsed / ASSEMBLE_DUR, 1);
        particles.forEach((p) => {
          p.x += p.vx * (1 - progress);
          p.y += p.vy * (1 - progress);
          p.alpha = progress;
          ctx.globalAlpha = Math.max(0, p.alpha * 0.6);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
        });

        if (progress >= 1) {
          phaseRef.current = "idle";
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [location, prefersReduced]);

  if (prefersReduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[150] pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
