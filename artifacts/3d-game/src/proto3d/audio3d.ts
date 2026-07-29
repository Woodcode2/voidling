// Synthesized SFX for VOIDLING — zero assets, pure WebAudio, tuned soft and
// toy-like (this is for kids: pops and whooshes, no harsh 8-bit edges).
// The context unlocks on the first user gesture per autoplay policy.
//
// The shared one-shots come first. After them the file holds TWO complete and
// completely separate scores, one per world, each with its own band, its own
// hook and its own place layer, gated on worldId():
//
//   PIRATE BAY RESORT — a 6/8 SEA SHANTY: squeezebox, fiddle, stomp, clap and
//   a crew shouting HEY, with the resort's steel pans as garnish, and a layer
//   that swaps in the DANCE COVE club beat on the dance floor.
//
//   MAPLE FALLS — a small-town band mid-election: front-porch bluegrass at the
//   bottom of the match (banjo, upright, brushes, fiddle) growing into a
//   marching band by the top (sousaphone, snare, cornets, bell lyre), ten
//   districts of place layer, and a campaign loudhailer two streets away.
//
// Neither score can hear the other; they share only the voice helpers.
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
  jingle(): void;                       // quote MAPLE FALLS' municipal jingle (no-op in the bay)
  setMuted(m: boolean): void;      // settings toggle (App Store expects one)
  isMuted(): boolean;
}

