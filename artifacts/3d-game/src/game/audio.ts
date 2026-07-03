export const audio = {
  ctx: null as AudioContext | null,
  muted: false,

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

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  playBlip(combo: number) {
    const baseFreq = 400;
    const freq = baseFreq * Math.pow(1.059463094359, combo * 2); // go up a whole step per combo
    this.playTone(freq, 'sine', 0.2, 0.1);
  },

  playMerge() {
    if (this.muted || !this.ctx) return;
    // Major chord
    this.playTone(523.25, 'triangle', 0.4, 0.15); // C5
    this.playTone(659.25, 'triangle', 0.4, 0.15); // E5
    this.playTone(783.99, 'triangle', 0.4, 0.15); // G5
  },

  playTick() {
    this.playTone(800, 'square', 0.05, 0.05);
  },

  playBoon() {
    this.playTone(600, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(800, 'sine', 0.2, 0.1), 100);
  }
};
