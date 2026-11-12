/**
 * The completion chime: three bell notes, made in the browser with Web Audio,
 * so there is no sound file to load. Browsers only let a page play sound after
 * a click, and a block usually ends while the tab sits in the background, so
 * the audio is unlocked when the block starts and played when it ends.
 */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    context ??= new Ctor();
  } catch {
    return null;
  }
  return context;
}

/** Called from the click that starts a block, while the browser allows sound to begin. */
export function unlockChime(): void {
  const ctx = audio();
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

/** One bell note: a quick strike that rings out. */
function bell(ctx: AudioContext, frequency: number, at: number): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.2);
  gain.connect(ctx.destination);
  // A partial an octave and a fifth up gives the note its bell colour.
  for (const [ratio, level] of [[1, 1], [3, 0.25]] as const) {
    const osc = ctx.createOscillator();
    const partial = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency * ratio, at);
    partial.gain.value = level;
    osc.connect(partial).connect(gain);
    osc.start(at);
    osc.stop(at + 1.25);
  }
}

/** Ding, ding, ding: the block is done. */
export function playChime(): void {
  const ctx = audio();
  if (!ctx) return;
  const ring = () => {
    const now = ctx.currentTime + 0.02;
    [1046.5, 1046.5, 1318.5].forEach((frequency, index) => bell(ctx, frequency, now + index * 0.32));
  };
  if (ctx.state === 'suspended') void ctx.resume().then(ring, () => undefined);
  else ring();
}
