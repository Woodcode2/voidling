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

  // ── gulp-pop absorb (~70ms): Layer A noise "p" + Layer B bending triangle ──────
  playChomp() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const ms = now * 1000;
    if (ms - this._lastAbsorb < 1500) this._ladder = Math.min(12, this._ladder + 1);
    else this._ladder = 0;
    this._lastAbsorb = ms;

    // Layer A: 15ms band-passed noise transient
    this._noise(now, 0.015, 'bandpass', 1800, 6, 0.5);

    // Layer B: triangle @ 520Hz (+ladder), bending down 30% over 55ms, exp decay
    const f0 = 520 * Math.pow(2, this._ladder / 12);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.7, now + 0.055);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(now); osc.stop(now + 0.09);
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

  playBoon() {
    this.playTone(600, 'sine', 0.1, 0.1);
    this.playTone(800, 'sine', 0.2, 0.1, 0.1);
  },

  // ── procedural background music (104 BPM, C major, 8-bar loop) ─────────────────
  startMusic() {
    this.init();
    if (!this.ctx || this._musicPlaying) return;
    this._musicPlaying = true;
    this._musicPaused = false;
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
    const eighth = (60 / 104) / 2; // seconds per 8th note
    while (this._nextStepTime < this.ctx.currentTime + 0.1) {
      // ~8% swing: nudge every off-beat 8th later
      const swing = this._step % 2 === 1 ? eighth * 0.08 : 0;
      this._scheduleStep(this._step, this._nextStepTime + swing);
      this._nextStepTime += eighth;
      this._step = (this._step + 1) % 64;
    }
  },

  _scheduleStep(step: number, time: number) {
    if (!this.ctx) return;
    const eighth = (60 / 104) / 2;
    const inBar = step % 8;
    const bar = Math.floor(step / 8);        // 0..7
    const chordIdx = Math.floor(bar / 2);    // 0..3  → I V vi IV
    const roots = [65.41, 98.0, 110.0, 87.31]; // C2 G2 A2 F2

    // triangle bass on beats 1 & 3
    if (inBar === 0 || inBar === 4) {
      this._musicVoice(roots[chordIdx], 'triangle', eighth * 3.4, 0.2, time);
    }

    // sine pad triad, retriggered at each chord change (every 2 bars)
    if (inBar === 0 && bar % 2 === 0) {
      const triads = [
        [261.63, 329.63, 392.0],
        [196.0, 246.94, 293.66],
        [220.0, 261.63, 329.63],
        [174.61, 220.0, 261.63],
      ];
      const padVol = this._intense ? 0.06 : 0.04;
      const padLp = this._intense ? 2600 : 1600;
      for (const f of triads[chordIdx]) this._musicVoice(f, 'sine', eighth * 15, padVol, time, padLp);
    }

    // soft square lead — 8-note motif with rests
    const motif: (number | null)[] = [0, 4, 7, null, 12, 7, null, 4];
    const semi = motif[inBar];
    if (semi !== null) {
      const f = roots[chordIdx] * 4 * Math.pow(2, semi / 12);
      this._musicVoice(f, 'square', eighth * 0.9, 0.05, time, 900);
    }

    // noise hats on 8ths, doubling to 16ths when intense
    this._musicHat(time);
    if (this._intense) this._musicHat(time + eighth / 2);
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
