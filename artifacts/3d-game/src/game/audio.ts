import { CONFIG, type ObjectKind } from './config';

// VOIDLING v5 §5 — synth SFX + procedural background music.
// Two master buses: SFX and MUSIC, each independently toggled + persisted.
export const audio = {
  ctx: null as AudioContext | null,
  sfxGain: null as GainNode | null,
  musicGain: null as GainNode | null,
  _noiseBuf: null as AudioBuffer | null,

  sfxOn: true,
  musicOn: true,

  // pitch-ladder state (climbs 1 semitone per absorb within 1.5s, up to +12)
  _ladder: 0,
  _lastAbsorb: -9999,

  // music scheduler state
  _musicBase: CONFIG.MUSIC_GAIN,
  _musicPlaying: false,
  _musicPaused: false,
  _musicTimer: null as number | null,
  _step: 0,
  _nextStepTime: 0,
  _intense: false,
  _musicForm: 0,          // v8 §5: evolution form → number of active music layers

  get muted() { return !this.sfxOn; },

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = CONFIG.SFX_GAIN;
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this._musicBase = CONFIG.MUSIC_GAIN;
      this.musicGain.gain.value = this.musicOn ? this._musicBase : 0;
      this.musicGain.connect(this.ctx.destination);
      // 1s of white noise, reused for pops / hats / sweeps
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
    }
    // resume if the browser suspended us before the first gesture
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    // load persisted toggles (falls back to the legacy single mute flag)
    const m = localStorage.getItem('voidling_music');
    const s = localStorage.getItem('voidling_sfx');
    if (m !== null) this.musicOn = m === 'true';
    if (s !== null) this.sfxOn = s === 'true';
    else {
      const legacy = localStorage.getItem('voidling_muted');
      if (legacy !== null) this.sfxOn = legacy !== 'true';
    }
    this._applyMusicGain();
  },

  _applyMusicGain() {
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this._musicBase : 0;
  },

  // ── toggles ──────────────────────────────────────────────────────────────────
  toggleMute() { return !this.toggleSfx(); }, // legacy: returns "muted"
  toggleSfx() {
    this.sfxOn = !this.sfxOn;
    localStorage.setItem('voidling_sfx', String(this.sfxOn));
    return this.sfxOn;
  },
  toggleMusic() {
    this.musicOn = !this.musicOn;
    localStorage.setItem('voidling_music', String(this.musicOn));
    this._applyMusicGain();
    return this.musicOn;
  },

  // ── debug-panel live gain ──────────────────────────────────────────────────────
  setMusicGain(v: number) { CONFIG.MUSIC_GAIN = v; this._musicBase = v; this._applyMusicGain(); },
  setSfxGain(v: number) { CONFIG.SFX_GAIN = v; if (this.sfxGain) this.sfxGain.gain.value = v; },

  // ── generic SFX voice ──────────────────────────────────────────────────────────
  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, when = 0) {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  },

  // band-passed / swept noise burst on the SFX bus
  _noise(time: number, dur: number, filterType: BiquadFilterType, freq: number, q: number, vol: number, sweepTo?: number) {
    if (!this.ctx || !this._noiseBuf || !this.sfxGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(freq, time);
    if (sweepTo) filt.frequency.exponentialRampToValueAtTime(sweepTo, time + dur);
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(time); src.stop(time + dur + 0.02);
  },

  // ── v8 §5: eat sound v3 — percussive "chest" thump, not a chime ────────────────
  // transient click + 90Hz sine punch + ladder-carrying pitch-down blip (+ T3+ sub).
  playChomp(tier = 1) {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const ms = now * 1000;
    if (ms - this._lastAbsorb < 1500) this._ladder = Math.min(12, this._ladder + 1);
    else this._ladder = 0;
    this._lastAbsorb = ms;

    // 1) 2ms transient click
    this._noise(now, 0.004, 'highpass', 4000, 0.9, 0.5);

    // 2) ~90Hz sine punch, 50ms fast decay
    const p = this.ctx.createOscillator(); const pg = this.ctx.createGain();
    p.type = 'sine';
    p.frequency.setValueAtTime(120, now);
    p.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    pg.gain.setValueAtTime(0.5, now);
    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    p.connect(pg); pg.connect(this.sfxGain); p.start(now); p.stop(now + 0.07);

    // 3) short pitch-down blip carrying the ladder
    const f0 = 620 * Math.pow(2, this._ladder / 12);
    const b = this.ctx.createOscillator(); const bg = this.ctx.createGain();
    b.type = 'triangle';
    b.frequency.setValueAtTime(f0, now);
    b.frequency.exponentialRampToValueAtTime(f0 * 0.55, now + 0.06);
    bg.gain.setValueAtTime(0.12, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    b.connect(bg); bg.connect(this.sfxGain); b.start(now); b.stop(now + 0.09);

    // 4) faint sub thump on T3+
    if (tier >= 3) {
      const s = this.ctx.createOscillator(); const sg = this.ctx.createGain();
      s.type = 'sine';
      s.frequency.setValueAtTime(55, now);
      s.frequency.exponentialRampToValueAtTime(40, now + 0.14);
      sg.gain.setValueAtTime(0.28, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      s.connect(sg); sg.connect(this.sfxGain); s.start(now); s.stop(now + 0.18);
    }
  },

  // Layer C — per-family flavour, layered under the gulp-pop
  playSignature(kind: ObjectKind) {
    if (!this.sfxOn || !this.ctx) return;
    switch (kind) {
      case 'gnome':
        this.playTone(1200, 'sine', 0.08, 0.06);
        this.playTone(1700, 'sine', 0.06, 0.05, 0.04);
        break;
      case 'trashcan':
        this.playTone(220, 'square', 0.06, 0.06);
        this.playTone(160, 'square', 0.08, 0.06, 0.06);
        break;
      case 'car':
        this.playTone(110, 'sawtooth', 0.14, 0.08);
        this.playTone(70, 'sawtooth', 0.1, 0.06, 0.03);
        break;
      case 'duck':
        this.playTone(420, 'sawtooth', 0.1, 0.06);
        break;
      case 'person':
        this.playTone(520, 'triangle', 0.09, 0.05);
        this.playTone(380, 'triangle', 0.08, 0.05, 0.05);
        break;
      default:
        break;
    }
  },

  playHonk() {
    if (!this.sfxOn || !this.ctx) return;
    this.playTone(300, 'square', 0.12, 0.06);
    this.playTone(360, 'square', 0.12, 0.05, 0.02);
  },

  // v8 §3: 2-note car alarm chirp when a DEVOURER+ player looms past
  carAlarm() {
    if (!this.sfxOn || !this.ctx) return;
    this.playTone(880, 'square', 0.08, 0.05);
    this.playTone(660, 'square', 0.09, 0.05, 0.1);
  },

  // v8 §6: callout whoosh — swept noise as a banner stamps in
  whoosh() {
    if (!this.sfxOn || !this.ctx) return;
    this._noise(this.ctx.currentTime, 0.18, 'bandpass', 700, 0.8, 0.14, 3600);
  },

  // v8 §7: meteor impact thump
  meteorThump() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, now);
    o.frequency.exponentialRampToValueAtTime(45, now + 0.18);
    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.22);
    this._noise(now, 0.1, 'lowpass', 800, 0.7, 0.25);
  },

  // v8 §5: the music grows with the player — set the active layer count
  setMusicForm(f: number) { this._musicForm = Math.max(0, f | 0); },

  // v7 §3: ice-cream cart jingle
  playJingle() {
    if (!this.sfxOn || !this.ctx) return;
    [659.25, 784, 659.25, 523.25].forEach((f, i) => this.playTone(f, 'triangle', 0.12, 0.045, i * 0.12));
  },

  // v7 §3: trampoline boing
  playBounce() {
    if (!this.sfxOn || !this.ctx) return;
    this.playTone(180, 'sine', 0.14, 0.08);
    this.playTone(520, 'sine', 0.16, 0.05, 0.05);
  },

  // merge / TRIPLE: 3-note chord + upward noise sweep
  playMerge() {
    if (!this.sfxOn || !this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => this.playTone(f, 'triangle', 0.4, 0.14, i * 0.02));
    this._noise(now, 0.28, 'bandpass', 500, 3, 0.12, 4000);
  },

  // getting eaten: descending filtered "wah"
  playEaten() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1600, now);
    filt.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.6);
  },

  playTick() { this.playTone(800, 'square', 0.05, 0.05); },

  // v8 §1: round-start countdown beeps (3/2/1 climb) + the "EAT!" go signal
  countBeep(n: number) {
    const f = n >= 3 ? 440 : n === 2 ? 554 : 659; // A4 → C#5 → E5
    this.playTone(f, 'triangle', 0.16, 0.18);
    this.playTone(f * 2, 'sine', 0.10, 0.06, 0.005);
  },
  eatGo() {
    // rising triumphant stab + noise transient
    this.playTone(660, 'triangle', 0.20, 0.20);
    this.playTone(990, 'triangle', 0.30, 0.15, 0.02);
    this.playTone(1320, 'sine', 0.34, 0.10, 0.04);
    if (this.ctx) this._noise(this.ctx.currentTime, 0.06, 'highpass', 2000, 1, 0.16);
  },

  playBoon() {
    this.playTone(600, 'sine', 0.1, 0.1);
    this.playTone(800, 'sine', 0.2, 0.1, 0.1);
  },

  // v8 §5: evolution sting — 400ms riser → boom → 3-chord stab w/ echo → 1s shimmer
  playEvolve() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // 1) white-noise riser sweeping up over 400ms
    if (this._noiseBuf) {
      const src = this.ctx.createBufferSource(); src.buffer = this._noiseBuf; src.loop = true;
      const filt = this.ctx.createBiquadFilter(); filt.type = 'bandpass';
      filt.frequency.setValueAtTime(300, now);
      filt.frequency.exponentialRampToValueAtTime(6000, now + 0.4);
      filt.Q.value = 1.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.03, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.4);
      src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
      src.start(now); src.stop(now + 0.42);
    }
    // 2) impact boom at +0.4s (55Hz sine sweep + low noise burst)
    const boom = now + 0.4;
    const bo = this.ctx.createOscillator(); const bg = this.ctx.createGain();
    bo.type = 'sine';
    bo.frequency.setValueAtTime(85, boom);
    bo.frequency.exponentialRampToValueAtTime(45, boom + 0.28);
    bg.gain.setValueAtTime(0.6, boom);
    bg.gain.exponentialRampToValueAtTime(0.001, boom + 0.3);
    bo.connect(bg); bg.connect(this.sfxGain); bo.start(boom); bo.stop(boom + 0.32);
    this._noise(boom, 0.14, 'lowpass', 1200, 0.7, 0.4);
    // 3) triumphant 3-chord stab with echo tail (starts on the boom)
    [523.25, 659.25, 783.99].forEach((f) => {
      this.playTone(f, 'triangle', 0.5, 0.14, 0.42);
      this.playTone(f, 'triangle', 0.4, 0.06, 0.6);  // echo
      this.playTone(f, 'triangle', 0.3, 0.03, 0.78); // echo tail
    });
    // 4) ~1s shimmer
    if (this._noiseBuf) this._noise(now + 0.55, 1.0, 'highpass', 6500, 1, 0.05);
  },

  // v6 §10: world event — attention-grabbing two-note horn
  playEvent() {
    if (!this.sfxOn || !this.ctx) return;
    this.playTone(392, 'sawtooth', 0.24, 0.12);
    this.playTone(523.25, 'sawtooth', 0.34, 0.12, 0.2);
  },

  // v6 §10: win — a short crowd-cheer swell (filtered noise)
  playWin() {
    if (!this.sfxOn || !this.ctx || !this._noiseBuf || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.setValueAtTime(900, now);
    filt.frequency.linearRampToValueAtTime(1600, now + 0.7);
    filt.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start(now); src.stop(now + 1.5);
    [523.25, 659.25, 783.99].forEach((f, i) => this.playTone(f, 'triangle', 0.5, 0.1, i * 0.05));
  },

  // ── procedural background music (v6 §10: 96 BPM marimba, C major, 8-bar loop) ──
  startMusic() {
    this.init();
    if (!this.ctx || this._musicPlaying) return;
    this._musicPlaying = true;
    this._musicPaused = false;
    this._musicForm = 0;
    this._step = 0;
    this._nextStepTime = this.ctx.currentTime + 0.1;
    this._musicTimer = window.setInterval(() => this._musicScheduler(), 25);
  },
  stopMusic() {
    this._musicPlaying = false;
    this._musicPaused = false;
    if (this._musicTimer !== null) { clearInterval(this._musicTimer); this._musicTimer = null; }
  },
  pauseMusic() {
    if (!this._musicPlaying || this._musicPaused) return;
    this._musicPaused = true;
    if (this._musicTimer !== null) { clearInterval(this._musicTimer); this._musicTimer = null; }
  },
  resumeMusic() {
    if (!this._musicPlaying || !this._musicPaused || !this.ctx) return;
    this._musicPaused = false;
    this._nextStepTime = this.ctx.currentTime + 0.05;
    this._musicTimer = window.setInterval(() => this._musicScheduler(), 25);
  },

  setMusicIntensity(combo: number) { this._intense = combo >= 2; },

  duckMusic() {
    if (!this.ctx || !this.musicGain || !this.musicOn) return;
    const now = this.ctx.currentTime;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.2, now + 0.05);
    g.linearRampToValueAtTime(this._musicBase, now + 0.45);
  },

  _musicScheduler() {
    if (!this.ctx) return;
    const six = (60 / 120) / 4; // sixteenth note @ 120 BPM = 0.125s
    while (this._nextStepTime < this.ctx.currentTime + 0.1) {
      // subtle swing on off-beat 16ths
      const swing = this._step % 2 === 1 ? six * 0.06 : 0;
      this._scheduleStep(this._step, this._nextStepTime + swing);
      this._nextStepTime += six;
      this._step = (this._step + 1) % 64; // 4 bars of 16 sixteenths
    }
  },

  // v8 §5: modern hyper-casual driver. Layers unlock by evolution form:
  //  0 VOIDLING = kick + hats · 1 MUNCHER +bass · 2 GOBBLER +pluck lead
  //  3 DEVOURER +counter-melody · 4 WORLD EATER +sub-rumble drone
  _scheduleStep(step: number, time: number) {
    if (!this.ctx) return;
    const inBar = step % 16;                 // 0..15 sixteenths
    const bar = Math.floor(step / 16);       // 0..3
    const chordIdx = bar % 4;                // I V vi IV
    const roots = [65.41, 98.0, 110.0, 87.31]; // C2 G2 A2 F2
    const form = this._musicForm;

    // four-on-the-floor kick on every beat (always)
    if (inBar % 4 === 0) this._musicKick(time);
    // hats on the off-beat 8th (always); doubled when intense
    if (inBar % 4 === 2) this._musicHat(time);
    if (this._intense && inBar % 2 === 1) this._musicHat(time);

    // bass (MUNCHER+): root on beat 1, off-beat drive on the "and"s
    if (form >= 1) {
      if (inBar === 0) this._musicBass(roots[chordIdx] / 2, time);
      if (inBar % 4 === 2) this._musicBass(roots[chordIdx], time);
    }

    // bright plucky lead with delay echo (GOBBLER+)
    if (form >= 2) {
      const motif: (number | null)[] = [0, null, 7, null, 12, null, 7, null, 4, null, 7, null, 0, null, 4, null];
      const semi = motif[inBar];
      if (semi !== null) this._musicPluck(roots[chordIdx] * 4 * Math.pow(2, semi / 12), time);
    }

    // counter-melody + energy (DEVOURER+)
    if (form >= 3) {
      const counter: (number | null)[] = [null, null, 3, null, null, 5, null, 7, null, null, 3, null, 5, null, 7, null];
      const s2 = counter[inBar];
      if (s2 !== null) this._musicVoice(roots[chordIdx] * 6 * Math.pow(2, s2 / 12), 'sawtooth', 0.18, 0.03, time, 2600);
    }

    // low sub-rumble drone (WORLD EATER)
    if (form >= 4 && inBar === 0) this._musicSub(roots[chordIdx] / 2, time);
  },

  _musicKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, time);
    o.frequency.exponentialRampToValueAtTime(50, time + 0.09);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    o.connect(g); g.connect(this.musicGain); o.start(time); o.stop(time + 0.16);
  },

  _musicBass(freq: number, time: number) {
    this._musicVoice(freq, 'triangle', 0.2, 0.18, time, 900);
  },

  _musicPluck(freq: number, time: number) {
    // fast-decay triangle pluck + a delayed echo (~dotted 8th later)
    this._musicVoice(freq, 'triangle', 0.16, 0.09, time, 3200);
    this._musicVoice(freq, 'triangle', 0.13, 0.035, time + 0.19, 3200);
  },

  _musicSub(freq: number, time: number) {
    this._musicVoice(freq, 'sine', 1.7, 0.14, time, 200);
  },

  _musicVoice(freq: number, type: OscillatorType, dur: number, vol: number, time: number, lp?: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    if (lp) {
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = lp + (this._intense ? 500 : 0);
      osc.connect(filt); filt.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(this.musicGain);
    osc.start(time); osc.stop(time + dur + 0.05);
  },

  // v6 §10: marimba lead voice — wooden triangle body + short sine mallet ping
  _musicMarimba(freq: number, time: number) {
    if (!this.ctx || !this.musicGain) return;
    this._musicVoice(freq, 'triangle', 0.34, 0.06, time, 1400);
    this._musicVoice(freq * 4, 'sine', 0.12, 0.02, time);
  },

  _musicHat(time: number) {
    if (!this.ctx || !this._noiseBuf || !this.musicGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    src.connect(filt); filt.connect(g); g.connect(this.musicGain);
    src.start(time); src.stop(time + 0.05);
  },
};
