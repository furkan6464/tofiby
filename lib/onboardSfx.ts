let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = ctx ?? new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0) {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function unlockSfx() {
  audio();
}

export function playSfx(kind: "pop" | "click" | "type" | "chime" | "soft") {
  if (kind === "pop") {
    tone(520, 0.08, "triangle", 0.05);
    tone(780, 0.1, "sine", 0.03, 0.02);
    return;
  }
  if (kind === "click") {
    tone(880, 0.05, "square", 0.035);
    return;
  }
  if (kind === "type") {
    tone(340 + Math.random() * 80, 0.035, "square", 0.02);
    return;
  }
  if (kind === "chime") {
    tone(523, 0.16, "sine", 0.05);
    tone(659, 0.2, "sine", 0.04, 0.07);
    tone(784, 0.24, "sine", 0.03, 0.14);
    return;
  }
  tone(240, 0.07, "sine", 0.03);
}
