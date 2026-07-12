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

  // v14 §1: decoded AudioBuffer cache for real CC0 OGG samples
  _samples: {} as Record<string, AudioBuffer | null>,
  _samplesLoaded: false,

  // Attempt to decode an OGG into an AudioBuffer.
  // Returns null on any failure so callers fall back to synth.
  async _decodeSample(name: string, url: string): Promise<AudioBuffer | null> {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      if (!this.ctx) return null;
      return await this.ctx.decodeAudioData(ab);
    } catch {
      return null;
    }
  },

  // v14 §1: load all Kenney CC0 OGG samples; run once after init().
  // Call on first user gesture so AudioContext is live before decoding.
  async loadSamples(): Promise<void> {
    if (this._samplesLoaded) return;
    this._samplesLoaded = true; // optimistically prevent re-entry
    if (!this.ctx) this.init(); // ensure context exists
    if (!this.ctx) return;
    const files: Record<string, string> = {
      pop_1:          '/assets/audio/pop_1.ogg',
      pop_2:          '/assets/audio/pop_2.ogg',
      pop_3:          '/assets/audio/pop_3.ogg',
      pop_4:          '/assets/audio/pop_4.ogg',
      pop_5:          '/assets/audio/pop_5.ogg',
      thud_big:       '/assets/audio/thud_big.ogg',
      chime_bonus:    '/assets/audio/chime_bonus.ogg',
      fanfare_evolve: '/assets/audio/fanfare_evolve.ogg',
      chomp_void:     '/assets/audio/chomp_void.ogg',
      ouch:           '/assets/audio/ouch.ogg',
      ui_click:       '/assets/audio/ui_click.ogg',
      ui_confirm:     '/assets/audio/ui_confirm.ogg',
      beep:           '/assets/audio/beep.ogg',
      go:             '/assets/audio/go.ogg',
      horn_event:     '/assets/audio/horn_event.ogg',
      capture_tick:   '/assets/audio/capture_tick.ogg',
      // Sound Pass: premium organic set (layered synthesis + Schroeder reverb,
      // generated offline — no beeps, no 8-bit)
      gulp_1:         '/assets/audio/gulp_1.wav',
      gulp_2:         '/assets/audio/gulp_2.wav',
      gulp_3:         '/assets/audio/gulp_3.wav',
      gulp_4:         '/assets/audio/gulp_4.wav',
      gulp_5:         '/assets/audio/gulp_5.wav',
      evolve_epic:    '/assets/audio/evolve_epic.wav',
      power_deep:     '/assets/audio/power_deep.wav',
      power_blast:    '/assets/audio/power_blast.wav',
      win_warm:       '/assets/audio/win_warm.wav',
      mutate_choice:  '/assets/audio/mutate_choice.wav',
      tick_soft:      '/assets/audio/tick_soft.wav',
      ui_tap:         '/assets/audio/ui_tap.wav',
      threat_sting:   '/assets/audio/threat_sting.wav',
      eaten_deep:     '/assets/audio/eaten_deep.wav',
    };
    const results = await Promise.allSettled(
      Object.entries(files).map(async ([k, url]) => {
        this._samples[k] = await this._decodeSample(k, url);
        return k;
      }),
    );
    const loaded = results.filter((r) => r.status === 'fulfilled' && this._samples[(r as PromiseFulfilledResult<string>).value]).length;
    const failed = results.length - loaded;
    console.log(`[audio §1] samples loaded=${loaded} fallback-synth=${failed}`);
  },

  // v14 §1: play a decoded sample via WebAudio with optional playbackRate and volume.
  // Returns true if the sample was available and scheduled; false → caller should synth.
  _playSample(name: string, rate = 1, vol = 0.5, when = 0): boolean {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return false;
    const buf = this._samples[name];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.max(0.05, Math.min(4, rate));
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.sfxGain);
    src.start(this.ctx.currentTime + when);
    return true;
  },

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

  // ── Sound Pack Phase 6: Tone.js adaptive music ──────────────────────────────
  _toneReady: false,
  _toneModule: null as any,    // lazily imported 'tone' module
  _toneVols: [] as any[],      // Tone.Volume per layer (0–4), faded in on evolve
  _dangerVol: null as any,     // Tone.Volume for the danger layer
  _masterFilt: null as any,    // Tone.Filter swept to 400 Hz during TIME WARP
  _toneDisposables: [] as any[], // everything to dispose on stopMusic
  _musicGen: 0,                // incremented each startMusic(); stale _startToneMusic() invocations bail on mismatch

  // Vacuum hum: looping bandpass noise while suction pulls objects
  _vacuumSrcNode: null as AudioBufferSourceNode | null,
  _vacuumGainNode: null as GainNode | null,
  _vacuumRunning: false,

  // Ped-panic squeak — rate-limited to 1 per second
  _lastPedPanicMs: -9999,

  // Final-10s: tick tracker so we fire exactly once per integer second
  _lastFinalTickSec: -1,

  // Danger layer: single cancellable mute timer to prevent per-frame accumulation
  _dangerMuteTimer: null as number | null,

  // v15 §2: music file infrastructure — loaded OGG tracks for crossfade
  _musicTracks: [] as (AudioBuffer | null)[],
  _musicTracksLoaded: false,
  _activeTrackSrc: null as AudioBufferSourceNode | null,
  _activeTrackGain: null as GainNode | null,

  // Attempt to load OGG music tracks from assets/music/.
  // Falls back to the existing synth music if files are absent.
  async loadMusicTracks(): Promise<void> {
    if (this._musicTracksLoaded) return;
    this._musicTracksLoaded = true;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    const files = ['track_1.ogg', 'track_2.ogg', 'track_3.ogg', 'track_4.ogg'];
    const results = await Promise.allSettled(
      files.map(async (f) => {
        try {
          const r = await fetch(`/assets/music/${f}`);
          if (!r.ok) return null;
          return await this.ctx!.decodeAudioData(await r.arrayBuffer());
        } catch { return null; }
      }),
    );
    this._musicTracks = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
    const loaded = this._musicTracks.filter(Boolean).length;
    console.log(`[audio §2] music tracks loaded=${loaded}/4`);
  },

  // Play a music track with a 2s crossfade to the new source.
  // Falls back silently if no tracks are available.
  playMusicFile(idx: number) {
    if (!this.ctx || !this.musicGain) return;
    const buf = this._musicTracks[idx % this._musicTracks.length];
    if (!buf) return; // no file — synth music continues
    const ctx = this.ctx;
    // Fade out current track
    if (this._activeTrackGain) {
      const g = this._activeTrackGain;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      const src = this._activeTrackSrc;
      window.setTimeout(() => { try { src?.stop(); } catch { /* ignore */ } }, 2100);
    }
    // New track on a fresh gain node
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this._musicBase, ctx.currentTime + 2);
    gain.connect(this.musicGain);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    this._activeTrackSrc = src;
    this._activeTrackGain = gain;
  },

  get muted() { return !this.sfxOn; },

  init() {
    try {
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
    } catch { /* AudioContext blocked before user gesture on some mobile browsers — fail silently */ }
  },

  _applyMusicGain() {
    if (this.musicGain) this.musicGain.gain.value = this.musicOn ? this._musicBase : 0;
  },

  // ── toggles ──────────────────────────────────────────────────────────────────
  // "Mute all" — silences both SFX and music (Tone.js + raw WebAudio bus)
  toggleMute() {
    const sfxOn = this.toggleSfx();
    // Keep music in sync with the global mute button
    this.musicOn = sfxOn;
    localStorage.setItem('voidling_music', String(this.musicOn));
    this._applyMusicGain();
    if (this._toneModule) {
      this._toneModule.getDestination().mute = !this.musicOn;
    }
    return !sfxOn; // returns true when muted
  },
  toggleSfx() {
    this.sfxOn = !this.sfxOn;
    localStorage.setItem('voidling_sfx', String(this.sfxOn));
    return this.sfxOn;
  },
  toggleMusic() {
    this.musicOn = !this.musicOn;
    localStorage.setItem('voidling_music', String(this.musicOn));
    this._applyMusicGain();
    // Sync Tone.js destination mute (Sound Pack Phase 6)
    if (this._toneModule) {
      const dest = this._toneModule.getDestination();
      dest.mute = !this.musicOn;
      if (this.musicOn) dest.volume.rampTo(-8, 0.1);
    }
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

  // ── v14 §1 + v8 §5: eat sound — real OGG sample with pitch-ladder playbackRate,
  // falls back to percussive synth if the sample isn't loaded yet. ──────────────
  playChomp(tier = 1) {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const ms = now * 1000;
    if (ms - this._lastAbsorb < 1500) this._ladder = Math.min(12, this._ladder + 1);
    else this._ladder = 0;
    this._lastAbsorb = ms;

    // Sound Pass: wet vacuum GULPS replace the arcade pops
    const sampleName = `gulp_${Math.min(tier, 5)}`;
    const rate = Math.pow(2, this._ladder / 12); // pitch-ladder playback rate
    const vol = tier >= 4 ? 0.7 : 0.52;
    if (this._playSample(sampleName, rate, vol)) {
      // T4+: layer the thud_big for weight — fixed rate 0.55 per manifest
      if (tier >= 4) this._playSample('thud_big', 0.55, 0.38);
      return; // sample handled it
    }

    // ── synth fallback (unchanged v8 §5) ────────────────────────────────────────
    this._noise(now, 0.004, 'highpass', 4000, 0.9, 0.5);
    const p = this.ctx.createOscillator(); const pg = this.ctx.createGain();
    p.type = 'sine';
    p.frequency.setValueAtTime(120, now);
    p.frequency.exponentialRampToValueAtTime(80, now + 0.05);
    pg.gain.setValueAtTime(0.5, now); pg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    p.connect(pg); pg.connect(this.sfxGain); p.start(now); p.stop(now + 0.07);
    const f0 = 620 * Math.pow(2, this._ladder / 12);
    const b = this.ctx.createOscillator(); const bg = this.ctx.createGain();
    b.type = 'triangle';
    b.frequency.setValueAtTime(f0, now); b.frequency.exponentialRampToValueAtTime(f0 * 0.55, now + 0.06);
    bg.gain.setValueAtTime(0.12, now); bg.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    b.connect(bg); bg.connect(this.sfxGain); b.start(now); b.stop(now + 0.09);
    if (tier >= 3) {
      const s = this.ctx.createOscillator(); const sg = this.ctx.createGain();
      s.type = 'sine';
      s.frequency.setValueAtTime(55, now); s.frequency.exponentialRampToValueAtTime(40, now + 0.14);
      sg.gain.setValueAtTime(0.28, now); sg.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
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

  // merge / TRIPLE: v14 §1 — chime sample + synth chord for richness
  playMerge() {
    if (!this.sfxOn || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (!this._playSample('chime_bonus', 1, 0.55)) {
      // synth fallback
      [523.25, 659.25, 783.99].forEach((f, i) => this.playTone(f, 'triangle', 0.4, 0.14, i * 0.02));
      this._noise(now, 0.28, 'bandpass', 500, 3, 0.12, 4000);
    } else {
      // keep thin synth harmony on top of the sample
      [523.25, 783.99].forEach((f, i) => this.playTone(f, 'triangle', 0.35, 0.06, i * 0.02));
    }
  },

  // getting eaten: v14 §1 — ouch sample, synth fallback
  playEaten() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    if (this._playSample('eaten_deep', 1, 0.65)) return; // Sound Pass: dark dive
    if (this._playSample('ouch', 0.85, 0.6)) return;
    // synth fallback (descending filtered wah)
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

  // v14 §1 + v8 §1: countdown beep + EAT! signal — samples with synth fallback
  countBeep(n: number) {
    // pitch-shift the beep sample per count: 3=normal, 2=slight up, 1=higher
    const rate = n >= 3 ? 1.0 : n === 2 ? 1.19 : 1.41;
    if (this._playSample('tick_soft', rate, 0.6)) return; // Sound Pass: woodblock, not beep
    // synth fallback
    const f = n >= 3 ? 440 : n === 2 ? 554 : 659;
    this.playTone(f, 'triangle', 0.16, 0.18);
    this.playTone(f * 2, 'sine', 0.10, 0.06, 0.005);
  },
  eatGo() {
    if (this._playSample('go', 1, 0.65)) return;
    // synth fallback
    this.playTone(660, 'triangle', 0.20, 0.20);
    this.playTone(990, 'triangle', 0.30, 0.15, 0.02);
    this.playTone(1320, 'sine', 0.34, 0.10, 0.04);
    if (this.ctx) this._noise(this.ctx.currentTime, 0.06, 'highpass', 2000, 1, 0.16);
  },

  // Sound Pass: dark double-pulse when a rival becomes big enough to eat you
  playThreat() {
    if (!this.sfxOn || !this.ctx) return;
    this._playSample('threat_sting', 1, 0.7);
  },

  playBoon() {
    this.playTone(600, 'sine', 0.1, 0.1);
    this.playTone(800, 'sine', 0.2, 0.1, 0.1);
  },

  // Distinct sting per signature VOID POWER — so each form's move sounds unique.
  playPower(kind: string) {
    if (!this.sfxOn) return;
    // Sound Pass: produced whoosh/impact layers under each power's synth sting
    if (kind === 'shockwave' || kind === 'singularity' || kind === 'collapse') {
      this._playSample('power_blast', kind === 'collapse' ? 0.85 : 1, 0.7);
    } else {
      this._playSample('power_deep', 1, 0.6);
    }
    if (this._playSample('mutate_choice', 1, 0.6)) return; // Sound Pass: mysterious swell
    switch (kind) {
      case 'tug': // snappy rising slurp
        this.playTone(480, 'sine', 0.10, 0.09);
        this.playTone(780, 'sine', 0.10, 0.07, 0.06);
        break;
      case 'vortex': // swirling ascending shimmer
        this.playTone(340, 'triangle', 0.18, 0.08);
        this.playTone(620, 'sine', 0.16, 0.06, 0.05);
        this.playTone(920, 'sine', 0.12, 0.05, 0.12);
        break;
      case 'shockwave': // punchy outward blast
        this.playTone(150, 'sawtooth', 0.16, 0.11);
        this.playTone(90, 'sawtooth', 0.22, 0.09, 0.02);
        if (this.ctx) this._noise(this.ctx.currentTime, 0.16, 'highpass', 1200, 1, 0.22);
        break;
      case 'singularity': // deep gravity rumble
        this.playTone(92, 'sawtooth', 0.5, 0.11);
        this.playTone(58, 'sine', 0.6, 0.09, 0.04);
        this.playTone(300, 'triangle', 0.3, 0.05, 0.1);
        break;
      case 'collapse': // apocalyptic boom + fanfare
        this._playSample('fanfare_evolve', 0.72, 0.5, 0);
        this.playTone(70, 'sawtooth', 0.7, 0.13);
        this.playTone(46, 'sine', 0.9, 0.1, 0.05);
        if (this.ctx) this._noise(this.ctx.currentTime, 0.4, 'lowpass', 800, 1, 0.3);
        break;
      default:
        this.playBoon();
    }
  },

  // v14 §1 + v8 §5: evolution sting — sample boom at the peak, synth riser + stab
  playEvolve() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    if (this._playSample('evolve_epic', 1, 0.75)) { this.duckMusic(); return; } // Sound Pass: riser→impact→shimmer
    // fire the fanfare sample at the boom point (0.4s into the synth riser)
    this._playSample('fanfare_evolve', 1, 0.65, 0.4);
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

  // v9 §5: a distinct horn per event so each announcement sounds unique
  eventHorn(id: string) {
    if (!this.sfxOn || !this.ctx) return;
    switch (id) {
      case 'goldenRush': // bright rising major arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.playTone(f, 'triangle', 0.22, 0.12, i * 0.08));
        break;
      case 'shrinkStorm': // ominous descending minor
        [440, 349.23, 293.66].forEach((f, i) => this.playTone(f, 'sawtooth', 0.3, 0.12, i * 0.12));
        break;
      case 'meteor': // two low booming honks
        this.playTone(196, 'sawtooth', 0.3, 0.14);
        this.playTone(261.63, 'sawtooth', 0.4, 0.12, 0.22);
        break;
      case 'frenzy': // fast triple stab
        [659.25, 659.25, 880].forEach((f, i) => this.playTone(f, 'square', 0.14, 0.1, i * 0.09));
        break;
      case 'town': // urgent alarm two-tone
        this.playTone(587.33, 'square', 0.2, 0.12);
        this.playTone(440, 'square', 0.24, 0.12, 0.18);
        break;
      default:
        // v14 §1: real horn sample for any unspecified event id
        if (!this._playSample('horn_event', 1, 0.55)) this.playEvent();
    }
  },

  // v14 §1: UI click / confirm
  playClick() { this._playSample('ui_tap', 1, 0.5) || this._playSample('ui_click', 1, 0.45) || this.playTick(); },
  playConfirm() { this._playSample('ui_confirm', 1, 0.5) || this.playBoon(); },

  // v14 §1: orbit capture tick — quiet hi-tick on each object entering the spiral
  playCaptureTick() { this._playSample('capture_tick', 1, 0.15); },

  // v14 §1: rival eat — chomp_void sample at 0.9, fall back to playMerge synth
  playChompVoid() {
    if (!this._playSample('chomp_void', 0.9, 0.65)) this.playMerge();
  },

  // v14 §1: full sample config table — used by the sound-board debug panel
  SAMPLE_CONFIGS: [
    { name: 'pop_1',          rate: 1,    vol: 0.52 },
    { name: 'pop_2',          rate: 1,    vol: 0.52 },
    { name: 'pop_3',          rate: 1,    vol: 0.52 },
    { name: 'pop_4',          rate: 1,    vol: 0.52 },
    { name: 'pop_5',          rate: 1,    vol: 0.7  },
    { name: 'thud_big',       rate: 0.55, vol: 0.38 },
    { name: 'chime_bonus',    rate: 1,    vol: 0.55 },
    { name: 'fanfare_evolve', rate: 1,    vol: 0.65 },
    { name: 'chomp_void',     rate: 0.9,  vol: 0.65 },
    { name: 'ouch',           rate: 0.85, vol: 0.6  },
    { name: 'ui_click',       rate: 1,    vol: 0.45 },
    { name: 'ui_confirm',     rate: 1,    vol: 0.5  },
    { name: 'beep',           rate: 1,    vol: 0.5  },
    { name: 'go',             rate: 1,    vol: 0.65 },
    { name: 'horn_event',     rate: 1,    vol: 0.55 },
    { name: 'capture_tick',   rate: 1,    vol: 0.15 },
  ] as { name: string; rate: number; vol: number }[],

  // v9 §5: TOWN FIGHTS BACK siren layer — a wailing two-tone sweep
  siren() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(650, now);
    o.frequency.linearRampToValueAtTime(950, now + 0.4);
    o.frequency.linearRampToValueAtTime(650, now + 0.8);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.1);
    g.gain.linearRampToValueAtTime(0.0001, now + 0.85);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.9);
  },

  // v9 §5: SHRINK STORM lightning — a sharp thunder crack
  lightningCrack() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this._noise(now, 0.35, 'highpass', 1200, 0.7, 0.35);
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.3);
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.37);
  },

  // v6 §10: win — a short crowd-cheer swell (filtered noise)
  playWin() {
    if (!this.sfxOn || !this.ctx || !this._noiseBuf || !this.sfxGain) return;
    if (this._playSample('win_warm', 1, 0.7)) return; // Sound Pass: warm felt swell
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

  // ── procedural background music — Sound Pack Phase 6: Tone.js engine ──────────
  startMusic() {
    this.init();
    if (!this.ctx || this._musicPlaying) return;
    this._musicPlaying = true;
    this._musicPaused = false;
    this._musicForm = 0;
    this._step = 0;
    this._nextStepTime = this.ctx.currentTime + 0.1;
    this._musicGen = (this._musicGen + 1) | 0; // invalidate any pending _startToneMusic from a previous round
    // Start the legacy scheduler immediately so music is audible with zero delay,
    // then swap to Tone.js once the async import resolves.
    this._musicTimer = window.setInterval(() => this._musicScheduler(), 25);
    void this._startToneMusic(this._musicGen);
  },
  stopMusic() {
    this._musicPlaying = false;
    this._musicPaused = false;
    this._musicGen = (this._musicGen + 1) | 0; // invalidate any in-flight _startToneMusic
    if (this._musicTimer !== null) { clearInterval(this._musicTimer); this._musicTimer = null; }
    // Dispose Tone.js resources
    try {
      if (this._toneModule) {
        const T = this._toneModule;
        T.getTransport().cancel(); // cancel scheduled events BEFORE stop so the stop event isn't immediately cancelled
        T.getTransport().stop();
        for (const node of this._toneDisposables) { try { node.dispose(); } catch { /* ignore */ } }
      }
    } catch { /* ignore */ }
    this._toneDisposables.length = 0;
    this._toneVols.length = 0;
    this._dangerVol = null;
    this._masterFilt = null;
    this._toneReady = false;
    this.stopVacuumHum();
    this._lastFinalTickSec = -1;
  },
  pauseMusic() {
    if (!this._musicPlaying || this._musicPaused) return;
    this._musicPaused = true;
    if (this._musicTimer !== null) { clearInterval(this._musicTimer); this._musicTimer = null; }
    if (this._toneReady && this._toneModule) this._toneModule.getTransport().pause();
  },
  resumeMusic() {
    if (!this._musicPlaying || !this._musicPaused) return;
    this._musicPaused = false;
    if (this._toneReady && this._toneModule) {
      this._toneModule.getTransport().start();
    } else if (this.ctx) {
      this._nextStepTime = this.ctx.currentTime + 0.05;
      this._musicTimer = window.setInterval(() => this._musicScheduler(), 25);
    }
  },

  setMusicIntensity(combo: number) { this._intense = combo >= 2; },

  setMusicForm(f: number) {
    this._musicForm = Math.max(0, f | 0);
    if (this._toneReady && this._toneVols.length) {
      // Fade each newly-unlocked layer in over 2 seconds
      const TARGET_DB = [-6, -9, -11, -14, -14];
      for (let i = 0; i <= this._musicForm && i < this._toneVols.length; i++) {
        const vol = this._toneVols[i];
        vol.mute = false;
        vol.volume.rampTo(TARGET_DB[i] ?? -14, 2);
      }
    }
  },

  duckMusic() {
    if (!this.ctx || !this.musicGain || !this.musicOn) return;
    const now = this.ctx.currentTime;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.2, now + 0.05);
    g.linearRampToValueAtTime(this._musicBase, now + 0.45);
    // Also duck the Tone.js bus
    if (this._toneReady && this._toneModule && this.musicOn) {
      const dest = this._toneModule.getDestination();
      const cur = dest.volume.value;
      dest.volume.rampTo(cur - 3.5, 0.06);
      window.setTimeout(() => {
        if (this._musicPlaying && this._toneModule) {
          this._toneModule.getDestination().volume.rampTo(-8, 0.4);
        }
      }, 300);
    }
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

  // ═══════════════════════════════════════════════════════════════════════════════
  //  Sound Pack Phase 6 — Tone.js adaptive music + new SFX
  // ═══════════════════════════════════════════════════════════════════════════════

  // Dynamically imported Tone.js: A minor, 110 BPM, 5 stacked layers + danger
  async _startToneMusic(gen: number) {
    try {
      const T = await import('tone');
      this._toneModule = T;
      // Bail if a newer round has started or music was stopped while we awaited the import
      if (!this._musicPlaying || gen !== this._musicGen) return;

      // Kill legacy scheduler — Tone.js takes over
      if (this._musicTimer !== null) { clearInterval(this._musicTimer); this._musicTimer = null; }

      T.getTransport().bpm.value = 110;
      T.getTransport().loop = true;
      T.getTransport().loopStart = 0;
      T.getTransport().loopEnd = '8m'; // 8-bar loop ≈ 43.6 s

      // Master lowpass filter (TIME WARP sweeps this to 400 Hz)
      const masterFilt = new T.Filter(20000, 'lowpass');
      masterFilt.toDestination();
      this._masterFilt = masterFilt;
      this._toneDisposables.push(masterFilt);

      // Tone.js master volume + mute
      T.getDestination().volume.value = this.musicOn ? -8 : -60;
      T.getDestination().mute = !this.musicOn;

      // Per-layer Volume nodes (layer 0 active, rest muted until evolve)
      const LAYER_START_DB = [-6, -60, -60, -60, -60];
      this._toneVols = LAYER_START_DB.map((db, i) => {
        const v = new T.Volume(db);
        if (i > 0) v.mute = true;
        v.connect(masterFilt);
        this._toneDisposables.push(v);
        return v;
      });

      // Danger layer (starts muted)
      const dangerVol = new T.Volume(-60);
      dangerVol.mute = true;
      dangerVol.connect(masterFilt);
      this._dangerVol = dangerVol;
      this._toneDisposables.push(dangerVol);

      // Am chord progression: Am | Am | Dm | Em (each = 2 bars)
      const CHORDS: string[][] = [
        ['A3', 'C4', 'E4'], ['A3', 'C4', 'E4'],
        ['D3', 'F3', 'A3'], ['E3', 'G3', 'B3'],
      ];

      // ── LAYER 0: pad + sparse pluck (VOIDLING) ────────────────────────────────
      const padSynth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'triangle' as OscillatorType },
        envelope: { attack: 0.9, decay: 0.2, sustain: 0.85, release: 4.0 },
        volume: -15,
      }).connect(this._toneVols[0]);
      this._toneDisposables.push(padSynth);

      let chordIdx = 0;
      const padSeq = new T.Sequence((time) => {
        if (!this._musicPlaying) return;
        padSynth.releaseAll(time);
        padSynth.triggerAttack(CHORDS[chordIdx % 4], time, 0.4);
        chordIdx++;
      }, [1], '2m');
      padSeq.start(0);
      this._toneDisposables.push(padSeq);

      const pluckSynth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'sine' as OscillatorType },
        envelope: { attack: 0.01, decay: 0.55, sustain: 0.04, release: 0.7 },
        volume: -19,
      }).connect(this._toneVols[0]);
      this._toneDisposables.push(pluckSynth);

      const PLUCK_PAT: (string | null)[] = [
        'A4', null, null, null, 'E4', null, null, null,
        'G4', null, null, null, 'C5', null, null, null,
      ];
      const pluckSeq = new T.Sequence((time, note) => {
        if (!this._musicPlaying || !note) return;
        pluckSynth.triggerAttackRelease(note as string, '8n', time, 0.3);
      }, PLUCK_PAT, '8n');
      pluckSeq.start(0);
      this._toneDisposables.push(pluckSeq);

      // ── LAYER 1: bass line (MUNCHER) ─────────────────────────────────────────
      const bassSynth = new T.Synth({
        oscillator: { type: 'triangle' as OscillatorType },
        envelope: { attack: 0.04, decay: 0.45, sustain: 0.55, release: 0.4 },
        volume: -12,
      }).connect(this._toneVols[1]);
      this._toneDisposables.push(bassSynth);

      const BASS_PAT: (string | null)[] = [
        'A1', null, 'E2', null, 'D2', null, 'A2', null,
        'A1', null, 'E2', null, 'E2', null, 'B1', null,
      ];
      const bassSeq = new T.Sequence((time, note) => {
        if (!this._musicPlaying || !note) return;
        bassSynth.triggerAttackRelease(note as string, '4n', time, 0.65);
      }, BASS_PAT, '4n');
      bassSeq.start(0);
      this._toneDisposables.push(bassSeq);

      // ── LAYER 2: drums — kick, snare, closed hats (GOBBLER) ─────────────────
      const kickSynth = new T.MembraneSynth({
        pitchDecay: 0.055, octaves: 4.5, volume: -5,
        envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.08 },
      }).connect(this._toneVols[2]);
      this._toneDisposables.push(kickSynth);

      const snareSynth = new T.NoiseSynth({
        noise: { type: 'white' as 'white' }, volume: -16,
        envelope: { attack: 0.001, decay: 0.19, sustain: 0, release: 0.04 },
      }).connect(this._toneVols[2]);
      this._toneDisposables.push(snareSynth);

      const hatSynth = new T.NoiseSynth({
        noise: { type: 'white' as 'white' }, volume: -23,
        envelope: { attack: 0.001, decay: 0.038, sustain: 0, release: 0.01 },
      }).connect(this._toneVols[2]);
      this._toneDisposables.push(hatSynth);

      const DRUM_PAT = ['kh', 'h', 'sh', 'h', 'kh', 'h', 'sh', 'h'];
      const drumSeq = new T.Sequence((time, beat) => {
        if (!this._musicPlaying || !beat) return;
        const b = beat as string;
        if (b.includes('k')) kickSynth.triggerAttackRelease('C1', '8n', time, 0.85);
        if (b.includes('s')) snareSynth.triggerAttackRelease('8n', time, 0.7);
        if (b.includes('h')) hatSynth.triggerAttackRelease('16n', time, this._intense ? 1 : 0.55);
      }, DRUM_PAT, '4n');
      drumSeq.start(0);
      this._toneDisposables.push(drumSeq);

      // ── LAYER 3: running arpeggio (DEVOURER) ─────────────────────────────────
      const arpSynth = new T.Synth({
        oscillator: { type: 'sine' as OscillatorType },
        envelope: { attack: 0.005, decay: 0.16, sustain: 0.12, release: 0.2 },
        volume: -20,
      }).connect(this._toneVols[3]);
      this._toneDisposables.push(arpSynth);

      const ARP_PAT: string[] = [
        'A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'A4',
        'A4', 'D5', 'F5', 'A5', 'G5', 'F5', 'D5', 'A4',
      ];
      const arpSeq = new T.Sequence((time, note) => {
        if (!this._musicPlaying || !note) return;
        arpSynth.triggerAttackRelease(note as string, '16n', time, 0.72);
      }, ARP_PAT, '16n');
      arpSeq.start(0);
      this._toneDisposables.push(arpSeq);

      // ── LAYER 4: lead line + open hats (WORLD ENDER) ─────────────────────────
      const leadSynth = new T.Synth({
        oscillator: { type: 'triangle' as OscillatorType },
        envelope: { attack: 0.04, decay: 0.45, sustain: 0.52, release: 0.85 },
        volume: -17,
      }).connect(this._toneVols[4]);
      this._toneDisposables.push(leadSynth);

      const LEAD_PAT: (string | null)[] = [
        null, 'A4', null, 'G4', null, 'F4', null, 'E4',
        null, 'D4', null, 'C4', null, 'A3', 'C4', 'E4',
      ];
      const leadSeq = new T.Sequence((time, note) => {
        if (!this._musicPlaying || !note) return;
        leadSynth.triggerAttackRelease(note as string, '4n', time, 0.75);
      }, LEAD_PAT, '8n');
      leadSeq.start(0);
      this._toneDisposables.push(leadSeq);

      const openHatSynth = new T.NoiseSynth({
        noise: { type: 'white' as 'white' }, volume: -21,
        envelope: { attack: 0.001, decay: 0.26, sustain: 0, release: 0.16 },
      }).connect(this._toneVols[4]);
      this._toneDisposables.push(openHatSynth);

      const OPEN_HAT_PAT = [false, false, true, false, false, false, true, false];
      const openHatSeq = new T.Sequence((time, v) => {
        if (!this._musicPlaying || !v) return;
        openHatSynth.triggerAttackRelease('8n', time, 0.78);
      }, OPEN_HAT_PAT, '4n');
      openHatSeq.start(0);
      this._toneDisposables.push(openHatSeq);

      // ── DANGER LAYER: tense pulsing low string pad ───────────────────────────
      const dangerSynth = new T.PolySynth(T.Synth, {
        oscillator: { type: 'sawtooth' as OscillatorType },
        envelope: { attack: 1.4, decay: 0.1, sustain: 0.9, release: 3.0 },
        volume: -22,
      }).connect(dangerVol);
      this._toneDisposables.push(dangerSynth);
      dangerSynth.triggerAttack(['A1', 'E2'], '+0.15', 0.5);

      const dangerLfo = new T.LFO({ frequency: 0.5, min: -26, max: -14, type: 'sine' as 'sine' });
      dangerLfo.connect(dangerVol.volume);
      dangerLfo.start();
      this._toneDisposables.push(dangerLfo);

      // Hard-reset the Transport before starting — it is a global singleton that
      // persists across rounds.  Without this a second start() can arrive with
      // a timestamp ≤ the previous one and throw
      // "Start time must be strictly greater than previous start time".
      try {
        const tr = T.getTransport();
        tr.cancel(0);   // wipe every scheduled event from t=0
        tr.stop();      // put Transport back to "stopped"
        tr.position = 0;
      } catch { /* ignore */ }

      T.getTransport().start('+0.1');
      this._toneReady = true;
    } catch {
      // Tone.js failed to load — legacy scheduler is already running as fallback
    }
  },

  // ── Sound Pack §3: GULP ── tiny sine drop synced to chomp squash ─────────────
  playGulp() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(90, now + 0.09);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.11);
  },

  // ── Sound Pack §7: FALLOFF ── slide-whistle glide + soft poof ───────────────
  playFalloff() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Slide whistle: 900 → 200 Hz sine over 700 ms
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, now);
    o.frequency.exponentialRampToValueAtTime(200, now + 0.7);
    g.gain.setValueAtTime(0.18, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.68);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.74);
    // Soft poof at the bottom
    this._noise(now + 0.65, 0.28, 'lowpass', 600, 0.8, 0.09);
    this.duckMusic();
  },

  // ── Sound Pack §8: PREDATION — eating a rival ───────────────────────────────
  playPredationEat() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Deep boom: EAT BIG
    this._noise(now, 0.15, 'lowpass', 300, 0.8, 0.25);
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 80;
    g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.17);
    // Shimmer tail
    if (this._noiseBuf) this._noise(now + 0.1, 0.5, 'highpass', 5000, 1, 0.04);
  },

  // ── Sound Pack §8: PREDATION — being eaten by a rival ───────────────────────
  playPredationEaten() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Heavy 120 Hz thud
    const o1 = this.ctx.createOscillator(); const g1 = this.ctx.createGain();
    o1.type = 'sine'; o1.frequency.value = 120;
    g1.gain.setValueAtTime(0.5, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    o1.connect(g1); g1.connect(this.sfxGain); o1.start(now); o1.stop(now + 0.2);
    // Two-note descending womp
    ([300, 180] as const).forEach((freq, i) => {
      const t = now + 0.12 + i * 0.18;
      const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g); g.connect(this.sfxGain!); o.start(t); o.stop(t + 0.18);
    });
    this.duckMusic();
  },

  // ── Sound Pack §10: SPEECH BUBBLE POP ── tiny blip when bubble expires ──────
  playBubblePop() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, now);
    o.frequency.exponentialRampToValueAtTime(1600, now + 0.025);
    g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.04);
  },

  // ── Sound Pack §11: FINAL-10s TICK ── 2 kHz square, dedup per integer second ─
  playFinalTick(sec: number) {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    if (sec === this._lastFinalTickSec) return;
    this._lastFinalTickSec = sec;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = 2000;
    g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.025);
  },

  // ── Sound Pack §9: PED PANIC ── cartoon squeak 800→1200 Hz, cap 1/sec ───────
  playPedPanic() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain) return;
    const nowMs = this.ctx.currentTime * 1000;
    if (nowMs - this._lastPedPanicMs < 1000) return;
    this._lastPedPanicMs = nowMs;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, now);
    o.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
    g.gain.setValueAtTime(0.1, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + 0.08);
  },

  // ── Sound Pack §5: VACUUM HUM ── looping bandpass noise while suction active ─
  startVacuumHum() {
    if (!this.sfxOn || !this.ctx || !this.sfxGain || this._vacuumRunning || !this._noiseBuf) return;
    this._vacuumRunning = true;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = 420; filt.Q.value = 1.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.09, this.ctx.currentTime + 0.25);
    src.connect(filt); filt.connect(g); g.connect(this.sfxGain);
    src.start();
    this._vacuumSrcNode = src;
    this._vacuumGainNode = g;
  },
  stopVacuumHum() {
    if (!this._vacuumRunning || !this.ctx || !this._vacuumGainNode || !this._vacuumSrcNode) return;
    this._vacuumRunning = false;
    const g = this._vacuumGainNode; const src = this._vacuumSrcNode;
    this._vacuumGainNode = null; this._vacuumSrcNode = null;
    g.gain.cancelScheduledValues(this.ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);
    const stopped = this.ctx;
    window.setTimeout(() => { try { src.stop(); } catch { /* ignore */ } }, 400);
    void stopped; // keep reference live
  },

  // Convenience toggle called from engine.ts each simulate tick
  setVacuumActive(active: boolean) {
    if (active && !this._vacuumRunning) this.startVacuumHum();
    else if (!active && this._vacuumRunning) this.stopVacuumHum();
  },

  // ── Sound Pack §8: DANGER LAYER ── fade tense pad in when big rival is close ─
  updateDanger(relDist: number) {
    // relDist: 0 = maxDanger (rival very close), 1 = safe (beyond 1.5 screen widths)
    if (!this._toneReady || !this._dangerVol) return;
    const safe = relDist >= 1;
    if (!safe) {
      // Cancel any pending safe-out timer so we don't force-mute an active layer
      if (this._dangerMuteTimer !== null) { clearTimeout(this._dangerMuteTimer); this._dangerMuteTimer = null; }
      this._dangerVol.mute = false;
      // Lerp volume toward target (called every tick — rampTo is idempotent in Tone.js)
      const targetDb = -14 + relDist * 16; // -14 dB at closest → -6 dB at half-range
      this._dangerVol.volume.rampTo(targetDb, 1.5);
    } else if (!this._dangerVol.mute && this._dangerMuteTimer === null) {
      // Safe zone: begin fade-out + schedule a single mute (guard prevents re-queuing each tick)
      this._dangerVol.volume.rampTo(-60, 2.0);
      this._dangerMuteTimer = window.setTimeout(() => {
        if (this._dangerVol) this._dangerVol.mute = true;
        this._dangerMuteTimer = null;
      }, 2300);
    }
  },

  // ── Unified play() entry point ── optional convenience wrapper ───────────────
  play(event: string, params: Record<string, unknown> = {}) {
    switch (event) {
      case 'eat_small':       this.playChomp((params.tier as number) || 1); break;
      case 'gulp':            this.playGulp(); break;
      case 'evolve':          this.playEvolve(); break;
      case 'falloff':         this.playFalloff(); break;
      case 'predation_eat':   this.playPredationEat(); break;
      case 'predation_eaten': this.playPredationEaten(); break;
      case 'bubble_pop':      this.playBubblePop(); break;
      case 'ped_panic':       this.playPedPanic(); break;
      case 'banner':          this.whoosh(); break;
      case 'click':           this.playClick(); break;
      case 'win':             this.playWin(); break;
      default: break;
    }
  },
};
