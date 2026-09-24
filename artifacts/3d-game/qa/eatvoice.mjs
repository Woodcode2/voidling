// WHAT YOU EAT TALKS BACK — does a bite say what it was?
//
//   node qa/eatvoice.mjs [port] [world ...] [--only=graph,offline,live,end]
//                                                  (default 4177 maple skylark)
//
// Research governor G5. A car, a person, a sheep and a chalet sounded the same
// apart from size: pop() is one tuned note whose depth follows the meal, and
// nothing in a bite said WHAT went in, although capture() holds the prop. Every
// one of a match's two hundred bites also sat dead centre, on one transient,
// byte for byte. The spec: a voice per kind of meal (a car meeps, a person goes
// wheee, a goat bleats, a house crumbles, a tree rustles, a paper lantern
// crinkles and pings, a balloon squeaks, snow goes poof), at most one per
// 0.35 s, 6 dB under the pop and 0.4x once the chain passes 8, never on the
// score's bus; the pop's transient varied and nothing else; and each bite on
// the other side of the stereo field from the last.
//
// FOUR PARTS, each reading the real thing.
//
// GRAPH — the real createAudio(), bundled and run in node on a context that
//   records every node and connect() (qa/_synthgraph.mjs, run in a child
//   process because it installs window/document/fetch stand-ins that have no
//   business in the process driving the browser), on Maple with its recording
//   PLAYING — the state every shipped match is in.
//   (g) every source an eat voice starts reaches master, and none of them
//       shares a node with the recording's path short of master. The spec
//       pictured reusing the ambience's moo and duck, whose buses synthStop()
//       takes down under every recording; a voice routed there is silent in
//       the shipped game.
//
// OFFLINE — the real synth, bundled by the esbuild vite ships and rendered in a
//   page through an OfflineAudioContext (the qa/chomp.mjs route, without a dev
//   server). Math.random is seeded per render, as qa/chomp.mjs does, so two
//   renders differ only in what was asked — and in the eat's own dice, which
//   are the thing (h) measures.
//   (a) every voice in eatvoice.ts's EAT_VOICES exists: eatVoice(v) says v and
//       renders sound
//   (b) wheee is in the giggle register where a phone can play it: at least
//       70% of its energy above 450 Hz (FFT)
//   (c) every voice sits 6 dB or more under the pop it rides with, and no more
//       than 14 dB under (there to be heard), at a car's meal and a house's —
//       energy above 450 Hz over one second, qa/chomp.mjs part 1's measure.
//       Five renders of each, graded on the LOUDEST and the quietest of them:
//       a voice has its own dice (wheee's pitch, a rustle's grains, two quacks
//       or three), and "6 dB under" is a promise about every bite, not about
//       the average one
//   (d) past link 8 the voice is 0.4x: meep at combo 9 within 0.5 dB of
//       20 log 0.4 = -7.96 dB against combo 0. Meep because it has no dice —
//       the fade is one multiply every voice goes through
//   (e) no thud: below 250 Hz (four poles, qa/chomp.mjs part 3) no voice
//       carries more than the pop's own + 1 dB
//   (f) the gate: a voice 0.20 s after another is held (says null and adds
//       under 0.3 dB to the render), one 0.36 s after sounds (adds 6 dB+)
//   (h) only the transient varies: ten pops in a row, each on a fresh render
//       with Math.random seeded identically and the oscillators disconnected
//       so the transient is alone — its spectral-centroid SD at least 3% of
//       its mean; then ten more with the noise disconnected — the body's f0
//       SD under 1 cent
//   (i) the bite has a side: two pops 0.3 s apart on a stereo render — each
//       one's L-R RMS difference at least 2 dB, and of opposite sign
//   (j) a pop and its voice together, at a tower's meal, peak at or under
//       -3 dBFS
//   (k) the voice rides a CHOMP too, and the headline stays the headline: at
//       a house-sized CHOMP every voice is 9 dB or more under the whole
//       CHOMP and adds no more than 1 dB to it
//
// LIVE — per world: a match, the void held at r 8 (__setVoidR) so every meal
//   driven is an ordinary bite and not a CHOMP, and one bite per voice class the
//   world's census offers, through __eatVoice -> the real capture(), each on the
//   game's clock 0.5 match-seconds after the last (tClock never runs faster
//   than the wall, so that is 0.5 s or more of audio clock too). Then a burst:
//   three people taken in one task, whose sinks share a frame.
//   (l) the census: every voice class and silent tag in the live world (info)
//   (m) every voice class the world's census offers was heard as 'eat:<voice>'
//   (n) every bite driven was classified as the class it was driven as, and
//       said its own name or was held by the gate — never another voice
//   (o) no two 'eat:' entries within 0.35 s on the wall clock — the clock
//       sounds play on (qa/endparty.mjs (g) reads it the same way)
//   (p) the burst: at most one voice for the three, and the bite log says
//       the others were held
//   (m6) the spec's bar, across the worlds run: six or more distinct voices
//       heard in one world. A world can only say what its census offers, and
//       that is the world's, not this file's: Maple offers five today — its
//       four pond ducks, the sixth, never reach the scene — and Skylark six.
//
// END — Maple dot 1 (?g=1), the goal met through __setScore, then four voiced
//   meals taken inside the outro, and every one of them followed down.
//   (q) not one 'eat:' after the whistle in the call log: the whistle owns
//       the end (qa/endbeat.mjs)
//
// THE BUILD BEFORE THIS ONE has the classifier and the hooks and no voice:
// (a)-(g) find no eatVoice, (h) and (i) read 0.0% and 0.0 dB, and (m) hears
// nothing but pops.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { enterMatch } from './_enter.mjs';

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

