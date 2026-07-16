// Synthesized SFX for MAPLE ISLE — zero assets, pure WebAudio, tuned soft and
// toy-like (this is for kids: pops and whooshes, no harsh 8-bit edges).
// The context unlocks on the first user gesture per autoplay policy.

type Ctx = AudioContext;

export interface Audio3D {
  pop(combo: number): void;        // eat — pitch rises with combo
  gulp(): void;                    // GULP whoosh
  rocket(): void;                  // ROCKET BITE zip
  collapse(): void;                // COLLAPSE boom
  evolve(): void;                  // form-up fanfare
  hit(): void;                     // took a shot
  alert(): void;                   // defense wave banner
  bigEat(): void;                  // crunching a building
}

export function createAudio(): Audio3D {
  let ctx: Ctx | null = null;
  let master: GainNode | null = null;

  function ensure(): Ctx | null {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.32; master.connect(ctx.destination);
      } catch { return null; }
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }
  const unlock = () => { ensure(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  // helpers
  function tone(freq0: number, freq1: number, dur: number, type: OscillatorType, vol: number, when = 0) {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur: number, vol: number, fc0: number, fc1: number, when = 0) {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(fc0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(60, fc1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  return {
    pop(combo) {
      const p = Math.min(combo, 14);
      const f = 340 * Math.pow(1.06, p);
      tone(f, f * 1.5, 0.09, 'sine', 0.32);
      tone(f * 2, f * 2.6, 0.05, 'triangle', 0.1);
    },
    bigEat() {
      noise(0.22, 0.3, 900, 180);
      tone(160, 70, 0.22, 'sine', 0.34);
    },
    gulp() {
      noise(0.4, 0.34, 2200, 220);
      tone(420, 120, 0.36, 'sine', 0.26);
    },
    rocket() {
      tone(180, 900, 0.42, 'sawtooth', 0.13);
      noise(0.45, 0.2, 500, 3200);
    },
    collapse() {
      tone(120, 34, 0.9, 'sine', 0.5);
      noise(0.8, 0.32, 2600, 90);
      tone(60, 46, 1.1, 'triangle', 0.3, 0.05);
    },
    evolve() {
      const seq = [392, 523.25, 659.25, 783.99]; // G4 C5 E5 G5 — bright major
      seq.forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.22, i * 0.085));
      tone(1567.98, 1567.98, 0.4, 'sine', 0.1, 0.34);
    },
    hit() {
      tone(140, 60, 0.16, 'square', 0.16);
      noise(0.12, 0.18, 700, 200);
    },
    alert() {
      tone(660, 660, 0.13, 'square', 0.12);
      tone(880, 880, 0.13, 'square', 0.12, 0.16);
    },
  };
}
