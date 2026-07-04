import type { ObjectKind } from './config';

export const audio = {
  ctx: null as AudioContext | null,
  muted: false,

  // pitch-ladder state (climbs 1 semitone per absorb within 1.5s, up to +12)
  _ladder: 0,
  _lastAbsorb: -9999,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const saved = localStorage.getItem('voidling_muted');
    if (saved) this.muted = saved === 'true';
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('voidling_muted', String(this.muted));
    return this.muted;
  },

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1, when = 0) {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  },

  // A short pitched pop that climbs with the absorb ladder.
  playChomp() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime * 1000;
    if (now - this._lastAbsorb < 1500) this._ladder = Math.min(12, this._ladder + 1);
    else this._ladder = 0;
    this._lastAbsorb = now;
    const base = 300;
    const freq = base * Math.pow(2, this._ladder / 12);
    // quick "pop": pitch blip + soft body
    this.playTone(freq * 2, 'square', 0.05, 0.05);
    this.playTone(freq, 'sine', 0.16, 0.11);
  },

  // ── signature per-family sounds (layered under the ladder) ──
  playSignature(kind: ObjectKind) {
    if (this.muted || !this.ctx) return;
    switch (kind) {
      case 'gnome':      // squeak — quick high sine
        this.playTone(1200, 'sine', 0.08, 0.06);
        this.playTone(1700, 'sine', 0.06, 0.05, 0.04);
        break;
      case 'trashcan':   // clatter — two square notes
        this.playTone(220, 'square', 0.06, 0.06);
        this.playTone(160, 'square', 0.08, 0.06, 0.06);
        break;
      case 'car':        // crunch — deeper saw pop
        this.playTone(110, 'sawtooth', 0.14, 0.08);
        this.playTone(70, 'sawtooth', 0.1, 0.06, 0.03);
        break;
      case 'duck':       // quack-ish
        this.playTone(420, 'sawtooth', 0.1, 0.06);
        break;
      case 'person':     // little "oop"
        this.playTone(520, 'triangle', 0.09, 0.05);
        this.playTone(380, 'triangle', 0.08, 0.05, 0.05);
        break;
      default:
        break;
    }
  },

  // short synth honk from a car near a small player
  playHonk() {
    if (this.muted || !this.ctx) return;
    this.playTone(300, 'square', 0.12, 0.06);
    this.playTone(360, 'square', 0.12, 0.05, 0.02);
  },

  playMerge() {
    if (this.muted || !this.ctx) return;
    this.playTone(523.25, 'triangle', 0.4, 0.15);
    this.playTone(659.25, 'triangle', 0.4, 0.15);
    this.playTone(783.99, 'triangle', 0.4, 0.15);
  },

  playTick() {
    this.playTone(800, 'square', 0.05, 0.05);
  },

  playBoon() {
    this.playTone(600, 'sine', 0.1, 0.1);
    this.playTone(800, 'sine', 0.2, 0.1, 0.1);
  },
};
