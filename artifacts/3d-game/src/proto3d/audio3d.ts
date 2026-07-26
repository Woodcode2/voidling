// Synthesized SFX for MAPLE ISLE — zero assets, pure WebAudio, tuned soft and
// toy-like (this is for kids: pops and whooshes, no harsh 8-bit edges).
// The context unlocks on the first user gesture per autoplay policy.
//
// PIRATE BAY RESORT (world 2) runs a SECOND, completely separate score in the
// back half of this file: steel pans, an off-beat skank and a warm bass, plus
// a place-aware layer that swaps in the DANCE COVE party when the player is
// standing on the dance floor. Maple's music is untouched by any of it.
import { worldId } from './island';

type Ctx = AudioContext;

export interface Audio3D {
  pop(combo: number, size?: number): void;   // eat — pitch rises with combo, deepens with size
  gulp(): void;                    // GULP whoosh
  rocket(): void;                  // ROCKET BITE zip
  collapse(): void;                // COLLAPSE boom
  evolve(): void;                  // form-up fanfare
  voice(kind: 'happy' | 'yum' | 'scared' | 'hurt' | 'sleepy'): void;   // the void's cute coos
  win(): void;                     // end-of-match warm sting
  hit(): void;                     // took a shot
  alert(): void;                   // defense wave banner
  bigEat(): void;                  // crunching a building
  ready(): void;                   // a power just charged
  startMusic(): void;              // the match loop — tempo + layers ride the stage
  setMusicStage(n: number): void;
  stopMusic(): void;
  setZone(zone: string | null): void;   // player's current district — drives the place layer
  matchBeat(kind: string): void;        // authored match beat (happy hour / dance party / feast)
  setMuted(m: boolean): void;      // settings toggle (App Store expects one)
  isMuted(): boolean;
}

