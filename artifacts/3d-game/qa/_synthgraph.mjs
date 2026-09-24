// THE REAL SYNTH, IN NODE, ON A CONTEXT THAT WRITES DOWN WHAT IT WAS ASKED.
//
//   import { loadSynth, rig } from './_synthgraph.mjs';
//   const mod = await loadSynth();
//   const { a, run } = await rig(mod, 'lantern', { recording: true });
//   const voices = run(() => a.alert());
//
// qa/chomp.mjs renders createAudio() through a real OfflineAudioContext, and
// that needs a browser and a dev server. Most of what the danger-channel job
// has to prove is not about the waveform at all: WHICH oscillator types a cue
// builds, WHEN each voice starts, and WHERE it is routed. Those are decisions
// the code makes before a single sample is rendered, so they can be read off a
// context that renders nothing and records every node, every connect() and
// every start() it is handed.
//
// NONE OF THE SYNTH IS COPIED. src/proto3d/audio3d.ts and the island module it
// takes worldId() from are bundled by the esbuild vite already ships (the
// qa/mouthwind.mjs route) and run as they are. The only things standing in are
// the platform: the AudioContext (below), fetch (a URL answers 200 with eight
// bytes when public/ holds that file and 404 when it does not, as the dev
// server would, and decodeAudioData hands back a silent 200 s buffer), and
// inert window/document stubs for the listeners createAudio() registers at
// build.
//
// WHAT THIS CANNOT TELL YOU: anything about loudness or spectrum. Nothing is
// rendered. A bar about how a cue SOUNDS belongs in qa/chomp.mjs, on the
// browser's own renderer.
import { createRequire } from 'node:module';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const fail = (msg) => { console.log(`FAIL — ${msg}`); process.exit(1); };
// Every abort prints a FAIL line: a throw from the synth itself, or from a
// module the probe imports after this one (qa/worlds.mjs throws on a WorldId
// union it cannot read), would otherwise end in a bare stack trace.
process.on('uncaughtException', (e) => fail(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => fail(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

/** the file under public/ that a root-relative asset URL is served from */
const publicFile = (url) => join(process.cwd(), 'public', decodeURIComponent(String(url).split(/[?#]/)[0]));
/** Does the build ship this world's match track? startMusic() asks for
 *  /assets/music/<world>.mp3 (theme.mp3 first only behind Maple's opt-in
 *  flag, which this harness never sets). A world without one plays its
 *  fallback score, and a `recording: true` rig on it fails, because the fetch
 *  below answers 404. */
export const shipsTrack = (world) => existsSync(publicFile(`/assets/music/${world}.mp3`));

/** Bundle and import the real audio3d.ts + island.ts. */
export async function loadSynth() {
  let esbuild;
  try {
    const req = createRequire(`${process.cwd()}/package.json`);
    esbuild = createRequire(req.resolve('vite'))('esbuild');
  } catch (e) {
    fail(`could not load the esbuild vite depends on (${String(e.message).split('\n')[0]}) — run from artifacts/3d-game with node_modules present`);
  }
  let built;
  try {
    built = await esbuild.build({
      stdin: {
        contents: "export { createAudio } from './src/proto3d/audio3d'; export { setWorld, worldId } from './src/proto3d/island';",
        resolveDir: process.cwd(), loader: 'ts',
      },
      bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent',
    });
  } catch (e) {
    fail(`esbuild could not bundle src/proto3d/audio3d.ts (${String(e.message).split('\n')[0]})`);
  }
  const noop = () => {};
  const el = () => ({ width: 0, height: 0, style: {}, getContext: () => null,
    addEventListener: noop, removeEventListener: noop, setAttribute: noop });
  globalThis.document = { createElement: el, createElementNS: () => el(), addEventListener: noop,
    hidden: false, body: { classList: { toggle: noop, add: noop, remove: noop } } };
  globalThis.window = globalThis;
  globalThis.addEventListener = noop;
  // a track or sample downloads when public/ ships it and 404s when it does
  // not, so a world with no track file is read on its fallback score
  globalThis.fetch = async (u) => (existsSync(publicFile(u))
    ? { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) }
    : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) });
  globalThis.AudioBuffer = AudioBufferRec;   // sample() tests `instanceof AudioBuffer`
  // a file, not a data: URL, so a throw inside the synth names a readable line
  const file = join(tmpdir(), `synthgraph-${process.pid}.mjs`);
  writeFileSync(file, built.outputFiles[0].text);
  process.on('exit', () => { try { unlinkSync(file); } catch { /* gone */ } });
  let mod;
  try {
    mod = await import(pathToFileURL(file).href);
  } catch (e) {
    fail(`the bundled synth threw on import (${String(e.message).split('\n')[0]})`);
  }
  if (typeof mod.createAudio !== 'function' || typeof mod.setWorld !== 'function')
    fail('createAudio/setWorld are not exported where this harness looks for them');
  return mod;
}

// ── THE RECORDING CONTEXT ──────────────────────────────────────────────────
class Param {
  constructor(v) { this.value = v; this.ev = []; }
  setValueAtTime(v, t) { this.ev.push({ k: 'set', v, t }); return this; }
  linearRampToValueAtTime(v, t) { this.ev.push({ k: 'lin', v, t }); return this; }
  exponentialRampToValueAtTime(v, t) { this.ev.push({ k: 'exp', v, t }); return this; }
  setTargetAtTime(v, t) { this.ev.push({ k: 'tgt', v, t }); return this; }
  setValueCurveAtTime(c, t) { this.ev.push({ k: 'curve', v: Math.min(...c), t }); this.ev.push({ k: 'curve', v: Math.max(...c), t }); return this; }
  cancelScheduledValues(t) { this.ev.push({ k: 'cancel', t }); return this; }
  cancelAndHoldAtTime(t) { return this.cancelScheduledValues(t); }
}
class Node {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.outs = []; this.id = ctx.nodes.length; ctx.nodes.push(this); }
  connect(d) { this.outs.push(d); return d; }
  disconnect() { this.outs = []; }
}
class Osc extends Node {
  constructor(ctx) {
    super(ctx, 'osc'); this.frequency = new Param(440); this.detune = new Param(0);
    this.types = ['sine']; this.startT = null; this.stopT = null; this.onended = null;
  }
  get type() { return this.types[this.types.length - 1]; }
  set type(v) { this.types.push(v); }
  setPeriodicWave() { this.types.push('custom'); }
  start(t = 0) { this.startT = t; }
  stop(t = 0) { this.stopT = t; }
}
class Src extends Node {
  constructor(ctx) {
    super(ctx, 'buf'); this.buffer = null; this.loop = false; this.loopStart = 0; this.loopEnd = 0;
    this.playbackRate = new Param(1); this.detune = new Param(0); this.startT = null; this.stopT = null; this.onended = null;
  }
  // start(when, offset, duration): a duration ends the source as stop() would
  start(t = 0, _off = 0, dur) { this.startT = t; if (dur !== undefined) this.stopT = t + dur; }
  stop(t = 0) { this.stopT = this.stopT === null ? t : Math.min(this.stopT, t); }
}
class AudioBufferRec {
  constructor(ch, len, sr) { this.numberOfChannels = ch; this.length = len; this.sampleRate = sr; this.duration = len / sr; this._d = []; }
  getChannelData(i) { return (this._d[i] ??= new Float32Array(this.length)); }
}
const mkBuffer = (ch, len, sr) => new AudioBufferRec(ch, len, sr);
export class RecCtx {
  constructor() {
    this.nodes = []; this.currentTime = 5; this.sampleRate = 48000; this.state = 'running';
    this.baseLatency = 0; this.outputLatency = 0;
    this.destination = new Node(this, 'destination');
  }
  createGain() { const n = new Node(this, 'gain'); n.gain = new Param(1); return n; }
  createOscillator() { return new Osc(this); }
  createBufferSource() { return new Src(this); }
  createBiquadFilter() {
    const n = new Node(this, 'biquad'); n.type = 'lowpass';
    n.frequency = new Param(350); n.Q = new Param(1); n.gain = new Param(0); n.detune = new Param(0); return n;
  }
  createDynamicsCompressor() {
    const n = new Node(this, 'compressor');
    for (const [k, v] of [['threshold', -24], ['knee', 30], ['ratio', 12], ['attack', 0.003], ['release', 0.25]]) n[k] = new Param(v);
    n.reduction = 0; return n;
  }
  createDelay() { const n = new Node(this, 'delay'); n.delayTime = new Param(0); return n; }
  createStereoPanner() { const n = new Node(this, 'panner'); n.pan = new Param(0); return n; }
  createWaveShaper() { const n = new Node(this, 'shaper'); n.curve = null; n.oversample = 'none'; return n; }
  createConvolver() { const n = new Node(this, 'convolver'); n.buffer = null; n.normalize = true; return n; }
  createPeriodicWave() { return {}; }
  createBuffer(ch, len, sr) { return mkBuffer(ch, len, sr); }
  decodeAudioData() { return Promise.resolve(mkBuffer(2, 200 * 48000, 48000)); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  addEventListener() {}
  removeEventListener() {}
}

// ── READING THE GRAPH ───────────────────────────────────────────────────────
/** every node reachable downstream of `n` (node outputs only, not params) */
const downstream = (n) => {
  const seen = new Set(), st = [n];
  while (st.length) {
    const x = st.pop();
    for (const o of x.outs) if (o instanceof Node && !seen.has(o)) { seen.add(o); st.push(o); }
  }
  return seen;
};
/** master is the gain createAudio() puts in front of its limiter: a gain
 *  whose output is a compressor whose output is the destination. Found by
 *  that shape, and thrown on if the shape is not there exactly once. */
const findMaster = (ctx) => {
  const m = ctx.nodes.filter((n) => n.kind === 'gain'
    && n.outs.some((o) => o.kind === 'compressor' && o.outs.includes(ctx.destination)));
  if (m.length !== 1) fail(`expected one master gain (gain -> compressor -> destination), found ${m.length}: `
    + 'createAudio()\'s output stage has moved and this harness cannot say what reaches the speaker');
  return m[0];
};
/** every frequency an oscillator is ever asked to sound at */
const freqs = (o) => {
  const ev = o.frequency.ev.filter((e) => e.k !== 'cancel');
  return ev.length ? ev.map((e) => e.v) : [o.frequency.value];
};

/**
 * One cue on one world, on a fresh createAudio() and a fresh context.
 * `recording: true` starts the world's match track through startMusic() and
 * waits until musicState() reports its source playing — the state in which
 * audio3d's recordingLive() is true — and throws if it never gets there.
 */
export async function rig(mod, world, { recording = false } = {}) {
  mod.setWorld(world);
  if (mod.worldId() !== world) fail(`setWorld('${world}') left worldId() at '${mod.worldId()}'`);
  const ctx = new RecCtx();
  globalThis.AudioContext = function AudioContext() { return ctx; };
  const a = mod.createAudio();
  a.setMuted?.(false);
  if (recording) {
    if (!shipsTrack(world)) fail(`${world}: public/assets/music/${world}.mp3 does not ship, so this world has no recording to read `
      + '(check shipsTrack() before asking for one)');
    a.startMusic();
    for (let i = 0; i < 200 && !(a.musicState().theme.srcs > 0); i++) await new Promise((r) => setImmediate(r));
    const s = a.musicState();
    if (!(s.theme.srcs > 0)) fail(`${world}: startMusic() never reached a playing recording (theme ${JSON.stringify(s.theme)})`);
  }
  // make sure the context and master exist before the cue is read
  a.musicState();
  return {
    a, ctx,
    state: () => a.musicState(),
    /** run `fn`, return every voice (oscillator or buffer source) it created */
    run(fn) {
      const from = ctx.nodes.length;
      const t0 = ctx.currentTime;
      fn();
      const master = findMaster(ctx);
      return ctx.nodes.slice(from).filter((n) => n.kind === 'osc' || n.kind === 'buf').map((n) => {
        const down = downstream(n);
        const fs = n.kind === 'osc' ? freqs(n) : [];
        return {
          kind: n.kind,
          type: n.kind === 'osc' ? n.type : 'buffer',
          everSquare: n.kind === 'osc' && n.types.includes('square'),
          start: n.startT === null ? null : n.startT - t0,
          stop: n.stopT === null ? null : n.stopT - t0,
          toMaster: down.has(master),
          // a filter's cutoff is its scheduled values when it has any (a
          // setValueAtTime() leaves .value at the default) — fMin/fMax span them
          filters: [...down].filter((x) => x.kind === 'biquad').map((x) => {
            const ff = freqs(x);
            return { type: x.type, f: x.frequency.value, fMin: Math.min(...ff), fMax: Math.max(...ff) };
          }),
          fMin: fs.length ? Math.min(...fs) : null,
          fMax: fs.length ? Math.max(...fs) : null,
          fFirst: fs.length ? fs[0] : null,
          fLast: fs.length ? fs[fs.length - 1] : null,
        };
      });
    },
  };
}
