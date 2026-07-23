// Synthesized SFX for MAPLE ISLE — zero assets, pure WebAudio, tuned soft and
// toy-like (this is for kids: pops and whooshes, no harsh 8-bit edges).
// The context unlocks on the first user gesture per autoplay policy.

type Ctx = AudioContext;

export interface Audio3D {
  pop(combo: number, size?: number): void;   // eat — pitch rises with combo, deepens with size
  gulp(): void;                    // GULP whoosh
  rocket(): void;                  // ROCKET BITE zip
  collapse(): void;                // COLLAPSE boom
  evolve(): void;                  // form-up fanfare
  hit(): void;                     // took a shot
  alert(): void;                   // defense wave banner
  bigEat(): void;                  // crunching a building
  ready(): void;                   // a power just charged
  startMusic(): void;              // the match loop — tempo + layers ride the stage
  setMusicStage(n: number): void;
  stopMusic(): void;
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

  // ── MUSIC: a soft toy-synth loop that AUDIBLY escalates as the void grows —
  // hole.io's trick: tempo +8 BPM and one new layer per evolution stage, so the
  // island "losing" is something you can hear.
  let musGain: GainNode | null = null;
  let musTimer: ReturnType<typeof setInterval> | null = null;
  let musStage = 0, step = 0, nextT = 0;
  let lastPop = 0;
  // warm bus: music -> soft lowpass -> (dry + echo) -> master. The gentle
  // feedback echo is what turns bare oscillators into something that sounds
  // PRODUCED instead of 8-bit.
  function buildMusicBus(c: AudioContext): GainNode {
    const bus = c.createGain();
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 2400; warm.Q.value = 0.4;
    const dry = c.createGain(); dry.gain.value = 0.85;
    const delay = c.createDelay(0.6); delay.delayTime.value = 0.31;
    const fb = c.createGain(); fb.gain.value = 0.32;
    const wet = c.createGain(); wet.gain.value = 0.24;
    const wetTone = c.createBiquadFilter(); wetTone.type = 'lowpass'; wetTone.frequency.value = 1600;
    bus.connect(warm);
    warm.connect(dry); dry.connect(master!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(master!);
    delay.connect(fb); fb.connect(delay);
    return bus;
  }
  const BASS = [65.41, 65.41, 49.0, 49.0, 55.0, 55.0, 43.65, 49.0];               // C2 C2 G1 G1 A1 A1 F1 G1
  const MEL = [523.25, 0, 659.25, 783.99, 0, 659.25, 587.33, 0, 523.25, 0, 440, 523.25, 0, 392, 440, 0];
  const ARP = [1046.5, 1318.5, 1568, 1318.5];
  function musNote(freq: number, t: number, dur: number, type: OscillatorType, vol: number, glideTo?: number, soft = false) {
    const c = ctx; if (!c || !musGain || freq <= 0) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + (soft ? 0.06 : 0.015));   // soft = pad-like attack
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    g.connect(musGain);
    // two gently-detuned voices — lush, not chippy
    for (const cents of soft ? [-6, 6] : [0]) {
      const o = c.createOscillator();
      o.type = type;
      o.detune.value = cents;
      o.frequency.setValueAtTime(freq, t);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
      o.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  function musHat(t: number, vol: number) {
    const c = ctx; if (!c || !musGain) return;
    const len = Math.floor(c.sampleRate * 0.05);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t);
    src.connect(f); f.connect(g); g.connect(musGain);
    src.start(t);
  }
  function musSchedule() {
    const c = ensure(); if (!c || !musGain) return;
    const spb = 60 / (92 + musStage * 8);
    const s16 = spb / 4;
    if (nextT < c.currentTime) nextT = c.currentTime + 0.05;
    while (nextT < c.currentTime + 0.35) {
      const beat = Math.floor(step / 4) % 8, s = step % 16;
      if (step % 4 === 0) musNote(BASS[beat], nextT, spb * 0.9, 'sine', 0.14);
      if (step % 8 === 0) musNote(150, nextT, 0.1, 'sine', 0.16, 50);                 // soft kick
      // warm chord bed every bar — the cozy floor under everything
      if (step % 16 === 0) {
        const root = BASS[beat] * 4;
        musNote(root, nextT, spb * 3.6, 'sine', 0.035, undefined, true);
        musNote(root * 1.26, nextT, spb * 3.6, 'sine', 0.028, undefined, true);   // ~major third
        musNote(root * 1.5, nextT, spb * 3.6, 'sine', 0.024, undefined, true);
      }
      // melody: unhurried quarter-note pads with detune shimmer
      if (musStage >= 1 && s % 4 === 0 && MEL[s] > 0) musNote(MEL[s], nextT, s16 * 3.4, 'sine', 0.06, undefined, true);
      if (musStage >= 2 && step % 8 === 2) musHat(nextT, 0.028);
      if (musStage >= 3 && step % 2 === 0) musNote(ARP[step % 4], nextT, s16 * 1.4, 'sine', 0.018, undefined, true);
      nextT += s16; step++;
    }
  }

  return {
    startMusic() {
      const c = ensure(); if (!c || !master) return;
      if (!musGain) musGain = buildMusicBus(c);
      musGain.gain.cancelScheduledValues(c.currentTime);
      musGain.gain.setValueAtTime(0.0001, c.currentTime);
      musGain.gain.exponentialRampToValueAtTime(0.26, c.currentTime + 1.2);
      step = 0; nextT = c.currentTime + 0.1;
      if (musTimer) clearInterval(musTimer);
      musTimer = setInterval(musSchedule, 110);
    },
    setMusicStage(n) { musStage = n; },
    stopMusic() {
      if (musTimer) { clearInterval(musTimer); musTimer = null; }
      if (ctx && musGain) {
        musGain.gain.cancelScheduledValues(ctx.currentTime);
        musGain.gain.setValueAtTime(musGain.gain.value, ctx.currentTime);
        musGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      }
    },
    pop(combo, size = 0.9) {
      // soft water-drop 'bloop' — pitch nudges up with the combo, DEEPENS with
      // the void's size (a WORLD ENDER bite is felt, not heard), rate-limited
      const c = ensure(); if (!c) return;
      const now = c.currentTime;
      if (now - lastPop < 0.09) return;
      lastPop = now;
      const depth = Math.min(1, (size - 0.9) / 9);          // 0 tiny -> 1 huge
      const f = (190 + Math.min(combo, 20) * 9) * (1 - depth * 0.55);
      tone(f * 1.6, f * 0.72, 0.12 + depth * 0.08, 'sine', 0.15 + depth * 0.07);
      noise(0.05, 0.04, 900, 300);
      if (depth > 0.4) tone(58, 34, 0.16, 'sine', depth * 0.12);   // sub thump
    },
    bigEat() {
      noise(0.22, 0.3, 900, 180);
      tone(160, 70, 0.24, 'sine', 0.24);
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
      tone(120, 34, 0.9, 'sine', 0.4);
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
    ready() {
      tone(659.25, 659.25, 0.1, 'sine', 0.18);
      tone(987.77, 987.77, 0.14, 'sine', 0.16, 0.09);
    },
  };
}