const ARGS = process.argv.slice(2);
const POS = ARGS.filter((a) => !a.startsWith('--'));
const onlyArg = ARGS.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null;
const want = (part) => !ONLY || ONLY.has(part);

/** esbuild, as vite ships it — the qa/mouthwind.mjs and qa/_synthgraph.mjs route */
function esbuildOf() {
  const req = createRequire(`${process.cwd()}/package.json`);
  return createRequire(req.resolve('vite'))('esbuild');
}
async function bundle(contents) {
  const built = await esbuildOf().build({
    stdin: { contents, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, format: 'esm', platform: 'browser', write: false, logLevel: 'silent',
  });
  return built.outputFiles[0].text;
}

// ══ GRAPH, in a child process ═══════════════════════════════════════════════
if (ARGS.includes('--graph-child')) {
  const { loadSynth, rig } = await import('./_synthgraph.mjs');
  const mod = await loadSynth();
  const voicesMod = await import(`data:text/javascript;base64,${Buffer.from(await bundle("export { EAT_VOICES } from './src/proto3d/eatvoice';")).toString('base64')}`);
  const r = await rig(mod, 'maple', { recording: true });
  const nodes = r.ctx.nodes;
  const down = (n) => { const seen = new Set(), st = [n];
    while (st.length) { const x = st.pop(); for (const o of x.outs) if (o && o.outs && !seen.has(o)) { seen.add(o); st.push(o); } }
    return seen; };
  const masters = nodes.filter((n) => n.kind === 'gain' && n.outs.some((o) => o.kind === 'compressor' && o.outs.includes(r.ctx.destination)));
  if (masters.length !== 1) { console.log(JSON.stringify({ err: `found ${masters.length} master gains (gain -> compressor -> destination), want 1` })); process.exit(0); }
  const master = masters[0];
  const after = new Set([master, ...down(master)]);
  // the recording: the long decoded buffer the theme channel is playing
  const rec = nodes.filter((n) => n.kind === 'buf' && n.buffer && n.buffer.duration > 100);
  if (!rec.length) { console.log(JSON.stringify({ err: 'no recording is playing in the rig — nothing to keep the voices off' })); process.exit(0); }
  const score = new Set(); for (const s of rec) for (const x of down(s)) if (!after.has(x)) score.add(x);
  const out = { has: typeof r.a.eatVoice === 'function', voices: {} };
  if (out.has) {
    for (const v of voicesMod.EAT_VOICES) {
      const from = nodes.length;
      const said = r.a.eatVoice(v, 1.3, 2.5, 0);
      r.ctx.currentTime += 1;   // clear the 0.35 s gate for the next voice
      const srcs = nodes.slice(from).filter((n) => n.kind === 'osc' || n.kind === 'buf');
      // an LFO's path ends on an AudioParam, which this context records as a
      // Param rather than a node: a source whose every output is a gain that
      // feeds only Params is a modulator, and is judged by what it modulates
      const isMod = (n) => n.outs.length > 0 && n.outs.every((g) => g.outs && g.outs.length > 0 && g.outs.every((q) => !q.outs));
      const heard = srcs.filter((n) => !isMod(n));
      out.voices[v] = { said, sources: srcs.length,
        toMaster: heard.filter((n) => down(n).has(master)).length, heard: heard.length,
        viaScore: srcs.filter((n) => [...down(n)].some((x) => score.has(x))).length };
    }
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}

const PORT = POS[0] || '4177';
const WORLDS = POS.length > 1 ? POS.slice(1) : ['maple', 'skylark'];
let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
console.log(`\n  WHAT YOU EAT TALKS BACK — :${PORT}, ${WORLDS.join(' ')}\n`);

if (want('graph')) {
  const g = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--graph-child'], { cwd: process.cwd(), encoding: 'utf8', timeout: 300000 });
  const line = (g.stdout || '').trim().split('\n').pop() || '';
  let res = null;
  try { res = JSON.parse(line); } catch { /* the child printed a FAIL line instead */ }
  if (!res) die(`the graph harness gave no answer: ${(line || g.stderr || '').slice(0, 200)}`);
  if (res.err) die(`the graph harness: ${res.err}`);
  console.log('  GRAPH — Maple, its recording playing (qa/_synthgraph.mjs)');
  if (!res.has) bar(false, 'g', 'there is no eatVoice() — nothing a meal could say reaches master');
  else {
    const rows = Object.entries(res.voices);
    for (const [v, x] of rows) console.log(`    ${v.padEnd(8)} said ${String(x.said).padEnd(8)} ${x.sources} sources, ${x.toMaster}/${x.heard} reach master, ${x.viaScore} cross the score`);
    const off = rows.filter(([v, x]) => x.said !== v || x.heard === 0 || x.toMaster < x.heard || x.viaScore > 0);
    bar(!off.length, 'g', off.length ? `under a recording these voices are silent, unrouted or on the score's bus: ${off.map(([v]) => v).join(', ')}`
      : `all ${rows.length} voices reach master under a playing recording, and not one source crosses the score's path`);
  }
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// ══ OFFLINE ═════════════════════════════════════════════════════════════════
if (want('offline')) {
  const code = await bundle("export { createAudio } from './src/proto3d/audio3d'; export { EAT_VOICES } from './src/proto3d/eatvoice';");
  const p = await b.newPage();
  // a static page on this origin: the synth is handed in, nothing is booted
  await p.goto(`http://127.0.0.1:${PORT}/privacy.html`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.evaluate(async (src) => {
    window.__EV = await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  }, code);
  const o = await p.evaluate(async () => {
    const EV = window.__EV, SR = 44100;
    const VOICES = [...EV.EAT_VOICES];
    const render = async (fn, { secs = 1, ch = 1, seed = 12345, mute = null } = {}) => {
      const realRandom = Math.random;
      let x = seed; Math.random = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
      const ctx = new OfflineAudioContext(ch, Math.floor(SR * secs), SR);
      // MUTE a layer by leaving it unconnected: 'osc' keeps only the noise
      // (the transient), 'noise' keeps only the oscillators (the body)
      if (mute === 'osc') { const r0 = ctx.createOscillator.bind(ctx); ctx.createOscillator = () => { const n = r0(); n.connect = (d) => d; return n; }; }
      if (mute === 'noise') { const r0 = ctx.createBufferSource.bind(ctx); ctx.createBufferSource = () => { const n = r0(); n.connect = (d) => d; return n; }; }
      const RealAC = window.AudioContext;
      window.AudioContext = function () { return ctx; };
      let ret;
      try { const a = EV.createAudio(); a.setMuted?.(false); ret = fn(a, ctx); } finally { window.AudioContext = RealAC; }
      const buf = await ctx.startRendering();
      Math.random = realRandom;
      return { ret, d: Array.from({ length: ch }, (_, i) => buf.getChannelData(i)) };
    };
    const at = (ctx, t) => Object.defineProperty(ctx, 'currentTime', { value: t, configurable: true });
    const db = (x) => 20 * Math.log10(x || 1e-9);
    const hp = (d, a = 0, n = d.length) => {   // one-pole high-pass at 450 Hz, RMS dBFS
      const rc = 1 / (2 * Math.PI * 450), dt = 1 / SR, al = rc / (rc + dt);
      let y = 0, xp = 0, sum = 0;
      for (let i = 0; i < a + n && i < d.length; i++) { y = al * (y + d[i] - xp); xp = d[i]; if (i >= a) sum += y * y; }
      return db(Math.sqrt(sum / n));
    };
    const low = (d) => {   // four one-pole low-passes at 250 Hz, RMS dBFS
      const aL = (1 / SR) / ((1 / (2 * Math.PI * 250)) + 1 / SR);
      let l1 = 0, l2 = 0, l3 = 0, l4 = 0, sum = 0;
      for (let i = 0; i < d.length; i++) { l1 += aL * (d[i] - l1); l2 += aL * (l1 - l2); l3 += aL * (l2 - l3); l4 += aL * (l3 - l4); sum += l4 * l4; }
      return db(Math.sqrt(sum / d.length));
    };
    const rms = (d, a, n) => { let q = 0; for (let i = a; i < a + n; i++) q += (d[i] || 0) ** 2; return db(Math.sqrt(q / n)); };
    const peak = (d) => { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return db(m); };
    // zero-padded to N, power per bin. HANN for a pitch read out of the middle
    // of a sound; RECTANGULAR for a whole sound from its own onset, which its
    // envelope already windows — a Hann over a sound that starts at sample 0
    // weights its first milliseconds by ~0, and those are a transient's, and
    // the low start of wheee's glide
    const fft = (d, a, n, N, hann = true) => {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < n; i++) re[i] = (d[a + i] || 0) * (hann ? 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) : 1);
      for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let cr = 1, ci = 0;
          for (let k = 0; k < len / 2; k++) {
            const u = i + k, v = u + len / 2;
            const tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr;
            re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti;
            const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
          }
        }
      }
      const pw = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) pw[k] = re[k] * re[k] + im[k] * im[k];
      return pw;
    };
    const has = (await render((a) => typeof a.eatVoice === 'function', { secs: 0.05 })).ret;
    const out = { has, voices: VOICES };
    const CAR = [1.3, 2.5], HOUSE = [3.2, 6.0], TOWER = [6.5, 11.0];
    const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
    const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((v) => (v - m) ** 2))); };

    // (h) THE TRANSIENT AND THE BODY — runs on any build: it only asks pop().
    // Ten transients FIRST, then ten bodies: the ten transients are then ten
    // bites in a row, which is what a child hears — interleaved, every other
    // bite's take went to a body render, and the ten read were not a run
    const cents = [], f0s = [];
    for (let k = 0; k < 10; k++) {
      const tr = await render((a) => a.pop(0, ...CAR), { secs: 0.3, mute: 'osc' });
      const N = 4096, n = Math.floor(0.06 * SR), pw = fft(tr.d[0], 0, n, N, false);
      let s0 = 0, s1 = 0; for (let i = 1; i < N / 2; i++) { s0 += pw[i]; s1 += pw[i] * (i * SR / N); }
      cents.push(s1 / s0);
    }
    for (let k = 0; k < 10; k++) {
      const bd = await render((a) => a.pop(0, ...CAR), { secs: 0.3, mute: 'noise' });
      const M = 32768, a0 = Math.floor(0.05 * SR), m = Math.floor(0.08 * SR), q = fft(bd.d[0], a0, m, M);
      let bi = 0; for (let i = Math.floor(150 * M / SR); i < Math.floor(900 * M / SR); i++) if (q[i] > q[bi]) bi = i;
      const y0 = Math.log(q[bi - 1] || 1e-30), y1 = Math.log(q[bi]), y2 = Math.log(q[bi + 1] || 1e-30);
      f0s.push(((bi + 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2)) * SR) / M);
    }
    out.centroid = { mean: mean(cents), sdPct: (100 * sd(cents)) / mean(cents) };
    const fm = mean(f0s);
    out.f0 = { mean: fm, sdCents: sd(f0s.map((f) => 1200 * Math.log2(f / fm))) };

    // (i) THE SIDE — two pops on a stereo render
    {
      const r = await render((a, ctx) => { at(ctx, 0); a.pop(0, ...CAR); at(ctx, 0.3); a.pop(0, ...CAR); }, { secs: 0.7, ch: 2 });
      const n = Math.floor(0.25 * SR);
      out.pan = [0, 0.3].map((t0) => rms(r.d[0], Math.floor(t0 * SR), n) - rms(r.d[1], Math.floor(t0 * SR), n));
    }
    if (!has) return out;

    // (a) (b) (c) (e) — each voice, alone and against the pop
    out.rows = {};
    const popAt = {};
    for (const [lab, m] of [['car', CAR], ['house', HOUSE]]) popAt[lab] = hp((await render((a) => a.pop(0, ...m))).d[0]);
    const popLow = low((await render((a) => a.pop(0, ...CAR))).d[0]);
    out.popAt = popAt; out.popLow = popLow;
    for (const v of VOICES) {
      const row = { said: null };
      for (const [lab, m] of [['car', CAR], ['house', HOUSE]]) {
        const lv = [];
        for (let k = 0; k < 5; k++) {
          const r = await render((a) => a.eatVoice(v, ...m, 0), { seed: 12345 + k });
          if (lab === 'car' && k === 0) { row.said = r.ret; row.low = low(r.d[0]); }
          lv.push(hp(r.d[0]));
        }
        row[lab] = Math.max(...lv); row[`${lab}Min`] = Math.min(...lv);
      }
      // (b) the share of the voice's energy above 450 Hz, by FFT
      const r = await render((a) => a.eatVoice(v, ...CAR, 0));
      const N = 65536, pw = fft(r.d[0], 0, Math.min(r.d[0].length, N), N, false);
      let all = 0, hi = 0; const kc = Math.round((450 * N) / SR);
      for (let k = 1; k < N / 2; k++) { all += pw[k]; if (k >= kc) hi += pw[k]; }
      row.share = hi / (all || 1e-30);
      // (j) a pop and its voice together, at a tower's meal
      row.peak = peak((await render((a) => { a.pop(0, ...TOWER); a.eatVoice(v, ...TOWER, 0); })).d[0]);
      // the record: against a CHOMP of a house-sized meal
      const ch = hp((await render((a) => a.chomp(3.2, 3.0, 'prop', 0))).d[0]);
      const chv = hp((await render((a) => { a.chomp(3.2, 3.0, 'prop', 0); a.eatVoice(v, 3.2, 3.0, 0); })).d[0]);
      const vAlone = hp((await render((a) => a.eatVoice(v, 3.2, 3.0, 0))).d[0]);
      row.chomp = { chomp: ch, withVoice: chv, voice: vAlone };
      out.rows[v] = row;
    }
    // (d) the fade, on meep (no dice)
    {
      const c0 = hp((await render((a) => a.eatVoice('meep', ...CAR, 0))).d[0]);
      const c9 = hp((await render((a) => a.eatVoice('meep', ...CAR, 9))).d[0]);
      out.fade = c9 - c0;
    }
    // (f) the gate
    {
      const A = await render((a, ctx) => { at(ctx, 0); a.eatVoice('meep', ...CAR, 0); });
      const B = await render((a, ctx) => { at(ctx, 0); a.eatVoice('meep', ...CAR, 0); at(ctx, 0.2); return a.eatVoice('wheee', ...CAR, 0); });
      const C = await render((a, ctx) => { at(ctx, 0); a.eatVoice('meep', ...CAR, 0); at(ctx, 0.36); return a.eatVoice('wheee', ...CAR, 0); });
      const w = (r, t0) => rms(r.d[0], Math.floor(t0 * SR), Math.floor(0.35 * SR));
      out.gate = { held: B.ret, heldAdds: w(B, 0.2) - w(A, 0.2), sounded: C.ret, soundedAdds: w(C, 0.36) - w(A, 0.36),
        heldDb: w(B, 0.2), soundedDb: w(C, 0.36), bareDb: w(A, 0.36) };
    }
    return out;
  });
  await p.close();

  console.log(`\n  OFFLINE — the real synth, rendered (${o.voices.length} voices in EAT_VOICES: ${o.voices.join(' ')})`);
  console.log(`    the pop's transient, ten pops in a row: centroid ${o.centroid.mean.toFixed(0)} Hz, SD ${o.centroid.sdPct.toFixed(2)}%;  the body's f0 ${o.f0.mean.toFixed(1)} Hz, SD ${o.f0.sdCents.toFixed(3)} cents`);
  console.log(`    two pops 0.3 s apart, L minus R: ${o.pan.map((x) => `${x >= 0 ? '+' : ''}${x.toFixed(2)} dB`).join(', ')}`);
  if (!o.has) {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'j', 'k']) bar(false, id, 'there is no eatVoice() — a bite says nothing about what it was');
  } else {
    console.log(`\n    voice     said      pop minus voice, closest-farthest of 5   >450 Hz share   <250 Hz (pop ${o.popLow.toFixed(1)})   peak w/ pop`);
    console.log('                        car             house');
    const rows = Object.entries(o.rows);
    const gapOf = (r, lab) => `${(o.popAt[lab] - r[lab]).toFixed(1)}-${(o.popAt[lab] - r[`${lab}Min`]).toFixed(1)}`;
    for (const [v, r] of rows)
      console.log(`    ${v.padEnd(8)}  ${String(r.said).padEnd(8)}  ${gapOf(r, 'car').padStart(9)} dB  ${gapOf(r, 'house').padStart(9)} dB  ${(100 * r.share).toFixed(1).padStart(12)}%  ${r.low.toFixed(1).padStart(14)} dBFS  ${r.peak.toFixed(1).padStart(8)} dBFS`);
    console.log('\n    against a CHOMP of a house-sized meal (>450 Hz, one second)');
    for (const [v, r] of rows)
      console.log(`    ${v.padEnd(8)}  CHOMP ${r.chomp.chomp.toFixed(1)}, voice alone ${r.chomp.voice.toFixed(1)} (${(r.chomp.voice - r.chomp.chomp).toFixed(1)} dB), CHOMP + voice ${r.chomp.withVoice.toFixed(1)} dBFS (+${(r.chomp.withVoice - r.chomp.chomp).toFixed(2)} dB)`);
    console.log('');
    const silent = rows.filter(([v, r]) => r.said !== v || !(r.car > -90));
    bar(!silent.length && rows.length === o.voices.length && rows.length > 0, 'a', silent.length ? `these voices say something else or nothing: ${silent.map(([v]) => v).join(', ')}` : `all ${rows.length} voices say their own name and sound`);
    const wh = o.rows.wheee;
    bar(!!wh && wh.share >= 0.70, 'b', wh ? `wheee puts ${(100 * wh.share).toFixed(1)}% of its energy above 450 Hz (bar 70%)` : 'there is no wheee');
    const loud = [], faint = [];
    for (const [v, r] of rows) for (const lab of ['car', 'house']) {
      const gap = o.popAt[lab] - r[lab], far = o.popAt[lab] - r[`${lab}Min`];
      if (gap < 6) loud.push(`${v}@${lab} ${gap.toFixed(1)}`);
      if (far > 14) faint.push(`${v}@${lab} ${far.toFixed(1)}`);
    }
    bar(!loud.length && !faint.length, 'c', loud.length ? `less than 6 dB under the pop — the note does not stay on top: ${loud.join(', ')}`
      : faint.length ? `more than 14 dB under the pop — not there to be heard: ${faint.join(', ')}`
        : `every voice sits 6-14 dB under the pop at a car's meal and a house's, in every render (${Math.min(...rows.flatMap(([, r]) => ['car', 'house'].map((l) => o.popAt[l] - r[l]))).toFixed(1)} dB at the closest, ${Math.max(...rows.flatMap(([, r]) => ['car', 'house'].map((l) => o.popAt[l] - r[`${l}Min`]))).toFixed(1)} at the farthest)`);
    const want04 = 20 * Math.log10(0.4);
    bar(Math.abs(o.fade - want04) <= 0.5, 'd', `past link 8 the voice is ${o.fade.toFixed(2)} dB against link 0 (bar ${want04.toFixed(2)} +-0.5)`);
    const thud = rows.filter(([, r]) => r.low > o.popLow + 1);
    bar(!thud.length, 'e', thud.length ? `a thud below 250 Hz in: ${thud.map(([v, r]) => `${v} ${r.low.toFixed(1)}`).join(', ')} (pop ${o.popLow.toFixed(1)} dBFS)`
      : `no voice carries more below 250 Hz than the pop's own ${o.popLow.toFixed(1)} dBFS + 1 (loudest ${Math.max(...rows.map(([, r]) => r.low)).toFixed(1)})`);
    bar(o.gate.held === null && o.gate.heldAdds < 0.3 && o.gate.sounded === 'wheee' && o.gate.soundedAdds >= 6, 'f',
      `a voice 0.20 s after another says ${o.gate.held} and adds ${o.gate.heldAdds.toFixed(2)} dB to the 0.35 s after it; one 0.36 s after says ${o.gate.sounded}, and that window reads ${o.gate.soundedDb.toFixed(1)} dBFS against ${o.gate.bareDb.toFixed(1)} without it`);
    // (k) THE CHOMP. The voice rides a CHOMP as it rides a pop (CHOMP_VOICE in
    // prototype3d.ts): the rule is 6 dB under the NOTE, and a CHOMP's note is
    // a pop. What must hold on top of that is that the headline stays the
    // headline: the voice at least 9 dB under the whole CHOMP, and adding no
    // more than 1 dB to it.
    const over = rows.filter(([, r]) => r.chomp.chomp - r.chomp.voice < 9 || r.chomp.withVoice - r.chomp.chomp > 1);
    bar(!over.length, 'k', over.length ? `a voice competes with the CHOMP it rides: ${over.map(([v, r]) => `${v} ${(r.chomp.voice - r.chomp.chomp).toFixed(1)} dB`).join(', ')}`
      : `under a CHOMP every voice sits ${Math.min(...rows.map(([, r]) => r.chomp.chomp - r.chomp.voice)).toFixed(1)} dB or more under it and adds ${Math.max(...rows.map(([, r]) => r.chomp.withVoice - r.chomp.chomp)).toFixed(2)} dB at the most`);
    const hot = rows.filter(([, r]) => r.peak > -3);
    bar(!hot.length, 'j', hot.length ? `over -3 dBFS with its pop at a tower's meal: ${hot.map(([v, r]) => `${v} ${r.peak.toFixed(1)}`).join(', ')}` : `a pop and its voice at a tower's meal peak at ${Math.max(...rows.map(([, r]) => r.peak)).toFixed(1)} dBFS at the most (bar -3)`);
  }
  bar(o.centroid.sdPct >= 3 && o.f0.sdCents < 1, 'h', `ten pops in a row: the transient's centroid SD ${o.centroid.sdPct.toFixed(2)}% (bar 3%), the body's f0 SD ${o.f0.sdCents.toFixed(3)} cents (bar under 1)`);
  bar(Math.abs(o.pan[0]) >= 2 && Math.abs(o.pan[1]) >= 2 && Math.sign(o.pan[0]) !== Math.sign(o.pan[1]), 'i',
    `two pops in a row sit ${o.pan.map((x) => `${x >= 0 ? '+' : ''}${x.toFixed(2)}`).join(' and ')} dB L-R (bar 2 dB each, opposite sides)`);
}

