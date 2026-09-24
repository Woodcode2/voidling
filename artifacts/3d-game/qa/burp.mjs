// THE BURP OF CHAMPIONS — does it exist, and what does it sound like?
//
//   node qa/burp.mjs [port] [world]
//
// Research governor G9. All six worlds' win titles promise 'BURP OF CHAMPIONS'
// (WORLD_COPY.winTitles in prototype3d.ts, one per world) and until G9 there
// was no burp anywhere in the game: audio3d.ts had no such cue. The governor
// ruled that the owner hears it before it ships, so it plays only under
// ?burp=1; this probe grades the SOUND, and writes it to disk for him:
//
//   qa/out/burp/burp.wav             audio.burp() alone
//   qa/out/burp/burp-in-context.wav  pop(), 0.6 s, chomp(), 0.6 s, burp() —
//                                    its level against the bite it follows
//
// both 16-bit PCM, 48 kHz, mono, rendered from the real createAudio() through
// its own master gain and limiter — the level he hears is the game's level.
//
// ── HOW THE REAL SYNTH GETS INTO THE PAGE ──────────────────────────────────
// qa/chomp.mjs imports /src/proto3d/audio3d.ts through a vite DEV server. The
// gate serves a production build, where /src is not importable, which is why
// chomp.mjs has never been a gate step. So this bundles src/proto3d/audio3d.ts
// (and the island module it takes worldId() from) with the esbuild vite
// already ships — the qa/_synthgraph.mjs and qa/mouthwind.mjs route — and
// injects the bundle into a blank Chromium page, where it renders on the
// browser's own OfflineAudioContext. No copy of the synth, no server; `port`
// is accepted for the house signature and not used. Math.random is seeded per
// render, so two renders differ only by what was asked.
//
// EVERY SOUND IS ASKED FOR AT T0 = 0.3 s INTO ITS RENDER, NEVER AT ZERO. The
// master chain ends in a DynamicsCompressor, and in this probe's first run the
// same pop() measured a -24.5 dBFS peak asked for at 0.00 s and -17.6 asked
// for at 0.10 s (and the CHOMP -21.0 against -16.1), while the burp — which
// schedules itself 5 ms after the call — read -21.5 and -21.2: sounds asked
// for at the very top of a render come out several dB down, and not all by
// the same amount. A comparison between them measured where each started. So
// the clock is moved on first, and every window below is read from T0. Asked
// for at T0, the next run read that pop at -17.3 and the CHOMP at -17.2 —
// their in-sequence levels — and the burp at -21.0.
//
// ── THE BARS, written before the first render ──────────────────────────────
//   (a) audio.burp() exists.
//   (b) 0.25 s IN TOTAL: the burp alone is under -60 dBFS from 0.28 s after
//       the call (the spec's 0.25 s, the 5 ms scheduling lead every one-shot
//       in the file takes, and 25 ms for the release to reach its floor).
//   (c) NO SUB (phone speakers; the owner's rule set): its lowest partial —
//       the body's end pitch — is at or above 120 Hz, and the energy below
//       100 Hz is at or under -20 dB of the whole, by FFT.
//   (d) ON THE TONIC. The tonic is read out of pop()'s own line in audio3d.ts
//       (`const base = N * Math.pow(`: the ladder's root at step 0, depth 0),
//       never copied here; a moved line FAILS. The 'b' — a sine pop — within
//       3% of it; the body starting within 5% of tonic/2 (the first 40 ms, so
//       the glide has begun: the window's mean sits a little under); the body
//       ending within 2% of tonic/2 a minor third down (2^-3/12), read over
//       130-230 ms, after the 0.12 s glide.
//   (e) its peak at or under -3 dBFS.
//   (f) HEARD ON A PHONE: above 450 Hz, over its own 0.25 s, it is no more
//       than 12 dB under a plain bite (pop(0, 1.3, 2.5), qa/chomp.mjs's) over
//       that bite's first 0.25 s. By FFT, not the one-pole filter chomp.mjs
//       parts 1-2 use: a one-pole high-pass passes a 150 Hz body at -9.5 dB
//       and would credit the part a phone cannot play.
//   (g) NOT THE HEADLINE: its peak at or under a CHOMP's
//       (chomp(3.2, 3.0, 'prop'), qa/chomp.mjs part 2's). A burp is a joke
//       after the bite, never louder than the biggest one.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const WORLD = POS[1] || 'maple';
const RATE = 48000;