export function createAudio(): Audio3D {
  let ctx: Ctx | null = null;
  let master: GainNode | null = null;
  // persisted mute — a parent hitting mute expects it to STAY muted tomorrow
  let muted = localStorage.getItem('voidMute') === '1';
  // major pentatonic: every eat lands on a consonant note, so fast eating
  // sounds like a tune rather than a stutter
  const PENTA = [0, 2, 4, 7, 9, 12, 9, 7];
  let comboStep = 0;
  const MASTER_VOL = 0.32;

  function ensure(): Ctx | null {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = muted ? 0 : MASTER_VOL; master.connect(ctx.destination);
      } catch { return null; }
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }
  const unlock = () => {
    ensure();
    // decode the recorded kit on the FIRST gesture — the first gulp of the
    // first match must already be the real sample, not the synth stand-in
    for (const n of ['eaten_deep.wav', 'evolve_epic.wav', 'win_warm.wav']) sample(n, 0);
  };
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

  // ── recorded sample kit: the produced audio in /assets/audio. Buffers decode
  // lazily on first request; until one is resident (or if it 404s) the caller
  // falls back to the synth voice, so sound never goes silent.
  const samples = new Map<string, AudioBuffer | 'loading' | 'bad'>();
  function sample(name: string, vol = 0.5, rate = 1): boolean {
    const c = ensure(); if (!c || !master) return false;
    const cur = samples.get(name);
    if (cur instanceof AudioBuffer) {
      const src = c.createBufferSource(); src.buffer = cur; src.playbackRate.value = rate;
      const g = c.createGain(); g.gain.value = vol;
      src.connect(g); g.connect(master); src.start();
      return true;
    }
    if (!cur) {
      samples.set(name, 'loading');
      fetch('/assets/audio/' + name)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
        .then((b) => c.decodeAudioData(b))
        .then((buf) => samples.set(name, buf))
        .catch(() => samples.set(name, 'bad'));
    }
    return false;
  }

  // ── MUSIC: a soft toy-synth loop that AUDIBLY escalates as the void grows —
  // hole.io's trick: tempo +8 BPM and one new layer per evolution stage, so the
  // island "losing" is something you can hear.
  // theme playback is WebAudio, not HTMLAudio: an mp3's encoder padding makes
  // <audio loop> hard-reset audibly at the seam. We decode once and run a
  // scheduled EQUAL-POWER CROSSFADE loop — each pass fades in over the tail of
  // the previous one, so the theme never stops or snaps.
  let themeBuf: AudioBuffer | null = null;
  let themeBad = false, themeLoading = false, themeWanted = false;
  let themeGain: GainNode | null = null;
  let themeTimer: ReturnType<typeof setTimeout> | null = null;
  let themeSrcs: AudioBufferSourceNode[] = [];
  const THEME_FADE = 1.6;   // seconds of overlap at the seam
  function startThemeLoop(c: AudioContext, buf: AudioBuffer) {
    stopThemeLoop(0);
    if (!themeGain) { themeGain = c.createGain(); themeGain.connect(master!); }
    themeGain.gain.cancelScheduledValues(c.currentTime);
    themeGain.gain.setValueAtTime(0.0001, c.currentTime);
    themeGain.gain.exponentialRampToValueAtTime(0.4, c.currentTime + 1.2);
    const period = Math.max(4, buf.duration - THEME_FADE);
    const playPass = (when: number) => {
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain();
      // equal-power-ish ramps across the overlap window
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(1, when + THEME_FADE);
      g.gain.setValueAtTime(1, when + period);
      g.gain.linearRampToValueAtTime(0.0001, when + buf.duration);
      src.connect(g); g.connect(themeGain!);
      src.start(when); src.stop(when + buf.duration + 0.1);
      themeSrcs.push(src);
      if (themeSrcs.length > 3) themeSrcs.shift();
    };
    let next = c.currentTime + 0.05;
    playPass(next);
    const arm = () => {
      next += period;
      playPass(next);   // scheduled ahead on the audio clock — sample-accurate
      themeTimer = setTimeout(arm, Math.max(500, (next - c.currentTime - 2.5) * 1000));
    };
    themeTimer = setTimeout(arm, Math.max(500, (period - 2.5) * 1000));
  }
  function stopThemeLoop(fade: number) {
    if (themeTimer) { clearTimeout(themeTimer); themeTimer = null; }
    if (ctx && themeGain && fade > 0) {
      themeGain.gain.cancelScheduledValues(ctx.currentTime);
      themeGain.gain.setValueAtTime(themeGain.gain.value, ctx.currentTime);
      themeGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
      const olds = themeSrcs; themeSrcs = [];
      setTimeout(() => olds.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }), fade * 1000 + 60);
    } else {
      themeSrcs.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
      themeSrcs = [];
    }
  }
  function startSynth() {
    const c = ensure(); if (!c || !master) return;
    if (!musGain) musGain = buildMusicBus(c);
    musGain.gain.cancelScheduledValues(c.currentTime);
    musGain.gain.setValueAtTime(0.0001, c.currentTime);
    musGain.gain.exponentialRampToValueAtTime(0.26, c.currentTime + 1.2);
    step = 0; nextT = c.currentTime + 0.1;
    if (musTimer) clearInterval(musTimer);
    musTimer = setInterval(musSchedule, 110);
  }
  let musGain: GainNode | null = null;
  let musTimer: ReturnType<typeof setInterval> | null = null;
  let musStage = 0, step = 0, nextT = 0;
  let lastPop = 0;
  const voiceCd: Record<string, number> = {};
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
  // I–V–vi–IV in C — the four-chord kids' anthem. One chord per bar.
  const CHORDS = [
    [261.63, 329.63, 392.0],   // C
    [392.0, 493.88, 587.33],   // G
    [440.0, 523.25, 659.25],   // Am
    [349.23, 440.0, 523.25],   // F
  ];
  const CHORD_BASS = [65.41, 49.0, 55.0, 43.65];   // C2 G1 A1 F1
  // pentatonic hook, one note per beat over 4 bars (0 = rest)
  const MEL = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 0,
    440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 440.0, 392.0];
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
      const bar = Math.floor(step / 16) % 4, s = step % 16;
      const beatIdx = Math.floor(step / 4) % 16;   // melody index: one note per beat over 4 bars
      // bass: root on the one, fifth on the three — walking, not droning
      if (s === 0) musNote(CHORD_BASS[bar], nextT, spb * 1.7, 'sine', 0.15);
      if (s === 8) musNote(CHORD_BASS[bar] * 1.5, nextT, spb * 0.9, 'sine', 0.1);
      if (s === 0 || s === 8) musNote(150, nextT, 0.1, 'sine', 0.15, 50);   // soft kick on 1 & 3
      // chord pad: full triad, one warm swell per bar
      if (s === 0) for (const f of CHORDS[bar]) musNote(f, nextT, spb * 3.7, 'sine', 0.026, undefined, true);
      // kalimba pluck hook: fundamental + soft octave, fast decay (from stage 1)
      if (musStage >= 1 && s % 4 === 0 && MEL[beatIdx] > 0) {
        musNote(MEL[beatIdx], nextT, s16 * 2.2, 'triangle', 0.055);
        musNote(MEL[beatIdx] * 2, nextT, s16 * 1.1, 'sine', 0.022);
      }
      if (musStage >= 2 && s % 8 === 4) musHat(nextT, 0.026);
      if (musStage >= 3 && s % 4 === 2) musNote(ARP[step % 4], nextT, s16 * 1.3, 'sine', 0.016, undefined, true);
      nextT += s16; step++;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PIRATE BAY RESORT
  // ──────────────────────────────────────────────────────────────────────────
  // A holiday, not a heist. The bed is a lazy tropical loop — steel-pan hook,
  // marimba counter-line, an off-beat skank and a warm round bass — in F MAJOR
  // throughout. There is deliberately no minor-key darkness anywhere in this
  // score, including the "urgent" stages: escalation is done with MORE PARTY
  // (extra percussion, a busier bass, a bright bell topline, +5 BPM a stage),
  // never with menace. Six-year-olds play this.
  //
  // On top of the bed sits a PLACE LAYER: each district can add its own quiet
  // world (the dance floor's four-on-the-floor, the docks' creaking rigging,
  // jungle crickets, beach surf) which crossfades in over 0.6s. The music is
  // still the star — every place layer is mixed to sit under it, because this
  // gets played on a phone speaker in the back of a car.
  // ══════════════════════════════════════════════════════════════════════════
  const isPirate = () => worldId() === 'pirate';

  // ONE flat white-noise buffer, generated once and shared by every noise voice
  // in the level (shakers, hats, surf, crowd, gulls, creaks). Rebuilding a
  // noise buffer per hit is the classic mobile-audio leak; a 2s buffer read
  // from a random offset with a random playback rate is indistinguishable.
  let whiteBuf: AudioBuffer | null = null;
  function white(c: AudioContext): AudioBuffer {
    if (!whiteBuf || whiteBuf.sampleRate !== c.sampleRate) {
      const len = Math.floor(c.sampleRate * 2);
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      whiteBuf = b;
    }
    return whiteBuf;
  }
  function ramp(p: AudioParam, to: number, now: number, dur: number) {
    p.cancelScheduledValues(now);
    p.setValueAtTime(Math.max(0.0001, p.value), now);
    p.exponentialRampToValueAtTime(Math.max(0.0001, to), now + dur);
  }

  // ── voices ────────────────────────────────────────────────────────────────
  // Every voice takes its destination, so the same synth serves the music bus,
  // the ambience bus and a district's zone bus without duplication.
  function nHit(dest: AudioNode, t: number, dur: number, vol: number,
    type: BiquadFilterType, fc0: number, q = 0.8, fc1 = 0, attack = 0.004) {
    const c = ctx; if (!c || vol <= 0) return;
    const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(fc0, t);
    if (fc1 > 0) f.frequency.exponentialRampToValueAtTime(Math.max(40, fc1), t + dur);
    const g = c.createGain();
    const atk = Math.min(attack, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.4); src.stop(t + dur + 0.03);
  }
  function dTone(dest: AudioNode, t: number, dur: number, type: OscillatorType,
    vol: number, f0: number, f1 = 0, f2 = 0, attack = 0.008) {
    const c = ctx; if (!c || f0 <= 0 || vol <= 0) return;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 > 0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + (f2 > 0 ? dur * 0.35 : dur));
    if (f2 > 0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = c.createGain();
    const atk = Math.min(attack, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
  }
  // STEEL PAN — the sound of the whole level. A struck pan is a strong
  // fundamental, a loud ringing octave and a slightly-sharp metallic partial
  // (2.76x, not a clean harmonic — that inharmonicity is what says "metal"),
  // finished with a tiny mallet tap so it reads as HIT rather than as a bleep.
  function pan(dest: AudioNode, freq: number, t: number, dur: number, vol: number, bright = 1) {
    const c = ctx; if (!c || freq <= 0) return;
    dTone(dest, t, dur, 'sine', vol, freq, 0, 0, 0.005);
    dTone(dest, t, dur * 0.55, 'sine', vol * 0.44 * bright, freq * 2, 0, 0, 0.004);
    if (bright > 0.5) dTone(dest, t, dur * 0.3, 'sine', vol * 0.17 * bright, freq * 2.76, 0, 0, 0.003);
    nHit(dest, t, 0.028, vol * 0.42, 'bandpass', 3400, 1.1);
  }
  // MARIMBA — wooden and dry: fundamental plus the 4th harmonic (two octaves
  // up), which is the bar's signature partial, and a very fast decay.
  function marimba(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    dTone(dest, t, dur, 'sine', vol, freq, 0, 0, 0.004);
    dTone(dest, t, dur * 0.35, 'sine', vol * 0.3, freq * 4, 0, 0, 0.003);
  }
  function pKick(dest: AudioNode, t: number, vol: number) {
    dTone(dest, t, 0.13, 'sine', vol, 145, 46, 0, 0.004);
  }
  function shaker(dest: AudioNode, t: number, vol: number) {
    nHit(dest, t, 0.055, vol, 'highpass', 6800, 0.7);
  }
  function conga(dest: AudioNode, t: number, freq: number, vol: number) {
    dTone(dest, t, 0.16, 'sine', vol, freq, freq * 0.72, 0, 0.004);
    nHit(dest, t, 0.04, vol * 0.35, 'bandpass', freq * 4, 1.4);
  }
  // the off-beat SKANK: all three chord tones share one fast envelope, which is
  // what makes it a stab and not a pad. One gain, three oscillators.
  function skank(dest: AudioNode, t: number, chord: number[], vol: number, dur: number) {
    const c = ctx; if (!c) return;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    f.connect(g); g.connect(dest);
    for (const fr of chord) {
      const o = c.createOscillator(); o.type = 'triangle';
      o.frequency.value = fr; o.detune.value = Math.random() * 8 - 4;
      o.connect(f); o.start(t); o.stop(t + dur + 0.03);
    }
  }
  // warm round bass: a triangle in a register a phone speaker can actually
  // reproduce, with a quiet sine an octave down for headphones.
  function pBass(dest: AudioNode, t: number, freq: number, dur: number, vol: number) {
    dTone(dest, t, dur, 'triangle', vol, freq, 0, 0, 0.02);
    dTone(dest, t, dur * 0.8, 'sine', vol * 0.55, freq / 2, 0, 0, 0.02);
  }

  // ── the tropical bus ──────────────────────────────────────────────────────
  // Brighter and airier than Maple's: a higher lowpass (pans need their top
  // end) and a longer, wetter delay so the pans wash into the bay.
  const PIR_VOL = 0.27;
  let pirBus: GainNode | null = null;
  let ambGain: GainNode | null = null;
  let pirTimer: ReturnType<typeof setInterval> | null = null;
  let pirRunning = false;
  let pirStep = 0, pirNextT = 0, ambNextT = 0;
  function buildTropicalBus(c: AudioContext): GainNode {
    const bus = c.createGain(); bus.gain.value = 0.0001;
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 4600; warm.Q.value = 0.4;
    const dry = c.createGain(); dry.gain.value = 0.88;
    const delay = c.createDelay(1.0); delay.delayTime.value = 0.43;   // ~dotted 8th at 105bpm
    const fb = c.createGain(); fb.gain.value = 0.3;
    const wet = c.createGain(); wet.gain.value = 0.22;
    const wetTone = c.createBiquadFilter(); wetTone.type = 'lowpass'; wetTone.frequency.value = 2600;
    bus.connect(warm);
    warm.connect(dry); dry.connect(master!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(master!);
    delay.connect(fb); fb.connect(delay);
    return bus;
  }

  // ── the score: I – vi – IV – V in F major, the sunniest four bars there are
  const P_CHORD = [
    [349.23, 440.00, 523.25],   // F  (F4 A4 C5)
    [349.23, 440.00, 587.33],   // Dm (F4 A4 D5)
    [349.23, 466.16, 587.33],   // Bb (F4 Bb4 D5)
    [329.63, 392.00, 523.25],   // C  (E4 G4 C5)
  ];
  const P_BASS = [87.31, 146.83, 116.54, 130.81];   // F2 D3 Bb2 C3
  // steel-pan hook, one note per beat across the 4 bars (0 = rest, and the
  // rests matter — a tune that never breathes stops being a tune)
  const P_MEL = [523.25, 587.33, 698.46, 587.33,
    523.25, 440.00, 523.25, 0,
    587.33, 698.46, 783.99, 698.46,
    587.33, 523.25, 440.00, 0];
  // marimba counter-line, two notes a bar, sitting an octave under the pans
  const P_CNTR = [[349.23, 440.00], [293.66, 349.23], [349.23, 466.16], [329.63, 392.00]];
  const P_BELL = [880.00, 1046.50, 1174.66];

  // ── place layers ──────────────────────────────────────────────────────────
  type ZoneId = 'party' | 'port' | 'jungle' | 'beach';
  interface ZoneLayer { g: GainNode; vol: number; on: boolean; until: number }
  const ZONE_VOL: Record<ZoneId, number> = { party: 1.0, port: 0.5, jungle: 0.45, beach: 0.5 };
  const ZONE_FADE = 0.6;
  const zones: Partial<Record<ZoneId, ZoneLayer>> = {};
  let curZone: ZoneId | null = null;
  // districts the game reports -> what they sound like. SMUGGLERS COVE gets the
  // beach's surf; the resort and the bazaar are music-only on purpose, so the
  // place layer stays a treat rather than a permanent wash.
  function normZone(z: string | null): ZoneId | null {
    switch (z) {
      case 'party': return 'party';
      case 'port': return 'port';
      case 'jungle': return 'jungle';
      case 'beach': case 'cove': return 'beach';
      default: return null;
    }
  }
  // Each bed is a SINGLE looping noise source built once and left running for
  // the match; only its gain moves. Nothing here allocates per frame.
  function buildBed(c: AudioContext, id: ZoneId, dest: AudioNode) {
    const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const lfo = c.createOscillator(); lfo.type = 'sine';
    const lfoG = c.createGain();
    if (id === 'beach') {          // surf: slow swells rolling in
      f.type = 'lowpass'; f.frequency.value = 620; f.Q.value = 0.6;
      g.gain.value = 0.075; lfo.frequency.value = 0.085; lfoG.gain.value = 0.05;
    } else if (id === 'party') {   // a packed floor: a warm crowd hubbub
      f.type = 'bandpass'; f.frequency.value = 820; f.Q.value = 0.55;
      g.gain.value = 0.075; lfo.frequency.value = 0.14; lfoG.gain.value = 0.03;
    } else if (id === 'jungle') {  // crickets: a fast chirr, barely there
      f.type = 'bandpass'; f.frequency.value = 4900; f.Q.value = 7;
      g.gain.value = 0.022; lfo.frequency.value = 9; lfoG.gain.value = 0.018;
    } else {                       // the docks: water slapping a hull
      f.type = 'lowpass'; f.frequency.value = 340; f.Q.value = 0.7;
      g.gain.value = 0.05; lfo.frequency.value = 0.24; lfoG.gain.value = 0.03;
    }
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(); lfo.start();
  }
  function zoneLayer(c: AudioContext, id: ZoneId): ZoneLayer {
    let z = zones[id];
    if (!z) {
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(master!);
      z = { g, vol: ZONE_VOL[id], on: false, until: 0 };
      zones[id] = z;
      buildBed(c, id, g);
    }
    return z;
  }
  const zoneLive = (id: ZoneId, now: number) => {
    const z = zones[id];
    return !!z && (z.on || now < z.until);
  };
  // Everything crossfades — a hard cut between the bay and the dance floor
  // would feel like a bug. The bed also ducks under the party so stepping onto
  // the floor is an EVENT.
  function applyZones() {
    const c = ctx; if (!c || !master) return;
    const now = c.currentTime;
    for (const k of Object.keys(zones) as ZoneId[]) {
      const z = zones[k]!;
      if (k !== curZone && z.on) { z.on = false; z.until = now + ZONE_FADE; ramp(z.g.gain, 0, now, ZONE_FADE); }
    }
    if (curZone && pirRunning) {
      const z = zoneLayer(c, curZone);
      if (!z.on) { z.on = true; z.until = 0; ramp(z.g.gain, z.vol, now, ZONE_FADE); }
    }
    if (pirBus) ramp(pirBus.gain, pirRunning ? (curZone === 'party' ? PIR_VOL * 0.5 : PIR_VOL) : 0, now, ZONE_FADE);
  }

  // ── ambience: gulls, surf, a far-off bell ─────────────────────────────────
  // Sparse on purpose (one event every 6-15s). A constant wash reads as tape
  // hiss on a phone; a single gull four seconds after the last one reads as a
  // place. The pool is weighted by district so the docks creak and the jungle
  // sings without needing beds of their own.
  function gull(t: number) {
    if (!ambGain) return;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 760 + Math.random() * 300;
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.16 + Math.random() * 0.07);
      dTone(ambGain, tt, 0.17, 'triangle', 0.05 - i * 0.008, base, base * 1.7, base * 1.12, 0.012);
    }
  }
  function shipBell(t: number) {
    if (!ambGain) return;
    const f = 590 + Math.random() * 80;
    for (const off of [0, 0.85]) {
      dTone(ambGain, t + off, 2.4, 'sine', 0.045, f, 0, 0, 0.004);
      dTone(ambGain, t + off, 1.5, 'sine', 0.026, f * 2.76, 0, 0, 0.003);
      dTone(ambGain, t + off, 0.7, 'sine', 0.012, f * 5.4, 0, 0, 0.003);
    }
  }
  function surfSwell(t: number) {
    if (!ambGain) return;
    nHit(ambGain, t, 2.6, 0.07, 'lowpass', 900, 0.5, 240, 0.7);
  }
  function ropeCreak(t: number) {
    if (!ambGain) return;
    nHit(ambGain, t, 0.75, 0.035, 'bandpass', 430, 6, 250, 0.18);
    dTone(ambGain, t + 0.05, 0.6, 'triangle', 0.018, 132, 118, 0, 0.15);
  }
  function jungleBird(t: number) {
    if (!ambGain) return;
    const n = 2 + Math.floor(Math.random() * 2);
    const base = 2200 + Math.random() * 900;
    for (let i = 0; i < n; i++) {
      dTone(ambGain, t + i * 0.11, 0.07, 'sine', 0.035, base, base * 1.35, 0, 0.006);
    }
  }
  function ambience(c: AudioContext) {
    if (ambNextT === 0) ambNextT = c.currentTime + 2.5 + Math.random() * 4;
    while (ambNextT < c.currentTime + 0.4) {
      const t = Math.max(c.currentTime + 0.05, ambNextT);
      const r = Math.random();
      if (curZone === 'port') {
        if (r < 0.45) ropeCreak(t); else if (r < 0.7) shipBell(t); else if (r < 0.9) gull(t); else surfSwell(t);
      } else if (curZone === 'jungle') {
        if (r < 0.6) jungleBird(t); else if (r < 0.85) gull(t); else ropeCreak(t);
      } else if (curZone === 'beach') {
        if (r < 0.5) surfSwell(t); else if (r < 0.85) gull(t); else shipBell(t);
      } else {
        if (r < 0.38) gull(t); else if (r < 0.6) surfSwell(t); else if (r < 0.82) shipBell(t); else ropeCreak(t);
      }
      // the dance floor is loud enough already — thin the ambience right out
      ambNextT = t + (curZone === 'party' ? 13 : 6) + Math.random() * 9;
    }
  }

  // ── the scheduler ─────────────────────────────────────────────────────────
  // Same idiom as Maple: the setInterval is only a LOOKAHEAD PUMP, it never
  // decides when a note happens. Every note is stamped onto the AudioContext
  // clock a third of a second ahead, so timing survives a dropped frame.
  function pirSchedule() {
    const c = ensure(); if (!c || !pirBus) return;
    const st = Math.max(0, Math.min(3, musStage));
    const spb = 60 / (100 + st * 5);
    const s16 = spb / 4;
    const now = c.currentTime;
    if (pirNextT < now) pirNextT = now + 0.05;
    while (pirNextT < now + 0.35) {
      const t = pirNextT;
      const bar = (pirStep >> 4) & 3, s = pirStep & 15;
      const beat = (pirStep >> 2) & 15;   // melody index: one note per beat, 4 bars
      const ch = P_CHORD[bar];

      // BASS — root on the one, a lazy push on the "and of 3". That push is
      // the whole tropical feel; a bass on every beat would read as marching.
      if (s === 0) pBass(pirBus, t, P_BASS[bar], spb * 1.5, 0.17);
      if (s === 10) pBass(pirBus, t, P_BASS[bar], spb * 0.55, 0.12);
      if (st >= 2 && s === 6) pBass(pirBus, t, P_BASS[bar] * 1.5, spb * 0.4, 0.08);
      if (st >= 3 && s === 14) pBass(pirBus, t, P_BASS[bar] * 2, spb * 0.4, 0.07);
      // soft kick on 1 and 3 — a heartbeat, not a club
      if (s === 0 || s === 8) pKick(pirBus, t, 0.15);
      // PAD: one warm swell a bar. This is the "expensive" in the brief —
      // the resort's air conditioning, basically.
      if (s === 0) for (const f of ch) dTone(pirBus, t, spb * 3.6, 'sine', 0.024, f, 0, 0, 0.09);
      // SKANK: the off-beat chord stab, every "and"
      if ((s & 3) === 2) skank(pirBus, t, ch, 0.05 + st * 0.008, s16 * 1.3);
      // SHAKER: off-beats only until stage 2, then straight 8ths with accents
      if (st >= 2 ? (s & 1) === 0 : (s & 3) === 2) shaker(pirBus, t, (s & 3) === 2 ? 0.032 : 0.016);
      // STEEL PAN HOOK — the tune arrives with the first evolution
      if (st >= 1 && (s & 3) === 0 && P_MEL[beat] > 0) {
        pan(pirBus, P_MEL[beat], t, s16 * 3, 0.07);
        if (st >= 3) pan(pirBus, P_MEL[beat] * 2, t, s16 * 1.6, 0.022, 0.4);
      }
      // MARIMBA counter-line answers the pans in the gaps
      if (st >= 2 && (s === 6 || s === 14)) marimba(pirBus, P_CNTR[bar][s === 6 ? 0 : 1], t, s16 * 2, 0.04);
      // CONGAS + a bright bell turnaround: stage 3 is BUSIER, never darker
      if (st >= 3) {
        if (s === 7) conga(pirBus, t, 310, 0.07);
        if (s === 11) conga(pirBus, t, 205, 0.08);
        if (s === 15) conga(pirBus, t, 380, 0.06);
        if (bar === 3 && s === 12) P_BELL.forEach((f, i) => pan(pirBus!, f, t + i * s16 * 0.5, 0.5, 0.05, 0.6));
      }

      // ── DANCE COVE: the floor's own beat, mixed into the party zone bus ───
      if (zoneLive('party', t)) {
        const pg = zones.party!.g;
        if ((s & 3) === 0) { pKick(pg, t, 0.3); nHit(pg, t, 0.014, 0.09, 'lowpass', 2400, 0.7); }
        if ((s & 3) === 2) {
          skank(pg, t, [ch[0] * 2, ch[1] * 2, ch[2] * 2], 0.055, s16 * 1.5);   // filtered stab
          nHit(pg, t, 0.06, 0.05, 'highpass', 7600, 0.7);                      // open hat
        }
        if ((s & 1) === 0 && (s & 3) !== 2) nHit(pg, t, 0.03, 0.022, 'highpass', 9000, 0.7);
        if (s === 4 || s === 12) pBass(pg, t, P_BASS[bar], s16 * 1.4, 0.1);
        if (bar === 3 && s === 14) nHit(pg, t, 1.1, 0.09, 'bandpass', 1100, 0.5, 1800, 0.25);   // crowd woo
      }

      pirNextT += s16; pirStep++;
    }
    ambience(c);
  }
  function startTropical() {
    const c = ensure(); if (!c || !master) return;
    if (!pirBus) pirBus = buildTropicalBus(c);
    if (!ambGain) { ambGain = c.createGain(); ambGain.gain.value = 0.0001; ambGain.connect(master); }
    pirRunning = true;
    ramp(ambGain.gain, 0.75, c.currentTime, 1.6);
    pirStep = 0; pirNextT = c.currentTime + 0.12; ambNextT = 0;
    applyZones();   // also fades pirBus in to the right level for the district
    if (pirTimer) clearInterval(pirTimer);
    pirTimer = setInterval(pirSchedule, 110);
  }
  function stopTropical(fade: number) {
    pirRunning = false;
    if (pirTimer) { clearInterval(pirTimer); pirTimer = null; }
    const c = ctx; if (!c) return;
    const now = c.currentTime;
    if (pirBus) ramp(pirBus.gain, 0, now, fade);
    if (ambGain) ramp(ambGain.gain, 0, now, fade);
    for (const k of Object.keys(zones) as ZoneId[]) {
      const z = zones[k]!; z.on = false; z.until = 0; ramp(z.g.gain, 0, now, fade);
    }
    curZone = null;
  }

  // ── resort-flavoured one-shots ────────────────────────────────────────────
  function panRun(t: number, notes: number[], gap: number, vol: number, dur: number) {
    if (!master) return;
    notes.forEach((f, i) => pan(master!, f, t + i * gap, dur, vol));
  }
  function cheer(t: number, vol: number) {
    if (!master) return;
    nHit(master, t, 1.5, vol * 0.16, 'bandpass', 1050, 0.5, 1900, 0.22);
    for (let i = 0; i < 3; i++) {
      const tt = t + 0.15 + Math.random() * 0.7;
      dTone(master, tt, 0.22, 'sine', vol * 0.05, 1500 + Math.random() * 600, 2300, 0, 0.03);
    }
  }
  // a soft party horn — the reggae airhorn, sanded down for small ears: warm
  // triangles instead of saws, and it bends UP into a smile.
  function airhorn(t: number, vol: number) {
    if (!master) return;
    for (const [m, v] of [[1, 1], [1.5, 0.5], [2, 0.32]] as [number, number][]) {
      dTone(master, t, 0.75, 'triangle', vol * v, 466.16 * m, 466.16 * m * 1.06, 0, 0.03);
    }
  }
  function mapleEvolve() {
    if (sample('evolve_epic.wav', 0.5)) return;
    const seq = [392, 523.25, 659.25, 783.99]; // G4 C5 E5 G5 — bright major
    seq.forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.22, i * 0.085));
    tone(1567.98, 1567.98, 0.4, 'sine', 0.1, 0.34);
  }
  function pirateEvolve() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime;
    panRun(t, [349.23, 440.00, 523.25, 698.46], 0.075, 0.16, 0.55);   // F A C F, up
    pan(master, 880.00, t + 0.34, 1.0, 0.11);
    nHit(master, t + 0.28, 0.45, 0.05, 'highpass', 5600, 0.7, 9000, 0.12);   // shaker flourish
    if (curZone === 'party') cheer(t + 0.1, 0.55);
  }

  return {
    startMusic() {
      // PIRATE BAY RESORT has its own score — and deliberately does NOT pick up
      // /assets/music/theme.mp3, which is Maple's track. Its bed is synthesised
      // end to end so the resort always sounds like the resort.
      if (isPirate()) { startTropical(); return; }
      // prefetch the recorded kit so the very first gulp is the real sample
      for (const n of ['eaten_deep.wav', 'evolve_epic.wav', 'win_warm.wav']) sample(n, 0);
      // licensed-track hook: if a real music file ships with the build, prefer
      // it (gapless crossfade loop); the synth score is the fallback
      themeWanted = true;
      const c = ensure();
      if (c && !themeBad) {
        if (themeBuf) { startThemeLoop(c, themeBuf); return; }
        if (!themeLoading) {
          themeLoading = true;
          fetch('/assets/music/theme.mp3')
            .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
            .then((b) => c.decodeAudioData(b))
            .then((buf) => { themeBuf = buf; if (themeWanted) startThemeLoop(c, buf); })
            .catch(() => { themeBad = true; if (themeWanted) startSynth(); });
        }
        return;   // theme decoding — it fades in the moment it's ready
      }
      startSynth();
    },
    setMusicStage(n) { musStage = n; },
    setMuted(m: boolean) {
      muted = m;
      localStorage.setItem('voidMute', m ? '1' : '0');
      if (master && ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(m ? 0 : MASTER_VOL, ctx.currentTime, 0.05);
      }
    },
    isMuted() { return muted; },
    // The player's current district, safe to call every frame — unchanged
    // values cost one comparison and nothing else.
    setZone(zone) {
      const id = normZone(zone);
      if (id === curZone) return;
      curZone = id;
      // NEVER call ensure() here: setZone can fire before the first gesture and
      // creating the context then would trip the autoplay policy. If there is
      // no context yet the choice is simply remembered for startTropical().
      if (!ctx || !isPirate()) return;
      applyZones();
    },
    // The authored match beats. Maple keeps the fanfare it always had; the
    // resort answers with the pans, and DANCE PARTY gets the full horn.
    matchBeat(kind) {
      const c = ensure(); if (!c || !master) return;
      if (!isPirate()) { mapleEvolve(); return; }
      const t = c.currentTime;
      const k = String(kind).toLowerCase();
      if (k.includes('dance') || k.includes('party')) {
        airhorn(t, 0.16);
        cheer(t + 0.12, 0.8);
        panRun(t + 0.5, [523.25, 587.33, 698.46, 880.00], 0.09, 0.14, 0.5);
      } else if (k.includes('treasure') || k.includes('feast')) {
        panRun(t, [349.23, 440.00, 523.25, 698.46, 880.00], 0.08, 0.15, 0.6);
        pan(master, 1046.5, t + 0.44, 1.2, 0.1);
        nHit(master, t + 0.38, 0.6, 0.05, 'highpass', 5200, 0.7, 9500, 0.14);
      } else {
        panRun(t, [523.25, 659.25, 783.99], 0.1, 0.14, 0.55);   // happy hour: a bright toast
        marimba(master, 1046.5, t + 0.32, 0.7, 0.08);
      }
    },
    stopMusic() {
      stopTropical(1.2);
      themeWanted = false;
      stopThemeLoop(1.2);
      if (musTimer) { clearInterval(musTimer); musTimer = null; }
      if (ctx && musGain) {
        musGain.gain.cancelScheduledValues(ctx.currentTime);
        musGain.gain.setValueAtTime(musGain.gain.value, ctx.currentTime);
        musGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      }
    },
    pop(combo, size = 0.9) {
      // ── THE CHOMP, rebuilt ────────────────────────────────────────────────
      // The recorded gulp takes read as wet and rough on a phone speaker, so
      // they're out of the eat sound entirely (they still carry bigEat). This
      // is a three-layer synthesised NOM:
      //   1. BITE   — a 20ms low-passed thump: jaws closing, felt not heard
      //   2. BODY   — a plump sine bloop that glides down a fifth
      //   3. POP    — a tiny bright tail so small bites feel crunchy-cute
      // and the whole thing is TUNED: consecutive bites walk up a pentatonic
      // ladder, so a hoover spree plays a little melody instead of machine-
      // gunning one sample. That's the difference between noise and delight.
      const c = ensure(); if (!c) return;
      const now = c.currentTime;
      if (now - lastPop < 0.075) return;
      // a gap in eating resets the melody back to the root
      if (now - lastPop > 1.1) comboStep = 0; else comboStep = (comboStep + 1) % PENTA.length;
      lastPop = now;
      const depth = Math.min(1, (size - 0.9) / 9);            // 0 tiny -> 1 huge
      const semis = PENTA[comboStep] + Math.min(12, Math.floor(combo / 3) * 2);
      // big voids sing LOWER: a world-ender's nom is a bass note, not a chirp
      const base = 300 * Math.pow(2, semis / 12) * (1 - depth * 0.52);
      // 1. bite transient
      noise(0.035, 0.10 + depth * 0.05, 620 - depth * 260, 90);
      // 2. body — fat sine glide + a triangle underneath for weight
      tone(base, base * 0.62, 0.13 + depth * 0.05, 'sine', 0.15 + depth * 0.04);
      tone(base * 0.5, base * 0.34, 0.11, 'triangle', 0.055, 0.006);
      // 3. bright tail — only on small snappy bites, keeps them crisp
      if (depth < 0.5) tone(base * 2.02, base * 1.5, 0.05, 'sine', 0.045 * (1 - depth * 2), 0.05);
      // 4. sub thump when something big goes down
      if (depth > 0.35) tone(52, 30, 0.2, 'sine', depth * 0.14, 0.03);
    },
    bigEat() {
      if (sample('eaten_deep.wav', 0.55)) return;
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
      // the resort answers in steel pans instead — same beat, different island
      if (isPirate()) { pirateEvolve(); return; }
      mapleEvolve();
    },
    voice(kind) {
      // Kirby-class coos: two-note sine chirps, soft and rate-limited so the
      // void sounds sweet, never chatty
      const c = ensure(); if (!c) return;
      const now = c.currentTime;
      if (now - (voiceCd[kind] ?? -99) < 6) return;
      voiceCd[kind] = now;
      if (kind === 'happy') { tone(660, 760, 0.09, 'sine', 0.09); tone(880, 990, 0.13, 'sine', 0.09, 0.1); }
      else if (kind === 'yum') { tone(330, 300, 0.12, 'sine', 0.08); tone(370, 335, 0.16, 'sine', 0.08, 0.14); }
      else if (kind === 'scared') { tone(740, 470, 0.2, 'triangle', 0.07); }
      else if (kind === 'hurt') { tone(430, 250, 0.22, 'sine', 0.09); }
      else if (kind === 'sleepy') { tone(340, 300, 0.55, 'sine', 0.045); }
    },
    win() {
      if (isPirate()) {
        // closing party: a pan run up the F major triad, a shaker roll and the
        // crowd. The match ends on a beach, not a scoreboard.
        const c = ensure(); if (!c || !master) return;
        const t = c.currentTime;
        panRun(t, [349.23, 440.00, 523.25, 698.46, 880.00, 1046.5], 0.11, 0.15, 0.7);
        pan(master, 1396.91, t + 0.68, 1.4, 0.09);
        nHit(master, t, 0.9, 0.045, 'highpass', 5000, 0.7, 9500, 0.5);
        cheer(t + 0.25, 0.9);
        return;
      }
      if (sample('win_warm.wav', 0.55)) return;
      const seq = [523.25, 659.25, 783.99, 1046.5];
      seq.forEach((f, i) => tone(f, f, 0.3, 'triangle', 0.2, i * 0.12));
    },
    hit() {
      tone(140, 60, 0.16, 'square', 0.16);
      noise(0.12, 0.18, 700, 200);
    },
    alert() {
      if (isPirate()) {
        // a friendly two-tone boat horn, a major third apart. Announcing a
        // guest at the resort, not a warning — the squares stay on Maple.
        const c = ensure(); if (!c || !master) return;
        const t = c.currentTime;
        for (const [f, off] of [[261.63, 0], [329.63, 0.17]] as [number, number][]) {
          dTone(master, t + off, 0.34, 'triangle', 0.13, f, 0, 0, 0.03);
          dTone(master, t + off, 0.3, 'sine', 0.07, f * 2, 0, 0, 0.03);
        }
        return;
      }
      tone(660, 660, 0.13, 'square', 0.12);
      tone(880, 880, 0.13, 'square', 0.12, 0.16);
    },
    ready() {
      if (isPirate()) {
        // the poolside bar chime: two marimba notes, a fifth apart
        const c = ensure(); if (!c || !master) return;
        const t = c.currentTime;
        marimba(master, 880.00, t, 0.5, 0.13);
        marimba(master, 1318.51, t + 0.09, 0.6, 0.11);
        return;
      }
      tone(659.25, 659.25, 0.1, 'sine', 0.18);
      tone(987.77, 987.77, 0.14, 'sine', 0.16, 0.09);
    },
  };
}