// ══ LIVE ════════════════════════════════════════════════════════════════════
async function openMatch(world, query = '') {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log(`    PAGEERR ${String(e).slice(0, 140)}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1'); localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}${query}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  return p;
}
const waitT = (p, dt) => p.evaluate(() => window.__matchState().tClock).then((t0) =>
  p.waitForFunction((x) => window.__matchState().tClock >= x, t0 + dt, { timeout: 900000, polling: 200 }));

if (want('live')) {
  const heardBy = {};
  for (const WORLD of WORLDS) {
    const p = await openMatch(WORLD);
    await enterMatch(p, WORLD);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });
    const hooks = await p.evaluate(() => ({ calls: typeof window.__audioCalls, eat: typeof window.__eatVoice,
      census: typeof window.__voiceCensus, log: typeof window.__biteLog, setR: typeof window.__setVoidR,
      ctx: window.__music?.().ctx }));
    for (const k of ['calls', 'eat', 'census', 'log', 'setR']) if (hooks[k] !== 'function') die(`${WORLD}: this build has no ${k} hook — nothing here can be driven without it`);
    // r 8, and a match-second for the void to finish off what that puts in
    // its reach before anything is counted
    const R = 8;
    await p.evaluate((r) => window.__setVoidR(r), R);
    await waitT(p, 1.0);
    const census = await p.evaluate(() => window.__voiceCensus());
    console.log(`\n  LIVE — ${WORLD} (audio context ${hooks.ctx}), ${census.edibles} edibles`);
    console.log(`    (l) voices: ${Object.entries(census.voices).map(([v, n]) => `${v} ${n}`).join('  ')}`);
    console.log(`        silent ${census.silent}: ${Object.entries(census.silentTags).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${n}`).join('  ')}`);
    const w0 = await p.evaluate(() => performance.now() / 1000);
    const sank = (ids) => p.waitForFunction((xs) => xs.every((id) => (window.__biteLog().find((x) => x.id === id)?.sndT ?? -1) >= 0), ids, { timeout: 900000, polling: 200 });
    const driven = [];
    // UP TO THREE BITES A CLASS. The void goes on eating by itself at r 8 —
    // townsfolk walk into it — and under this renderer a frame is most of a
    // wall second, so a meal it took on its own can sink on the same frame as
    // the driven one, ahead of it in the loop, and take the 0.35 s slot. That
    // is the gate doing its job; a class is asked again until it is heard,
    // and a hold is only ever a hold (n)
    for (const v of Object.keys(census.voices)) {
      if (!census.voices[v]) continue;
      for (let k = 0; k < 3; k++) {
        const got = await p.evaluate(([v2, r]) => window.__eatVoice(v2, 1, r), [v, R]);
        if (!got.n) { driven.push({ v, skip: `none of it left at r <= ${R}` }); break; }
        // its sink — the frame its sound is asked for — then half a match-second
        await sank(got.ids);
        const row = await p.evaluate((id) => window.__biteLog().find((x) => x.id === id) || null, got.ids[0]);
        driven.push({ v, r: got.r[0], vc: row?.vc, snd: row?.snd, said: row?.said });
        await waitT(p, 0.5);
        if (row?.said !== '-') break;
      }
    }
    // the burst: three people in one task, their sinks on one frame
    const burst = await p.evaluate((r) => window.__eatVoice('wheee', 3, r), R);
    if (burst.n) { await sank(burst.ids); await waitT(p, 0.5); }
    const end = await p.evaluate(([w, ids]) => ({
      calls: window.__audioCalls().filter((c) => c.w >= w).map((c) => ({ id: c.id, t: c.t, w: c.w })),
      rows: window.__biteLog().filter((x) => ids.includes(x.id)).map((x) => ({ id: x.id, sink: x.sink, snd: x.snd, said: x.said })),
    }), [w0, burst.ids]);
    await p.close();

    for (const d of driven) console.log(d.skip ? `    ·    ${d.v.padEnd(8)} not driven — ${d.skip}` : `    ·    ${d.v.padEnd(8)} r ${d.r.toFixed(2)}: classified ${d.vc}, sounded ${d.snd}, said ${d.said === undefined ? '(no said field)' : d.said || '(nothing)'}`);
    const eats = end.calls.filter((c) => c.id.startsWith('eat:'));
    const heard = new Set(eats.map((c) => c.id.slice(4)));
    const offered = Object.keys(census.voices).filter((v) => census.voices[v] > 0);
    heardBy[WORLD] = heard;
    console.log(`    heard: ${eats.map((c) => c.id).join(' ') || 'no eat voice at all'}  (bite sounds in the log: ${[...new Set(end.calls.filter((c) => ['pop', 'chomp', 'bigEat'].includes(c.id)).map((c) => c.id))].join(', ')})`);
    // (m) every voice this world offers is heard. HOW MANY it offers is the
    // world's own census, printed above; the spec's six is graded across the
    // worlds run, in (m6)
    const missing = offered.filter((v) => !heard.has(v));
    bar(offered.length > 0 && !missing.length, 'm', missing.length ? `${WORLD}: offers ${offered.join(' ')} and never said ${missing.join(' ')}`
      : `${WORLD}: all ${offered.length} voices its census offers were heard: ${[...heard].join(' ')}`);
    // (n) each driven bite said ITS OWN name, or was held by the gate — the
    // void goes on eating by itself at r 8, so another meal's voice can take
    // the 0.35 s slot, and that is the gate working, not a wrong voice
    const drove = driven.filter((d) => !d.skip);
    const wrong = drove.filter((d) => d.vc !== d.v || !(d.said === d.v || d.said === '-'));
    const own = drove.filter((d) => d.said === d.v).length;
    bar(drove.length > 0 && !wrong.length && own > 0, 'n', wrong.length
      ? `${WORLD}: ${wrong.map((d) => `${d.v} classified ${d.vc}, said ${d.said === undefined ? '(no said field)' : d.said || '(nothing)'}`).join('; ')}`
      : `${WORLD}: all ${drove.length} bites driven were classified as themselves; ${own} said their own name, ${drove.length - own} were held by the gate`);
    let close = null;
    for (let i = 1; i < eats.length; i++) { const g = eats[i].w - eats[i - 1].w; if (g < 0.35 && (!close || g < close.g)) close = { g, a: eats[i - 1].id, b2: eats[i].id }; }
    bar(!close && eats.length > 1, 'o', eats.length < 2 ? `${WORLD}: ${eats.length} eat voice(s), so no spacing to read` : close ? `${WORLD}: ${close.a} and ${close.b2} ${(close.g * 1000).toFixed(0)} ms apart (bar 350)`
      : `${WORLD}: ${eats.length} eat voices, none within 350 ms of another (closest ${(Math.min(...eats.slice(1).map((c, i) => c.w - eats[i].w)) * 1000).toFixed(0)} ms)`);
    if (!burst.n) bar(false, 'p', `${WORLD}: no people left to take three of`);
    else {
      const bs = end.rows;
      const sinks = new Set(bs.map((x) => x.sink.toFixed(3)));
      const said = bs.filter((x) => x.said && x.said !== '-').length, held = bs.filter((x) => x.said === '-').length;
      // at most one, and every one accounted for: the first to sink may itself
      // be held, if a meal the void took on its own spoke just before it
      bar(bs.length === 3 && said <= 1 && said + held === 3, 'p', `${WORLD}: three people taken in one task, sinking on ${sinks.size} frame(s): ${said} voiced, ${held} held by the gate${bs.some((x) => x.said === undefined) ? ' (this build keeps no said field)' : ''}`);
    }
  }
  // (m6) THE SPEC'S SIX: six or more distinct voices heard in one world. Read
  // on every world run and graded on the best, because how many a world CAN
  // say is its census, not this file's choice: Maple offers five today (its
  // pond ducks never reach the scene), Skylark six.
  const best = WORLDS.map((w) => [w, heardBy[w]?.size ?? 0]).sort((x, y) => y[1] - x[1])[0];
  bar(!!best && best[1] >= 6, 'm6', `${WORLDS.map((w) => `${w} ${heardBy[w]?.size ?? 0}`).join(', ')} distinct voices heard — ${best && best[1] >= 6 ? `${best[0]} says six or more` : 'no world says six'} (bar 6)`);
}