export function createAudio(): Audio3D {
  let ctx: Ctx | null = null;
  let master: GainNode | null = null;
  // persisted mute — a parent hitting mute expects it to STAY muted tomorrow
  let muted = localStorage.getItem('voidMute') === '1';
  // set voidTheme=1 to play /assets/music/theme.mp3 (and the old generic synth
  // bed behind it) on MAPLE FALLS instead of the town band. Off by default.
  const LICENSED_THEME = localStorage.getItem('voidTheme') === '1';
  // major pentatonic: every eat lands on a consonant note, so fast eating
  // sounds like a tune rather than a stutter
  const PENTA = [0, 2, 4, 7, 9, 12, 9, 7];
  let comboStep = 0;
  // ── THE MIX HAD 40 dB OF UNUSED HEADROOM ──────────────────────────────────
  // Measured with a calibrated analyser on ctx.destination: median RMS
  // -62 dBFS on Maple, -56 on the bay, with peaks never past -30. Meanwhile a
  // single chomp peaks at -26 dBFS — one eat is louder than the loudest instant
  // of thirty-six seconds of band, and about 30 dB above the music's median. On
  // a phone speaker the score is simply inaudible under the effects, which is
  // most of why "the music is gone" was the report on BOTH worlds.
  //
  // Raising the gains alone would clip, because the one-shots bypass the band
  // bus and go straight to master. So master now runs through a limiter and the
  // band buses come up underneath it.
  const MASTER_VOL = 0.62;

  function ensure(): Ctx | null {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = muted ? 0 : MASTER_VOL;
        // a soft limiter, not a compressor doing tone: it sits nearly idle on
        // the band and only catches the one-shot stack when several land at once
        const lim = ctx.createDynamicsCompressor();
        lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12;
        lim.attack.value = 0.003; lim.release.value = 0.14;
        master.connect(lim); lim.connect(ctx.destination);
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
  // A SEA SHANTY, played by a resort band. That sentence is the whole design.
  //
  // The bones are a shanty and nothing else: 6/8, squeezebox oom-pah-pah, a
  // plucked bass on the root, a fiddle doubling the tune, and — the part that
  // actually makes it fun — a STOMP AND CLAP on the strong beats with the crew
  // shouting HEY on the turnarounds. On top of that sits the resort: steel pan
  // and marimba, demoted from "the identity" to "the garnish", answering the
  // hook on off-beats. Pirate-themed luxury holiday; the score tells the joke.
  //
  // The hook is four bars, call / answer / call / bigger answer, and bars 0
  // and 2 are byte-identical. Repetition is not laziness here, it is the
  // brief: the test this music has to pass is a seven-year-old humming it in
  // the car afterwards. Escalation is the room getting ROWDIER — more voices
  // shouting, faster claps, the whistle joining in, +6 BPM a stage — never
  // darker, never scarier.
  //
  // Over the top sits a PLACE LAYER: each district adds its own quiet world
  // (the dance floor's straight-4/4 club beat, the docks' creaking rigging,
  // jungle crickets, beach surf) crossfading in over 0.6s. The dance floor is
  // the one place the shanty stands down — a nightclub is no place for an
  // accordion — but DJ Coconut quotes the hook once a loop, so the island has
  // exactly one tune however you happen to be hearing it.
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
  // Percussion and any voice with a fixed tone colour runs through STATIC
  // filters that are built once per destination bus, on demand, and left
  // connected — so a clap costs a source and an envelope and nothing else.
  // Not two filters a hit, eight times a bar, for three and a half minutes.
  const FX_SPEC: Record<string, [BiquadFilterType, number, number]> = {
    shaker: ['highpass', 6800, 0.7],
    hat: ['highpass', 8600, 0.7],
    mallet: ['bandpass', 3400, 1.1],
    click: ['lowpass', 2200, 0.7],
    clap: ['bandpass', 1250, 0.9],    // hands, not a snare
    stomp: ['lowpass', 240, 1.0],     // a boot on a deck
    lead: ['lowpass', 2800, 3.5],     // the club synth quoting the shanty
    // ── MAPLE FALLS ──
    pick: ['highpass', 3200, 0.8],    // the banjo's fingerpick on the wire
    brush: ['bandpass', 2600, 0.5],   // a wire brush on a snare head
    snare: ['highpass', 1700, 0.7],   // and the same head hit properly
    crash: ['highpass', 5200, 0.6],   // one cymbal, at the top of the phrase
    horn: ['lowpass', 2500, 1.6],     // the cornet section's bell
    calli: ['lowpass', 1400, 0.9],    // a steam organ, heard across a field
  };
  const fxCache = new Map<AudioNode, Record<string, BiquadFilterNode>>();
  function fxFor(dest: AudioNode, key: string): BiquadFilterNode | null {
    const c = ctx; if (!c) return null;
    let m = fxCache.get(dest);
    if (!m) { m = {}; fxCache.set(dest, m); }
    let b = m[key];
    if (!b) {
      const [type, freq, q] = FX_SPEC[key];
      b = c.createBiquadFilter(); b.type = type; b.frequency.value = freq; b.Q.value = q;
      b.connect(dest); m[key] = b;
    }
    return b;
  }
  // a noise burst straight into a pre-built filter: two nodes, both short-lived
  function nEnv(dest: AudioNode | null, t: number, dur: number, vol: number, attack = 0.003) {
    const c = ctx; if (!c || !dest || vol <= 0) return;
    const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const g = c.createGain();
    const atk = Math.min(attack, dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.4); src.stop(t + dur + 0.03);
  }
  // STEEL PAN — the sound of the whole level. The body is a PeriodicWave with
  // the pan's partial mix baked in (one oscillator, not five), and the two
  // things that stop it sounding like an organ ride on top: a slightly-sharp
  // 2.76x partial — inharmonic, which is what the ear reads as METAL — and a
  // mallet tap so it reads as struck rather than as a bleep.
  let panWave: PeriodicWave | null = null;
  function pan(dest: AudioNode, freq: number, t: number, dur: number, vol: number, bright = 1) {
    const c = ctx; if (!c || freq <= 0) return;
    if (!panWave) {
      panWave = c.createPeriodicWave(
        new Float32Array([0, 0, 0, 0, 0, 0, 0]),
        new Float32Array([0, 1, 0.55, 0.2, 0.3, 0.07, 0.1]),
      );
    }
    const o = c.createOscillator(); o.setPeriodicWave(panWave);
    o.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
    if (bright > 0.5) {
      dTone(dest, t, dur * 0.3, 'sine', vol * 0.18, freq * 2.76, 0, 0, 0.003);
      nEnv(fxFor(dest, 'mallet'), t, 0.028, vol * 0.45);
    }
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
    nEnv(fxFor(dest, 'shaker'), t, 0.055, vol);
  }
  function conga(dest: AudioNode, t: number, freq: number, vol: number) {
    dTone(dest, t, 0.16, 'sine', vol, freq, freq * 0.72, 0, 0.004);
  }

  // ══ THE CREW ══════════════════════════════════════════════════════════════
  // Everything below is the shanty band. The three melodic instruments each get
  // a PERMANENT channel (a gain, a tone filter, and for the fiddle a vibrato
  // LFO) built once with the bus, so a note is only ever an oscillator and an
  // envelope. The LFOs are shared: a running LFO can be connected to any number
  // of new oscillators' detune params for free, which is how every fiddle note
  // gets vibrato without a node per note.
  // A crew is built PER DESTINATION and cached, the same way the percussion
  // filters are. There are two in practice: one on the band bus for the score,
  // and one straight on master for the one-shots. That second one matters —
  // win() fires immediately after stopMusic(), so a fanfare routed through the
  // music bus would fade out underneath itself, and evolve() can be triggered
  // from the shop before a match has ever started the bus at all.
  interface Crew { acc: GainNode; fid: GainNode; vib: GainNode; wh: GainNode }
  const crews = new Map<AudioNode, Crew>();
  function crewFor(dest: AudioNode): Crew | null {
    const c = ctx; if (!c) return null;
    let k = crews.get(dest);
    if (k) return k;
    // SQUEEZEBOX: the wheeze is a slow tremolo on the whole channel, exactly
    // like a bellows breathing. One LFO for every accordion note in the match.
    const acc = c.createGain(); acc.gain.value = 1;
    const accTone = c.createBiquadFilter(); accTone.type = 'lowpass'; accTone.frequency.value = 2500; accTone.Q.value = 0.6;
    acc.connect(accTone); accTone.connect(dest);
    const trem = c.createOscillator(); trem.type = 'sine'; trem.frequency.value = 5.1;
    const tremG = c.createGain(); tremG.gain.value = 0.14;
    trem.connect(tremG); tremG.connect(acc.gain); trem.start();
    // FIDDLE — body resonance top and bottom, plus a shared bow vibrato that
    // every future fiddle note connects to for free
    const fid = c.createGain(); fid.gain.value = 1;
    const fidTone = c.createBiquadFilter(); fidTone.type = 'highpass'; fidTone.frequency.value = 330; fidTone.Q.value = 0.7;
    const fidTop = c.createBiquadFilter(); fidTop.type = 'lowpass'; fidTop.frequency.value = 3400; fidTop.Q.value = 0.5;
    fid.connect(fidTone); fidTone.connect(fidTop); fidTop.connect(dest);
    const vibO = c.createOscillator(); vibO.type = 'sine'; vibO.frequency.value = 5.4;
    const vib = c.createGain(); vib.gain.value = 17;   // cents
    vibO.connect(vib); vibO.start();
    // TIN WHISTLE
    const wh = c.createGain(); wh.gain.value = 1;
    const whTone = c.createBiquadFilter(); whTone.type = 'lowpass'; whTone.frequency.value = 3800; whTone.Q.value = 0.7;
    wh.connect(whTone); whTone.connect(dest);
    k = { acc, fid, vib, wh };
    crews.set(dest, k);
    return k;
  }
  // accordion reed: saw-like with a nasal rolloff. One PeriodicWave, cached,
  // so a reed note is one oscillator instead of a stack.
  let reedWave: PeriodicWave | null = null;
  function reed(c: AudioContext): PeriodicWave {
    if (!reedWave) {
      reedWave = c.createPeriodicWave(
        new Float32Array(10),
        new Float32Array([0, 1, 0.72, 0.5, 0.34, 0.26, 0.19, 0.14, 0.1, 0.07]),
      );
    }
    return reedWave;
  }
  // A single squeezebox note: TWO reeds a musette 14 cents apart. That beating
  // between them is the entire sound of an accordion — one reed is an organ.
  function accord(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; const k = crewFor(dest); if (!c || !k || freq <= 0) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.018);
    g.gain.setValueAtTime(vol, t + dur * 0.6);          // bellows hold
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(k.acc);
    for (const d of [-14, 14]) {
      const o = c.createOscillator(); o.setPeriodicWave(reed(c));
      o.detune.value = d; o.frequency.setValueAtTime(freq, t);
      o.connect(g); o.start(t); o.stop(t + dur + 0.03);
    }
  }
  // the left hand: the "pah" of the oom-pah-pah. All three tones share one
  // short envelope, so it's a chop, not a pad.
  function accChord(dest: AudioNode, chord: number[], t: number, dur: number, vol: number) {
    const c = ctx; const k = crewFor(dest); if (!c || !k) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(k.acc);
    for (const f of chord) {
      const o = c.createOscillator(); o.setPeriodicWave(reed(c));
      o.detune.value = Math.random() * 10 - 5;
      o.frequency.setValueAtTime(f, t);
      o.connect(g); o.start(t); o.stop(t + dur + 0.03);
    }
  }
  function fiddle(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; const k = crewFor(dest); if (!c || !k || freq <= 0) return;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    k.vib.connect(o.detune);   // shared LFO — no node cost
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);      // bowed, not plucked
    g.gain.setValueAtTime(vol, t + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(k.fid);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function whistle(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; const k = crewFor(dest); if (!c || !k || freq <= 0) return;
    const o = c.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.025);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(k.wh);
    o.start(t); o.stop(t + dur + 0.03);
  }
  // STOMP — a boot on a wooden deck: a fast pitch-dropping sine for the thud
  // you feel, and a lowpassed noise slap for the wood you hear.
  function stomp(dest: AudioNode, t: number, vol: number, wood = true) {
    dTone(dest, t, 0.15, 'sine', vol, 108, 42, 0, 0.004);
    if (wood) nEnv(fxFor(dest, 'stomp'), t, 0.085, vol * 0.6, 0.002);
  }
  // CLAP — baked once into a tiny buffer, because a clap is not one noise
  // burst: it's three hands not quite together plus the room. Doing that with
  // live nodes costs six per clap; as a buffer it costs two, and it sounds
  // better because the 11ms spacing is sample-accurate.
  let clapBuf: AudioBuffer | null = null;
  function clapBuffer(c: AudioContext): AudioBuffer {
    if (!clapBuf || clapBuf.sampleRate !== c.sampleRate) {
      const len = Math.floor(c.sampleRate * 0.17);
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const tt = i / c.sampleRate;
        let a = 0;
        for (const tp of [0, 0.011, 0.023]) if (tt >= tp && tt < tp + 0.013) a += Math.exp(-(tt - tp) * 420);
        a += 0.5 * Math.exp(-Math.max(0, tt - 0.023) * 33);   // the room
        d[i] = (Math.random() * 2 - 1) * a * 0.6;
      }
      clapBuf = b;
    }
    return clapBuf;
  }
  function clap(dest: AudioNode, t: number, vol: number) {
    const c = ctx; if (!c || vol <= 0) return;
    const f = fxFor(dest, 'clap'); if (!f) return;
    const src = c.createBufferSource(); src.buffer = clapBuffer(c);
    src.playbackRate.value = 0.92 + Math.random() * 0.17;   // never twice the same
    const g = c.createGain(); g.gain.setValueAtTime(vol, t);
    src.connect(g); g.connect(f);
    src.start(t); src.stop(t + 0.22);
  }
  // "HEY!" — a saw at chest pitch pushed through two sweeping bandpass
  // FORMANTS. F1 falling 720->400 and F2 rising 1900->2350 is the /eɪ/
  // diphthong, and that glide is the whole reason it reads as a word and not
  // as a buzz. Voices are pitched apart and nudged off the beat by a few
  // milliseconds each, because a crowd is never together.
  const HEY_PITCH = [147.0, 185.0, 110.0, 220.0, 165.0, 131.0];
  function hey(dest: AudioNode, t: number, vol: number, voices: number) {
    const c = ctx; if (!c) return;
    const v0 = vol / Math.sqrt(Math.max(1, voices));
    for (let v = 0; v < voices; v++) {
      const f0 = HEY_PITCH[v % HEY_PITCH.length] * (1 + (Math.random() * 0.04 - 0.02));
      const tt = t + (v === 0 ? 0 : Math.random() * 0.04);
      const dur = 0.28 + Math.random() * 0.07;
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 1.08, tt);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, tt + dur);
      for (const [fc0, fc1, q, lvl] of [[720, 400, 5, 1], [1900, 2350, 9, 0.5]] as number[][]) {
        const b = c.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = q;
        b.frequency.setValueAtTime(fc0, tt);
        b.frequency.exponentialRampToValueAtTime(fc1, tt + dur * 0.8);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(v0 * lvl, tt + 0.022);
        g.gain.setValueAtTime(v0 * lvl, tt + dur * 0.5);
        g.gain.exponentialRampToValueAtTime(0.0006, tt + dur);
        o.connect(b); b.connect(g); g.connect(dest);
      }
      o.start(tt); o.stop(tt + dur + 0.05);
    }
    nEnv(fxFor(dest, 'hat'), t, 0.1, v0 * 0.22, 0.012);   // the breath in front of it
  }
  // the club lead — a fat detuned saw pair, used only to quote the shanty hook
  function leadSyn(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; if (!c || freq <= 0) return;
    const f = fxFor(dest, 'lead'); if (!f) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(f);
    for (const d of [-11, 11]) {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.detune.value = d; o.frequency.setValueAtTime(freq, t);
      o.connect(g); o.start(t); o.stop(t + dur + 0.03);
    }
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

  // ── the band's bus ────────────────────────────────────────────────────────
  // A tavern, not a lagoon: less delay than a tropical mix wants (a wash would
  // smear the oom-pah and kill the stomp) but enough to put the band in a room.
  //
  // The bus level is LOWER than the first draft's, and on purpose. A shanty
  // stacks far more sustained content than a lounge loop did — bass, four
  // chord chops a bar and a melody all sounding at once where the tropical bed
  // had a bass and a pad — so the same bus gain came out roughly twice as loud
  // as MAPLE ISLE's. Switching worlds should not be a jump scare. This lands
  // the band a few dB above Maple, which is the right relationship for the
  // rowdier of the two, and leaves plenty of headroom for the one-shots.
  const PIR_VOL = 0.42;   // was 0.19 — see the headroom note on MASTER_VOL
  let pirBus: GainNode | null = null;
  let ambGain: GainNode | null = null;
  let pirTimer: ReturnType<typeof setInterval> | null = null;
  let pirRunning = false;
  let pirStep = 0, pirNextT = 0, ambNextT = 0;
  let pirDelay: DelayNode | null = null, pirDelayStage = -1;
  function buildBandBus(c: AudioContext): GainNode {
    const bus = c.createGain(); bus.gain.value = 0.0001;
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 4800; warm.Q.value = 0.4;
    const dry = c.createGain(); dry.gain.value = 0.92;
    const delay = c.createDelay(1.0); delay.delayTime.value = 0.37;   // two eighths at 108
    pirDelay = delay;
    const fb = c.createGain(); fb.gain.value = 0.2;
    const wet = c.createGain(); wet.gain.value = 0.15;
    const wetTone = c.createBiquadFilter(); wetTone.type = 'lowpass'; wetTone.frequency.value = 2400;
    bus.connect(warm);
    warm.connect(dry); dry.connect(master!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(master!);
    delay.connect(fb); fb.connect(delay);
    return bus;
  }

  // ══ THE SHANTY ════════════════════════════════════════════════════════════
  // 6/8 — twelve steps a bar, two dotted-quarter pulses, which is the lilt that
  // makes a shanty walk instead of march. D minor resolving through a big
  // bright F major on bar three: i - VII - III - VII. Minor bones, major grin,
  // and it turns around forever. Deliberately the SAME seven notes the steel
  // pans were already using (D minor and F major are the same scale), so the
  // resort band's tropical topping sits on the crew's shanty without a single
  // wrong note. That's the joke of the level made literal.
  // The LEFT HAND, and it lives low on purpose. First pass had the chord chops
  // voiced C4-A4, which is exactly where the hook lives — the tune came out
  // buried inside its own accompaniment, every melody note doubled by a chord
  // tone at the same pitch. Down an octave the chops top out at A3, a clean
  // fourth below the melody's lowest note, and the tune sits on top where a
  // kid can actually follow it. It shares a register with the bass, which is
  // fine and is literally how an accordion is laid out: they never sound at
  // the same instant (bass on the pulses, chops on the eighths between) and a
  // triangle bass against reedy saws separates by timbre anyway.
  const S_CHORD = [
    [146.83, 174.61, 220.00],   // Dm  (D3 F3 A3)
    [130.81, 164.81, 196.00],   // C   (C3 E3 G3)
    [130.81, 174.61, 220.00],   // F   (C3 F3 A3)  ← the bright one
    [130.81, 164.81, 196.00],   // C
  ];
  const S_BASS = [146.83, 130.81, 174.61, 130.81];   // D3 C3 F3 C3 — the "oom"
  const S_FIFTH = [220.00, 196.00, 261.63, 196.00];  // A3 G3 C4 G3
  // THE HOOK. Four bars, six eighths each, call / answer / call / BIGGER
  // answer. Bars 0 and 2 are IDENTICAL and that is the entire point: a shanty
  // is a thing a crowd can join in with on the second pass. Being tasteful and
  // varied here would be the mistake. 0 = rest — the rests are where a kid
  // breathes in before shouting the next bit.
  const S_HOOK = [
    [293.66, 293.66, 293.66, 349.23, 440.00, 440.00],   // D D D  F A A   call
    [523.25, 523.25, 440.00, 392.00, 0, 0],             // C C A  G . .   answer
    [293.66, 293.66, 293.66, 349.23, 440.00, 440.00],   // D D D  F A A   call again
    [523.25, 587.33, 659.25, 783.99, 659.25, 0],        // C D E  G E .   the big one
  ];

  // ── place layers ──────────────────────────────────────────────────────────
  type ZoneId = 'party' | 'port' | 'jungle' | 'beach';
  interface ZoneLayer { g: GainNode; vol: number; on: boolean; until: number }
  // Levels are set RELATIVE TO THE BED (PIR_VOL) — that is the whole mix
  // decision, and they were rescaled with it. The dance floor is allowed to be
  // roughly twice the band's bass, because you're standing in front of the
  // speaker wall; every other district is a fifth of it, i.e. something you'd
  // only notice if you stopped and listened. Phone speakers are small and the
  // tune is the star.
  const ZONE_VOL: Record<ZoneId, number> = { party: 0.26, port: 0.12, jungle: 0.12, beach: 0.12 };
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
  function applyZones(fade = ZONE_FADE) {
    const c = ctx; if (!c || !master) return;
    const now = c.currentTime;
    for (const k of Object.keys(zones) as ZoneId[]) {
      const z = zones[k]!;
      if (k !== curZone && z.on) { z.on = false; z.until = now + fade; ramp(z.g.gain, 0, now, fade); }
    }
    if (curZone && pirRunning) {
      const z = zoneLayer(c, curZone);
      if (!z.on) { z.on = true; z.until = 0; ramp(z.g.gain, z.vol, now, fade); }
    }
    // was PIR_VOL * 0.5 on the floor — a further 6 dB off a band that had
    // already lost most of its voices, which is what turned "quieter" into
    // "gone". The club is additive now, so a gentle 0.82 is enough to make room.
    if (pirBus) ramp(pirBus.gain, pirRunning ? (curZone === 'party' ? PIR_VOL * 0.82 : PIR_VOL) : 0, now, fade);
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
    nHit(ambGain, t, 2.6, 0.05, 'lowpass', 900, 0.5, 240, 0.7);
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
      ambNextT = t + (curZone === 'party' ? 9 : 6) + Math.random() * 9;
    }
  }

  // ── the scheduler ─────────────────────────────────────────────────────────
  // Same idiom as Maple: the setInterval is only a LOOKAHEAD PUMP, it never
  // decides when a note happens. Every note is stamped onto the AudioContext
  // clock a third of a second ahead, so timing survives a dropped frame.
  function pirSchedule() {
    const c = ensure(); if (!c || !pirBus) return;
    const st = Math.max(0, Math.min(3, musStage));
    const spd = 60 / (108 + st * 6);   // seconds per dotted-quarter PULSE (two a bar)
    const e8 = spd / 3;                // one eighth
    const s12 = spd / 6;               // one step: twelve to the bar
    const now = c.currentTime;
    // keep the echo two eighths as the tempo climbs — glided, not jumped, so it
    // slurs like tape instead of clicking. Four times a match, no allocation.
    if (pirDelay && st !== pirDelayStage) {
      pirDelayStage = st;
      pirDelay.delayTime.setTargetAtTime(e8 * 2, now, 0.35);
    }
    if (pirNextT < now) pirNextT = now + 0.05;
    while (pirNextT < now + 0.35) {
      const t = pirNextT;
      const barN = Math.floor(pirStep / 12);
      const bar = barN & 3;          // where we are in the 4-bar tune
      const ph = barN & 7;           // where we are in the 8-bar phrase
      const s = pirStep % 12;
      const e = s >> 1, onE = (s & 1) === 0;   // eighth index 0..5
      const ch = S_CHORD[bar];
      const note = S_HOOK[bar][e];
      // ── WHY THE BAY SOUNDED LIKE IT HAD NO MUSIC ────────────────────────
      // This flag used to DROP the band's percussion and melody outright on
      // the dance floor. That is a fine idea for a district you visit and a
      // fatal one for the district the game SPAWNS you in: an instrumented
      // voice census over the first 40 seconds of a bay match counted 883
      // sound starts and, among them, 0 stomps, 0 claps, 0 shakers, 0
      // accordion, 0 fiddle, 0 whistle, 0 steel pan, 0 marimba and 0 crew
      // shouts. Every note of the level's identity, gone, for the whole
      // opening. Walk 25 units north and the accordion jumped from 0 to 9.44
      // notes a second.
      //
      // The club is now ADDITIVE, the way Maple's districts are — it lays its
      // kit ON TOP of the band instead of replacing it. `duck` thins the
      // shanty's percussion so the two do not fight, but the hook, the fiddle
      // and the HEYs always play. The bay always has its tune.
      const duck = zoneLive('party', t);
      // …and the tune gets a grace period regardless: for the first eight bars
      // of a match the band plays in full even on the floor, so the very first
      // thing a child hears on PIRATE BAY is the shanty.
      const floor = duck && pirStep > 96;

      // ── THE ENGINE: oom-pah-pah, oom-pah-pah ───────────────────────────────
      // Bass on the two pulses, squeezebox chops on the four eighths between.
      // This one pattern is what makes it a shanty and not a chord bed.
      if (e === 0 && onE) pBass(pirBus, t, S_BASS[bar], e8 * 1.7, 0.17);
      if (e === 3 && onE) pBass(pirBus, t, S_FIFTH[bar], e8 * 1.4, 0.12);
      if (!floor && st >= 2 && e === 5 && onE) pBass(pirBus, t, S_BASS[bar], e8 * 0.7, 0.08);
      // through the club door you get the band's bass and half its chops — the
      // bass lands on the house kick (both sit on the pulse) and the remaining
      // chops read as a three-against-two shimmer instead of mud
      if (onE && (floor ? (e === 2 || e === 5) : (e === 1 || e === 2 || e === 4 || e === 5))) {
        accChord(pirBus, ch, t, e8 * 0.85, 0.05);
      }

      // ── STOMP AND CLAP: the rowdy floor ───────────────────────────────────
      if (!floor && onE) {
        if (e === 0) stomp(pirBus, t, 0.24);
        if (e === 3) stomp(pirBus, t, 0.2);
        if (st >= 3 && (e === 2 || e === 5)) stomp(pirBus, t, 0.09, false);   // ghost boots
        if (e === 3) clap(pirBus, t, 0.15);
        if (st >= 1 && e === 5) clap(pirBus, t, 0.11);
        if (st >= 2 && e === 1) clap(pirBus, t, 0.09);
      }
      // stage 3 claps land BETWEEN the eighths too — the room speeding up
      if (!floor && st >= 3 && !onE && (s === 7 || s === 11)) clap(pirBus, t, 0.055);
      if (!floor && st >= 3 && (s === 3 || s === 7 || s === 11)) shaker(pirBus, t, 0.014);

      // ── THE HOOK ──────────────────────────────────────────────────────────
      // THE HOOK ALWAYS PLAYS. On the floor it sits under the club kit at
      // 55% rather than disappearing.
      if (onE && note > 0) {
        const hookV = floor ? 0.55 : 1;
        accord(pirBus, note, t, e8 * 0.92, 0.1 * hookV);   // squeezebox has the tune from bar one
        // The fiddle joins on the ANSWER bars first (1 and 3), so the arrival
        // of stage 1 sounds like a second player picking the tune up mid-verse
        // — call on the box alone, answer in octaves. From stage 2 it's on the
        // whole thing, and stage 3 puts a whistle on the strong beats.
        // and it doubles IN OCTAVES on the low call bars, in UNISON on the high
        // answer bars — an octave up from bar 3's G5 puts a fiddle at 1.5kHz,
        // which is a squeak, not a lift. A real fiddler picks the octave that
        // keeps the line in one register; so does this one.
        if (st >= 2 || (st >= 1 && (bar & 1) === 1)) {
          fiddle(pirBus, note * ((bar & 1) === 0 ? 2 : 1), t, e8 * 0.95, 0.04 * hookV);
        }
        if (st >= 3 && (e === 0 || e === 3)) whistle(pirBus, note * 2, t, e8 * 1.5, 0.026 * hookV);
      }

      // ── THE RESORT BAND'S TOPPING ─────────────────────────────────────────
      // Steel pan and marimba are demoted to colour: they answer the hook on
      // the off-beats instead of being the tune. Pirate-themed LUXURY resort —
      // shanty bones, tropical garnish.
      if (st >= 2 && onE) {
        const panV = floor ? 0.5 : 1;
        if (e === 2) pan(pirBus, ch[2] * 4, t, e8 * 1.8, 0.04 * panV);
        if (e === 5) pan(pirBus, ch[1] * 4, t, e8 * 1.4, 0.033 * panV, 0.4);   // ghost ping
      }
      if (!floor && st >= 3 && s === 11) marimba(pirBus, ch[0] * 4, t, e8 * 0.9, 0.028);

      // ── "HEY!" ────────────────────────────────────────────────────────────
      // On the downbeat of the 8-bar phrase. One voice at stage 0, a whole
      // crew by stage 3, and from stage 2 they shout twice as often. This is
      // the cheapest thing in the file and the thing that makes it FUN.
      if (s === 0) {
        const heyV = floor ? 0.6 : 1;
        if (ph === 0) hey(pirBus, t, 0.22 * heyV, 1 + st);
        else if (st >= 2 && ph === 4) hey(pirBus, t, 0.18 * heyV, 1 + st);
      }
      if (!floor && st >= 3 && ph === 7 && s === 10) hey(pirBus, t, 0.13, 2);   // pickup shout

      // ── DANCE COVE: straight electronic 4/4, scheduled a bar at a time ────
      // A shanty does not belong in a nightclub. The club's beat is laid out
      // in real seconds off the bar downbeat, so it stays a straight four
      // while the band around it is in six — and the two lock because the
      // house kick sits exactly on the shanty's dotted-quarter pulse.
      if (floor) {
        const pg = zones.party!.g;
        if (s === 0) {
          for (let k = 0; k < 2; k++) {
            const b0 = t + k * spd;
            pKick(pg, b0, 0.3); nEnv(fxFor(pg, 'click'), b0, 0.014, 0.09);
            skank(pg, b0 + spd * 0.5, [ch[0] * 2, ch[1] * 2, ch[2] * 2], 0.055, spd * 0.34);
            nEnv(fxFor(pg, 'hat'), b0 + spd * 0.5, 0.06, 0.05);
            nEnv(fxFor(pg, 'hat'), b0 + spd * 0.25, 0.03, 0.02);
            nEnv(fxFor(pg, 'hat'), b0 + spd * 0.75, 0.03, 0.02);
            pBass(pg, b0 + spd * 0.5, S_BASS[bar], spd * 0.4, 0.1);
          }
        }
        // DJ Coconut quotes the shanty once per 8-bar loop, so the island has
        // exactly one tune however you're hearing it
        if (onE && ph >= 6 && note > 0) leadSyn(pg, note * 2, t, e8 * 0.9, 0.05);
        if (ph === 5 && s === 10) nHit(pg, t, 1.1, 0.09, 'bandpass', 1100, 0.5, 1800, 0.25);   // crowd woo
      }

      pirNextT += s12; pirStep++;
    }
    ambience(c);
  }
  function startTropical() {
    const c = ensure(); if (!c || !master) return;
    if (!pirBus) pirBus = buildBandBus(c);
    if (!ambGain) { ambGain = c.createGain(); ambGain.gain.value = 0.0001; ambGain.connect(master); }
    pirRunning = true;
    ramp(ambGain.gain, 0.34, c.currentTime, 1.6);
    pirStep = 0; pirNextT = c.currentTime + 0.12; ambNextT = 0;
    // the match opens on a 1.5s swell, not a switch flick; after this every
    // zone change rides the shorter 0.6s crossfade
    applyZones(1.5);
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
  // a stomp-and-clap hit — the band landing on a beat together
  function bandHit(t: number, vol: number) {
    if (!master) return;
    stomp(master, t, vol * 1.1);
    clap(master, t, vol * 0.8);
  }
  function pirateEvolve() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime;
    // the crew shouts, the band stomps, and the resort's pans sparkle on top —
    // the whole level's identity in six tenths of a second
    hey(master, t, 0.2, 2);
    bandHit(t, 0.22);
    accord(master, 587.33, t + 0.02, 0.3, 0.11); accord(master, 698.46, t + 0.16, 0.42, 0.11);
    panRun(t + 0.14, [523.25, 698.46, 880.00], 0.085, 0.15, 0.5);
    if (curZone === 'party') cheer(t + 0.1, 0.55);
  }
  // ── THE TREASURE FEAST FANFARE ────────────────────────────────────────────
  // The biggest moment in the match, so it gets a real cadence rather than a
  // flourish: the crew shouts, the band climbs the hook's own opening figure,
  // and it lands on a proper V-i — A major into D minor, the strongest turn in
  // the key — with the pans and the fiddle both on the last chord.
  function treasureFanfare(t: number) {
    if (!master) return;
    hey(master, t, 0.26, 4);
    bandHit(t, 0.26);
    const climb = [293.66, 349.23, 440.00, 523.25, 587.33];   // D F A C D
    climb.forEach((f, i) => {
      const tt = t + 0.1 + i * 0.1;
      accord(master!, f, tt, 0.16, 0.1);
      fiddle(master!, f * 2, tt, 0.16, 0.05);
      if (i % 2 === 0) bandHit(tt, 0.13);
    });
    // V: A major (A C# E) — the one accidental in the whole score, and it's
    // there because a raised third is what makes a cadence feel like ARRIVING
    const land = t + 0.62;
    accChord(master, [440.00, 554.37, 659.25], land, 0.3, 0.09);
    bandHit(land, 0.24);
    // i: D minor, everybody in
    const home = t + 0.92;
    accChord(master, [293.66, 349.23, 440.00], home, 0.9, 0.11);
    pBass(master, home, 146.83, 0.9, 0.18);
    fiddle(master, 587.33, home, 0.85, 0.06);
    whistle(master, 1174.66, home + 0.04, 0.8, 0.035);
    panRun(home, [587.33, 880.00, 1174.66], 0.1, 0.14, 0.8);
    bandHit(home, 0.3);
    hey(master, home + 0.06, 0.24, 4);
    cheer(home + 0.1, 0.8);
  }
  // a rare accordion WHEEZE — one squeezed chord and a breath, for when
  // something enormous goes down. Rate-limited hard: this is a garnish, and a
  // garnish you hear every time is a smell.
  let bigEatCount = 0;
  function yoHo(t: number) {
    if (!master) return;
    accChord(master, [293.66, 349.23, 440.00], t, 0.42, 0.075);
    accord(master, 220.00, t + 0.02, 0.5, 0.07);
    nEnv(fxFor(master, 'shaker'), t, 0.3, 0.02, 0.1);   // bellows air
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAPLE FALLS
  // ──────────────────────────────────────────────────────────────────────────
  // A SMALL-TOWN BAND, and the joke is that there are two of them.
  //
  // Stages 0-1 are the front porch: an upright bass walking quarter notes, a
  // banjo rolling eighths, brushes on the backbeat and — from stage 1 — a
  // fiddle and a pair of hands clapping along. Stage 2 is the moment the
  // MARCHING BAND turns the corner: the sousaphone takes the bass line over
  // (oom on one and three, honks on the two and four the porch never asked
  // for), the brushes become a snare, and the horns pick up the tune. Stage 3
  // is the whole town: bell lyre on top, rudiments in the snare, a drum
  // major's whistle, a cymbal crash on the phrase and a crowd hollering.
  //
  // It is G major from end to end. No minor-key dread, no horror stings: this
  // is a town where four people have protested one parking meter since March,
  // and the score should sound like it takes that very seriously.
  //
  // The band is DELIBERATELY not quite together. Every marching voice —
  // sousaphone, brass, snare rudiments — is dragged a few milliseconds behind
  // the grid by `drag()`, and the bell lyre player rushes by eight. It is
  // never enough to break the groove, and it is the entire personality.
  //
  // THE JINGLE lives in M_HOOK. Four bars, and bars 0 and 2 are byte-
  // identical: "it's MA-PLE FALLS / everybody smile / it's MA-PLE FALLS /
  // ...MAPLE FAAALLS!" It is written to be sung by someone who is not
  // listening carefully, which is the only test that matters here. jingle()
  // quotes it on demand so the town can hum its own theme at itself.
  // ══════════════════════════════════════════════════════════════════════════
  const MAP_VOL = 0.40;   // was 0.17 — see the headroom note on MASTER_VOL
  // the "pah" of the oompah, voiced LOW (top note E4) so the hook — which
  // never goes below G4 — sits clean on top of it instead of inside it
  const M_CHOP = [
    [196.00, 246.94, 293.66],   // G   (G3 B3 D4)
    [196.00, 261.63, 329.63],   // C   (G3 C4 E4)
    [196.00, 246.94, 293.66],   // G
    [185.00, 220.00, 261.63],   // D7  (F#3 A3 C4) — the turnaround
  ];
  // the "oom": root on beat one, fifth on beat three. All of it lands between
  // 92 and 147 Hz, which is the one octave a phone speaker actually moves air in
  const M_OOM = [
    [98.00, 146.83],    // G2 D3
    [130.81, 98.00],    // C3 G2
    [98.00, 146.83],    // G2 D3
    [146.83, 110.00],   // D3 A2
  ];
  // the porch bass walks instead: four quarters a bar, bar 3 climbing F#2->G2
  const M_WALK = [
    [98.00, 123.47, 146.83, 164.81],    // G  B  D  E
    [130.81, 164.81, 196.00, 146.83],   // C  E  G  D
    [98.00, 123.47, 146.83, 164.81],    // G  B  D  E
    [146.83, 110.00, 130.81, 92.50],    // D  A  C  F# -> home
  ];
  // THE JINGLE. Eight eighths a bar, 0 = rest. Bars 0 and 2 are identical on
  // purpose; a municipal jingle that develops is a municipal jingle nobody can
  // sing back at the mayor.
  const M_HOOK = [
    [392.00, 0, 392.00, 493.88, 0, 587.33, 0, 0],           // G  G B . D      "it's MA-PLE FALLS"
    [659.25, 0, 587.33, 0, 493.88, 0, 392.00, 0],           // E  D  B  G      the answer, coming down
    [392.00, 0, 392.00, 493.88, 0, 587.33, 0, 0],           // same as bar 0
    [659.25, 0, 587.33, 0, 493.88, 587.33, 783.99, 0],      // E  D  B D  G5   the big one
  ];
  const M_ROLL = [0, 2, 1, 2, 0, 1, 2, 1];   // banjo forward roll, chord-tone index
  // the quotable phrase, as [freq, beat-offset] — bar 0 plus the top of bar 1
  const M_QUOTE: [number, number][] = [
    [392.00, 0], [392.00, 0.5], [493.88, 0.75], [587.33, 1.25],
    [659.25, 2], [587.33, 2.5], [493.88, 3], [392.00, 3.5],
  ];
  // the band is never quite together — a few ms behind the grid, every time
  const drag = (amt: number) => Math.random() * amt;

  // ── the town's instruments ────────────────────────────────────────────────
  // BANJO: a bright plucked wire. One PeriodicWave with a lot of upper
  // harmonic and a very fast decay does the whole job; the pick click on
  // accents is what stops it reading as a harpsichord.
  let banjoWave: PeriodicWave | null = null;
  function banjoW(c: AudioContext): PeriodicWave {
    if (!banjoWave) {
      banjoWave = c.createPeriodicWave(
        new Float32Array(10),
        new Float32Array([0, 1, 0.82, 0.61, 0.44, 0.31, 0.23, 0.16, 0.11, 0.07]),
      );
    }
    return banjoWave;
  }
  function banjo(dest: AudioNode, freq: number, t: number, dur: number, vol: number, pick = false) {
    const c = ctx; if (!c || freq <= 0 || vol <= 0) return;
    const o = c.createOscillator(); o.setPeriodicWave(banjoW(c));
    o.frequency.setValueAtTime(freq, t);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
    if (pick) nEnv(fxFor(dest, 'pick'), t, 0.014, vol * 0.35, 0.001);
  }
  // the banjo/guitar CHOP — three strings, one short envelope. A stab, not a pad.
  function chop(dest: AudioNode, chord: number[], t: number, dur: number, vol: number) {
    const c = ctx; if (!c || vol <= 0) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(dest);
    for (const f of chord) {
      const o = c.createOscillator(); o.setPeriodicWave(banjoW(c));
      o.detune.value = Math.random() * 9 - 4.5;      // nobody's guitar is in tune
      o.frequency.setValueAtTime(f, t);
      o.connect(g); o.start(t); o.stop(t + dur + 0.03);
    }
  }
  // SOUSAPHONE: a fat triangle with a soft octave on top and a slow lip-on
  // attack. Never below 92 Hz, because below that a phone plays nothing at all.
  function sousa(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    if (freq <= 0) return;
    dTone(dest, t, dur, 'triangle', vol, freq, 0, 0, 0.028);
    dTone(dest, t, dur * 0.7, 'sine', vol * 0.3, freq * 2, 0, 0, 0.03);
  }
  // BRASS: two saws a hair apart through a horn-shaped lowpass, with the pitch
  // SCOOPED up into the note. That scoop is the only reason it reads as a
  // cornet and not as a synth pad.
  function brass(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; if (!c || freq <= 0 || vol <= 0) return;
    const f = fxFor(dest, 'horn'); if (!f) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.035);
    g.gain.setValueAtTime(vol, t + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    g.connect(f);
    for (const d of [-9, 9]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.detune.value = d;
      o.frequency.setValueAtTime(freq * 0.945, t);
      o.frequency.exponentialRampToValueAtTime(freq, t + 0.045);
      o.connect(g); o.start(t); o.stop(t + dur + 0.03);
    }
  }
  // GLOCKENSPIEL / bell lyre — the thing on a pole at the front of the band
  function glock(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    dTone(dest, t, dur, 'sine', vol, freq, 0, 0, 0.002);
    dTone(dest, t, dur * 0.35, 'sine', vol * 0.32, freq * 2.76, 0, 0, 0.002);
  }
  function brush(dest: AudioNode, t: number, vol: number) {      // wire brush swish
    nEnv(fxFor(dest, 'brush'), t, 0.14, vol, 0.035);
  }
  function mSnare(dest: AudioNode, t: number, vol: number, body = true) {
    nEnv(fxFor(dest, 'snare'), t, 0.07, vol, 0.0015);
    if (body) dTone(dest, t, 0.05, 'triangle', vol * 0.3, 195, 160, 0, 0.002);
  }
  function bDrum(dest: AudioNode, t: number, vol: number) {
    dTone(dest, t, 0.22, 'sine', vol, 92, 48, 0, 0.005);
  }
  function crash(dest: AudioNode, t: number, vol: number) {
    nEnv(fxFor(dest, 'crash'), t, 1.3, vol, 0.004);
  }
  function refWhistle(dest: AudioNode, t: number, vol: number) {   // drum major / PA
    dTone(dest, t, 0.26, 'square', vol, 2320, 2560, 2380, 0.012);
    nEnv(fxFor(dest, 'hat'), t, 0.05, vol * 0.3, 0.006);
  }
  // "WHOO!" — the same formant trick the bay's crew shout uses, moved to an
  // /u/ vowel and a friendlier register. A crowd is never together, so the
  // voices are pitched apart and nudged off the beat.
  const WHOO_PITCH = [196.0, 233.08, 174.61, 261.63, 155.56, 220.0];
  function holler(dest: AudioNode, t: number, vol: number, voices: number) {
    const c = ctx; if (!c || vol <= 0) return;
    const v0 = vol / Math.sqrt(Math.max(1, voices));
    for (let v = 0; v < voices; v++) {
      const f0 = WHOO_PITCH[v % WHOO_PITCH.length] * (1 + (Math.random() * 0.04 - 0.02));
      const tt = t + (v === 0 ? 0 : Math.random() * 0.05);
      const dur = 0.3 + Math.random() * 0.09;
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0 * 0.94, tt);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.14, tt + dur * 0.7);   // it goes UP
      for (const [fc0, fc1, q, lvl] of [[640, 900, 5, 1], [1150, 1500, 8, 0.42]] as number[][]) {
        const b = c.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = q;
        b.frequency.setValueAtTime(fc0, tt);
        b.frequency.exponentialRampToValueAtTime(fc1, tt + dur * 0.8);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.linearRampToValueAtTime(v0 * lvl, tt + 0.03);
        g.gain.setValueAtTime(v0 * lvl, tt + dur * 0.55);
        g.gain.exponentialRampToValueAtTime(0.0006, tt + dur);
        o.connect(b); b.connect(g); g.connect(dest);
      }
      o.start(tt); o.stop(tt + dur + 0.05);
    }
  }
  function crowdSwell(dest: AudioNode, t: number, vol: number, dur = 1.4) {
    nHit(dest, t, dur, vol, 'bandpass', 1000, 0.5, 1700, dur * 0.28);
  }
  // FAIRGROUND ORGAN — a steam calliope is loud, square and permanently out of
  // tune with itself. Heard from the next field over it is mostly the wobble.
  function calliope(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; if (!c || freq <= 0) return;
    const f = fxFor(dest, 'calli'); if (!f) return;
    const o = c.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(freq * 1.006, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.994, t + dur * 0.5);
    o.frequency.exponentialRampToValueAtTime(freq * 1.004, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(f);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // ── THE CAMPAIGN PA ───────────────────────────────────────────────────────
  // The cheapest thing in this file and the one that makes the theme audible:
  // somebody two streets away is saying something about the parking meter
  // through a loudhailer. One saw, a stepped pitch contour, a syllabic
  // envelope and a single narrow bandpass — which is what a megaphone IS, a
  // band-limited horn — and the ear fills in words that were never there.
  // The last syllable always goes UP. It is always a name, or "VOTE".
  const PA_STEP = [1, 1.14, 0.93, 1.08, 0.97, 1.2, 0.9];
  function stump(dest: AudioNode, t: number, vol: number) {
    const c = ctx; if (!c || vol <= 0) return;
    const syl = 4 + Math.floor(Math.random() * 4);
    const base = 148 + Math.random() * 46;
    const o = c.createOscillator(); o.type = 'sawtooth';
    const b = c.createBiquadFilter(); b.type = 'bandpass';
    b.frequency.value = 1250 + Math.random() * 320; b.Q.value = 2.6;   // the horn
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    o.connect(b); b.connect(g); g.connect(dest);
    let tt = t;
    for (let i = 0; i < syl; i++) {
      const last = i === syl - 1;
      const dur = last ? 0.3 : 0.11 + Math.random() * 0.07;
      const f = base * (last ? 1.32 : PA_STEP[(i + syl) % PA_STEP.length]);
      o.frequency.setValueAtTime(f, tt);
      if (last) o.frequency.exponentialRampToValueAtTime(f * 1.18, tt + dur * 0.8);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(vol, tt + 0.025);
      g.gain.setValueAtTime(vol, tt + dur * 0.66);
      g.gain.exponentialRampToValueAtTime(0.0006, tt + dur);
      tt += dur + 0.035;
    }
    o.start(t); o.stop(tt + 0.05);
    // the loudhailer feeding back on itself, now and then
    if (Math.random() < 0.35) dTone(dest, tt + 0.02, 0.34, 'sine', vol * 0.3, 2100, 2420, 0, 0.06);
  }

  // ── the town's ambience one-shots ─────────────────────────────────────────
  function churchBell(dest: AudioNode, t: number, vol: number) {
    // a real bell is a stack of partials, and the 1.2x tierce is what makes it
    // a BELL. Two strikes, because a church clock never rings once.
    for (const off of [0, 2.1]) {
      for (const [m, v, d] of [[1, 1, 3.6], [1.2, 0.4, 2.4], [1.5, 0.3, 1.8], [2, 0.22, 1.2]] as number[][]) {
        dTone(dest, t + off, d, 'sine', vol * v, 196.0 * m, 0, 0, 0.004);
      }
    }
  }
  function cockerel(dest: AudioNode, t: number, vol: number) {
    const c = ctx; if (!c) return;
    const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 1150; b.Q.value = 2.2;
    const o = c.createOscillator(); o.type = 'sawtooth';
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    o.connect(b); b.connect(g); g.connect(dest);
    // cock-a-doodle-DOOOO
    const syl: [number, number][] = [[620, 0.12], [900, 0.1], [780, 0.12], [1180, 0.42]];
    let tt = t;
    for (const [f, d] of syl) {
      o.frequency.setValueAtTime(f, tt);
      if (d > 0.3) o.frequency.exponentialRampToValueAtTime(f * 0.78, tt + d);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.linearRampToValueAtTime(vol, tt + 0.02);
      g.gain.setValueAtTime(vol, tt + d * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0006, tt + d);
      tt += d + 0.03;
    }
    o.start(t); o.stop(tt + 0.05);
  }
  function tractor(dest: AudioNode, t: number, vol: number) {
    // a two-cylinder diesel three fields away: eight putts, not a drone
    for (let i = 0; i < 9; i++) {
      dTone(dest, t + i * (0.145 + Math.random() * 0.012), 0.11, 'triangle',
        vol * (0.7 + Math.random() * 0.4), 88, 60, 0, 0.008);
    }
  }
  function moo(dest: AudioNode, t: number, vol: number) {
    dTone(dest, t, 0.95, 'sawtooth', vol, 168, 132, 148, 0.12);
  }
  function dogBark(dest: AudioNode, t: number, vol: number) {
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const tt = t + i * (0.22 + Math.random() * 0.1);
      dTone(dest, tt, 0.11, 'sawtooth', vol, 232, 168, 0, 0.006);
      nEnv(fxFor(dest, 'click'), tt, 0.05, vol * 0.5, 0.002);
    }
  }
  function songbird(dest: AudioNode, t: number, vol: number) {
    const n = 3 + Math.floor(Math.random() * 3);
    const base = 2400 + Math.random() * 1100;
    for (let i = 0; i < n; i++) {
      dTone(dest, t + i * 0.085, 0.06, 'sine', vol, base, base * (1.2 + Math.random() * 0.3), 0, 0.005);
    }
  }
  function duck(dest: AudioNode, t: number, vol: number) {
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      dTone(dest, t + i * 0.19, 0.11, 'sawtooth', vol, 470, 320, 0, 0.008);
    }
  }
  function carPass(dest: AudioNode, t: number, vol: number) {
    nHit(dest, t, 1.7, vol, 'bandpass', 720, 0.9, 360, 0.8);   // swells in, dulls away
  }
  function sprinkler(dest: AudioNode, t: number, vol: number) {
    for (let i = 0; i < 7; i++) nEnv(fxFor(dest, 'shaker'), t + i * 0.115, 0.05, vol * (1 - i * 0.09), 0.002);
  }
  function windChime(dest: AudioNode, t: number, vol: number) {
    const notes = [1174.66, 1396.91, 1567.98, 880.0];
    for (let i = 0; i < 3; i++) {
      glock(dest, notes[Math.floor(Math.random() * notes.length)], t + i * (0.13 + Math.random() * 0.2), 0.9, vol);
    }
  }
  function golfTock(dest: AudioNode, t: number, vol: number) {
    nEnv(fxFor(dest, 'click'), t, 0.02, vol, 0.001);
    dTone(dest, t, 0.05, 'triangle', vol * 0.7, 940, 700, 0, 0.002);
  }
  function woodpecker(dest: AudioNode, t: number, vol: number) {
    for (let i = 0; i < 6; i++) nEnv(fxFor(dest, 'pick'), t + i * 0.055, 0.02, vol, 0.001);
  }
  function rideBell(dest: AudioNode, t: number, vol: number) {
    glock(dest, 1318.51, t, 0.6, vol);
    glock(dest, 1318.51, t + 0.16, 0.7, vol * 0.8);
  }

  // ── the bandstand bus ─────────────────────────────────────────────────────
  // Outdoors in a town square: brighter than the bay's tavern (the top end is
  // where a banjo lives) and a short slapback rather than a wash, locked to an
  // eighth so it thickens the oompah instead of smearing it.
  let mapBus: GainNode | null = null;
  let mapAmb: GainNode | null = null;
  let mapTimer: ReturnType<typeof setInterval> | null = null;
  let mapRunning = false;
  let mapStep = 0, mapNextT = 0, mAmbNextT = 0, mPaNextT = 0, mBellNextT = 0;
  let mapDelay: DelayNode | null = null, mapDelayStage = -1;
  function buildTownBus(c: AudioContext): GainNode {
    const bus = c.createGain(); bus.gain.value = 0.0001;
    const warm = c.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5600; warm.Q.value = 0.4;
    const dry = c.createGain(); dry.gain.value = 0.93;
    const delay = c.createDelay(1.0); delay.delayTime.value = 0.29;
    mapDelay = delay;
    const fb = c.createGain(); fb.gain.value = 0.16;
    const wet = c.createGain(); wet.gain.value = 0.12;
    const wetTone = c.createBiquadFilter(); wetTone.type = 'lowpass'; wetTone.frequency.value = 2100;
    bus.connect(warm);
    warm.connect(dry); dry.connect(master!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(master!);
    delay.connect(fb); fb.connect(delay);
    return bus;
  }

  // ── the place layer ───────────────────────────────────────────────────────
  // Ten districts, nine soundscapes, all of them SUBTLE. The rule is the same
  // as the bay's: you should notice a district only if you stop and listen,
  // because the tune is the star and a phone speaker is the size of a stamp.
  type MZoneId = 'town' | 'fair' | 'campus' | 'farm' | 'strip' | 'lake' | 'park' | 'woods' | 'suburb';
  const MZONE_VOL: Record<MZoneId, number> = {
    town: 0.11, fair: 0.16, campus: 0.13, farm: 0.12, strip: 0.12,
    lake: 0.13, park: 0.11, woods: 0.11, suburb: 0.10,
  };
  const mzones: Partial<Record<MZoneId, ZoneLayer>> = {};
  let mZone: MZoneId | null = null;
  // THE SQUARE and MAIN STREET share one bed — they are fifty yards apart and
  // it is the same murmur — which is also what lets the campaign PA and the
  // church bell treat them as one place.
  function mNormZone(z: string | null): MZoneId | null {
    switch (z) {
      case 'plaza': case 'downtown': return 'town';
      case 'fair': return 'fair';
      case 'campus': return 'campus';
      case 'farm': return 'farm';
      case 'strip': return 'strip';
      case 'beach': return 'lake';
      case 'park': return 'park';
      case 'forest': return 'woods';
      case 'cozy': return 'suburb';
      default: return null;
    }
  }
  // One looping noise source per district, built once on first visit and left
  // running for the match; only its gain ever moves. THE STRIP gets a second
  // permanent voice — a 120 Hz mains buzz — because a neon sign is not noise,
  // it is a tone, and that is exactly what makes the motel sign read as a
  // motel sign.
  function buildMBed(c: AudioContext, id: MZoneId, dest: AudioNode) {
    const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const lfo = c.createOscillator(); lfo.type = 'sine';
    const lfoG = c.createGain();
    if (id === 'town') {              // a low municipal murmur: traffic and talk
      f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.5;
      g.gain.value = 0.06; lfo.frequency.value = 0.11; lfoG.gain.value = 0.025;
    } else if (id === 'fair') {       // the midway: a crowd with its money out
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.6;
      g.gain.value = 0.07; lfo.frequency.value = 0.17; lfoG.gain.value = 0.03;
    } else if (id === 'campus') {     // bleachers, a long way off
      f.type = 'bandpass'; f.frequency.value = 760; f.Q.value = 0.5;
      g.gain.value = 0.05; lfo.frequency.value = 0.13; lfoG.gain.value = 0.025;
    } else if (id === 'farm') {       // crickets — a fast chirr, barely there
      f.type = 'bandpass'; f.frequency.value = 4600; f.Q.value = 7;
      g.gain.value = 0.022; lfo.frequency.value = 8.5; lfoG.gain.value = 0.017;
    } else if (id === 'strip') {      // tyre hum off the highway
      f.type = 'lowpass'; f.frequency.value = 330; f.Q.value = 0.7;
      g.gain.value = 0.065; lfo.frequency.value = 0.07; lfoG.gain.value = 0.03;
      const nz = c.createOscillator(); nz.type = 'sawtooth'; nz.frequency.value = 120;   // the neon
      const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1150; nf.Q.value = 4.5;
      const ng = c.createGain(); ng.gain.value = 0.012;
      nz.connect(nf); nf.connect(ng); ng.connect(dest); nz.start();
    } else if (id === 'lake') {       // water on a boat ramp
      f.type = 'lowpass'; f.frequency.value = 560; f.Q.value = 0.6;
      g.gain.value = 0.07; lfo.frequency.value = 0.09; lfoG.gain.value = 0.045;
    } else if (id === 'park') {       // the pond, and a lot of grass
      f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 0.5;
      g.gain.value = 0.04; lfo.frequency.value = 0.06; lfoG.gain.value = 0.022;
    } else if (id === 'woods') {      // wind in pine
      f.type = 'lowpass'; f.frequency.value = 430; f.Q.value = 0.5;
      g.gain.value = 0.05; lfo.frequency.value = 0.05; lfoG.gain.value = 0.03;
    } else {                          // MAPLE HEIGHTS: somebody's mower, two streets over
      f.type = 'bandpass'; f.frequency.value = 210; f.Q.value = 3;
      g.gain.value = 0.045; lfo.frequency.value = 0.12; lfoG.gain.value = 0.02;
    }
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(); lfo.start();
  }
  function mZoneLayer(c: AudioContext, id: MZoneId): ZoneLayer {
    let z = mzones[id];
    if (!z) {
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(master!);
      z = { g, vol: MZONE_VOL[id], on: false, until: 0 };
      mzones[id] = z;
      buildMBed(c, id, g);
    }
    return z;
  }
  const mZoneLive = (id: MZoneId, now: number) => {
    const z = mzones[id];
    return !!z && (z.on || now < z.until);
  };
  function mApplyZones(fade = ZONE_FADE) {
    const c = ctx; if (!c || !master) return;
    const now = c.currentTime;
    for (const k of Object.keys(mzones) as MZoneId[]) {
      const z = mzones[k]!;
      if (k !== mZone && z.on) { z.on = false; z.until = now + fade; ramp(z.g.gain, 0, now, fade); }
    }
    if (mZone && mapRunning) {
      const z = mZoneLayer(c, mZone);
      if (!z.on) { z.on = true; z.until = 0; ramp(z.g.gain, z.vol, now, fade); }
    }
    if (mapBus) ramp(mapBus.gain, mapRunning ? MAP_VOL : 0, now, fade);
  }

  // ── ambience ──────────────────────────────────────────────────────────────
  // Sparse, weighted by district. A wash reads as tape hiss on a phone; one
  // cockerel eight seconds after the last one reads as a farm. Three separate
  // accumulators, all on the audio clock: the general pool, the campaign PA
  // (15-25s, town only) and the church bell (a minute-ish, town only).
  function mapAmbience(c: AudioContext) {
    const dest = mapAmb; if (!dest) return;
    const now = c.currentTime;
    if (mAmbNextT === 0) mAmbNextT = now + 3 + Math.random() * 4;
    while (mAmbNextT < now + 0.4) {
      const t = Math.max(now + 0.05, mAmbNextT);
      const r = Math.random();
      let gap = 7 + Math.random() * 8;
      switch (mZone) {
        case 'farm':
          if (r < 0.3) cockerel(dest, t, 0.05); else if (r < 0.6) tractor(dest, t, 0.035);
          else if (r < 0.8) moo(dest, t, 0.04); else songbird(dest, t, 0.03);
          break;
        case 'fair':
          if (r < 0.4) rideBell(dest, t, 0.05); else if (r < 0.75) crowdSwell(dest, t, 0.05);
          else holler(dest, t, 0.06, 2);
          gap = 6 + Math.random() * 6;
          break;
        case 'campus':
          if (r < 0.35) refWhistle(dest, t, 0.05); else if (r < 0.7) crowdSwell(dest, t, 0.055);
          else bDrum(dest, t, 0.07);
          break;
        case 'strip':
          if (r < 0.6) carPass(dest, t, 0.05); else if (r < 0.85) dogBark(dest, t, 0.025);
          else golfTock(dest, t, 0.03);
          break;
        case 'lake':
          if (r < 0.45) duck(dest, t, 0.04); else if (r < 0.8) songbird(dest, t, 0.035);
          else crowdSwell(dest, t, 0.03, 2.2);
          break;
        case 'park':
          if (r < 0.5) songbird(dest, t, 0.04); else if (r < 0.75) duck(dest, t, 0.03);
          else golfTock(dest, t, 0.035);
          break;
        case 'woods':
          if (r < 0.55) songbird(dest, t, 0.04); else if (r < 0.85) woodpecker(dest, t, 0.03);
          else moo(dest, t, 0.022);
          break;
        case 'suburb':
          if (r < 0.35) dogBark(dest, t, 0.035); else if (r < 0.65) sprinkler(dest, t, 0.03);
          else windChime(dest, t, 0.03);
          break;
        default:   // THE SQUARE and MAIN STREET, or off the map entirely
          if (r < 0.35) carPass(dest, t, 0.035); else if (r < 0.6) dogBark(dest, t, 0.025);
          else if (r < 0.85) songbird(dest, t, 0.03); else crowdSwell(dest, t, 0.03);
          gap = 9 + Math.random() * 9;
      }
      mAmbNextT = t + gap;
    }
    // THE ELECTION, two streets away
    const inTown = mZone === 'town';
    if (mPaNextT === 0) mPaNextT = now + 8 + Math.random() * 8;
    while (mPaNextT < now + 0.4) {
      const t = Math.max(now + 0.05, mPaNextT);
      if (inTown) stump(dest, t, 0.055);
      mPaNextT = t + 15 + Math.random() * 10;
    }
    // the church clock, on a long timer, so it is an event and not a texture
    if (mBellNextT === 0) mBellNextT = now + 25 + Math.random() * 25;
    while (mBellNextT < now + 0.4) {
      const t = Math.max(now + 0.05, mBellNextT);
      if (inTown) churchBell(dest, t, 0.045);
      mBellNextT = t + 55 + Math.random() * 35;
    }
  }

  // ── the scheduler ─────────────────────────────────────────────────────────
  // Same idiom as the bay: the interval is a LOOKAHEAD PUMP and never decides
  // when a note happens. Cut time — sixteen steps to the bar, oom on one and
  // three, pah on two and four.
  function mapSchedule() {
    const c = ensure(); if (!c || !mapBus) return;
    const st = Math.max(0, Math.min(3, musStage));
    const spb = 60 / (104 + st * 7);   // seconds per beat
    const s16 = spb / 4;
    const now = c.currentTime;
    if (mapDelay && st !== mapDelayStage) {
      mapDelayStage = st;
      mapDelay.delayTime.setTargetAtTime(spb * 0.5, now, 0.35);   // glided, four times a match
    }
    if (mapNextT < now) mapNextT = now + 0.05;
    while (mapNextT < now + 0.35) {
      const t = mapNextT;
      const barN = Math.floor(mapStep / 16);
      const bar = barN & 3;          // where we are in the 4-bar tune
      const ph = barN & 7;           // where we are in the 8-bar phrase
      const s = mapStep % 16;
      const e = s >> 1, onE = (s & 1) === 0;   // eighth index 0..7
      const ch = M_CHOP[bar];
      const note = M_HOOK[bar][e];
      const march = st >= 2;

      // ── THE ENGINE: oom-pah ────────────────────────────────────────────────
      if (march) {
        // the marching band has arrived and the sousaphone has the bass
        if (s === 0) sousa(mapBus, M_OOM[bar][0], t + drag(0.012), spb * 0.8, 0.17);
        if (s === 8) sousa(mapBus, M_OOM[bar][1], t + drag(0.012), spb * 0.7, 0.14);
        // ...and by stage 3 he is honking the two and four as well, which
        // nobody asked him to do
        // an octave up from the root, so it lands in the chop's register as a
        // honk rather than doubling the oom into mud
        if (st >= 3 && (s === 4 || s === 12)) sousa(mapBus, M_OOM[bar][0] * 2, t + drag(0.016), spb * 0.3, 0.06);
      } else if (s % 4 === 0) {
        // the porch: an upright walking four to the bar
        pBass(mapBus, t, M_WALK[bar][s >> 2], spb * 0.92, 0.15);
      }
      // the upright never actually leaves — under the march it keeps the
      // fourth-beat approach note, which is the walk-up into the next bar and
      // the one thing that stops this being a straight military two-step
      if (march && s === 12) pBass(mapBus, t, M_WALK[bar][3], spb * 0.5, 0.085);
      // the "pah" — chopped chords on the backbeat, all match long
      if (s === 4 || s === 12) chop(mapBus, ch, t, spb * 0.34, 0.055);

      // ── THE BANJO ─────────────────────────────────────────────────────────
      // It has the tune from bar one and rolls chord tones through the rests,
      // which is what makes the gaps in a jingle feel like part of the jingle.
      if (onE) {
        if (note > 0) banjo(mapBus, note, t, spb * 0.55, 0.075, e === 0);
        else banjo(mapBus, ch[M_ROLL[e]] * 2, t, spb * 0.4, 0.032);
      }

      // ── THE TUNE ──────────────────────────────────────────────────────────
      if (onE && note > 0) {
        // the fiddle picks it up mid-verse on the ANSWER bars first, so stage 1
        // sounds like a second player leaning in off the porch rail
        if (st >= 2 || (st >= 1 && (bar & 1) === 1)) fiddle(mapBus, note, t, spb * 0.5, 0.04);
        // horns on the strong eighths only — a cornet section playing every
        // note of a jingle is a wall, not a band
        if (march && e % 2 === 0) brass(mapBus, note, t + drag(0.018), spb * 0.62, 0.05);
        // the bell lyre RUSHES, because the kid with the bell lyre always does
        if (st >= 3 && e === 0) glock(mapBus, note * 2, t - 0.008, spb * 0.9, 0.022);
      }

      // ── THE KIT ───────────────────────────────────────────────────────────
      if (s === 4 || s === 12) {
        if (march) mSnare(mapBus, t + drag(0.008), 0.085); else brush(mapBus, t, 0.055);
        if (st >= 1) clap(mapBus, t, 0.06);
      }
      if (st >= 1 && (s === 0 || s === 8)) bDrum(mapBus, t, 0.15);
      if (!march && s === 14) brush(mapBus, t, 0.03);                      // the swish back
      if (march && (s === 14 || s === 15)) mSnare(mapBus, t + drag(0.006), 0.03, false);   // pickup into the bar
      if (st >= 3 && (s === 2 || s === 6 || s === 10)) mSnare(mapBus, t + drag(0.01), 0.022, false);
      if (st >= 3 && ph === 7 && s === 15) mSnare(mapBus, t - 0.022, 0.035, false);        // the flam
      if (st >= 3 && ph === 0 && s === 0) crash(mapBus, t, 0.045);

      // ── THE TOWN ──────────────────────────────────────────────────────────
      if (s === 0 && ph === 0 && st >= 1) holler(mapBus, t, 0.14, 1 + st);
      if (s === 0 && ph === 4 && st >= 3) holler(mapBus, t, 0.11, 2);
      if (s === 0 && ph === 4 && st >= 3) refWhistle(mapBus, t - 0.03, 0.045);

      // ── THE FAIRGROUNDS, from the next field over ─────────────────────────
      // The calliope plays the jingle's own opening notes, in the score's own
      // key, once every two bars. One town, one tune, wherever you're standing.
      if (mZoneLive('fair', t) && s === 0 && (barN & 1) === 0) {
        const fg = mzones.fair!.g;
        const fig = [392.00, 587.33, 493.88];
        fig.forEach((f, i) => calliope(fg, f * 2, t + i * spb * 0.66, spb * 0.6, 0.045));
      }
      // ── THE GRIDIRON: a drumline warming up under the bleachers ───────────
      if (mZoneLive('campus', t) && s % 2 === 0) {
        const cg = mzones.campus!.g;
        const accent = s === 0 || s === 8;
        mSnare(cg, t + drag(0.01), accent ? 0.06 : 0.028, accent);
      }

      mapNextT += s16; mapStep++;
    }
    mapAmbience(c);
  }
  function startTown() {
    const c = ensure(); if (!c || !master) return;
    if (!mapBus) mapBus = buildTownBus(c);
    if (!mapAmb) { mapAmb = c.createGain(); mapAmb.gain.value = 0.0001; mapAmb.connect(master); }
    mapRunning = true;
    ramp(mapAmb.gain, 0.36, c.currentTime, 1.6);
    mapStep = 0; mapNextT = c.currentTime + 0.12;
    mAmbNextT = 0; mPaNextT = 0; mBellNextT = 0;
    mApplyZones(1.5);   // the match opens on a swell, not a switch flick
    if (mapTimer) clearInterval(mapTimer);
    mapTimer = setInterval(mapSchedule, 110);
  }
  function stopTown(fade: number) {
    mapRunning = false;
    if (mapTimer) { clearInterval(mapTimer); mapTimer = null; }
    const c = ctx; if (!c) return;
    const now = c.currentTime;
    if (mapBus) ramp(mapBus.gain, 0, now, fade);
    if (mapAmb) ramp(mapAmb.gain, 0, now, fade);
    for (const k of Object.keys(mzones) as MZoneId[]) {
      const z = mzones[k]!; z.on = false; z.until = 0; ramp(z.g.gain, 0, now, fade);
    }
    mZone = null;
  }

  // ── the town's one-shots ──────────────────────────────────────────────────
  // All of these play STRAIGHT TO MASTER, never through the band bus: win()
  // fires right after stopMusic(), and a fanfare on a bus that is fading out
  // would duck underneath itself.
  function bandLand(t: number, vol: number) {   // the whole band landing together
    if (!master) return;
    bDrum(master, t, vol);
    mSnare(master, t + drag(0.006), vol * 0.55);
    crash(master, t, vol * 0.3);
  }
  // the town jingle, quoted. Banjo, and from the second half a cornet on top.
  function jingleQuote(t: number, vol: number, beat = 0.26) {
    if (!master) return;
    M_QUOTE.forEach(([f, b], i) => {
      const tt = t + b * beat;
      banjo(master!, f, tt, beat * 1.4, vol, i === 0);
      if (i >= 4) brass(master!, f, tt + drag(0.012), beat * 1.3, vol * 0.55);
    });
  }
  // BAKE SALE RUSH — a counter bell and the band falling over itself. Fast,
  // bright, over in under a second: this beat is a starting pistol.
  function bakeSting(t: number) {
    if (!master) return;
    glock(master, 1567.98, t, 0.5, 0.12);
    glock(master, 1567.98, t + 0.11, 0.6, 0.1);
    const run = [392.00, 493.88, 587.33, 659.25, 783.99];   // G B D E G, straight up
    run.forEach((f, i) => banjo(master!, f, t + 0.2 + i * 0.062, 0.3, 0.09, i === 0));
    brass(master, 783.99, t + 0.52, 0.42, 0.07);
    bandLand(t + 0.52, 0.16);
    holler(master, t + 0.56, 0.12, 2);
  }
  // RECALL VOTE — a town siren, and the single most important note in this
  // file is that it is NOT a wail. Two tones a MAJOR THIRD apart, alternating
  // and rising, on warm triangles: a fire truck in a cartoon, not an air raid.
  // Six-year-olds are playing this.
  function recallSting(t: number) {
    if (!master) return;
    const pair = [523.25, 659.25];   // C5 E5
    for (let i = 0; i < 5; i++) {
      const f = pair[i & 1] * (1 + i * 0.012);
      dTone(master!, t + i * 0.17, 0.2, 'triangle', 0.1, f, f * 1.04, 0, 0.02);
      dTone(master!, t + i * 0.17, 0.18, 'sine', 0.05, f * 2, 0, 0, 0.02);
    }
    // the whole town heading for the church hall
    for (let i = 0; i < 7; i++) mSnare(master, t + 0.15 + i * 0.09, 0.03 + i * 0.008, false);
    bandLand(t + 0.86, 0.2);
    chop(master, [392.00, 493.88, 587.33], t + 0.86, 0.5, 0.08);
    holler(master, t + 0.9, 0.16, 3);
  }
  // THE LANDSLIDE — the biggest moment in the match, and it gets a real
  // cadence instead of a flourish: a snare roll that accelerates into the
  // band's own big bar, then D7 -> G, the strongest turn in the key, with
  // sousaphone, horns, bell lyre and the entire square shouting over it.
  function landslideFanfare(t: number) {
    if (!master) return;
    // the roll: sixteen taps getting faster and louder — pure anticipation
    let rt = t, gapR = 0.085;
    for (let i = 0; i < 16; i++) {
      mSnare(master, rt, 0.02 + i * 0.004, false);
      rt += gapR; gapR *= 0.93;
    }
    const hit = t + 0.86;
    bandLand(hit, 0.3);
    holler(master, hit, 0.22, 4);
    // the jingle's big bar, everybody in unison
    const big = [659.25, 587.33, 493.88, 587.33, 783.99];   // E D B D G
    big.forEach((f, i) => {
      const tt = hit + 0.08 + i * 0.15;
      banjo(master!, f, tt, 0.34, 0.085, i === 0);
      fiddle(master!, f, tt, 0.3, 0.045);
      brass(master!, f, tt + drag(0.014), 0.32, 0.07);
      if (i % 2 === 0) mSnare(master!, tt + drag(0.006), 0.05);
    });
    // V: D7, leaning
    const lean = hit + 0.86;
    chop(master, [185.00, 220.00, 261.63], lean, 0.34, 0.08);
    sousa(master, 146.83, lean, 0.34, 0.16);
    bandLand(lean, 0.18);
    // I: G major, the whole town, held
    const home = hit + 1.2;
    chop(master, [196.00, 246.94, 293.66], home, 1.0, 0.09);
    sousa(master, 98.00, home + drag(0.014), 1.0, 0.2);
    brass(master, 783.99, home + drag(0.014), 0.95, 0.075);
    brass(master, 587.33, home + drag(0.014), 0.9, 0.05);
    fiddle(master, 783.99, home, 0.9, 0.05);
    glock(master, 1567.98, home - 0.008, 1.1, 0.035);
    bandLand(home, 0.34);
    holler(master, home + 0.05, 0.26, 4);
    crowdSwell(master, home + 0.1, 0.12, 2.4);
  }
  // the fall-through: a bandstand flourish that quotes the jingle's first
  // three notes, so an unplanned beat still sounds like it happened HERE
  function townFanfare(t: number) {
    if (!master) return;
    bandLand(t, 0.2);
    const up = [392.00, 493.88, 587.33];
    up.forEach((f, i) => {
      const tt = t + i * 0.1;
      banjo(master!, f, tt, 0.3, 0.09, i === 0);
      brass(master!, f, tt + drag(0.012), 0.34, 0.06);
    });
    glock(master, 1174.66, t + 0.3, 0.7, 0.03);
    holler(master, t + 0.32, 0.14, 2);
  }

  return {
    startMusic() {
      // PIRATE BAY RESORT has its own score — and deliberately does NOT pick up
      // /assets/music/theme.mp3, which is Maple's track. Its bed is synthesised
      // end to end so the resort always sounds like the resort.
      if (isPirate()) { startTropical(); return; }
      // prefetch the recorded kit so the very first gulp is the real sample
      for (const n of ['eaten_deep.wav', 'evolve_epic.wav', 'win_warm.wav']) sample(n, 0);
      // MAPLE FALLS plays its own band, for the same reason the bay plays its
      // own: a stock loop is a stock loop, and this town has an election on.
      // The licensed-track drop-in (/assets/music/theme.mp3, and behind it the
      // old generic synth bed) is still here and still works — it is opt-in
      // now rather than default, so a shipped track can be A/B'd against the
      // band without a code change.
      if (!LICENSED_THEME) { startTown(); return; }
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
    // The town's own eight notes, on demand — for a menu, a results screen, a
    // shop, anywhere the theme wants stating out loud. Silent in the bay,
    // which has a hook of its own and does not need this one.
    jingle() {
      const c = ensure(); if (!c || !master || isPirate()) return;
      jingleQuote(c.currentTime + 0.02, 0.1);
    },
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
      // NEVER call ensure() in here: setZone can fire before the first gesture
      // and creating the context then would trip the autoplay policy. If there
      // is no context yet the choice is simply remembered for the world's
      // start function, which applies it on the opening swell.
      if (!isPirate()) {
        const mid = mNormZone(zone);
        if (mid === mZone) return;
        mZone = mid;
        if (!ctx) return;
        mApplyZones();
        return;
      }
      const id = normZone(zone);
      if (id === curZone) return;
      curZone = id;
      if (!ctx) return;
      applyZones();
    },
    // The authored match beats. Maple keeps the fanfare it always had; the bay
    // answers in character — the DANCE PARTY is the only one the club horn
    // belongs to, and TREASURE FEAST gets the full band cadence.
    matchBeat(kind) {
      const c = ensure(); if (!c || !master) return;
      const k = String(kind).toLowerCase();
      if (!isPirate()) {
        // MAPLE FALLS. The banner text is being re-themed to the election in
        // parallel with this file, so match GENEROUSLY — bake sale or donut
        // rush, recall vote or evacuation, landslide or final feast — and fall
        // through to a flourish that still sounds like the town band.
        const mt = c.currentTime;
        if (/rush|donut|bake/.test(k)) bakeSting(mt);
        else if (/evacu|recall|alarm/.test(k)) recallSting(mt);
        else if (/final|feast|landslide|count/.test(k)) landslideFanfare(mt);
        else townFanfare(mt);
        return;
      }
      const t = c.currentTime;
      if (k.includes('dance') || k.includes('party')) {
        airhorn(t, 0.13);
        cheer(t + 0.12, 0.55);
        hey(master, t + 0.06, 0.2, 4);
        panRun(t + 0.5, [523.25, 587.33, 698.46, 880.00], 0.09, 0.16, 0.5);
      } else if (k.includes('treasure') || k.includes('feast')) {
        treasureFanfare(t);
      } else {
        // happy hour: the crew raises a glass — a shout, a stomp, a toast
        hey(master, t, 0.18, 3);
        bandHit(t, 0.2);
        accChord(master, [293.66, 349.23, 440.00], t + 0.04, 0.5, 0.09);
        panRun(t + 0.2, [523.25, 659.25, 783.99], 0.1, 0.14, 0.55);
      }
    },
    stopMusic() {
      stopTropical(1.2);
      stopTown(1.2);
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
      // the crunch itself is shared and untouched. In the bay a squeezebox
      // wheeze is layered ON TOP roughly every fifth big meal — often enough
      // to be a running joke, rare enough to stay one.
      if (isPirate() && ++bigEatCount % 5 === 2) {
        const c = ensure(); if (c) yoHo(c.currentTime + 0.1);
      }
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
        // last orders: the whole band plays the hook's big answer out, lands
        // on home, and the room goes up. The match ends on a singalong.
        const c = ensure(); if (!c || !master) return;
        const t = c.currentTime;
        const out = [523.25, 587.33, 659.25, 783.99];   // the "big one", bar 3
        out.forEach((f, i) => {
          const tt = t + i * 0.13;
          accord(master!, f, tt, 0.2, 0.11);
          fiddle(master!, f * 2, tt, 0.2, 0.05);
          bandHit(tt, i === 0 ? 0.22 : 0.14);
        });
        const home = t + 0.58;
        accChord(master, [293.66, 349.23, 440.00], home, 1.1, 0.11);
        pBass(master, home, 146.83, 1.0, 0.18);
        whistle(master, 1174.66, home, 0.9, 0.035);
        panRun(home, [587.33, 880.00, 1174.66], 0.12, 0.14, 0.9);
        bandHit(home, 0.28);
        hey(master, home, 0.24, 4);
        cheer(home + 0.15, 0.75);
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
