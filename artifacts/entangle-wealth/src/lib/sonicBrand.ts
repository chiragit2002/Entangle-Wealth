let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

function isMuted(): boolean {
  try {
    return localStorage.getItem("ew_celebration_muted") === "true";
  } catch {
    return false;
  }
}

export function playBootSonic(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;

  const chord = [
    { freq: 220, start: 0, dur: 0.8 },
    { freq: 277.18, start: 0.1, dur: 0.7 },
    { freq: 329.63, start: 0.2, dur: 0.6 },
    { freq: 440, start: 0.35, dur: 1.2 },
    { freq: 554.37, start: 0.5, dur: 1.0 },
  ];

  chord.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t + start);
    gain.gain.setValueAtTime(0, t + start);
    gain.gain.linearRampToValueAtTime(0.15, t + start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.1);
  });

  const sweepOsc = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  sweepOsc.type = "sawtooth";
  sweepOsc.frequency.setValueAtTime(80, t + 0.6);
  sweepOsc.frequency.exponentialRampToValueAtTime(440, t + 1.2);
  sweepGain.gain.setValueAtTime(0.08, t + 0.6);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, t + 0.6);
  sweepOsc.connect(filter);
  filter.connect(sweepGain);
  sweepGain.connect(ctx.destination);
  sweepOsc.start(t + 0.6);
  sweepOsc.stop(t + 1.8);
}

export function playMilestoneSonic(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const notes = [
    { freq: 523.25, start: 0, dur: 0.3 },
    { freq: 659.25, start: 0.12, dur: 0.3 },
    { freq: 783.99, start: 0.24, dur: 0.5 },
    { freq: 1046.5, start: 0.38, dur: 0.8 },
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t + start);
    gain.gain.setValueAtTime(0.22, t + start);
    gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + start);
    osc.stop(t + start + dur + 0.05);
  });
}

export function playMicroConfirm(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.setValueAtTime(1320, t + 0.06);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}
