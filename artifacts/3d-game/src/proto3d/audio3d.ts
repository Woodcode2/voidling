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
// Loop regions per track — a JSON row, not an engine edit, for the next track
// the owner drops in. `loopStart` is where passes 2..n re-enter, in seconds
// AFTER the shipped trim: an opening stinger plays once, on entry, and never
// again. Game Day is the case that forced this: its first 1.5s sits 20 dB
// above the body of the track (measured, qa/trackprofile.mjs), and the old
// whole-buffer crossfade re-fired that hit every three and a half minutes.
import MUSIC_MANIFEST from './music-manifest.json';

type Ctx = AudioContext;

export interface Audio3D {
  pop(combo: number, mealR?: number, voidR?: number): void;   // eat — pitch rises with combo, deepens with WHAT WAS EATEN
  gulp(): void;                    // GULP whoosh
  rocket(): void;                  // ROCKET BITE zip
  collapse(): void;                // COLLAPSE boom
  evolve(): void;                  // form-up fanfare
  voice(kind: 'happy' | 'yum' | 'scared' | 'hurt' | 'sleepy'): void;   // the void's cute coos
  win(): void;                     // end-of-match warm sting — 1st place only
  lose(): void;                    // "aww — next time": soft, major, no dread
  hit(): void;                     // took a shot
  alert(): void;                   // defense wave banner
  bigEat(): void;                  // crunching a building
  ready(): void;                   // a power just charged
  startMusic(): void;              // the match loop — tempo + layers ride the stage
  setMusicStage(n: number): void;
  stopMusic(): void;
  startMenuMusic(): void;          // the splash/picker/shop theme — /assets/music/menu.mp3
  stopMenuMusic(): void;
  setZone(zone: string | null): void;   // player's current district — drives the place layer
  matchBeat(kind: string): void;        // authored match beat (happy hour / dance party / feast)
  jingle(): void;                       // quote MAPLE FALLS' municipal jingle (no-op in the bay)
  /** Restart the match track if it wants to be playing and nothing is. Safe to
   *  call on a timer; a no-op in the normal case. */
  ensureMusic(): void;
  /** Ordered log of what the audio engine actually did (?audio=1 shows it). */
  musicLog(): string[];
  /** Fire an unmistakable tone through master — "can this page make a sound?" */
  testTone(): void;
  /** Download and decode the menu theme and the current world's track NOW,
   *  without playing either. Decoding needs no running clock, so this can run
   *  during the splash and take the network out of the path between the first
   *  touch and the first note. */
  preloadMusic(): void;
  setMuted(m: boolean): void;      // settings toggle (App Store expects one)
  isMuted(): boolean;
  /** QA: what the music engine is ACTUALLY doing. qa/music.mjs could only see
   *  that a file was requested and that the synth was quiet — and a track that
   *  loads but never starts is exactly that, so total silence reported as
   *  "RECORDING". This reports the state that decides whether a sound reaches
   *  a child: is the context running, did the buffer decode, is the gain up,
   *  are there scheduled sources. */
  musicState(): {
    ctx: string; muted: boolean; masterGain: number;
    synth: boolean;
    /** the shared music bus gain — the node duckMusic() schedules on; a duck
     *  that never recovers hides behind healthy channel numbers without it */
    bus: number;
    /** TRUE when the silent media element is playing — i.e. the page holds
     *  the Playback audio session and the iPhone mute switch cannot mute it */
    media: boolean;
    theme: { wanted: boolean; loading: boolean; bad: boolean; cold: boolean; dur: number; gain: number; srcs: number; starts: number };
    menu: { wanted: boolean; loading: boolean; bad: boolean; cold: boolean; dur: number; gain: number; srcs: number; starts: number };
  };
}