// ══ END ═════════════════════════════════════════════════════════════════════
if (want('end')) {
  const p = await openMatch('maple', '&g=1&len=60');
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 900000, polling: 250 });
  const goal = await p.evaluate(() => window.__goalState?.());
  if (!goal || goal.n !== 1) die(`?g=1 did not make a dot-1 level match (goal ${JSON.stringify(goal)})`);
  await p.evaluate(() => window.__setVoidR(8));
  await waitT(p, 1.0);
  const eat = await p.evaluate(() => window.__levelSpec().eat);
  // the log is a 400-deep ring that drops from the FRONT; its entries are the
  // same objects on every read, so the last one before the score is set finds
  // where "after" starts (qa/bitetime.mjs does the same)
  await p.evaluate((e) => { const c = window.__audioCalls(); window.__g5mark = c[c.length - 1] ?? null; window.__setScore(e + 1); }, eat);
  await p.waitForFunction(() => window.__goalState()?.met, null, { timeout: 900000, polling: 100 });
  const tm = await p.evaluate(() => window.__matchState().tClock);
  const took = await p.evaluate(() => ['wheee', 'meep', 'rustle', 'crumble'].map((v) => window.__eatVoice(v, 1, 8)));
  const ids = took.flatMap((x) => x.ids);
  // every meal down, or the 2 s outro spent — whichever comes first
  await p.waitForFunction(([xs, t]) => xs.every((id) => (window.__biteLog().find((x) => x.id === id)?.sndT ?? -1) >= 0)
    || window.__matchState().tClock > t + 2.2, [ids, tm], { timeout: 900000, polling: 200 });
  const res = await p.evaluate((xs) => {
    const all = window.__audioCalls(), k = window.__g5mark ? all.lastIndexOf(window.__g5mark) : -1;
    return { calls: all.slice(k + 1).map((c) => c.id),
      rows: window.__biteLog().filter((x) => xs.includes(x.id)).map((x) => ({ snd: x.snd, said: x.said, sndT: x.sndT })) };
  }, ids);
  await p.close();
  const iw = res.calls.indexOf('whistle');
  const eatsAfter = iw < 0 ? [] : res.calls.slice(iw + 1).filter((id) => id.startsWith('eat:'));
  const sunk = res.rows.filter((x) => x.sndT >= 0);
  console.log(`\n  END — Maple dot 1, the goal met at tClock ${tm.toFixed(2)}; ${ids.length} voiced meals taken in the outro, ${sunk.length} went down inside it`);
  console.log(`    calls from the score set on: ${res.calls.join(' ') || 'none'}`);
  console.log(`    the meals, sound/said: ${res.rows.map((x) => `${x.snd || 'not down'}/${x.said === undefined ? '(no said field)' : x.said || '-'}`).join(' ')}`);
  bar(sunk.length > 0 && iw >= 0 && !eatsAfter.length, 'q', !sunk.length ? 'no voiced meal went down inside the outro — nothing tested'
    : iw < 0 ? 'the whistle never blew — the end did not open through the goal door'
      : eatsAfter.length ? `${eatsAfter.length} eat voice(s) after the whistle: ${eatsAfter.join(' ')} — a second celebration over it`
        : `${sunk.length} meals went down after the whistle and not one of them spoke; the whistle had the end`);
}

await b.close();
if (!bars) die('no bar was run');
console.log(bad ? `\nFAIL — ${bad} of ${bars} bar(s)` : `\nPASS — ${bars} bar(s): what she eats says what it was, under the note, on its own side`);
process.exit(bad ? 1 : 0);
