import confetti from "canvas-confetti";

export type CelebrationTier = "small" | "medium" | "big";

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function playSmallDing() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

function playMediumChord() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.04);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.04);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.04 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 0.6);
    osc.start(ctx.currentTime + i * 0.04);
    osc.stop(ctx.currentTime + i * 0.04 + 0.6);
  });
}

function playBigFanfare() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const sequence = [
    { freq: 392, time: 0, dur: 0.15 },
    { freq: 523.25, time: 0.12, dur: 0.15 },
    { freq: 659.25, time: 0.24, dur: 0.15 },
    { freq: 783.99, time: 0.36, dur: 0.3 },
    { freq: 1046.5, time: 0.6, dur: 0.5 },
  ];
  sequence.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
    gain.gain.setValueAtTime(0, ctx.currentTime + time);
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
    osc.start(ctx.currentTime + time);
    osc.stop(ctx.currentTime + time + dur);
  });
}

export function fireConfetti(tier: CelebrationTier = "small") {
  if (tier === "small") {
    playSmallDing();
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.6 },
      colors: ["#e0e0e0", "#ffffff", "#c0c0c0", "#d4d4d4", "#f5f5f5"],
      scalar: 0.85,
      gravity: 1.2,
    });
  } else if (tier === "medium") {
    playMediumChord();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.55 },
      colors: ["#00D4FF", "#00bcd4", "#0099cc", "#00e5ff", "#26c6da", "#80deea"],
      scalar: 1,
      gravity: 0.9,
    });
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 40,
        origin: { x: 0.2, y: 0.6 },
        colors: ["#00D4FF", "#00bcd4", "#0099cc"],
        scalar: 0.9,
      });
      confetti({
        particleCount: 60,
        spread: 40,
        origin: { x: 0.8, y: 0.6 },
        colors: ["#00D4FF", "#00bcd4", "#0099cc"],
        scalar: 0.9,
      });
    }, 300);
  } else {
    playBigFanfare();
    const goldColors = ["#FFD700", "#FFA500", "#FF6347", "#ff3366", "#00ff88", "#00D4FF", "#9c27b0"];
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.5 },
      colors: goldColors,
      scalar: 1.2,
      gravity: 0.7,
    });
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { x: 0.1, y: 0.4 },
        colors: goldColors,
        scalar: 1,
        angle: 60,
      });
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { x: 0.9, y: 0.4 },
        colors: goldColors,
        scalar: 1,
        angle: 120,
      });
    }, 300);
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { x: 0.5, y: 0.3 },
        colors: goldColors,
        scalar: 1.1,
        gravity: 0.6,
        shapes: ["circle", "square"],
      });
    }, 700);
  }
}

export function getCelebrationTier(rewardType: string, rewardValue: number): CelebrationTier {
  if (
    rewardType === "multiplier" ||
    rewardType === "streak_protection" ||
    rewardValue >= 750
  ) {
    return "big";
  }
  if (rewardValue >= 250) {
    return "medium";
  }
  return "small";
}

export function getXpCelebrationTier(xp: number): CelebrationTier {
  if (xp >= 750) return "big";
  if (xp >= 250) return "medium";
  return "small";
}