const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

// ── the tonic, out of pop()'s own line ─────────────────────────────────────
const SRC = readFileSync('src/proto3d/audio3d.ts', 'utf8');
const popBody = SRC.match(/\n {4}pop\(combo, mealR = [\d.]+, voidR = [\d.]+\) \{([\s\S]*?)\n {4}\},/);
if (!popBody) die('could not find pop() in audio3d.ts — the call site moved; re-point this probe');
const baseM = popBody[1].match(/const base = ([\d.]+) \* Math\.pow\(2, semis \/ 12\)/);
if (!baseM) die('could not find pop()\'s root (`const base = N * Math.pow(2, semis / 12)`) — the ladder moved');
const TONIC = Number(baseM[1]);

// ── the real synth, bundled ────────────────────────────────────────────────
let esbuild;
try {
  const req = createRequire(`${process.cwd()}/package.json`);
  esbuild = createRequire(req.resolve('vite'))('esbuild');
} catch (e) { die(`could not load the esbuild vite depends on (${String(e.message).split('\n')[0]}) — run from artifacts/3d-game`); }
const built = await esbuild.build({
  stdin: { contents: "export { createAudio } from './src/proto3d/audio3d'; export { setWorld } from './src/proto3d/island';",
    resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, format: 'iife', globalName: '__synth', platform: 'browser', write: false, logLevel: 'silent',
}).catch((e) => die(`esbuild could not bundle src/proto3d/audio3d.ts (${String(e.message).split('\n')[0]})`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
await p.setContent('<!doctype html><title>burp</title>');
await p.addScriptTag({ content: built.outputFiles[0].text });
await p.evaluate(({ world, rate }) => {
  __synth.setWorld(world);
  const seed = (s) => { let x = s; Math.random = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648); };
  const at = (ctx, t) => Object.defineProperty(ctx, 'currentTime', { value: t, configurable: true });
  /** render `fn(a, at)` on a fresh createAudio() into `secs` of mono at `rate` */
  window.__render = async (fn, secs, s = 777) => {
    seed(s);
    const ctx = new OfflineAudioContext(1, Math.ceil(rate * secs), rate);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let has = true;
    try { const a = __synth.createAudio(); a.setMuted?.(false); has = fn(a, (t) => at(ctx, t)) !== false; }
    finally { window.AudioContext = RealAC; }
    return { has, d: Array.from((await ctx.startRendering()).getChannelData(0)) };
  };
}, { world: WORLD, rate: RATE });

const T0 = 0.3;
const render = (body, secs) => p.evaluate(({ body, secs, t0 }) =>
  window.__render(new Function('a', 'at', `at(${t0}); ${body}`), secs + t0), { body, secs, t0: T0 });
/** the render from T0 on: the sound and what follows it, nothing before */
const fromT0 = (r) => ({ ...r, d: r.d.slice(Math.floor(T0 * RATE)) });

const burp = fromT0(await render('if (typeof a.burp !== "function") return false; a.burp();', 0.6));
console.log(`\n  THE BURP — ${WORLD}, the real createAudio() at ${RATE / 1000} kHz; tonic ${TONIC} Hz (pop()'s root, read from its line)\n`);
if (!burp.has) {
  await b.close();
  die('(a) audio3d.ts has no burp() — the BURP OF CHAMPIONS every world\'s win title promises does not exist');
}
console.log('  ok   (a) audio.burp() exists');
const pop = fromT0(await render('a.pop(0, 1.3, 2.5);', 0.6));
const chomp = fromT0(await render('a.chomp(3.2, 3.0, "prop", 0);', 1.0));
const ctxRender = { pop: pop.d, chomp: chomp.d };

// ── measurement ────────────────────────────────────────────────────────────
const db = (x) => 20 * Math.log10(x || 1e-12);
const peakOf = (d) => d.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const lastAbove = (d, lin) => { for (let i = d.length - 1; i >= 0; i--) if (Math.abs(d[i]) > lin) return i / RATE; return 0; };
/** radix-2 FFT power spectrum of `d` from t0 for `len` s, zero-padded to N */
const spectrum = (d, t0, len, N = 65536) => {
  const re = new Float64Array(N), im = new Float64Array(N);
  const a = Math.floor(t0 * RATE), n = Math.min(N, Math.floor(len * RATE));
  for (let i = 0; i < n; i++) re[i] = d[a + i] || 0;
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let size = 2; size <= N; size <<= 1) {
    const ang = (-2 * Math.PI) / size, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < N; i += size) {
      let cr = 1, ci = 0;
      for (let k = 0; k < size / 2; k++) {
        const x = i + k, y = x + size / 2;
        const tr = re[y] * cr - im[y] * ci, ti = re[y] * ci + im[y] * cr;
        re[y] = re[x] - tr; im[y] = im[x] - ti; re[x] += tr; im[x] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  const pw = new Float64Array(N / 2);
  for (let k = 1; k < N / 2; k++) pw[k] = re[k] * re[k] + im[k] * im[k];
  return { pw, hz: RATE / N, samples: n };
};
const bandDb = (sp, lo, hi) => { let s = 0; for (let k = 1; k < sp.pw.length; k++) { const f = k * sp.hz; if (f >= lo && f < hi) s += sp.pw[k]; } return s; };
/** the strongest frequency in [lo, hi] over a Hann window — a fine DFT scan, so
 *  the peak's position is read to well under the window's own resolution */
const pitch = (d, t0, len, lo, hi, step = 0.25) => {
  const a = Math.floor(t0 * RATE), n = Math.floor(len * RATE);
  const w = new Float64Array(n);
  for (let k = 0; k < n; k++) w[k] = (d[a + k] || 0) * (0.5 - 0.5 * Math.cos((2 * Math.PI * k) / (n - 1)));
  let best = 0, bestF = 0;
  for (let f = lo; f <= hi; f += step) {
    let re = 0, im = 0; const dph = (2 * Math.PI * f) / RATE;
    for (let k = 0; k < n; k++) { re += w[k] * Math.cos(dph * k); im -= w[k] * Math.sin(dph * k); }
    const m = re * re + im * im;
    if (m > best) { best = m; bestF = f; }
  }
  return bestF;
};

const B = burp.d;
const tEnd = lastAbove(B, 0.001);
const spB = spectrum(B, 0, 0.3);
const all = bandDb(spB, 0, RATE / 2), sub100 = bandDb(spB, 0, 100), sub120 = bandDb(spB, 0, 120);
const bodyStart = pitch(B, 0.005, 0.04, 100, 220);
const bodyEnd = pitch(B, 0.135, 0.1, 100, 220);
const bPop = pitch(B, 0.005, 0.04, 240, 420);
const third = Math.pow(2, -3 / 12);
const hiBurp = bandDb(spectrum(B, 0, 0.25), 450, RATE / 2) / (0.25 * RATE);
const hiPop = bandDb(spectrum(pop.d, 0, 0.25), 450, RATE / 2) / (0.25 * RATE);
const pkB = peakOf(B), pkPop = peakOf(pop.d), pkChomp = peakOf(chomp.d);

console.log(`    length           under -60 dBFS from ${(tEnd * 1000).toFixed(0)} ms`);
console.log(`    peak             ${db(pkB).toFixed(1)} dBFS   (plain bite ${db(pkPop).toFixed(1)}, CHOMP ${db(pkChomp).toFixed(1)})`);
console.log(`    below 100 Hz     ${(10 * Math.log10(sub100 / all)).toFixed(1)} dB of the whole   (below 120 Hz: ${(10 * Math.log10(sub120 / all)).toFixed(1)} dB)`);
console.log(`    the 'b'          ${bPop.toFixed(1)} Hz   (tonic ${TONIC})`);
console.log(`    body             ${bodyStart.toFixed(1)} Hz over 5-45 ms -> ${bodyEnd.toFixed(1)} Hz over 135-235 ms`
  + `   (tonic/2 ${(TONIC / 2).toFixed(1)}, a minor third under it ${(TONIC / 2 * third).toFixed(1)})`);
console.log(`    above 450 Hz     ${(10 * Math.log10(hiBurp)).toFixed(1)} dB   against a plain bite's ${(10 * Math.log10(hiPop)).toFixed(1)} dB (mean power, each over its own 0.25 s)`);
console.log('');

let bad = 0;
const bar = (ok, id, msg) => { console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
bar(tEnd <= 0.28, 'b', `${tEnd <= 0.28 ? 'done' : 'still sounding'} at ${(tEnd * 1000).toFixed(0)} ms (bar 280: the spec's 0.25 s)`);
bar(bodyEnd >= 120 && 10 * Math.log10(sub100 / all) <= -20, 'c',
  `lowest partial ${bodyEnd.toFixed(1)} Hz (bar 120), energy below 100 Hz ${(10 * Math.log10(sub100 / all)).toFixed(1)} dB (bar -20)`);
const popOk = Math.abs(bPop / TONIC - 1) <= 0.03;
const startOk = Math.abs(bodyStart / (TONIC / 2) - 1) <= 0.05;
const endOk = Math.abs(bodyEnd / (TONIC / 2 * third) - 1) <= 0.02;
bar(popOk && startOk && endOk, 'd', `the 'b' ${(100 * (bPop / TONIC - 1)).toFixed(1)}% off the tonic (bar 3), `
  + `the body ${(100 * (bodyStart / (TONIC / 2) - 1)).toFixed(1)}% off tonic/2 at the start (bar 5) and `
  + `${(100 * (bodyEnd / (TONIC / 2 * third) - 1)).toFixed(1)}% off a minor third under it at the end (bar 2)`);
bar(db(pkB) <= -3, 'e', `peak ${db(pkB).toFixed(1)} dBFS (bar -3)`);
const hiGap = 10 * Math.log10(hiPop) - 10 * Math.log10(hiBurp);
bar(hiGap <= 12, 'f', `above 450 Hz it sits ${hiGap.toFixed(1)} dB under a plain bite (bar 12)`);
bar(pkB <= pkChomp, 'g', `its peak ${db(pkB).toFixed(1)} dBFS against the CHOMP's ${db(pkChomp).toFixed(1)}`);

// ── the owner's two files ──────────────────────────────────────────────────
const wav = (d) => {
  const n = d.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, d[i])) * 32767), 44 + i * 2);
  return buf;
};
// the gaps are 0.6 s of silence after each sound has actually ended — each end
// read off its own render at -60 dBFS, never a guessed length
const popEnd = lastAbove(ctxRender.pop, 0.001), chompEnd = lastAbove(ctxRender.chomp, 0.001);
const T_POP = T0, T_CHOMP = T_POP + popEnd + 0.6, T_BURP = T_CHOMP + chompEnd + 0.6;
const seq = await p.evaluate(({ tp, tc, tb, secs }) => window.__render((a, at) => {
  at(tp); a.pop(0, 1.3, 2.5);
  at(tc); a.chomp(3.2, 3.0, 'prop', 0);
  at(tb); a.burp();
}, secs), { tp: T_POP, tc: T_CHOMP, tb: T_BURP, secs: T_BURP + 0.6 });
await b.close();
const dir = join('qa', 'out', 'burp');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'burp.wav'), wav(B));
writeFileSync(join(dir, 'burp-in-context.wav'), wav(seq.d));
console.log(`\n  wrote ${join(dir, 'burp.wav')} (${(B.length / RATE).toFixed(2)} s) and ${join(dir, 'burp-in-context.wav')} `
  + `(${(seq.d.length / RATE).toFixed(2)} s: pop at ${T_POP.toFixed(2)} s, chomp at ${T_CHOMP.toFixed(2)} s, burp at ${T_BURP.toFixed(2)} s; `
  + `peaks ${db(peakOf(seq.d.slice(0, Math.floor(T_CHOMP * RATE)))).toFixed(1)} / `
  + `${db(peakOf(seq.d.slice(Math.floor(T_CHOMP * RATE), Math.floor(T_BURP * RATE)))).toFixed(1)} / `
  + `${db(peakOf(seq.d.slice(Math.floor(T_BURP * RATE)))).toFixed(1)} dBFS)`);

if (bad) console.log(`\nFAIL — ${bad} of 7 bar(s)`);
else console.log('\nPASS — 7 bar(s): the burp exists, sits on the eat sounds\' tonic, carries no sub, and is heard under the bite, never over it');
process.exit(bad ? 1 : 0);
