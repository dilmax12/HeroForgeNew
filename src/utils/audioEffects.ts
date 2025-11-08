// Utilitário simples de efeitos sonoros usando Web Audio API
// Evita dependências externas e funciona sem arquivos de áudio

let audioCtx: AudioContext | null = null;
let lastPlayAt = 0;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}


function playSequence(notes: Array<{ f: number; d: number; t?: OscillatorType; v?: number }>, gapMs = 30) {
  const ctx = getAudioContext();
  let offset = 0;
  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.t || 'sine';
    osc.frequency.value = n.f;
    gain.gain.value = n.v ?? 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + offset / 1000;
    const stop = start + n.d / 1000;
    osc.start(start);
    gain.gain.setValueAtTime(gain.gain.value, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.stop(stop);
    offset += n.d + gapMs;
  });
}

function rateLimit(minIntervalMs = 80): boolean {
  const now = Date.now();
  if (now - lastPlayAt < minIntervalMs) return false;
  lastPlayAt = now;
  return true;
}

export function playSuccess() {
  if (!rateLimit()) return;
  // Arpejo curto e alegre
  playSequence([
    { f: 740, d: 90 },
    { f: 880, d: 90 },
    { f: 988, d: 120 },
  ]);
}

export function playFailure() {
  if (!rateLimit()) return;
  // Tom descendente e suave
  playSequence([
    { f: 220, d: 140, t: 'sawtooth', v: 0.08 },
    { f: 180, d: 140, t: 'sawtooth', v: 0.08 },
    { f: 140, d: 160, t: 'sawtooth', v: 0.08 },
  ]);
}

export function playLevelUp() {
  if (!rateLimit()) return;
  // Fanfare curta
  playSequence([
    { f: 660, d: 100, t: 'triangle', v: 0.12 },
    { f: 880, d: 140, t: 'triangle', v: 0.12 },
    { f: 990, d: 120, t: 'triangle', v: 0.12 },
    { f: 1320, d: 180, t: 'sine', v: 0.12 },
  ]);
}

export function resumeAudioContextIfNeeded() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