export function createAudio(): Audio3D {
  let ctx: Ctx | null = null;
  let master: GainNode | null = null;
  // ── ONE BUS FOR EVERYTHING THAT IS SCORE ─────────────────────────────────
  // The recordings, the synth beds and their zone/ambience layers all join
  // master through this single gain, so "make room for a sting" is one ramp
  // in one place. One-shots (chomps, fanfares, voices) stay on master — a
  // duck that ducked the thing it was making room FOR would be a volume bug
  // with extra steps.
  let musicBus: GainNode | null = null;
  // persisted mute — a parent hitting mute expects it to STAY muted tomorrow
  // Guarded: with storage blocked (iOS "Block All Cookies", a kiosk profile, an
  // iframe) a bare read throws, and this module is imported during boot — so
  // the throw took the whole game down while a fully-rendered static menu sat
  // there inviting a child to tap PLAY. prototype3d.ts shadows localStorage for
  // its own 65 call sites; these three are the only other live ones.
  const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* session-only */ } };
  let muted = lsGet('voidMute') === '1';
  // set voidTheme=1 to play /assets/music/theme.mp3 (and the old generic synth
  // bed behind it) on MAPLE FALLS instead of the town band. Off by default.
  const LICENSED_THEME = lsGet('voidTheme') === '1';
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

  // ── WHAT ACTUALLY HAPPENED, IN ORDER, ON THE DEVICE IT HAPPENED ON ───────
  // Three rounds of fixes have measured correct in every environment reachable
  // from a build machine and still failed on the owner's phone. The gap is not
  // a missing idea, it is a missing observation: nothing has ever reported what
  // this engine did on THAT hardware. Every state transition that could bear on
  // whether a sound comes out is recorded here, and ?audio=1 puts it on screen.
  // Forty lines is a whole session's worth of audio history and about 3 KB.
  const evLog: string[] = [];
  let lastEv = '';
  let lastEvN = 0;
  const logEv = (s: string) => {
    // COLLAPSE REPEATS. ensure() is called by every single sound effect, so a
    // busy match fires a resume promise dozens of times a second and the log
    // fills with one line — pushing the twelve that matter off the top of a
    // phone screen. A diagnostic that scrolls its own evidence away is no
    // better than no diagnostic.
    if (s === lastEv) {
      lastEvN++;
      evLog[evLog.length - 1] = `${(performance.now() / 1000).toFixed(1)}s ${s}  (x${lastEvN})`;
      return;
    }
    lastEv = s; lastEvN = 1;
    evLog.push(`${(performance.now() / 1000).toFixed(1)}s ${s}`);
    if (evLog.length > 40) evLog.shift();
  };

  // ── THE iOS UNLOCK, WHICH IS NOT resume() ────────────────────────────────
  // On iOS Safari a resumed context can report `running` and still produce no
  // sound. The platform wants a source STARTED inside the gesture before it
  // will really open the output; every audio library on the web carries some
  // version of this, and this engine never had one. It is the one failure mode
  // that matches the owner's report exactly — every number correct, nothing
  // audible — and it is invisible to any probe that reads state.
  //
  // It also guards a regression I introduced this session: preloadMusic() now
  // calls ensure() at boot, so the AudioContext is CONSTRUCTED with no user
  // activation, where before it was usually first built inside a tap. That is
  // precisely the case iOS treats worst.
  //
  // One frame of silence, connected straight to destination, started at zero.
  // Costs nothing, cannot be heard, and is the difference between a context
  // that says it is running and one that is.
  // ── THE RING/SILENT SWITCH, DEFEATED ────────────────────────────────────
  // The brief said the iPhone's mute switch "cannot be fixed — must be
  // detected". That was WRONG, and the correction matters more than the
  // original claim: the switch silences WebAudio in Safari, but it does NOT
  // silence HTMLMediaElement playback — media takes the Playback audio
  // session, and once ANY media element is playing, WebAudio routes through
  // that session and sounds with the switch on. Keeping a looping, silent,
  // inline <audio> element alive is therefore the difference between "the
  // game is mysteriously mute for every child whose phone is on silent" —
  // which is MOST phones, most of the time — and the game behaving like the
  // native titles it is competing with. This is the mechanism unmute.js has
  // shipped to thousands of web games; it is not a hack, it is the platform's
  // only sanctioned way to say "this page is a media app".
  //
  // Given how the owner's reports read — every number correct, nothing
  // audible, on an iPhone — this is the strongest single candidate for the
  // whole saga.
  //
  // The element pauses when the page hides: holding the audio session in the
  // background would silence the child's podcast half an hour after they
  // stopped playing, and that is a one-star review with a changelog.
  let mediaEl: HTMLAudioElement | null = null;
  const SILENT_WAV = 'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQgAAAAAAAAAAAAAAA==';
  function promoteSession() {
    try {
      if (!mediaEl) {
        mediaEl = new Audio(SILENT_WAV);
        mediaEl.loop = true;
        (mediaEl as HTMLAudioElement & { playsInline: boolean }).playsInline = true;
        mediaEl.setAttribute('playsinline', '');
        document.addEventListener('visibilitychange', () => {
          if (mediaEl && document.hidden) mediaEl.pause();
          // resume happens in unlock(), inside a real gesture — play() from a
          // bare visibility event is exactly what iOS refuses
        });
      }
      if (mediaEl.paused) {
        void mediaEl.play().then(
          () => logEv('session promoted (silent media playing — mute switch defeated)'),
          (e) => logEv(`session promote refused: ${String(e).slice(0, 44)}`));
      }
    } catch (e) { logEv(`session promote failed: ${String(e).slice(0, 40)}`); }
  }

  let primed = false;
  function primeOutput(c: AudioContext) {
    if (primed) return;
    try {
      const b = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = b; src.connect(c.destination); src.start(0);
      primed = true;
      logEv('output primed (silent buffer inside gesture)');
    } catch (e) { logEv(`prime FAILED ${String(e).slice(0, 40)}`); }
  }

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
        musicBus = ctx.createGain(); musicBus.connect(master);
        logEv(`ctx created, state=${ctx.state}, rate=${ctx.sampleRate}, muted=${muted}`);
        // ── THE SIGNAL NOTHING CAN MISS ──────────────────────────────────
        // Every route to a running clock ends here: the first touch, the pause
        // sheet closing, a phone unlocking, the tab coming back to the front.
        // Hanging the repair off the context's own state means no caller has
        // to remember to ask, and no frame loop has to be running for it to
        // work — which is precisely what defeated the previous fix.
        ctx.addEventListener('statechange', () => {
          logEv(`statechange -> ${ctx ? ctx.state : 'gone'}`);
          if (ctx && ctx.state === 'running') repairMusic();
        });
      } catch { return null; }
    }
    // ── EVERY STATE THAT IS NOT 'running' IS A STATE TO RESUME FROM ────────
    // This used to read `=== 'suspended'`, and it was the only ctx.resume() in
    // the whole source tree. iOS Safari has a state the spec does not:
    // 'interrupted', entered on an incoming call, on Siri, on another app
    // taking the audio session, and on the phone locking. From there this fell
    // straight through to `return ctx` without ever asking to resume, and
    // repairMusic() bails on anything that is not 'running' — so the context
    // was wedged for the rest of the session and nothing in the codebase would
    // ever have tried again. resume() on a running context is a no-op that
    // resolves, so widening the gate is safe from every state.
    if ((ctx.state as string) !== 'running') {
      // RESUME IS A PROMISE, AND THE NEXT LINE IS STILL SUSPENDED. Every
      // caller of ensure() that went straight on to schedule something was
      // scheduling on a stopped clock — including unlock(), the one function
      // whose whole job was to fix that. Nothing here may assume otherwise;
      // the repair rides the promise and the statechange event, never the
      // return value.
      const was = ctx.state as string;
      void ctx.resume().then(
        () => {
          if (!ctx) return;
          if ((ctx.state as string) !== was) logEv(`resume ${was} -> ${ctx.state}`);
          if (ctx.state === 'running') repairMusic();
        },
        (e) => { logEv(`resume REFUSED from ${was}: ${String(e).slice(0, 40)}`); },
      );
    }
    return ctx;
  }
  let gestures = 0;
  // wall-clock moment of the last trusted gesture — the optimistic-scheduling
  // window in startLoop keys off it
  let lastGestureAt = -1e9;
  const unlock = () => {
    // ── ALL THIS DOES IS ASK, AND WARM THE SAMPLES ─────────────────────────
    // It used to read the clock state, call ensure(), and then immediately
    // rebuild every loop — on the line after a resume() that had not finished.
    // ctx.resume() is a PROMISE. On the next statement the context is still
    // suspended, so the "repair" laid down another dead schedule and set cold
    // straight back to true. Measured: the menu channel came out of the first
    // tap with cold=true and stayed that way indefinitely.
    //
    // The repair now hangs off the context's statechange event and off the
    // resume promise (see ensure()), so this function has no timing to get
    // wrong. It only has to make sure a context EXISTS to be resumed.
    const c = ensure();
    gestures++;
    lastGestureAt = performance.now();
    // SYNCHRONOUSLY, INSIDE THE GESTURE. Not in the resume() callback — by then
    // the activation is spent and iOS will not accept it. See primeOutput.
    if (c) primeOutput(c);
    promoteSession();
    // …and start whatever wants to be playing NOW, inside this gesture, on the
    // optimistic path — not whenever the resume promise gets a turn on the
    // main thread. This is what makes the very first tap of a session — PLAY,
    // a nav card, anywhere — the moment the music starts.
    repairMusic();
    logEv(`gesture, ctx=${c ? c.state : 'none'}`);
    // decode the recorded kit on the FIRST gesture — the first gulp of the
    // first match must already be the real sample, not the synth stand-in
    for (const n of ['eaten_deep.wav', 'evolve_epic.wav', 'win_warm.wav']) sample(n, 0);
  };
  // ── EVERY WAY A CHILD CAN TOUCH THIS GAME COUNTS AS THE GESTURE ──────────
  // Capture phase, on window, so nothing downstream can stop the event before
  // it arrives: a splash card that calls stopPropagation, an overlay that eats
  // pointer events, a button that only ever produces a click. `pointerdown`
  // alone is not enough — a keyboard or assistive activation raises click
  // without it, and that child gets a silent game.
  for (const ev of ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
  window.addEventListener('keydown', unlock, { capture: true });
  // …and returning to the foreground, which is the ONLY exit from iOS's
  // 'interrupted' that involves no touch at all: a child who takes a call
  // mid-match comes back to the game without necessarily tapping anything.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) unlock(); });

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
  //
  // TWO CHANNELS RUN THIS, not one. The match track has always used it; the
  // MENU theme now uses it too, and they are separate instances rather than a
  // second copy of the code, because the seam maths here is the part that took
  // tuning and a drifting duplicate of it would be a bug waiting to happen.
  // Two instances also make the one rule that matters enforceable in one place:
  // the menu and the match must never be audible together.
  interface LoopChan {
    buf: AudioBuffer | null;
    bad: boolean; loading: boolean; wanted: boolean;
    gain: GainNode | null;
    timer: ReturnType<typeof setTimeout> | null;
    srcs: AudioBufferSourceNode[];
    vol: number;
    /** TRUE when this loop was scheduled against a clock that was not running.
     *  Everything WebAudio schedules — source start times, the crossfade
     *  envelope — is on the audio clock, and a suspended clock does not move.
     *  So a loop started cold has a full set of `srcs` and makes no sound, and
     *  is indistinguishable from a healthy one by any count. This flag is that
     *  distinction, and without it the watchdog is blind to the exact failure
     *  it exists to catch. */
    cold: boolean;
    /** loop re-entry point (seconds) from the manifest; 0 = loop the whole
     *  buffer. Set beside `buf` at decode, from the URL that actually won. */
    loop: number;
    /** how many times a loop has been STARTED this session — the continuity
     *  probe (qa/journey.mjs) reads this: a menu theme that is one continuous
     *  piece across splash → picker → shop → book starts exactly once. */
    starts: number;
  }
  const mkChan = (vol: number): LoopChan =>
    ({ buf: null, bad: false, loading: false, wanted: false, gain: null, timer: null, srcs: [], vol, cold: false, loop: 0, starts: 0 });
  const loopFor = (url: string): number => {
    const stem = (url.split('/').pop() ?? '').replace(/\.\w+$/, '');
    const row = (MUSIC_MANIFEST as Record<string, { loopStart?: number }>)[stem];
    return row?.loopStart ?? 0;
  };
  // 0.4 is the match track's long-standing level. The menu sits a little under
  // it: it plays against no gameplay bed at all, so the same number reads loud.
  const themeCh = mkChan(0.4);
  // …remembered so the unlock handler can re-arm the MATCH track too. Without
  // these it could only ever retry the menu, and a world reached by the
  // reloading picker path had nothing to retry with.
  let themeUrls: string[] = [];
  let themeSynth: (() => void) | null = null;
  const menuCh = mkChan(0.34);
  const MENU_URL = '/assets/music/menu.mp3';
  const THEME_FADE = 1.6;   // seconds of overlap at the seam
  function startLoop(ch: LoopChan, c: AudioContext, buf: AudioBuffer) {
    stopLoop(ch, 0);
    // ── NOTHING IS SCHEDULED AGAINST A CLOCK THAT IS NOT MOVING ───────────
    // The previous version went ahead and scheduled anyway, recording `cold`
    // so a watchdog could rebuild it later. That was worse than useless twice
    // over. It produced a channel with a full `srcs` array, a set gain and no
    // sound — the exact state that has fooled every probe and every reading of
    // this file for four rounds. And the sources it left behind are not inert:
    // they are scheduled at clock times that are ALREADY IN THE PAST by the
    // time a child finally touches the screen, so when the context resumes
    // they all fire at once, on top of each other, out of step with the
    // crossfade timers that were counting in wall-clock milliseconds the whole
    // while. That is the owner's "either has a delay or sometimes ... works".
    //
    // So: refuse. Mark the channel cold, keep the decoded buffer, schedule
    // NOTHING, and let the context's own statechange event start it properly
    // the instant the clock is real. `srcs.length === 0` while cold is then an
    // honest answer to "is anything playing", which it never was before.
    if (c.state !== 'running' && performance.now() - lastGestureAt > 1500) {
      ch.cold = true; logEv(`startLoop REFUSED, clock ${c.state}, no gesture pending`); return;
    }
    // ── WITHIN 1.5s OF A GESTURE, SCHEDULE WITHOUT WAITING ────────────────
    // resume() is a promise, and on a struggling main thread its resolution —
    // and the statechange event behind it — queue behind whole frames. Waiting
    // for 'running' before scheduling put that queueing time between the tap
    // and the first note. But a schedule laid down on a clock that a
    // just-fired resume is about to start is SAFE: the clock has not advanced,
    // so nothing scheduled at currentTime+0.03 can be in the past when it
    // starts moving, and the next crossfade pass is a minute away — the
    // pileup that made cold scheduling poisonous needs minutes of frozen
    // clock, which the 1.5s window cannot produce. If the resume is refused
    // after all, the statechange repair rebuilds from scratch, exactly as it
    // would have.
    if (c.state !== 'running') logEv('startLoop optimistic (resume in flight)');
    ch.cold = false;
    logEv(`startLoop ${ch === themeCh ? 'theme' : 'menu'} ${Math.round(buf.duration)}s vol=${ch.vol}`);
    // was the hand-written bed audibly up when the recording landed? Decides
    // the channel envelope below: a handover wants a short crossfade, a cold
    // start wants NOTHING between the tap and the first note.
    const hadBed = synthOn;
    // the recording is here; the bed hands over across its own 1.2s fade
    synthStop(1.2);
    if (!ch.gain) { if (!master || !musicBus) return; ch.gain = c.createGain(); ch.gain.connect(musicBus); }
    ch.starts++;
    // ── NOTHING BETWEEN THE TAP AND THE FIRST NOTE ────────────────────────
    // Two ramps used to sit between "the music started" and "you can hear it":
    // the channel gain eased up over 1.2s AND the first pass faded in over the
    // full 1.6s crossfade window — so a tap produced roughly three seconds of
    // near-silence before the score reached level. That was engine-made head
    // silence stacked on top of the head silence in the files themselves, and
    // together they are the owner's "the music isn't loading": it was loading,
    // and then it whispered. The crossfade-in belongs to LOOP SEAMS, where the
    // outgoing pass covers it; the first pass has nothing covering it and
    // plays at level from its first sample (a 30ms ramp kills the click).
    //
    // The channel ramp that replaced them (0.25s) was still redundant on a
    // cold start: every call here rides on stopLoop(ch, 0), so nothing on
    // this channel is audible when the envelope begins — pass 1's own 30ms
    // ramp is the whole anti-click story. On an iPhone that 0.25s stacked on
    // resume latency is the owner's "music is slightly delayed": tap, beat,
    // music. So the channel now comes up INSTANTLY unless the synth bed was
    // mid-air, where an instant arrival would pop over the bed's 1.2s fade —
    // that one case keeps a short crossfade.
    ch.gain.gain.cancelScheduledValues(c.currentTime);
    if (hadBed) {
      ch.gain.gain.setValueAtTime(0.0001, c.currentTime);
      ch.gain.gain.exponentialRampToValueAtTime(ch.vol, c.currentTime + 0.25);
    } else {
      ch.gain.gain.setValueAtTime(ch.vol, c.currentTime);
    }
    // Where passes 2..n re-enter. Guarded: a manifest row deeper than the
    // buffer (wrong file in the slot, stale row) must not wedge the loop.
    const lp = ch.loop > 0.05 && ch.loop < buf.duration - 8 ? ch.loop : 0;
    const playPass = (when: number, offset: number, first: boolean): number => {
      const seg = Math.max(4, buf.duration - offset);   // audible length of this pass
      const src = c.createBufferSource(); src.buffer = buf;
      const g = c.createGain();
      if (first) {
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(1, when + 0.03);
      } else {
        // equal-power-ish ramp across the overlap; the outgoing pass covers it
        g.gain.setValueAtTime(0.0001, when);
        g.gain.linearRampToValueAtTime(1, when + THEME_FADE);
      }
      g.gain.setValueAtTime(1, when + seg - THEME_FADE);
      g.gain.linearRampToValueAtTime(0.0001, when + seg);
      src.connect(g); g.connect(ch.gain!);
      src.start(when, offset); src.stop(when + seg + 0.1);
      ch.srcs.push(src);
      if (ch.srcs.length > 3) ch.srcs.shift();
      return seg;
    };
    let next = c.currentTime + 0.03;
    let seg = playPass(next, 0, true);   // pass 1: the intro, from the top
    const arm = () => {
      next += seg - THEME_FADE;
      seg = playPass(next, lp, false);   // scheduled ahead on the audio clock — sample-accurate
      ch.timer = setTimeout(arm, Math.max(500, (next - c.currentTime - 2.5) * 1000));
    };
    ch.timer = setTimeout(arm, Math.max(500, (seg - THEME_FADE - 2.5) * 1000));
  }
  function stopLoop(ch: LoopChan, fade: number) {
    if (ch.timer) { clearTimeout(ch.timer); ch.timer = null; }
    if (ctx && ch.gain && fade > 0) {
      ch.gain.gain.cancelScheduledValues(ctx.currentTime);
      ch.gain.gain.setValueAtTime(ch.gain.gain.value, ctx.currentTime);
      ch.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
      const olds = ch.srcs; ch.srcs = [];
      setTimeout(() => olds.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }), fade * 1000 + 60);
    } else {
      ch.srcs.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
      ch.srcs = [];
    }
  }
  /** Load a channel's track once and play it. `urls` are tried in order and the
   *  first that decodes wins; if none does, `onNone` runs (the match falls back
   *  to its synth score, the menu simply stays quiet as it does today). */
  function playTrack(ch: LoopChan, urls: string[], onNone: () => void) {
    ch.wanted = true;
    const c = ensure();
    if (!c || ch.bad) { onNone(); return; }
    // ALREADY PLAYING IS DONE. Without this, two callers asking for the same
    // channel is an audible restart: the gate starts the menu theme inside
    // the tap, the body.menu sync asks again a frame later, and the piece
    // jumped back to bar one. qa/journey.mjs counts starts; it caught this
    // as starts=2 on a walk where the theme should be one continuous piece.
    if (ch.srcs.length && !ch.cold) return;
    if (ch.buf) { startLoop(ch, c, ch.buf); return; }
    if (ch.loading) return;
    ch.loading = true;
    (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const buf = await c.decodeAudioData(await r.arrayBuffer());
          ch.buf = buf;
          ch.loop = loopFor(u);
          logEv(`decoded ${u.split('/').pop()} ${Math.round(buf.duration)}s loop@${ch.loop}`);
          // CLEAR THE FLAG. It used to be set and never unset on the success
          // path, so a channel that had loaded perfectly still read
          // `loading: true` for the rest of the session — which meant every
          // repair path guarded on `!ch.loading` silently declined to touch
          // it, forever. A latch nobody releases is a repair nobody runs.
          ch.loading = false;
          if (ch.wanted) startLoop(ch, c, buf);
          return;
        } catch { /* next candidate */ }
      }
      ch.loading = false;
      ch.bad = true;
      if (ch.wanted) onNone();
    })();
  }

  // ── FETCH AND DECODE WITHOUT PLAYING ──────────────────────────────────────
  // Decoding is legal on a SUSPENDED context — the clock has to move to sound,
  // not to decode — so the whole download and decode can be over before the
  // child's first touch. Without this the world's track is not even requested
  // until the match begins, which is the second half of the owner's report:
  // "when you click maple falls there's a massive delay". The delay was the
  // download, started at the worst possible moment.
  function preload(ch: LoopChan, urls: string[]): Promise<void> | undefined {
    const c = ensure();
    if (!c || ch.buf || ch.loading || ch.bad) return undefined;
    ch.loading = true;
    return (async () => {
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          ch.buf = await c.decodeAudioData(await r.arrayBuffer());
          ch.loop = loopFor(u);
          logEv(`preloaded ${u.split('/').pop()} ${Math.round(ch.buf.duration)}s loop@${ch.loop}`);
          ch.loading = false;
          // it may have been asked for while we were fetching
          if (ch.wanted) startLoop(ch, c, ch.buf);
          return;
        } catch { /* next candidate */ }
      }
      ch.loading = false; ch.bad = true;
    })();
  }

  // ── THE REPAIR, AND WHERE IT IS TRIGGERED FROM ────────────────────────────
  // Everything above conspires to leave exactly one question: the clock has
  // just started moving — is what should be playing, playing? This answers it,
  // and it is driven by the AudioContext's OWN statechange event rather than
  // by a timer.
  //
  // That distinction is the whole fix. The previous attempt polled from the
  // frame loop, and the frame loop does not reach that line before a match
  // starts — proved by hand: after the first tap the menu channel sat at
  // cold=true through a dozen watchdog periods, and calling ensureMusic() from
  // the console repaired it instantly. A poll that cannot run where the bug
  // lives is not a backstop, it is decoration. statechange fires wherever the
  // resume came from: the first touch, the pause sheet closing, the phone
  // coming back from the lock screen.
  function reviveCh(ch: LoopChan, c: AudioContext) {
    if (ch.buf) { if (ch.cold || !ch.srcs.length) startLoop(ch, c, ch.buf); return; }
    // Getting here means the channel wants music and has none. For a match that
    // is a silent match, so the bed comes up NOW — no grace period, because we
    // are already in the state the grace period exists to detect.
    synthCover();                                 // menu or match: never silent
    if (ch.bad) return;                           // no recording: the bed is the score
    if (ch.loading) return;                       // in flight; its own tail starts it
    if (ch === themeCh) { if (themeUrls.length) playTrack(themeCh, themeUrls, () => synthCover()); }
    else playTrack(menuCh, [MENU_URL], () => { /* no file: quiet, as designed */ });
  }
  // ── A MATCH IS NEVER SILENT WHILE IT WAITS FOR A DOWNLOAD ────────────────
  // startMusic() passes the world's hand-written synth score into playTrack as
  // `onNone`, and onNone runs on exactly one condition: every URL failed. The
  // note there justified having no stopgap with "the fetch fails fast when
  // there is no file (a 404 is one round trip), which is the case for every
  // world today". That premise died the day the five recordings shipped. The
  // fetch no longer 404s — it SUCCEEDS, slowly — so the bed became unreachable
  // and the match plays in complete silence from the whistle until decode
  // resolves. That is the owner's "massive delay", and the delay was audible
  // as nothing at all rather than as a score coming up.
  //
  // The same note's real objection — "startLoop() does not silence a running
  // score, there is no shared stop" — was simply wrong: stopTown, stopTropical,
  // stopGameday and stopLantern all exist and stopMusic() calls all four.
  //
  // So the bed covers the gap and the recording displaces it, which is what a
  // game with a loading screen does. `synthOn` is the interlock: the start
  // functions reset their step counter and re-ramp their gain, so calling one
  // twice restarts the bed from the top, and repairMusic may fire often.
  // ── DUCKING — the score steps back for the moments that matter ──────────
  // -6 dB, 120ms in, 400ms out: enough that the evolve fanfare and the win
  // sting own their beat, gentle enough to read as the music making room
  // rather than a volume knob. Overlapping cues extend the hold instead of
  // stacking ramps into a staircase.
  // (duckMusic, not duck — Maple Falls has a pond, the pond has ducks, and
  // duck() is already the sound one of them makes. This codebase.)
  let duckUntil = 0;
  function duckMusic(db = 6, hold = 0.3) {
    const c = ctx; if (!c || !musicBus) return;
    const g = musicBus.gain, t = c.currentTime;
    const floor = Math.pow(10, -db / 20);
    duckUntil = Math.max(duckUntil, t + 0.12 + hold);
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(floor, t + 0.12);
    g.setValueAtTime(floor, duckUntil);
    g.linearRampToValueAtTime(1, duckUntil + 0.4);
  }

  let synthOn = false;
  /** The hand-written bed for whichever world this session is on. */
  const worldSynth = () => (isPirate() ? startTropical
    : isGameday() ? startGameday
      : isLantern() ? startLantern
        : isPowder() ? startPowderScore : startTown);
  /** Bring the bed up, unless a recording beat it to it. */
  function synthCover() {
    const c = ctx;
    if (synthOn || !c || c.state !== 'running') return;
    // A record is playing — but only a channel that WANTS to play counts. At
    // match start the menu theme is still FADING (stopLoop's 0.6s ramp holds
    // its srcs alive past the 400ms cover grace), and counting that corpse
    // meant the bed never covered the menu→PLAY path at all: the match sat
    // silent until the recording decoded — 0.3s warm, 3s cold, the owner's
    // "music doesn't always start the moment you play". Measured by
    // qa/_startlag.mjs: 314/934/1067/3061ms with zero bed engagements.
    if (themeCh.srcs.length || (menuCh.wanted && menuCh.srcs.length)) return;
    // themeSynth is only set once a match has armed; before that — on the
    // splash — fall back to this world's own bed. THE MENU HAS NEVER HAD A
    // SCORE TO FALL BACK ON, which was defensible while the menu had no track
    // at all and is not now: menu.mp3 is 2.2 MB, and on a cold first launch
    // over cellular that is several seconds of the owner's "music at the
    // splash screen not loading". The world's bed is the same music family
    // and it is replaced the moment the recording lands.
    const bed = themeSynth ?? worldSynth();
    synthOn = true;
    logEv('synth bed up (cover)');
    bed();
  }
  function synthStop(fade: number) {
    if (!synthOn) return;
    synthOn = false;
    logEv('synth bed down (handover)');
    stopTropical(fade); stopTown(fade); stopGameday(fade); stopLantern(fade); stopPowder(fade);
  }
  function repairMusic() {
    const c = ctx;
    if (!c || !master) return;
    // 'running', OR inside the optimistic window of a gesture whose resume is
    // in flight — startLoop schedules safely in that window (see its note), so
    // the FIRST tap can start the score without a dedicated gate overlay. This
    // is what let the TAP TO BEGIN screen come back out of the fresh-load
    // path: the tap the child was already going to make is the gesture.
    if (c.state !== 'running' && performance.now() - lastGestureAt > 1500) return;
    // a match owns the music; the menu never talks over it
    if (themeCh.wanted) reviveCh(themeCh, c);
    else if (menuCh.wanted) reviveCh(menuCh, c);
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
  // -1, NOT 0. The rate limiter in pop() is `now - lastPop < 0.075`, and
  // ensure() creates the AudioContext lazily on the first sound — so if the
  // first sound of a session is a chomp, currentTime is ~0, the test reads
  // 0 - 0 < 0.075, and the very first bite a child ever takes is dropped.
  // Starting in the past means the first one always plays. (It is also what
  // makes pop() renderable in an OfflineAudioContext, which is how
  // qa/chomp.mjs measures it — a limiter that swallows the only call is
  // indistinguishable from a synth that makes no sound.)
  let lastPop = -1;
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
    warm.connect(dry); dry.connect(musicBus!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(musicBus!);
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
  const isGameday = () => worldId() === 'gameday';

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
    // ── LANTERN NIGHT ──
    nail: ['highpass', 4200, 0.8],    // the koto plectrum's click on the wire
    skin: ['lowpass', 900, 0.8],      // a taiko head, which is enormous
    shime: ['bandpass', 2100, 0.8],   // the small rope-tuned drum, tight
    gong: ['highpass', 3000, 0.7],    // the hand gong's beater
    clack: ['highpass', 2400, 0.7],   // hardwood on hardwood
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
    warm.connect(dry); dry.connect(musicBus!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(musicBus!);
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
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(musicBus!);
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
    if (!ambGain) { ambGain = c.createGain(); ambGain.gain.value = 0.0001; ambGain.connect(musicBus!); }
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
    warm.connect(dry); dry.connect(musicBus!);
    warm.connect(delay); delay.connect(wetTone); wetTone.connect(wet); wet.connect(musicBus!);
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
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(musicBus!);
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
    if (!mapAmb) { mapAmb = c.createGain(); mapAmb.gain.value = 0.0001; mapAmb.connect(musicBus!); }
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

  // ══════════════════════════════════════════════════════════════════════════
  //  GAME DAY — THE FIGHT SONG, FROM THE CAR PARK
  //
  //  The third world shipped with no score at all. startMusic() branched two
  //  ways — Pirate Bay, or everything else — so a football Saturday played
  //  Maple Falls' front-porch bluegrass, and mNormZone() had no cases for any
  //  of the eight Game Day districts, so it returned null everywhere and the
  //  place layer never engaged once. Standing in the stadium bowl, in the
  //  parking lot and in the woods all sounded identical, on the one world
  //  whose design contract opens on the word "Noise".
  //
  //  THE CONCEIT, straight out of docs/GAMEDAY.md: "The band is playing
  //  somewhere you cannot see. There is a distant roar every so often, and it
  //  gets louder as the match goes on." So this is not a soundtrack — it is a
  //  MARCHING BAND HEARD ACROSS A CAR PARK, and every stage moves it closer:
  //
  //    stage 0  a drumline warming up under the stands, and nothing else.
  //             Two blocks away. You can hear the bass drum and not the tune.
  //    stage 1  the sousaphone finds the bottom and the crowd starts answering
  //             on the phrase ends. The band has taken the field.
  //    stage 2  the cornets have the fight song outright, snare in cut time.
  //    stage 3  everybody, plus the bell lyre rushing, plus ninety thousand
  //             people. This is the fourth quarter.
  //
  //  It shares the instrument bench with MAPLE FALLS on purpose — sousa,
  //  brass, glock, mSnare, bDrum, crash, refWhistle, holler, crowdSwell are
  //  the same functions. A cornet is a cornet. What is different is the TUNE,
  //  the arrangement (drumline-forward, never a banjo), the eight beds and the
  //  roar. Nothing here is reachable from either of the other two scores.
  // ══════════════════════════════════════════════════════════════════════════

  // THE FIGHT SONG. F major, cut time, eight eighths to the bar, four bars
  // round. Written to be singable by a child after one match: the first two
  // bars are a rising call, the second two answer it and land back on the
  // tonic. 0 is a rest — the rests are the point, they are where the crowd
  // shouts back.
  const G_HOOK: number[][] = [
    [523.25, 523.25, 349.23, 349.23, 440.00, 440.00, 523.25, 0],
    [466.16, 440.00, 392.00, 440.00, 349.23, 0, 0, 0],
    [523.25, 523.25, 349.23, 349.23, 440.00, 440.00, 587.33, 0],
    [587.33, 523.25, 466.16, 440.00, 349.23, 0, 0, 0],
  ];
  // F · C · Bb · C — the plainest turn in the key, which is what a fight song
  // written in 1911 by somebody's uncle actually sounds like.
  const G_CHOP: number[][] = [
    [349.23, 440.00, 523.25],
    [329.63, 392.00, 523.25],
    [349.23, 466.16, 587.33],
    [329.63, 392.00, 523.25],
  ];
  const G_OOM: number[][] = [[87.31, 130.81], [130.81, 98.00], [116.54, 174.61], [130.81, 98.00]];
  // the four notes the crowd shouts in the gaps, which is the whole reason the
  // gaps are there
  const G_SHOUT: [number, number][] = [[349.23, 5], [349.23, 5.5], [440.00, 6], [523.25, 6.5]];

  let gdBus: GainNode | null = null;
  let gdAmb: GainNode | null = null;
  let gdStep = 0, gdNextT = 0;
  let gdTimer: ReturnType<typeof setInterval> | null = null;
  let gdRunning = false;
  let gAmbNextT = 0, gPaNextT = 0, gRoarNextT = 0;
  const GD_VOL = 0.42;   // in family with PIR_VOL 0.42 and MAP_VOL 0.40

  type GZoneId = 'bowl' | 'gate' | 'lot' | 'rvpark' | 'greek' | 'quad' | 'practice' | 'treeline';
  const GZONE_VOL: Record<GZoneId, number> = {
    bowl: 0.17, gate: 0.14, lot: 0.13, rvpark: 0.11,
    greek: 0.13, quad: 0.09, practice: 0.10, treeline: 0.10,
  };
  const gzones: Partial<Record<GZoneId, ZoneLayer>> = {};
  let gZone: GZoneId | null = null;
  // island.ts renames three of gameday.ts's districts on the way out, so both
  // spellings are listed — the same care MAPLE_DIST and GAMEDAY_DIST take.
  function gNormZone(z: string | null): GZoneId | null {
    switch (z) {
      case 'bowl': return 'bowl';
      case 'gate': case 'plaza': return 'gate';
      case 'lot': return 'lot';
      case 'rvpark': return 'rvpark';
      case 'greek': return 'greek';
      case 'quad': case 'campus': return 'quad';
      case 'practice': return 'practice';
      case 'treeline': case 'woods': return 'treeline';
      default: return null;
    }
  }

  function buildGBed(c: AudioContext, id: GZoneId, dest: AudioNode) {
    const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const lfo = c.createOscillator(); lfo.type = 'sine';
    const lfoG = c.createGain();
    if (id === 'bowl') {              // ninety thousand people, one wall of them
      f.type = 'bandpass'; f.frequency.value = 620; f.Q.value = 0.4;
      g.gain.value = 0.10; lfo.frequency.value = 0.09; lfoG.gain.value = 0.055;
    } else if (id === 'gate') {       // a queue: closer, brighter, more voices
      f.type = 'bandpass'; f.frequency.value = 980; f.Q.value = 0.55;
      g.gain.value = 0.075; lfo.frequency.value = 0.15; lfoG.gain.value = 0.032;
    } else if (id === 'lot') {        // the tailgate, plus somebody's car radio
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.5;
      g.gain.value = 0.062; lfo.frequency.value = 0.12; lfoG.gain.value = 0.028;
      // A CAR RADIO TWO ROWS OVER. Not a tune — a tuned hum through a paper
      // cone, which is what a radio sounds like from the far side of a truck.
      const rz = c.createOscillator(); rz.type = 'sawtooth'; rz.frequency.value = 174.61;
      const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 900; rf.Q.value = 5.5;
      const rg = c.createGain(); rg.gain.value = 0.009;
      rz.connect(rf); rf.connect(rg); rg.connect(dest); rz.start();
    } else if (id === 'rvpark') {     // a generator that has been on since Wednesday
      f.type = 'lowpass'; f.frequency.value = 280; f.Q.value = 0.7;
      g.gain.value = 0.05; lfo.frequency.value = 0.06; lfoG.gain.value = 0.02;
      const gz = c.createOscillator(); gz.type = 'sawtooth'; gz.frequency.value = 61;
      const gf = c.createBiquadFilter(); gf.type = 'lowpass'; gf.frequency.value = 240; gf.Q.value = 2;
      const gg = c.createGain(); gg.gain.value = 0.019;
      gz.connect(gf); gf.connect(gg); gg.connect(dest); gz.start();
    } else if (id === 'greek') {      // a party thump through a wall
      f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.6;
      g.gain.value = 0.055; lfo.frequency.value = 0.19; lfoG.gain.value = 0.03;
    } else if (id === 'quad') {       // the quiet one: grass, brick and distance
      f.type = 'lowpass'; f.frequency.value = 460; f.Q.value = 0.5;
      g.gain.value = 0.032; lfo.frequency.value = 0.05; lfoG.gain.value = 0.018;
    } else if (id === 'practice') {   // open ground, wind across it
      f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 0.5;
      g.gain.value = 0.04; lfo.frequency.value = 0.07; lfoG.gain.value = 0.026;
    } else {                          // THE TREE LINE: wind in dry autumn leaves
      f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.9;
      g.gain.value = 0.036; lfo.frequency.value = 0.055; lfoG.gain.value = 0.026;
    }
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(); lfo.start();
  }
  function gZoneLayer(c: AudioContext, id: GZoneId): ZoneLayer {
    let z = gzones[id];
    if (!z) {
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(musicBus!);
      z = { g, vol: GZONE_VOL[id], on: false, until: 0 };
      gzones[id] = z;
      buildGBed(c, id, g);
    }
    return z;
  }
  const gZoneLive = (id: GZoneId, now: number) => {
    const z = gzones[id];
    return !!z && (z.on || now < z.until);
  };
  function gApplyZones(fade = ZONE_FADE) {
    const c = ctx; if (!c || !master) return;
    const now = c.currentTime;
    for (const k of Object.keys(gzones) as GZoneId[]) {
      const z = gzones[k]!;
      if (k !== gZone && z.on) { z.on = false; z.until = now + fade; ramp(z.g.gain, 0, now, fade); }
    }
    if (gZone && gdRunning) {
      const z = gZoneLayer(c, gZone);
      if (!z.on) { z.on = true; z.until = 0; ramp(z.g.gain, z.vol, now, fade); }
    }
    if (gdBus) ramp(gdBus.gain, gdRunning ? GD_VOL : 0, now, fade);
  }

  // ── the sounds this world owns ────────────────────────────────────────────

  /** THE ROAR. The one sound the design contract names, and the single most
   *  characteristic noise a stadium makes: a long swell of eighty thousand
   *  people that arrives from nowhere, peaks, and takes four seconds to die
   *  away. Two bands of filtered noise — a body around 500 Hz and a bright
   *  edge near 2 kHz that comes in late — because a crowd is not one colour,
   *  it starts as a rumble and turns into voices. */
  function roar(dest: AudioNode, t: number, vol: number, dur = 4.2) {
    const c = ctx; if (!c) return;
    for (const [fc, q, k, lag] of [[520, 0.5, 1, 0], [1950, 0.8, 0.42, 0.5]] as number[][]) {
      const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fc; f.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t + lag);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * k), t + lag + dur * 0.26);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(dest);
      src.start(t + lag); src.stop(t + dur + 0.1);
    }
  }
  /** THE STADIUM PA, from outside the stadium. A syllabic contour through a
   *  horn: you can hear that somebody is reading a name and not which name,
   *  which is exactly right and also means it never needs translating. */
  function stadiumPa(dest: AudioNode, t: number, vol: number) {
    const c = ctx; if (!c) return;
    const horn = c.createBiquadFilter(); horn.type = 'bandpass';
    horn.frequency.value = 1250; horn.Q.value = 3.2; horn.connect(dest);
    const syl = [0, 0.17, 0.3, 0.47, 0.6, 0.78];
    const step = [0, 2, 3, 2, 5, 3];
    syl.forEach((o, i) => {
      const f = 168 * Math.pow(2, step[i] / 12);
      dTone(horn, t + o, 0.13, 'sawtooth', vol * (i === 4 ? 1.15 : 0.85), f, f * 1.03, 0, 0.012);
    });
    // and the tail of it bouncing off the far stand
    dTone(horn, t + 0.94, 0.2, 'sawtooth', vol * 0.28, 168 * Math.pow(2, 3 / 12), 0, 0, 0.03);
  }
  /** A whistle-and-thump: somebody kicking a ball on the practice field. */
  function kickThump(dest: AudioNode, t: number, vol: number) {
    nHit(dest, t, 0.05, vol, 'lowpass', 220, 70);
    dTone(dest, t, 0.09, 'sine', vol * 0.7, 120, 62, 0, 0.004);
  }
  /** A turnstile: a ratchet and a clack. Gate plaza only. */
  function turnstile(dest: AudioNode, t: number, vol: number) {
    for (let i = 0; i < 4; i++) nHit(dest, t + i * 0.035, 0.02, vol * 0.5, 'bandpass', 2600, 2600);
    nHit(dest, t + 0.17, 0.045, vol, 'bandpass', 1400, 900);
  }
  /** Cornhole: a bag landing on a board. Two thirds of a thump, one third of
   *  a slide, and it is the sound of the district the player spawns in. */
  function bagToss(dest: AudioNode, t: number, vol: number) {
    nHit(dest, t, 0.07, vol, 'lowpass', 700, 260);
    nHit(dest, t + 0.06, 0.11, vol * 0.35, 'bandpass', 1800, 900);
  }
  /** A grill, from about four metres. */
  function sizzle(dest: AudioNode, t: number, vol: number) {
    nHit(dest, t, 1.5, vol, 'highpass', 3200, 4200, 0.25);
  }

  function buildGDBus(c: AudioContext): GainNode {
    const bus = c.createGain(); bus.gain.value = 0.0001;
    // THE BAND IS OUTSIDE. A low-pass and a long reverb-ish delay is what a
    // hundred yards of open tarmac does to a brass band, and it is the whole
    // reason this reads as "somewhere you cannot see" rather than "in your ear".
    const air = c.createBiquadFilter(); air.type = 'lowpass';
    air.frequency.value = 2600; air.Q.value = 0.4;
    const dly = c.createDelay(1.2); dly.delayTime.value = 0.26;
    const fb = c.createGain(); fb.gain.value = 0.22;
    const wet = c.createGain(); wet.gain.value = 0.3;
    bus.connect(air); air.connect(musicBus!);
    air.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(musicBus!);
    return bus;
  }

  // ── the ambience ──────────────────────────────────────────────────────────
  function gdAmbience(c: AudioContext) {
    const dest = gdAmb; if (!dest) return;
    const now = c.currentTime;
    const st = Math.max(0, Math.min(3, musStage));
    if (gAmbNextT === 0) gAmbNextT = now + 2 + Math.random() * 3;
    while (gAmbNextT < now + 0.4) {
      const t = Math.max(now + 0.05, gAmbNextT);
      const r = Math.random();
      let gap = 5 + Math.random() * 6;
      switch (gZone) {
        case 'lot':
          if (r < 0.3) bagToss(dest, t, 0.05); else if (r < 0.55) sizzle(dest, t, 0.03);
          else if (r < 0.78) carPass(dest, t, 0.035); else holler(dest, t, 0.05, 2);
          break;
        case 'gate':
          if (r < 0.4) turnstile(dest, t, 0.045); else if (r < 0.75) crowdSwell(dest, t, 0.05);
          else refWhistle(dest, t, 0.04);
          gap = 4 + Math.random() * 4;
          break;
        case 'bowl':
          if (r < 0.5) crowdSwell(dest, t, 0.07, 2.0); else if (r < 0.8) holler(dest, t, 0.07, 3);
          else bDrum(dest, t, 0.06);
          gap = 3.5 + Math.random() * 4;
          break;
        case 'rvpark':
          if (r < 0.4) dogBark(dest, t, 0.03); else if (r < 0.7) sizzle(dest, t, 0.028)
          ; else windChime(dest, t, 0.028);
          gap = 7 + Math.random() * 7;
          break;
        case 'greek':
          if (r < 0.4) holler(dest, t, 0.06, 3); else if (r < 0.7) clap(dest, t, 0.045);
          else crowdSwell(dest, t, 0.045);
          break;
        case 'quad':
          if (r < 0.45) songbird(dest, t, 0.035); else if (r < 0.75) churchBell(dest, t, 0.03);
          else windChime(dest, t, 0.025);
          gap = 9 + Math.random() * 9;
          break;
        case 'practice':
          if (r < 0.4) refWhistle(dest, t, 0.05); else if (r < 0.7) kickThump(dest, t, 0.045);
          else mSnare(dest, t, 0.035, false);
          break;
        case 'treeline':
          if (r < 0.5) songbird(dest, t, 0.035); else if (r < 0.8) woodpecker(dest, t, 0.028);
          else crowdSwell(dest, t, 0.03, 2.4);
          gap = 8 + Math.random() * 8;
          break;
        default:
          if (r < 0.4) crowdSwell(dest, t, 0.035); else if (r < 0.7) carPass(dest, t, 0.03);
          else holler(dest, t, 0.04, 2);
          gap = 8 + Math.random() * 8;
      }
      gAmbNextT = t + gap;
    }
    // THE PA, from wherever you are on the plateau. Louder near the gates.
    if (gPaNextT === 0) gPaNextT = now + 10 + Math.random() * 8;
    while (gPaNextT < now + 0.4) {
      const t = Math.max(now + 0.05, gPaNextT);
      const near = gZone === 'bowl' || gZone === 'gate';
      stadiumPa(dest, t, near ? 0.05 : 0.028);
      gPaNextT = t + 17 + Math.random() * 13;
    }
    // AND THE ROAR. It gets louder as the match goes on and more frequent with
    // it — at stage 0 it is a thing that happens twice; by the fourth quarter
    // the stadium never quite stops. This is the sound the level is named for.
    if (gRoarNextT === 0) gRoarNextT = now + 12 + Math.random() * 10;
    while (gRoarNextT < now + 0.4) {
      const t = Math.max(now + 0.05, gRoarNextT);
      const near = gZone === 'bowl' || gZone === 'gate' ? 1.7 : 1;
      roar(dest, t, (0.035 + st * 0.022) * near, 3.6 + Math.random() * 1.6);
      gRoarNextT = t + (26 - st * 5) + Math.random() * 14;
    }
  }

  // ── the scheduler ─────────────────────────────────────────────────────────
  // Same lookahead pump as the other two. Cut time, and the tempo climbs with
  // the stage the way a band speeds up when the score is close.
  function gdSchedule() {
    const c = ensure(); if (!c || !gdBus) return;
    const st = Math.max(0, Math.min(3, musStage));
    const spb = 60 / (112 + st * 8);
    const s16 = spb / 4;
    const now = c.currentTime;
    if (gdNextT < now) gdNextT = now + 0.05;
    while (gdNextT < now + 0.35) {
      const t = gdNextT;
      const barN = Math.floor(gdStep / 16);
      const bar = barN & 3;
      const ph = barN & 7;
      const sx = gdStep % 16;
      const e = sx >> 1, onE = (sx & 1) === 0;
      const ch = G_CHOP[bar];
      const note = G_HOOK[bar][e];

      // ── THE DRUMLINE. Present from the first bar and never absent: at stage
      //    0 it is the ONLY thing playing, which is what "warming up under the
      //    stands" sounds like from a car park two hundred yards away.
      if (sx === 0 || sx === 8) bDrum(gdBus, t, 0.15 + st * 0.02);
      if (sx === 4 || sx === 12) mSnare(gdBus, t + drag(0.008), 0.075 + st * 0.012);
      if (sx === 14 || sx === 15) mSnare(gdBus, t + drag(0.006), 0.028, false);
      if (st >= 1 && (sx === 2 || sx === 6 || sx === 10)) mSnare(gdBus, t + drag(0.01), 0.02, false);
      if (st >= 2 && ph === 7 && sx === 15) mSnare(gdBus, t - 0.02, 0.038, false);
      if (st >= 1 && ph === 0 && sx === 0) crash(gdBus, t, 0.04 + st * 0.012);

      // ── WARMING UP. Stage 0 is meant to be a drumline two hundred yards
      //    away and nothing else, and measured against the other two scores
      //    that came out at 37 scheduled events per eight seconds against
      //    Maple's 95 — the conceit was right and the result was a hole. A
      //    band before a game is not silent, it is TUNING: long single notes
      //    at no particular tempo, one player at a time, nobody together. So
      //    that is what fills it, and it disappears the moment the band
      //    actually starts playing at stage 1.
      //    THE TUNING WAS NOT ENOUGH. Measured again, per world, at the radius
      //    a player actually starts at: Maple 14 voices a second, Lantern 29,
      //    Pirate Bay 44 — and GAME DAY 4. It comes back to 31 the instant the
      //    player grows, so the hole is exactly the opening, which is the one
      //    stretch of a football world that has to sound like a football
      //    world. On a phone speaker in a room with a television on, four
      //    events a second is silence, and the first thing anybody would say
      //    is that the music is broken.
      //
      //    The fix is not to make stage 0 louder — it is to give it the thing
      //    a drumline actually does before a game. They do not tune. They run
      //    the same rudiment for twenty minutes: eights on a hand, right hand
      //    then left, quiet, relentless, nowhere near the tune. That fills the
      //    bar honestly, stays two hundred yards away, and still leaves stage
      //    1 the moment where the band starts PLAYING.
      if (st === 0) {
        // eights on a hand — the accent falls on the quarter, the rest are taps
        if (sx % 2 === 0) mSnare(gdBus, t + drag(0.016), sx % 4 === 0 ? 0.019 : 0.011, false);
        // and the stick clicks between them, the two rests of the exercise
        if (sx === 7 || sx === 15) nHit(gdBus, t + drag(0.012), 0.03, 0.014, 'highpass', 2400, 1.1);
        if (sx === 0 && (barN & 1) === 0) {
          const warm = G_HOOK[(barN >> 1) & 3];
          const pick = warm[(barN * 5) % 8] || 349.23;
          brass(gdBus, pick, t + drag(0.06), spb * 2.4, 0.028);
        }
        if (sx === 8 && (barN % 3) === 1) sousa(gdBus, G_OOM[bar][0], t + drag(0.05), spb * 1.8, 0.075);
        if (sx === 4 && (barN % 4) === 2) glock(gdBus, G_HOOK[bar][2] * 2 || 880, t, spb * 1.4, 0.018);
      }

      // ── THE SOUSAPHONE finds the bottom at stage 1 and never lets go
      if (st >= 1) {
        if (sx === 0) sousa(gdBus, G_OOM[bar][0], t + drag(0.012), spb * 0.8, 0.17);
        if (sx === 8) sousa(gdBus, G_OOM[bar][1], t + drag(0.012), spb * 0.7, 0.14);
        if (st >= 3 && (sx === 4 || sx === 12)) sousa(gdBus, G_OOM[bar][0] * 2, t + drag(0.016), spb * 0.3, 0.06);
      }
      // the off-beat chop: the horn section punching two and four
      if (st >= 1 && (sx === 4 || sx === 12)) chop(gdBus, ch, t, spb * 0.32, 0.05);

      // ── THE TUNE. Cornets from stage 2; before that only the tops of the
      //    phrase get through, which is how a band sounds across open ground.
      if (onE && note > 0) {
        if (st >= 2) brass(gdBus, note, t + drag(0.016), spb * 0.6, 0.055);
        else if (st >= 1 && e === 0) brass(gdBus, note, t + drag(0.02), spb * 0.7, 0.03);
        if (st >= 3 && e % 2 === 0) glock(gdBus, note * 2, t - 0.008, spb * 0.85, 0.024);
      }

      // ── THE CROWD ANSWERS. The rests in bars 1 and 3 are where a real crowd
      //    shouts the team's name back, so that is what goes there.
      if (st >= 1 && (bar === 1 || bar === 3) && onE) {
        for (const [f, at] of G_SHOUT) {
          if (e === Math.floor(at) && (at % 1 === 0)) holler(gdBus, t, 0.05 + st * 0.02, 1 + st);
          if (e === Math.floor(at) && st >= 2 && at % 1 !== 0) brass(gdBus, f * 2, t + spb * 0.5, spb * 0.4, 0.025);
        }
      }
      // the drum major, once a phrase, from stage 2
      if (st >= 2 && ph === 4 && sx === 0) refWhistle(gdBus, t - 0.03, 0.04);
      // ninety thousand people, on the top of every other phrase, at the end
      if (st >= 3 && ph === 0 && sx === 0) crowdSwell(gdBus, t, 0.06, 1.8);

      // ── AND THE DISTRICT PLAYS ALONG. Standing on the practice field puts a
      //    second drumline in the mix, a half-bar behind, the way two bands
      //    warming up in earshot of each other never quite line up.
      if (gZoneLive('practice', t) && sx % 4 === 2) {
        mSnare(gzones.practice!.g, t + drag(0.014), 0.03, false);
      }
      // …and on Frat Row the thump next door is on the same beat as the band,
      // because they are playing along with it out of a window.
      if (gZoneLive('greek', t) && (sx === 0 || sx === 8)) {
        bDrum(gzones.greek!.g, t + drag(0.01), 0.05);
      }

      gdNextT += s16; gdStep++;
    }
    gdAmbience(c);
  }
  function startGameday() {
    const c = ensure(); if (!c || !master) return;
    if (!gdBus) gdBus = buildGDBus(c);
    if (!gdAmb) { gdAmb = c.createGain(); gdAmb.gain.value = 0.0001; gdAmb.connect(musicBus!); }
    gdRunning = true;
    ramp(gdAmb.gain, 0.4, c.currentTime, 1.6);
    gdStep = 0; gdNextT = c.currentTime + 0.12;
    gAmbNextT = 0; gPaNextT = 0; gRoarNextT = 0;
    gApplyZones(1.5);
    if (gdTimer) clearInterval(gdTimer);
    gdTimer = setInterval(gdSchedule, 110);
  }
  function stopGameday(fade: number) {
    gdRunning = false;
    if (gdTimer) { clearInterval(gdTimer); gdTimer = null; }
    const c = ctx; if (!c) return;
    const now = c.currentTime;
    if (gdBus) ramp(gdBus.gain, 0, now, fade);
    if (gdAmb) ramp(gdAmb.gain, 0, now, fade);
    for (const k of Object.keys(gzones) as GZoneId[]) {
      const z = gzones[k]!; z.on = false; z.until = 0; ramp(z.g.gain, 0, now, fade);
    }
    gZone = null;
  }

  // ── GAME DAY's one-shots, straight to master (see the note on the town's) ──
  /** Evolution: the band hits it, and the crowd goes up. */
  function gamedayEvolve() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime + 0.01;
    bDrum(master, t, 0.2); crash(master, t, 0.09);
    mSnare(master, t + drag(0.006), 0.09);
    [349.23, 440.00, 523.25].forEach((f, i) => brass(master!, f, t + i * 0.06, 0.42, 0.075));
    holler(master, t + 0.18, 0.16, 3);
    crowdSwell(master, t + 0.1, 0.075, 1.4);
  }
  /** KICKOFF: a whistle, and everybody on their feet. */
  function kickoffSting(t: number) {
    if (!master) return;
    refWhistle(master, t, 0.09);
    bDrum(master, t + 0.18, 0.2);
    roar(master, t + 0.16, 0.075, 2.6);
    [523.25, 587.33, 698.46].forEach((f, i) => brass(master!, f, t + 0.22 + i * 0.08, 0.34, 0.06));
  }
  /** THE BAND TAKES THE FIELD: a drum major's whistle and the whole line. */
  function bandOnSting(t: number) {
    if (!master) return;
    refWhistle(master, t, 0.08);
    for (let i = 0; i < 6; i++) mSnare(master!, t + 0.12 + i * 0.085, 0.03 + i * 0.009, i > 3);
    bDrum(master, t + 0.62, 0.2); crash(master, t + 0.62, 0.07);
    G_HOOK[0].forEach((f, i) => { if (f > 0) brass(master!, f, t + 0.66 + i * 0.09, 0.3, 0.055); });
    holler(master, t + 0.72, 0.14, 3);
  }
  /** CONCESSION RUSH: a counter bell, a turnstile and a lot of feet. */
  function concessionSting(t: number) {
    if (!master) return;
    glock(master, 1567.98, t, 0.45, 0.1);
    glock(master, 1318.51, t + 0.1, 0.5, 0.085);
    turnstile(master, t + 0.16, 0.06);
    for (let i = 0; i < 5; i++) nHit(master!, t + 0.3 + i * 0.07, 0.05, 0.03, 'lowpass', 400, 180);
    holler(master, t + 0.5, 0.12, 2);
  }
  /** FOURTH QUARTER: the biggest moment on this world. A roll into the band's
   *  own big bar, and eighty thousand people underneath the whole thing. */
  function fourthQuarterSting(t: number) {
    if (!master) return;
    for (let i = 0; i < 10; i++) mSnare(master!, t + i * 0.058, 0.022 + i * 0.006, i > 6);
    refWhistle(master, t + 0.42, 0.075);
    roar(master, t + 0.3, 0.10, 4.4);
    bDrum(master, t + 0.62, 0.24); crash(master, t + 0.62, 0.1);
    G_HOOK[3].forEach((f, i) => {
      if (f <= 0) return;
      brass(master!, f, t + 0.66 + i * 0.1, 0.4, 0.07);
      sousa(master!, f / 4, t + 0.66 + i * 0.1, 0.36, 0.09);
    });
    glock(master, 1396.91, t + 1.14, 0.8, 0.035);
    holler(master, t + 0.9, 0.18, 4);
  }


  // ══════════════════════════════════════════════════════════════════════════
  //  LANTERN NIGHT — a festival, and then not a festival
  //
  //  Until this existed the spirit market played MAPLE FALLS' town band: an
  //  American small-town brass ensemble, cornets and a sousaphone, over a
  //  Japanese night market. It is the single loudest thing a world can get
  //  wrong, because a player hears the score before they have finished looking
  //  at the ground.
  //
  //  THE ONE IDEA. This level's whole subject is a welcome that curdles — the
  //  spirits walk TOWARD the void for the first minute because they think it
  //  is a guest, and away from it for the last. The score says that in the
  //  scale itself. It opens on the YO scale (D E G A B — no half-steps, the
  //  bright pentatonic of festival music, the one that sounds like a welcome)
  //  and moves to the IN scale (D Eb G A Bb — the same five degrees with two
  //  of them flattened) as the match escalates. Two notes move. Nothing else
  //  about the arrangement has to change for the whole thing to turn, and a
  //  child will feel it happen without ever being able to say what happened.
  //
  //  A NOTE ON WHERE THIS COMES FROM, matching the one in nightmarket.ts. The
  //  instruments are the standard ensemble of a matsuri: taiko, a shime drum,
  //  the atarigane hand gong, shrine suzu, wooden hyoshigi clappers, koto and
  //  shakuhachi. Those are folk instruments and folk scales, the same well
  //  every telling of a festival night draws from. No melody here quotes any
  //  particular piece, and none should be added that does.
  // ══════════════════════════════════════════════════════════════════════════
  const isLantern = () => worldId() === 'lantern';

  // The two scales, one octave, in Hz. Same root, same five degrees; the 2nd
  // and the 6th drop a semitone. That is the entire dramatic device.
  const YO = [293.66, 329.63, 392.00, 440.00, 493.88];   // D  E  G  A  B
  const IN = [293.66, 311.13, 392.00, 440.00, 466.16];   // D  Eb G  A  Bb
  /** The scale at the current stage, with the two notes bending across rather
   *  than switching — at stage 1 the level is a third of the way unhappy. */
  function lnScale(): number[] {
    const k = Math.max(0, Math.min(1, musStage / 3));
    return YO.map((f, i) => f * Math.pow(IN[i] / f, k));
  }
  const lnDeg = (d: number) => {
    const sc = lnScale();
    const oct = Math.floor(d / 5);
    return sc[((d % 5) + 5) % 5] * Math.pow(2, oct);
  };

  // ── the voices ────────────────────────────────────────────────────────────
  /** KOTO. A plucked silk string over a paulownia box: a bright, slightly
   *  buzzy attack that decays fast into a woody body. Built as a sawtooth
   *  through a falling low-pass — the sweep IS the pluck — plus the nail's
   *  click on the fx bus so it reads as struck rather than as a synth pad. */
  function koto(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; if (!c || freq <= 0 || vol <= 0) return;
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    // the press-bend a player makes behind the bridge: a few cents, upward,
    // and it is most of what separates a koto from a harp
    o.frequency.linearRampToValueAtTime(freq * 1.004, t + Math.min(0.25, dur));
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.6;
    f.frequency.setValueAtTime(Math.min(9000, freq * 11), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 2.2), t + dur * 0.7);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
    nEnv(fxFor(dest, 'nail'), t, 0.02, vol * 0.5);
  }

  /** SHAKUHACHI. An end-blown bamboo flute, and the reason it does not sound
   *  like a sine wave is BREATH: the tone is half air. A sine for the pitch, a
   *  band-passed noise bed riding the same envelope for the wind in the tube,
   *  and a slow attack because you cannot start a bamboo flute instantly. */
  function shaku(dest: AudioNode, freq: number, t: number, dur: number, vol: number) {
    const c = ctx; if (!c || freq <= 0 || vol <= 0) return;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 0.985, t);
    o.frequency.linearRampToValueAtTime(freq, t + Math.min(0.14, dur * 0.4));
    // the player's vibrato, which on this instrument is made with the head
    const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 4.6;
    const lfoG = c.createGain(); lfoG.gain.value = freq * 0.012;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.11, dur * 0.35));
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
    lfo.start(t); lfo.stop(t + dur + 0.05);
    // the air, at a third of the level and centred on the tone
    nHit(dest, t, dur, vol * 0.32, 'bandpass', freq * 1.6, 2.2, freq * 1.4, 0.09);
  }

  /** TAIKO. The big drum: a low sine dropping fast — that pitch drop is what
   *  the ear reads as a large struck skin — with the skin's own slap on top. */
  function taiko(dest: AudioNode, t: number, vol: number, big = true) {
    dTone(dest, t, big ? 0.5 : 0.3, 'sine', vol, big ? 128 : 190, big ? 52 : 88, 0, 0.002);
    nEnv(fxFor(dest, 'skin'), t, big ? 0.12 : 0.07, vol * 0.55, 0.001);
  }
  /** SHIME. The small rope-tuned drum that keeps the actual time. Tight, high,
   *  and it is the pulse the feet follow. */
  function shime(dest: AudioNode, t: number, vol: number) {
    dTone(dest, t, 0.09, 'sine', vol * 0.7, 640, 380, 0, 0.001);
    nEnv(fxFor(dest, 'shime'), t, 0.05, vol, 0.001);
  }
  /** ATARIGANE. The little hand gong struck with a deer-horn beater — the
   *  "chan-chiki-chin" that sits on top of every festival ensemble. Metallic,
   *  which means INHARMONIC: three partials at ratios that are not integers. */
  function kane(dest: AudioNode, t: number, vol: number, open = true) {
    const d = open ? 0.42 : 0.09;
    for (const [r, a] of [[1, 1], [2.41, 0.6], [3.83, 0.34], [5.9, 0.18]] as const)
      dTone(dest, t, d * (1 - 0.12 * r / 6), 'sine', vol * a, 1180 * r, 0, 0, 0.001);
    nEnv(fxFor(dest, 'gong'), t, 0.03, vol * 0.5, 0.001);
  }
  /** SUZU. The shrine's bell cluster — a dozen tiny bells on a ring, shaken.
   *  A single bright shimmer, not a pitch. */
  function suzu(dest: AudioNode, t: number, vol: number, dur = 0.5) {
    for (let i = 0; i < 7; i++)
      dTone(dest, t + Math.random() * dur * 0.5, 0.13 + Math.random() * 0.16, 'sine',
        vol * (0.3 + Math.random() * 0.5), 2400 + Math.random() * 2600, 0, 0, 0.002);
    nHit(dest, t, dur, vol * 0.4, 'highpass', 5200, 0.7, 0, 0.01);
  }
  /** HYOSHIGI. Two blocks of hardwood struck together — the sound that starts
   *  a performance, and about as dry as a sound gets. */
  function clack(dest: AudioNode, t: number, vol: number) {
    nEnv(fxFor(dest, 'clack'), t, 0.028, vol, 0.0008);
    dTone(dest, t, 0.03, 'square', vol * 0.3, 1900, 1200, 0, 0.001);
  }
  /** A stall's griddle. Not music — but a market's real bed is FRYING, and
   *  this is the only world where the food makes a noise. */
  function griddle(dest: AudioNode, t: number, vol: number, dur = 0.8) {
    nHit(dest, t, dur, vol, 'highpass', 3800, 0.6, 6400, 0.06);
  }
  /** Water: the canal against a hull, or a spring over rock. */
  function water(dest: AudioNode, t: number, vol: number, dur = 0.7) {
    nHit(dest, t, dur, vol, 'bandpass', 700 + Math.random() * 900, 1.4, 300, 0.08);
  }
  /** Wooden sandals on a boardwalk — two taps, because feet come in pairs. */
  function geta(dest: AudioNode, t: number, vol: number) {
    nEnv(fxFor(dest, 'clack'), t, 0.022, vol * 0.7, 0.0008);
    nEnv(fxFor(dest, 'clack'), t + 0.13 + Math.random() * 0.05, 0.022, vol * 0.5, 0.0008);
  }
  /** The market talking. A crowd is not a sound, it is a shape: a slow swell
   *  of band-passed noise with no attack the ear can find. */
  function murmur(dest: AudioNode, t: number, vol: number, dur = 2.4) {
    nHit(dest, t, dur, vol, 'bandpass', 520, 0.8, 700, dur * 0.4);
  }
  /** A stallholder calling. One syllable, pitched, and gone. */
  function callOut(dest: AudioNode, t: number, vol: number) {
    const f = 210 + Math.random() * 150;
    dTone(dest, t, 0.3, 'sawtooth', vol * 0.16, f, f * 1.5, f * 0.8, 0.03);
    nHit(dest, t, 0.32, vol * 0.2, 'bandpass', 900, 1.6, 1500, 0.03);
  }
  /** Bamboo in wind: hollow stems knocking together up on the valley wall. */
  function bambooKnock(dest: AudioNode, t: number, vol: number) {
    for (let i = 0; i < 2 + ((Math.random() * 3) | 0); i++)
      dTone(dest, t + i * (0.07 + Math.random() * 0.09), 0.07, 'sine',
        vol * (0.5 + Math.random() * 0.5), 300 + Math.random() * 420, 200, 0, 0.001);
  }

  // ── the bed ───────────────────────────────────────────────────────────────
  let lnBus: GainNode | null = null;
  let lnAmb: GainNode | null = null;
  let lnRunning = false;
  let lnTimer: ReturnType<typeof setInterval> | null = null;
  let lnStep = 0;
  let lnNextT = 0;
  let lAmbNextT = 0;
  /** THE BAND IS ACROSS THE WATER. Same trick GAME DAY uses for a band on the
   *  far side of a car park, tuned differently: a valley at night is small and
   *  wet, so the delay is shorter and the feedback higher than the stadium's —
   *  a slap off the far bank rather than an open field. */
  function buildLnBus(c: AudioContext): GainNode {
    const bus = c.createGain(); bus.gain.value = 0.0001;
    const air = c.createBiquadFilter(); air.type = 'lowpass';
    air.frequency.value = 3400; air.Q.value = 0.4;
    const dly = c.createDelay(1.0); dly.delayTime.value = 0.19;
    const fb = c.createGain(); fb.gain.value = 0.3;
    const wet = c.createGain(); wet.gain.value = 0.26;
    bus.connect(air); air.connect(musicBus!);
    air.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(musicBus!);
    return bus;
  }

  // 16 steps to the bar at about 100bpm, which is walking pace — this is
  // processional music and it should be possible to walk to it.
  const LN_SPB = 0.15;
  /** The koto figure, by stage. Degrees into lnScale(), -1 for a rest. The
   *  phrase does not change as the level turns; only the tuning does. */
  const L_KOTO: number[][] = [
    [0, -1, 2, -1, 4, -1, 2, -1, 0, -1, -1, -1, 2, -1, -1, -1],
    [0, -1, 2, 4, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1],
    [0, 2, 4, 5, 7, -1, 5, 4, 2, -1, 0, 2, 4, -1, 5, 7],
    [0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 2, 4, 5, 7, 9],
  ];
  /** The taiko pattern, by stage: 2 = the big drum, 1 = a rim, 0 = nothing. */
  const L_TAIKO: number[][] = [
    [2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 1, 0, 0],
    [2, 0, 1, 1, 0, 1, 1, 0, 2, 0, 1, 1, 0, 1, 1, 1],
    [2, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1],
  ];

  function lnSchedule() {
    const c = ctx; if (!c || !lnRunning || !lnBus) return;
    const now = c.currentTime;
    if (lnNextT === 0) lnNextT = now + 0.1;
    const st = Math.max(0, Math.min(3, musStage));
    while (lnNextT < now + 0.35) {
      const t = Math.max(now + 0.02, lnNextT);
      const i = lnStep & 15;
      const bar = (lnStep >> 4) & 7;

      // THE PULSE. The shime keeps eighths under everything; that steady tick
      // is what makes the whole thing feel like a procession moving past you
      // rather than a loop playing at you.
      if (i % 2 === 0) shime(lnBus, t, 0.030 + st * 0.006);
      // …and the drum
      const dr = L_TAIKO[st][i];
      if (dr === 2) taiko(lnBus, t, 0.115 + st * 0.016, true);
      else if (dr === 1) taiko(lnBus, t, 0.05 + st * 0.008, false);

      // THE HAND GONG. Chan-chiki-chin: a long stroke on the beat and two
      // damped ones after it. The most identifiably festival thing here.
      if (i === 0 || i === 8) kane(lnBus, t, 0.048, true);
      else if (i === 3 || i === 6 || i === 11 || i === 14) kane(lnBus, t, 0.030, false);

      // THE KOTO figure.
      const d = L_KOTO[st][i];
      if (d >= 0) koto(lnBus, lnDeg(d), t, 0.34 + Math.random() * 0.2, 0.055 + st * 0.008);

      // THE FLUTE, over the top of every other bar and never on the beat —
      // shakuhachi phrasing floats free of the drum, which is what stops the
      // whole thing sounding like a metronome with a tune attached.
      if (i === 5 && bar % 2 === 0) {
        const line = [7, 5, 4, 7, 9][bar % 5];
        shaku(lnBus, lnDeg(line), t, 0.9 + Math.random() * 0.5, 0.05 + st * 0.006);
      }
      if (i === 12 && bar % 4 === 2) shaku(lnBus, lnDeg(4), t, 1.3, 0.045);

      // THE CLAPPERS, at the top of every fourth bar: the signal that the next
      // part of the performance is starting.
      if (i === 0 && bar % 4 === 0) { clack(lnBus, t, 0.06); clack(lnBus, t + 0.11, 0.045); }

      lnStep++; lnNextT += LN_SPB;
    }
    lnAmbience(c);
  }

  function startLantern() {
    const c = ensure(); if (!c || !master) return;
    if (!lnBus) lnBus = buildLnBus(c);
    if (!lnAmb) { lnAmb = c.createGain(); lnAmb.gain.value = 0.0001; lnAmb.connect(musicBus!); }
    lnRunning = true;
    ramp(lnBus.gain, 0.5, c.currentTime, 2.2);
    ramp(lnAmb.gain, 0.42, c.currentTime, 1.8);
    lnStep = 0; lnNextT = c.currentTime + 0.12;
    lAmbNextT = 0;
    lApplyZones(1.5);
    if (lnTimer) clearInterval(lnTimer);
    lnTimer = setInterval(lnSchedule, 110);
  }
  function stopLantern(fade: number) {
    lnRunning = false;
    if (lnTimer) { clearInterval(lnTimer); lnTimer = null; }
    const c = ctx; if (!c) return;
    const now = c.currentTime;
    if (lnBus) ramp(lnBus.gain, 0, now, fade);
    if (lnAmb) ramp(lnAmb.gain, 0, now, fade);
    for (const k of Object.keys(lzones) as LZoneId[]) {
      const z = lzones[k]!; z.on = false; z.until = 0; ramp(z.g.gain, 0, now, fade);
    }
    lZone = null;
  }

  // ── the districts ─────────────────────────────────────────────────────────
  // Ten of them, and each one is a PLACE before it is a mix level: the market
  // fries and shouts, the shrine rings and goes quiet, the spring is the only
  // district whose sound comes from the ground.
  type LZoneId = 'stalls' | 'canal' | 'gate' | 'shrine' | 'teahouse'
    | 'bridge' | 'garden' | 'bathhouse' | 'onsen' | 'bamboo';
  const LZONE_VOL: Record<LZoneId, number> = {
    stalls: 0.17, canal: 0.11, gate: 0.12, shrine: 0.10, teahouse: 0.10,
    bridge: 0.09, garden: 0.08, bathhouse: 0.15, onsen: 0.11, bamboo: 0.09,
  };
  const lzones: Partial<Record<LZoneId, ZoneLayer>> = {};
  let lZone: LZoneId | null = null;
  // island.ts renames three of lantern.ts's districts on the way out, so both
  // spellings are listed — the same care MAPLE_DIST and GAMEDAY_DIST take.
  function lNormZone(z: string | null): LZoneId | null {
    switch (z) {
      case 'stalls': return 'stalls';
      case 'canal': return 'canal';
      case 'gate': case 'torii': return 'gate';
      case 'shrine': return 'shrine';
      case 'teahouse': return 'teahouse';
      case 'bridge': case 'moonbridge': return 'bridge';
      case 'garden': case 'nightgarden': return 'garden';
      case 'bathhouse': return 'bathhouse';
      case 'onsen': return 'onsen';
      case 'bamboo': return 'bamboo';
      default: return null;
    }
  }
  /** Each district's continuous bed — one noise source, one filter, one slow
   *  LFO. Everything episodic (a call, a bell, a splash) is scheduled by the
   *  ambience loop instead; a bed is the thing that is ALWAYS there. */
  function buildLBed(c: AudioContext, id: LZoneId, dest: AudioNode) {
    const src = c.createBufferSource(); src.buffer = white(c); src.loop = true;
    const f = c.createBiquadFilter();
    const g = c.createGain();
    const lfo = c.createOscillator(); lfo.type = 'sine';
    const lfoG = c.createGain();
    switch (id) {
      case 'stalls':                    // frying, and a hundred people talking
        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.5;
        g.gain.value = 0.9; lfo.frequency.value = 0.19; lfoG.gain.value = 0.34; break;
      case 'canal':                     // water against stone, and hulls
        f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.9;
        g.gain.value = 0.7; lfo.frequency.value = 0.32; lfoG.gain.value = 0.36; break;
      case 'gate':                      // wide, stone, and mostly empty
        f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 0.5;
        g.gain.value = 0.5; lfo.frequency.value = 0.11; lfoG.gain.value = 0.2; break;
      case 'shrine':                    // the quietest bed in the level
        f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 0.6;
        g.gain.value = 0.42; lfo.frequency.value = 0.08; lfoG.gain.value = 0.18; break;
      case 'teahouse':                  // a room, not a street: close and warm
        f.type = 'bandpass'; f.frequency.value = 640; f.Q.value = 0.7;
        g.gain.value = 0.55; lfo.frequency.value = 0.15; lfoG.gain.value = 0.22; break;
      case 'bridge':                    // water underneath, air above
        f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 1.1;
        g.gain.value = 0.6; lfo.frequency.value = 0.26; lfoG.gain.value = 0.3; break;
      case 'garden':                    // crickets, and not much else
        f.type = 'highpass'; f.frequency.value = 4200; f.Q.value = 0.6;
        g.gain.value = 0.34; lfo.frequency.value = 0.55; lfoG.gain.value = 0.24; break;
      case 'bathhouse':                 // a huge wooden building full of water
        f.type = 'lowpass'; f.frequency.value = 300; f.Q.value = 1.4;
        g.gain.value = 1.0; lfo.frequency.value = 0.13; lfoG.gain.value = 0.4; break;
      case 'onsen':                     // steam, which is the only white noise
        f.type = 'highpass'; f.frequency.value = 2600; f.Q.value = 0.5;
        g.gain.value = 0.7; lfo.frequency.value = 0.22; lfoG.gain.value = 0.26; break;
      default:                          // bamboo: wind, high and thin
        f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.4;
        g.gain.value = 0.5; lfo.frequency.value = 0.09; lfoG.gain.value = 0.34; break;
    }
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(); lfo.start();
  }
  function lZoneLayer(c: AudioContext, id: LZoneId): ZoneLayer {
    let z = lzones[id];
    if (!z) {
      const g = c.createGain(); g.gain.value = 0.0001; g.connect(musicBus!);
      z = { g, vol: LZONE_VOL[id], on: false, until: 0 };
      lzones[id] = z;
      buildLBed(c, id, g);
    }
    return z;
  }
  function lApplyZones(fade = ZONE_FADE) {
    const c = ctx; if (!c || !master) return;
    const now = c.currentTime;
    for (const k of Object.keys(lzones) as LZoneId[]) {
      const z = lzones[k]!;
      if (k !== lZone && z.on) { z.on = false; z.until = now + fade; ramp(z.g.gain, 0, now, fade); }
    }
    if (lZone && lnRunning) {
      const z = lZoneLayer(c, lZone);
      if (!z.on) { z.on = true; z.until = 0; ramp(z.g.gain, z.vol, now, fade); }
    }
  }

  /** The episodic layer — what the district DOES, on top of what it sounds
   *  like. Gaps are per-district: a market street should never be silent, a
   *  shrine should mostly be. */
  function lnAmbience(c: AudioContext) {
    const dest = lnAmb; if (!dest) return;
    const now = c.currentTime;
    const st = Math.max(0, Math.min(3, musStage));
    if (lAmbNextT === 0) lAmbNextT = now + 1.5 + Math.random() * 2.5;
    while (lAmbNextT < now + 0.4) {
      const t = Math.max(now + 0.05, lAmbNextT);
      const r = Math.random();
      let gap = 4 + Math.random() * 5;
      switch (lZone) {
        case 'stalls':
          // the busiest district in the game, and it never stops
          if (r < 0.34) griddle(dest, t, 0.09, 0.7 + Math.random() * 0.8);
          else if (r < 0.62) callOut(dest, t, 0.10);
          else if (r < 0.82) murmur(dest, t, 0.055, 2.4);
          else geta(dest, t, 0.05);
          gap = 1.1 + Math.random() * 1.6;
          break;
        case 'canal':
          if (r < 0.6) water(dest, t, 0.07, 0.6 + Math.random() * 0.7);
          else if (r < 0.85) murmur(dest, t, 0.035, 2.6);
          else callOut(dest, t, 0.05);
          gap = 1.6 + Math.random() * 2.0;
          break;
        case 'gate':
          if (r < 0.5) taiko(dest, t, 0.075, true);       // the drum tower
          else if (r < 0.8) geta(dest, t, 0.055);
          else murmur(dest, t, 0.04, 3.0);
          gap = 2.6 + Math.random() * 3.0;
          break;
        case 'shrine':
          if (r < 0.5) suzu(dest, t, 0.06, 0.6);
          else if (r < 0.78) clack(dest, t, 0.045);        // two claps, at the box
          else kane(dest, t, 0.05, true);
          gap = 3.4 + Math.random() * 4.0;
          break;
        case 'teahouse':
          if (r < 0.4) koto(dest, lnDeg(2 + ((Math.random() * 5) | 0)), t, 0.5, 0.05);
          else if (r < 0.72) murmur(dest, t, 0.04, 2.2);
          else clack(dest, t, 0.03);                       // a cup on a tray
          gap = 2.4 + Math.random() * 2.8;
          break;
        case 'bridge':
          if (r < 0.5) geta(dest, t, 0.06);                // everyone walks over
          else if (r < 0.8) water(dest, t, 0.05, 0.8);
          else murmur(dest, t, 0.035, 2.4);
          gap = 2.0 + Math.random() * 2.4;
          break;
        case 'garden':
          if (r < 0.55) bambooKnock(dest, t, 0.04);
          else if (r < 0.8) water(dest, t, 0.035, 1.0);    // the koi ponds
          else suzu(dest, t, 0.03, 0.4);
          gap = 3.0 + Math.random() * 3.6;
          break;
        case 'bathhouse':
          // the finale, and it should sound like the biggest room in the game
          if (r < 0.34) water(dest, t, 0.085, 1.1);
          else if (r < 0.6) geta(dest, t, 0.075);
          else if (r < 0.82) taiko(dest, t, 0.06, true);
          else murmur(dest, t, 0.06, 2.6);
          gap = 1.5 + Math.random() * 1.9;
          break;
        case 'onsen':
          if (r < 0.62) water(dest, t, 0.075, 1.3);        // the spouts
          else if (r < 0.86) murmur(dest, t, 0.03, 3.0);
          else bambooKnock(dest, t, 0.035);
          gap = 1.8 + Math.random() * 2.2;
          break;
        case 'bamboo':
          if (r < 0.7) bambooKnock(dest, t, 0.055);
          else suzu(dest, t, 0.025, 0.5);
          gap = 2.6 + Math.random() * 3.4;
          break;
        default:
          if (r < 0.5) murmur(dest, t, 0.04, 2.6);
          else geta(dest, t, 0.05);
          gap = 2.6 + Math.random() * 3.0;
      }
      // AND THE CROWD TURNS. By the last act the market is not talking any
      // more, it is reacting — so the ambience thins out and what is left of
      // it is the drum. A festival with the chatter taken out of it is a
      // genuinely unsettling sound, and it costs one branch.
      if (st >= 2 && Math.random() < 0.28 + st * 0.08) taiko(dest, t + 0.2, 0.07, true);
      lAmbNextT = t + gap * (st >= 2 ? 1.35 : 1);
    }
  }

  // ── LANTERN NIGHT's one-shots, straight to master ─────────────────────────
  /** Evolution: the ensemble hits it together and the gong rings open. */
  function lanternEvolve() {
    const c = ensure(); if (!c || !master) return;
    const t = c.currentTime + 0.01;
    taiko(master, t, 0.22, true);
    kane(master, t, 0.11, true);
    suzu(master, t + 0.04, 0.09, 0.7);
    [0, 2, 4, 7].forEach((d, i) => koto(master!, lnDeg(d), t + 0.06 + i * 0.055, 0.5, 0.085));
    shaku(master, lnDeg(9), t + 0.3, 1.1, 0.07);
  }
  /** THE GATE OPENS: the drum tower, three strokes and the clappers. */
  function lnGateSting(t: number) {
    if (!master) return;
    clack(master, t, 0.075); clack(master, t + 0.1, 0.055);
    for (let i = 0; i < 3; i++) taiko(master!, t + 0.28 + i * 0.34, 0.2 - i * 0.02, true);
    kane(master, t + 0.3, 0.07, true);
    shaku(master, lnDeg(4), t + 0.6, 1.4, 0.06);
  }
  /** THE MARKET NOTICES: the chatter stops, one gong, and it starts again
   *  wrong. The turn of the level, in four seconds. */
  function lnNoticeSting(t: number) {
    if (!master) return;
    kane(master, t, 0.10, true);
    murmur(master, t + 0.1, 0.07, 1.2);
    for (let i = 0; i < 5; i++) shime(master!, t + 0.9 + i * 0.12, 0.05 + i * 0.008);
    taiko(master, t + 1.5, 0.19, true);
    // the flute answers a semitone under where it should be
    shaku(master, lnDeg(4) * 0.944, t + 1.7, 1.5, 0.06);
  }
  /** THE BATHHOUSE: the biggest moment in the level. Everything at once, and
   *  the gong left open underneath it. */
  function lnBathhouseSting(t: number) {
    if (!master) return;
    for (let i = 0; i < 8; i++) taiko(master!, t + i * 0.115, 0.09 + i * 0.017, i > 4);
    kane(master, t + 0.95, 0.13, true);
    suzu(master, t + 0.95, 0.10, 0.9);
    [0, 4, 7, 9, 11].forEach((d, i) => koto(master!, lnDeg(d), t + 1.0 + i * 0.07, 0.6, 0.09));
    shaku(master, lnDeg(12), t + 1.4, 1.8, 0.08);
    taiko(master, t + 1.4, 0.24, true);
  }
  /** THE LAST MINUTE: the drum, alone, speeding up. No melody left. */
  function lnLastSting(t: number) {
    if (!master) return;
    for (let i = 0; i < 12; i++) taiko(master!, t + i * (0.30 - i * 0.017), 0.10 + i * 0.011, true);
    kane(master, t + 2.0, 0.12, true);
    clack(master, t + 2.1, 0.07);
  }


  // ═══ POWDER PASS — the fifth score ═══════════════════════════════════════
  // A snow-day dusk: a music box over sleigh bells, with a low warm pad under
  // it — the sound of a village that has cancelled everything and is pleased
  // about it. Deliberately COMPACT next to the four incumbents (no per-zone
  // ambience mixer yet — recorded in the AAA-BRIEF ledger as an honest gap):
  // one bus, one scheduler, the same musStage escalation contract as the rest.
  //   stage 0   music box alone, sparse — the valley holding its breath
  //   stage 1+  sleigh bells pick up the off-beats
  //   stage 2+  the pad swells, the box doubles at the octave
  //   stage 3+  bells on every beat, a low drum — the avalanche is coming
  const isPowder = () => worldId() === 'powder';
  let pwBus: GainNode | null = null;
  let pwTimer: ReturnType<typeof setInterval> | null = null;
  let pwStep = 0, pwNextT = 0, pwRunning = false;
  // D major pentatonic, high register — the icy music-box row
  const PW_ROW = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66];
  const pwDeg = (i: number) => PW_ROW[((i % PW_ROW.length) + PW_ROW.length) % PW_ROW.length];
  /** one music-box note: triangle with a fast bright decay + a sine an octave
   *  up at low level — reads as celesta on a phone speaker */
  function pwBox(freq: number, t: number, vol = 0.16) {
    const c = ctx; if (!c || !pwBus) return;
    for (const [f, v, d] of [[freq, vol, 0.9], [freq * 2, vol * 0.28, 0.5]] as const) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(pwBus);
      o.start(t); o.stop(t + d + 0.05);
    }
  }
  /** sleigh bells: a short burst of bright filtered noise, band-passed high */
  function pwBells(t: number, vol = 0.10) {
    const c = ctx; if (!c || !pwBus) return;
    const len = Math.floor(c.sampleRate * 0.09);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = 5200; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(pwBus);
    src.start(t);
  }
  /** the pad: two detuned sines a fifth apart, slow swell, held a bar */
  function pwPad(rootHz: number, t: number, dur: number, vol: number) {
    const c = ctx; if (!c || !pwBus) return;
    for (const f of [rootHz, rootHz * 1.4983, rootHz * 1.007]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(pwBus);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  /** a soft low drum — felt, not heard; the avalanche pulse at full stage */
  function pwDrum(t: number, vol = 0.20) {
    const c = ctx; if (!c || !pwBus) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(pwBus);
    o.start(t); o.stop(t + 0.35);
  }
  // the tune: a 16-step music-box phrase that rises and falls — authored, not
  // random, so a child can hum it by match three
  const PW_TUNE = [0, 2, 4, 5, 4, 2, 0, -1, 0, 2, 4, 7, 5, 4, 2, 1];
  function pwSchedule() {
    const c = ctx; if (!c || !pwRunning) return;
    const BEAT = 60 / (96 + musStage * 8) / 2;   // 8ths at 96..128 bpm
    while (pwNextT < c.currentTime + 0.65) {
      const t = pwNextT, st = pwStep;
      const bar8 = st % 8, deg = PW_TUNE[st % PW_TUNE.length];
      // the box plays on beats 0/2/4/6 at stage 0, filling in as stages rise
      if (bar8 % 2 === 0 || musStage >= 2) pwBox(pwDeg(deg), t, 0.15);
      if (musStage >= 2 && bar8 % 4 === 0) pwBox(pwDeg(deg) * 2, t, 0.05);
      if (musStage >= 1 && bar8 % 2 === 1) pwBells(t, 0.07 + musStage * 0.015);
      if (musStage >= 3 && bar8 % 2 === 0) pwBells(t, 0.05);
      if (st % 16 === 0) pwPad(146.83, t, BEAT * 16, 0.05 + musStage * 0.012);
      if (musStage >= 3 && bar8 % 4 === 0) pwDrum(t, 0.16);
      pwNextT += BEAT; pwStep++;
    }
  }
  function startPowderScore() {
    const c = ensure(); if (!c || !master) return;
    if (!pwBus) {
      pwBus = c.createGain(); pwBus.gain.value = 0.0001;
      // a touch of air: one short feedback delay, wet and quiet — snowfields
      // are the quietest place a child has ever stood, and the reverb says so
      const dly = c.createDelay(0.5); dly.delayTime.value = 0.22;
      const fb = c.createGain(); fb.gain.value = 0.28;
      const wet = c.createGain(); wet.gain.value = 0.18;
      pwBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet);
      wet.connect(musicBus!); pwBus.connect(musicBus!);
    }
    pwRunning = true;
    ramp(pwBus.gain, 0.5, c.currentTime, 1.8);
    pwStep = 0; pwNextT = c.currentTime + 0.1;
    if (pwTimer) clearInterval(pwTimer);
    pwTimer = setInterval(pwSchedule, 110);
  }
  function stopPowder(fade: number) {
    pwRunning = false;
    if (pwTimer) { clearInterval(pwTimer); pwTimer = null; }
    const c = ctx; if (!c || !pwBus) return;
    ramp(pwBus.gain, 0, c.currentTime, fade);
  }
  /** the evolution answer: a rising music-box run with a bell flourish */
  function powderEvolve() {
    const c = ensure(); if (!c) return;
    if (!pwBus) startPowderScore();
    const t = c.currentTime + 0.02;
    [0, 2, 4, 5, 7].forEach((d, i) => pwBox(pwDeg(d), t + i * 0.07, 0.17));
    pwBells(t + 0.38, 0.13); pwBells(t + 0.5, 0.10);
    pwDrum(t + 0.5, 0.2);
  }

  return {
    startMusic() {
      // prefetch the recorded kit so the very first gulp is the real sample.
      // (This used to sit AFTER the pirate early-return, so the resort was the
      // one world that never warmed it.)
      for (const n of ['eaten_deep.wav', 'evolve_epic.wav', 'win_warm.wav']) sample(n, 0);

      // ── EVERY WORLD'S OWN SCORE, AND EVERY WORLD'S OWN TRACK SLOT ─────────
      // Each world has a hand-written synthesised score, and each is the right
      // sound for its place — the resort must not play the town band, and until
      // Lantern Night had its own the spirit market played cornets and a
      // sousaphone over a Japanese festival.
      //
      // What was missing is the other half. A licensed-track drop-in existed,
      // but only for MAPLE, only under the fixed name theme.mp3, and only
      // behind a localStorage opt-in — so three of the four worlds had no way
      // to play a real recording at all. Now every world has a slot, and
      // PRESENCE OF THE FILE IS THE SWITCH: drop
      // /assets/music/<world>.mp3 into public/ and that world plays it on the
      // gapless crossfade loop; leave it out and the world keeps its synth
      // score, exactly as today. No flag, no code change, no rebuild of the
      // audio engine to A/B a track.
      const synth = isPirate() ? startTropical
        : isGameday() ? startGameday
        : isLantern() ? startLantern
        : isPowder() ? startPowderScore
        : startTown;
      const slot = isPirate() ? 'pirate' : isGameday() ? 'gameday' : isLantern() ? 'lantern' : isPowder() ? 'powder' : 'maple';
      // theme.mp3 stays as Maple's legacy name so an existing drop-in keeps
      // working; the opt-in flag now only forces that older path.
      const urls = slot === 'maple' && LICENSED_THEME
        ? ['/assets/music/theme.mp3', '/assets/music/maple.mp3']
        : [`/assets/music/${slot}.mp3`];

      // THE MENU THEME STANDS DOWN THE MOMENT A MATCH BEGINS. Two tracks over
      // each other is the one failure this whole two-channel split exists to
      // make impossible, and the match is what the child is here for.
      menuCh.wanted = false;
      stopLoop(menuCh, 0.6);
      themeUrls = urls; themeSynth = synth;   // so a repair can re-arm this world
      playTrack(themeCh, urls, () => synthCover());
      // ── AND COVER THE DOWNLOAD, AFTER A BEAT ──────────────────────────────
      // 400ms of grace, so a warm cache never hears the bed at all: on a second
      // launch the decoded buffer is already in hand and startLoop runs inside
      // this frame. Only a genuinely cold start gets the bed, which is exactly
      // when the alternative is a silent whistle.
      setTimeout(() => synthCover(), 400);
      // NOTE: do NOT also start the synth as a stopgap. startLoop() does not
      // silence a running score — there is no shared stop — so the two would
      // play over each other for the life of the match. The fetch fails fast
      // when there is no file (a 404 is one round trip), which is the case for
      // every world today, so the synth still comes up effectively at once.
    },
    // ── THE MENU THEME ────────────────────────────────────────────────────
    // The first thing anybody hears, and until now there was NOTHING here:
    // startMusic() has always been match-only, and theme.mp3 — which
    // docs/AUDIO-SOURCING.md calls "the menu" — is actually MAPLE's match track
    // behind a localStorage flag. The splash, the world picker, the shop and
    // the sticker book all played in silence.
    //
    // Same drop-in contract as the worlds: put a file at
    // /assets/music/menu.mp3 and it plays; leave it out and the menu is exactly
    // as quiet as it is today. There is deliberately NO synth fallback here —
    // the menu has never had a score to fall back to, and inventing one is a
    // different job from wiring the slot.
    //
    // AUTOPLAY: a browser will not start audio before a gesture, so this cannot
    // sound on page load however it is called. The caller re-arms it from the
    // context-unlock handler, which makes the theme begin on the child's very
    // first touch — in practice the daily reward card or PLAY.
    startMenuMusic() {
      if (themeCh.wanted) return;   // a match owns the music; never talk over it
      // already audibly up: nothing to do. This makes the call safe to RESTATE
      // — the watchdog now asks for the menu theme at level, every 2s of
      // front-of-house, precisely so a single missed transition cannot mean
      // silence for the rest of the session. Without this guard each
      // restatement would arm another cover timer for no reason.
      if (menuCh.srcs.length && !menuCh.cold) return;
      playTrack(menuCh, [MENU_URL], () => synthCover());
      // …and the same 400ms grace the match gets: a warm cache starts the real
      // menu theme inside this frame and never hears the bed.
      setTimeout(() => synthCover(), 400);
    },
    stopMenuMusic() {
      menuCh.wanted = false;
      stopLoop(menuCh, 0.6);
    },
    setMusicStage(n) { musStage = n; },
    // The town's own eight notes, on demand — for a menu, a results screen, a
    // shop, anywhere the theme wants stating out loud. Silent in the bay,
    // which has a hook of its own and does not need this one.
    jingle() {
      const c = ensure(); if (!c || !master || isPirate() || isGameday() || isLantern() || isPowder()) return;
      jingleQuote(c.currentTime + 0.02, 0.1);
    },
    // ── THE WATCHDOG ──────────────────────────────────────────────────────
    // A match must never play in silence, and I could not reproduce the owner's
    // silent phone in any environment available here — headless Chromium keeps
    // its AudioContext `running` without a gesture, so the one condition most
    // likely to cause this is the one that cannot be tested locally.
    //
    // Rather than guess a fifth time, this asks the only question that matters,
    // every couple of seconds, from the state itself: the match wants music and
    // NOTHING IS SCHEDULED. That is true for every cause — a fetch that never
    // fired, a decode that failed, a loop scheduled against a frozen clock, a
    // stop that raced a start — so the repair does not need to know which.
    //
    // Cheap by construction: it returns on the first check in the normal case
    // (srcs is non-empty for the life of a match), and it cannot fight the
    // engine because every branch is the same call the engine would make.
    ensureMusic() {
      // Now a thin backstop over the real mechanism, which is the
      // AudioContext's statechange event (see ensure()) — event-driven, so it
      // fires wherever the resume came from and at any frame rate.
      //
      // RETRACTED, in full, because it was asserted in a commit message and is
      // wrong: "animate() does not reach this line before a match starts, so
      // at the splash the watchdog was never called at all." It does reach it.
      // The line sits at depth 1 of animate() with no early return above it.
      //
      // What I actually measured was a swiftshader artifact generalised into a
      // claim about the game. `musicCd` is decremented by `dt`, and dt is
      // CLAMPED to 0.05 — so the period is 40 FRAMES, not 2 seconds. Counted
      // directly: 0 calls in 40 s over 37 frames at 0.9 fps, i.e. one call
      // every ~44 s in the harness. On a 60 fps phone the same code fires
      // every 2 s exactly as intended. The repair was reaching the owner's
      // phone; it simply had nothing to do, because reviveCh returned early
      // while the download was still in flight (see the cover, above) — which
      // is also the real reason pausing "fixed" it: the pause was never
      // causal, it was twenty more seconds of downloading.
      //
      // The clamped-dt period is a bug in its own right and is fixed at the
      // call site: a stuttering phone must not stretch a 2-second watchdog
      // into minutes.
      repairMusic();
    },
    // ── HAVE THE TRACK IN MEMORY BEFORE ANYONE ASKS FOR IT ────────────────
    // Called at boot. Decoding does not need a running clock, so the menu
    // theme and the world the player is about to enter can both be downloaded
    // and decoded during the splash — and then start on the first touch with
    // no network in the way at all.
    //
    // The menu goes first and the world follows, deliberately: they compete
    // for the same connection, and the one that is needed in two seconds must
    // not queue behind the one needed in twenty.
    preloadMusic() {
      const slot = isPirate() ? 'pirate' : isGameday() ? 'gameday' : isLantern() ? 'lantern' : isPowder() ? 'powder' : 'maple';
      const urls = slot === 'maple' && LICENSED_THEME
        ? ['/assets/music/theme.mp3', '/assets/music/maple.mp3']
        : [`/assets/music/${slot}.mp3`];
      // ── WHICH ONE IS ACTUALLY GOING TO BE HEARD ON THIS PAGE ─────────────
      // The world picker switches world by writing voidAutoPlay and reloading,
      // and the page that comes back goes STRAIGHT into a match — the menu
      // theme is never heard on it at all. Downloading the menu track first
      // there is spending the connection on the one file nobody will hear,
      // while the one they are about to hear waits behind it.
      //
      // (The 2000ms stagger this replaces was worse than useless on that path:
      // launchWorld fires on the first frame after module evaluation, so
      // startMusic → playTrack had already begun the world fetch ~1.98s before
      // the timer would have, and the timer then found `loading` set and did
      // nothing. A guessed wall-clock delay cannot sequence two downloads;
      // chaining off the first one's settle can.)
      let straightIn = false;
      try { straightIn = localStorage.getItem('voidAutoPlay') === '1'; } catch { /* storage blocked */ }
      const first = straightIn ? () => preload(themeCh, urls) : () => preload(menuCh, [MENU_URL]);
      const second = straightIn ? () => preload(menuCh, [MENU_URL]) : () => preload(themeCh, urls);
      void first()?.then(second, second);
    },
    /** Ordered log of everything the audio engine did this session. The
     *  ?audio=1 overlay shows it; it exists because a phone cannot be attached
     *  to a debugger and "it doesn't work" is not a measurement. */
    musicLog() { return evLog.slice(); },
    /** A plainly audible 0.6s tone straight through master. The single most
     *  useful question on a device: can this page make ANY sound at all? If
     *  this is silent the fault is the context, the mute toggle or the phone's
     *  ring switch; if it sounds and the music does not, the fault is ours. */
    testTone() {
      const c = ensure(); if (!c || !master) { logEv('testTone: no context'); return; }
      primeOutput(c);
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(660, c.currentTime);
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6);
      o.connect(g); g.connect(master);
      o.start(); o.stop(c.currentTime + 0.65);
      logEv(`testTone fired, ctx=${c.state} master=${master.gain.value.toFixed(2)}`);
    },
    musicState() {
      const snap = (ch: LoopChan) => ({
        wanted: ch.wanted, loading: ch.loading, bad: ch.bad,
        cold: ch.cold,
        dur: ch.buf ? Math.round(ch.buf.duration) : 0,
        gain: ch.gain ? Math.round(ch.gain.gain.value * 1000) / 1000 : -1,
        srcs: ch.srcs.length,
        starts: ch.starts,
      });
      return {
        ctx: ctx ? ctx.state : 'none',
        media: !!mediaEl && !mediaEl.paused,
        // is the hand-written bed up? The one state that decides whether a
        // recording arriving means a handover or two scores at once.
        synth: synthOn,
        // the shared music bus — the node duckMusic() schedules on. Every
        // channel reads healthy while this sits at a duck floor, so a probe
        // (or the ?audio=1 overlay on a phone) that cannot see it cannot tell
        // "playing" from "playing into a strangled bus".
        bus: musicBus ? Math.round(musicBus.gain.value * 1000) / 1000 : -1,
        muted,
        masterGain: master ? Math.round(master.gain.value * 1000) / 1000 : -1,
        theme: snap(themeCh), menu: snap(menuCh),
      };
    },
    setMuted(m: boolean) {
      logEv(`setMuted(${m})`);
      muted = m;
      lsSet('voidMute', m ? '1' : '0');
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
      if (isGameday()) {
        const gid = gNormZone(zone);
        if (gid === gZone) return;
        gZone = gid;
        if (!ctx) return;
        gApplyZones();
        return;
      }
      if (isLantern()) {
        const lid = lNormZone(zone);
        if (lid === lZone) return;
        lZone = lid;
        if (!ctx) return;
        lApplyZones();
        return;
      }
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
      if (isGameday()) {
        // the four moments of a football match, each with its own sound —
        // matched generously, the way Maple's are, so a re-worded banner does
        // not silently fall through to a generic flourish
        const gt = c.currentTime;
        if (/kick|kickoff/.test(k)) kickoffSting(gt);
        else if (/band|drum|field/.test(k)) bandOnSting(gt);
        else if (/concession|hot ?dog|rush|snack/.test(k)) concessionSting(gt);
        else if (/fourth|quarter|final|whistle/.test(k)) fourthQuarterSting(gt);
        else { bDrum(master, gt, 0.18); crash(master, gt, 0.07); holler(master, gt + 0.1, 0.14, 3); }
        return;
      }
      if (isLantern()) {
        // The four beats of the night, and they are the level's three acts in
        // sound: two welcomes, the drum that nobody ordered, and the doors.
        // Matched generously for the same reason the others are — a re-worded
        // banner must not silently fall through to a generic flourish.
        const lt = c.currentTime;
        if (/lantern|lit|light/.test(k)) lnGateSting(lt);
        else if (/free|price|insist|stall/.test(k)) lnGateSting(lt);
        else if (/drum|tower|start/.test(k)) lnNoticeSting(lt);
        else if (/bath|open|door|last/.test(k)) lnBathhouseSting(lt);
        else lnNoticeSting(lt);
        return;
      }
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
      synthOn = false;
      stopTropical(1.2);
      stopTown(1.2);
      stopGameday(1.2);
      stopLantern(1.2);
      stopPowder(1.2);
      themeCh.wanted = false;
      stopLoop(themeCh, 1.2);
      if (musTimer) { clearInterval(musTimer); musTimer = null; }
      if (ctx && musGain) {
        musGain.gain.cancelScheduledValues(ctx.currentTime);
        musGain.gain.setValueAtTime(musGain.gain.value, ctx.currentTime);
        musGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      }
    },
    pop(combo, mealR = 0.9, voidR = 0.9) {
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
      // ── DEPTH FOLLOWS THE MEAL, NOT THE MOUTH ──────────────────────────
      // This read `voidling.radius` at the call site, so `depth` described how
      // big the PLAYER was and knew nothing about what had just gone down. A
      // seven-unit hotel and a traffic cone eaten in the same second produced
      // byte-identical audio, and every bite in a WORLD ENDER's last thirty
      // seconds was the same bass note whatever it hit. Children hear size
      // before they see it, and this is the cheapest size cue in the build —
      // it costs no GPU at all.
      // The player's own size still gets a third of the vote, because a big
      // void genuinely should sound heavier across the board; it just no
      // longer gets all of it.
      const mealD = Math.min(1, Math.max(0, mealR / 6));
      const voidD = Math.min(1, Math.max(0, (voidR - 0.9) / 9));
      const depth = mealD * 0.7 + voidD * 0.3;               // 0 tiny -> 1 huge
      const semis = PENTA[comboStep] + Math.min(12, Math.floor(combo / 3) * 2);
      // big voids sing LOWER: a world-ender's nom is a bass note, not a chirp
      const base = 300 * Math.pow(2, semis / 12) * (1 - depth * 0.52);
      // ── THE BIG BITE USED TO BE THE QUIET ONE ─────────────────────────
      // Every layer here got darker with depth at once, and past depth 0.5
      // there was nothing left above ~360 Hz: the bright tail was gated off
      // outright, the body sat at 300*(1-0.52) = 144 Hz, the transient was
      // filtered at 620-260 = 360 Hz, and the remaining weight was a 52 Hz sub.
      // A phone speaker reproduces almost none of that — it rolls off hard
      // below ~500 Hz — so swallowing a HOUSE measured -64.6 dBFS through a
      // 450 Hz high-pass against -47.1 for a traffic cone, under music at -33
      // to -38. The core reward of the entire game got quieter the better you
      // were doing, and on the device it ships on it very nearly vanished.
      //
      // Depth still makes a bite sound BIGGER. It no longer makes it darker in
      // every band at once, which is not how a big thing breaking sounds
      // anyway: the body drops, and the transient gets brighter and sharper,
      // because more material is fracturing at once.
      // 1. bite transient — cutoff RISES with depth. Splintering timber is not
      //    a duller sound than a snapping twig, it is a louder brighter one.
      noise(0.040 + depth * 0.02, 0.11 + depth * 0.22, 900 + depth * 700, 90);
      // 2. body — fat sine glide + a triangle underneath for weight
      tone(base, base * 0.62, 0.13 + depth * 0.05, 'sine', 0.15 + depth * 0.04);
      tone(base * 0.5, base * 0.34, 0.11, 'triangle', 0.055, 0.006);
      // 3. bright tail — at EVERY depth now. Its old gain term was
      //    0.045*(1-depth*2), which is negative past 0.5, so ungating it alone
      //    would have done nothing: it had to be re-scaled, not just re-enabled.
      tone(base * 2.02, base * 1.5, 0.05 + depth * 0.03, 'sine', 0.030 + 0.030 * depth, 0.05);
      // 4. THE PART A PHONE CAN ACTUALLY PLAY. A big meal's fundamental is
      //    down at 144 Hz where a phone speaker has nothing, so give it a
      //    harmonic up where the speaker lives — this is what carries the
      //    weight of a building on the device, rather than the sub below.
      tone(base * 4.05, base * 2.9, 0.075 + depth * 0.05, 'triangle', 0.022 + 0.130 * depth, 0.02);
      // 5. sub thump — still there for a good speaker and for the felt
      //    low end on a tablet; it is no longer the only thing carrying a
      //    building.
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
      duckMusic(6, 1.2);   // the fanfare owns this beat; the score makes room
      // the resort answers in steel pans instead — same beat, different island
      if (isPirate()) { pirateEvolve(); return; }
      if (isGameday()) { gamedayEvolve(); return; }
      if (isLantern()) { lanternEvolve(); return; }
      if (isPowder()) { powderEvolve(); return; }
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
      duckMusic(7, 1.8);   // the win sting is the loudest thing in the match, on purpose
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
    lose() {
      duckMusic(5, 1.2);
      // the mirror of win()'s rising four: two falling triangle notes landing
      // a major third apart — "aww, next time", never a minor-key sting (the
      // no-dread rule). Soft enough that the results panel stays the event.
      tone(659.25, 659.25, 0.38, 'triangle', 0.13);
      tone(523.25, 523.25, 0.55, 'triangle', 0.11, 0.2);
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
      if (isLantern()) {
        // The drum tower, alone, speeding up. On this world an alert is not a
        // siren — nobody here has one. It is the one instrument that is still
        // playing after the market has stopped talking.
        const c = ensure(); if (!c || !master) return;
        lnLastSting(c.currentTime);
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
