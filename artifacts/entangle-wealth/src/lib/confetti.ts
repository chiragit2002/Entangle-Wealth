import confetti from "canvas-confetti";

export type CelebrationTier = "small" | "medium" | "large" | "jackpot";
export type CelebrationAmountType = "xp" | "money" | "special";

const MUTE_KEY = "ew_celebration_muted";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "true" : "false");
  } catch {}
}

export function toggleMute(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

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

function playSoftChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1047, ctx.currentTime);
  osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.1);
  osc.connect(gainNode);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.8);
}

function playCoinDrop(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

  [0, 0.07, 0.14].forEach((delay) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1600, ctx.currentTime + delay);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + delay + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.3);
  });
}

function playFanfare(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [
    { freq: 523, time: 0 },
    { freq: 659, time: 0.1 },
    { freq: 784, time: 0.2 },
    { freq: 1047, time: 0.3 },
    { freq: 1319, time: 0.45 },
  ];

  notes.forEach(({ freq, time }) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
    g.gain.setValueAtTime(0.2, ctx.currentTime + time);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.25);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime + time);
    osc.stop(ctx.currentTime + time + 0.25);
  });
}

function playFireworkBurst(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  [0, 0.15, 0.3].forEach((delay) => {
    const bufSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000 - delay * 500, ctx.currentTime + delay);
    filter.Q.setValueAtTime(0.5, ctx.currentTime + delay);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);

    source.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    source.start(ctx.currentTime + delay);
    source.stop(ctx.currentTime + delay + 0.5);
  });

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
  g.gain.setValueAtTime(0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

function playSound(tier: CelebrationTier): void {
  if (isMuted()) return;
  try {
    switch (tier) {
      case "small":
        playSoftChime();
        break;
      case "medium":
        playCoinDrop();
        break;
      case "large":
        playFanfare();
        break;
      case "jackpot":
        playFireworkBurst();
        break;
    }
  } catch {}
}

function determineTier(amount: number, type: CelebrationAmountType = "xp"): CelebrationTier {
  if (type === "special") return "jackpot";

  if (type === "xp") {
    if (amount >= 1000) return "large";
    if (amount >= 500) return "medium";
    return "small";
  }

  if (type === "money") {
    if (amount >= 10000) return "jackpot";
    if (amount >= 1000) return "large";
    if (amount >= 100) return "medium";
    return "small";
  }

  return "small";
}

function fireSmall(): void {
  confetti({
    particleCount: 40,
    spread: 50,
    origin: { y: 0.6 },
    colors: ["#C0C0C0", "#FFFFFF", "#E8E8E8", "#AAAAAA"],
    ticks: 100,
    gravity: 1.2,
    scalar: 0.8,
  });
}

function fireMedium(): void {
  confetti({
    particleCount: 80,
    spread: 65,
    origin: { y: 0.6 },
    colors: ["#00ff88", "#00D4FF", "#00cc6a", "#00b8cc", "#00e07a"],
    ticks: 150,
    gravity: 1.0,
  });

  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: ["#00ff88", "#00D4FF"],
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: ["#00ff88", "#00D4FF"],
    });
  }, 150);
}

function fireLarge(): void {
  const colors = ["#FFD700", "#FFA500", "#FF8C00", "#FFEC6E", "#FFC832"];

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors,
    ticks: 200,
    gravity: 0.9,
  });

  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 75,
      spread: 70,
      origin: { x: 0.1, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 60,
      angle: 105,
      spread: 70,
      origin: { x: 0.9, y: 0.6 },
      colors,
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 100,
      origin: { y: 0.3 },
      colors,
      gravity: 0.6,
      scalar: 1.2,
    });
  }, 400);
}

function fireJackpot(): void {
  const rainbowColors = [
    "#FF0000", "#FF7F00", "#FFFF00", "#00FF00",
    "#0000FF", "#8B00FF", "#FF69B4", "#FFD700",
    "#00D4FF", "#FF3366",
  ];
  const goldColors = ["#FFD700", "#FFA500", "#FFEC6E", "#FFC832"];

  const burst = () => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { x: Math.random(), y: Math.random() * 0.4 + 0.1 },
      colors: rainbowColors,
      ticks: 300,
      gravity: 0.7,
      scalar: 1.3,
    });
  };

  burst();
  setTimeout(burst, 150);
  setTimeout(burst, 300);

  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 120,
      origin: { y: 0.5 },
      colors: goldColors,
      ticks: 350,
      gravity: 0.8,
      scalar: 1.4,
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 80,
      origin: { x: 0, y: 0.7 },
      colors: rainbowColors,
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 80,
      origin: { x: 1, y: 0.7 },
      colors: rainbowColors,
    });
  }, 400);

  setTimeout(burst, 500);
  setTimeout(burst, 700);
}

export function fireCelebration(
  amount: number = 0,
  type: CelebrationAmountType = "xp",
  forceTier?: CelebrationTier
): CelebrationTier {
  const tier = forceTier ?? determineTier(amount, type);

  playSound(tier);

  switch (tier) {
    case "small":
      fireSmall();
      break;
    case "medium":
      fireMedium();
      break;
    case "large":
      fireLarge();
      break;
    case "jackpot":
      fireJackpot();
      break;
  }

  return tier;
}

export function getCelebrationTier(rewardType: string, rewardValue: number): CelebrationTier {
  if (rewardType === "multiplier" || rewardType === "streak_protection" || rewardValue >= 750) {
    return "jackpot";
  }
  if (rewardValue >= 250) return "medium";
  return "small";
}

export function getXpCelebrationTier(xp: number): CelebrationTier {
  if (xp >= 1000) return "large";
  if (xp >= 500) return "medium";
  return "small";
}

export function fireConfetti(): void {
  fireCelebration(0, "xp", "medium");
}
