// WHAT "NOW I CAN EAT THAT" SOUNDS LIKE — the three cues, rendered.
//
//   node qa/nowfoodsound.mjs [devport]
//
// Research governor G7. qa/nowfood.mjs proves the three moments are ANSWERED
// in a live match; this proves how the answers SOUND, by rendering the real
// createAudio() through an OfflineAudioContext the way qa/chomp.mjs does. It
// imports /src, so [devport] must be a vite DEV server serving the build under
// test (`npx vite --port <p>` from artifacts/3d-game), not a preview of dist/.
//
// AND IT MUST BE RUN FROM THE TREE THAT SERVER SERVES. Two of its halves read
// two different places: (b1), (b2), (o1), (o2), (s1) and (s2) render the synth
// the dev server imports, and (b3) bundles the synth from ./src of the cwd
// (qa/_synthgraph.mjs, loadSynth). Run from one worktree against a server on
// another, it graded two builds and printed one verdict — found in review: 6
// of 7 on a pre-fix server, where the pre-fix tree run on itself read 7 of 7
// BAD. So the first thing it does is ask the server for the two files the
// synth bundle is entered from (?raw, the file as it sits on disk) and abort
// if either differs from the cwd's copy.
//
// THE THREE CUES, AND THE ONE RULE THE BUMP INHERITS
// A touch on a prop that is still too big means "you can't have that (yet)",
// and since studio round 4's Job 10 that meaning has ONE sound: bonk() — the
// wall, a tapped locked level dot, a tapped locked world card (qa/padlock.mjs).
// So the bump is bonk(ratio), not a second sound: `ratio` is the prop's radius
// over the eat line, and the bump plays softer than the wall and lower for a
// bigger prop. The research governor asked for it at least 10 dB under the pop
// — the eat is the reward and is heard fifty times a match; the bump must never
// compete with it.
//
// Measured by this probe on the build before the fix: bonk() — the wall —
// sits 8.7 dB under pop(0) in full-band RMS and 8.7 dB under it in peak, and
// 6.2 dB under the cone-sized pop above 450 Hz. So the wall's bonk alone is NOT
// 10 dB under the pop, and a bump that just called bonk() fails (b1): that
// build read 7 of 7 BAD, (b1) at 6.2 dB.
//
// THE BARS
//   (b1) bonk(ratio) at ratios 1, 1.5, 2 and 4 is at least 10 dB under the
//        QUIETEST pop of the table below in full-band RMS, in RMS above 450 Hz
//        (where a phone speaker plays), and in raw peak
//   (b2) lower for bigger: bonk(4)'s pitch, read by zero crossings over its
//        body, is below bonk(1)'s
//   (b3) no thud, read off the graph rather than the waveform: on every
//        world, every oscillator bonk(1), bonk(4), outgrow() and sparkle()
//        build stays at or above 250 Hz, none is ever square, every noise voice
//        passes a bandpass or highpass at or above 250 Hz, and every voice
//        reaches master — qa/padlock.mjs's own test of a soft tap, run on the
//        real synth in node (qa/_synthgraph.mjs). A one-pole filter on the
//        rendered buffer cannot make this call: it takes only 4.4 dB off a
//        330 Hz sine at a 250 Hz corner, so every cue in the game would read
//        as a thud through it.
//   (o1) outgrow() exists and is heard: its peak is no more than 3 dB under
//        the LOUDEST pop of the table — it has to land over a hoover spree
//   (o2) outgrow() rises: the pitch of its last sounding window is above the
//        pitch of its first
//   (s1) sparkle() exists, is quieter than the loudest pop (it is the world
//        lighting up, not a reward: peak at or under the pop's) and still
//        audible (peak within 12 dB of the quietest pop's)
//   (s2) sparkle() rises, first sounding window to last, as (o2)
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { loadSynth, rig } from './_synthgraph.mjs';
import { ALL_WORLDS } from './worlds.mjs';
const PORT = process.argv[2] || '4223';
const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };
process.on('uncaughtException', (e) => die(`threw: ${String((e && e.message) || e).split('\n')[0]}`));
process.on('unhandledRejection', (e) => die(`rejected: ${String((e && e.message) || e).split('\n')[0]}`));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
// a static page on the dev server's origin — the import below needs only the
// origin, and loading `/` would build a whole world for a probe that draws nothing
await p.goto(`http://127.0.0.1:${PORT}/privacy.html`, { waitUntil: 'domcontentloaded', timeout: 300000 });

// ── ONE TREE, NOT TWO ─────────────────────────────────────────────────────────
{
  const ENTRY = ['src/proto3d/audio3d.ts', 'src/proto3d/island.ts'];
  const served = await p.evaluate(async (paths) => {
    const out = {};
    for (const f of paths) {
      try { out[f] = (await import(`/${f}?raw`)).default; } catch { out[f] = null; }
    }
    return out;
  }, ENTRY);
  const differ = ENTRY.filter((f) => served[f] !== readFileSync(f, 'utf8'));
  if (differ.length) {
    await b.close();
    die(`the dev server on :${PORT} serves ${differ.map((f) => (served[f] === null ? `no ${f}` : `a different ${f}`)).join(' and ')} from the one in ${process.cwd()} — `
      + '(b3) would grade this checkout and every other bar the server\'s. Run it from the tree the server serves');
  }
}

const R = await p.evaluate(async () => {
  let mod;
  try { mod = await import('/src/proto3d/audio3d.ts'); } catch (e) { return { err: `cannot import /src/proto3d/audio3d.ts (${e.message}) — is ${location.host} a vite dev server?` }; }
  const SR = 44100;
  const filt = (d, lo, hi) => {   // one-pole HP at lo, then one-pole LP at hi (the chomp.mjs band)
    const dt = 1 / SR;
    const aH = lo ? (1 / (2 * Math.PI * lo)) / ((1 / (2 * Math.PI * lo)) + dt) : 0;
    const aL = hi ? dt / ((1 / (2 * Math.PI * hi)) + dt) : 1;
    const out = new Float32Array(d.length);
    let hp = 0, xp = 0, lp = 0;
    for (let i = 0; i < d.length; i++) {
      const h = lo ? aH * (hp + d[i] - xp) : d[i]; xp = d[i]; hp = h;
      lp = hi ? lp + aL * (h - lp) : h;
      out[i] = lp;
    }
    return out;
  };
  const db = (x) => 20 * Math.log10(x || 1e-9);
  const rms = (d) => { let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return db(Math.sqrt(s / d.length)); };
  const peak = (d) => { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return db(m); };
  /** zero-crossing pitch over 40 ms windows that are within 20 dB of the
   *  cue's own peak window: the first and last SOUNDING windows */
  const pitchEnds = (d) => {
    const W = Math.floor(SR * 0.04);
    const wins = [];
    for (let s = 0; s + W <= d.length; s += W) {
      let e = 0, z = 0;
      for (let i = s; i < s + W; i++) { e += d[i] * d[i]; if (i > s && (d[i - 1] < 0) !== (d[i] < 0)) z++; }
      wins.push({ e: Math.sqrt(e / W), f: z / 2 / 0.04 });
    }
    const top = Math.max(...wins.map((w) => w.e));
    const loud = wins.filter((w) => w.e > top * 0.1);
    return loud.length ? { first: loud[0].f, last: loud[loud.length - 1].f, n: loud.length } : null;
  };
  const render = async (fn, secs = 1.2) => {
    const ctx = new OfflineAudioContext(1, Math.floor(SR * secs), SR);
    const RealAC = window.AudioContext;
    window.AudioContext = function () { return ctx; };
    let a;
    try { a = mod.createAudio(); a.setMuted?.(false); const r = fn(a); if (r === 'missing') return null; }
    finally { window.AudioContext = RealAC; }
    const d = (await ctx.startRendering()).getChannelData(0);
    const hp = filt(d, 450, 0);
    // the body of the cue: from its first to its last sample over -70 dBFS
    let a0 = 0, a1 = d.length - 1;
    while (a0 < d.length && Math.abs(d[a0]) < 3e-4) a0++;
    while (a1 > a0 && Math.abs(d[a1]) < 3e-4) a1--;
    const body = d.subarray(a0, Math.min(d.length, Math.max(a0 + 1, a0 + Math.floor(SR * 0.11))));
    let z = 0; for (let i = 1; i < body.length; i++) if ((body[i - 1] < 0) !== (body[i] < 0)) z++;
    return { rms: rms(d), hp: rms(hp), peak: peak(d), zc: z / 2 / (body.length / SR), ends: pitchEnds(d), len: (a1 - a0) / SR };
  };
  const has = (k) => (a) => (typeof a[k] === 'function' ? undefined : 'missing');
  const out = { pops: {}, bonk: {} };
  for (const [k, m, v] of [['cone 0.35/1.0', 0.35, 1.0], ['default 0.9/0.9', 0.9, 0.9], ['car 1.3/2.5', 1.3, 2.5]])
    out.pops[k] = await render((a) => { a.pop(0, m, v); });
  out.wall = await render((a) => { a.bonk(); });
  for (const r of [1, 1.5, 2, 4]) out.bonk[r] = await render((a) => { a.bonk(r); });
  out.outgrow = await render((a) => has('outgrow')(a) ?? a.outgrow(), 1.6);
  out.sparkle = await render((a) => has('sparkle')(a) ?? a.sparkle(), 1.6);
  return out;
});
await b.close();
if (R.err) die(R.err);

const f1 = (x) => x.toFixed(1);
console.log('\n  NOW I CAN EAT THAT — the cues, rendered through the real createAudio()\n');
console.log('                         rms    >450 rms     peak     pitch');
const row = (k, r) => console.log(`    ${k.padEnd(18)} ${f1(r.rms).padStart(6)}  ${f1(r.hp).padStart(8)}  ${f1(r.peak).padStart(8)}  ${r.zc.toFixed(0).padStart(6)} Hz`);
for (const [k, r] of Object.entries(R.pops)) row(`pop ${k}`, r);
row('bonk() the wall', R.wall);
for (const [k, r] of Object.entries(R.bonk)) row(`bonk(${k})`, r);
if (R.outgrow) row('outgrow()', R.outgrow);
if (R.sparkle) row('sparkle()', R.sparkle);
console.log('');

let bad = 0, bars = 0;
const bar = (ok, id, msg) => { bars++; console.log(`  ${ok ? 'ok  ' : 'BAD '} (${id}) ${msg}`); if (!ok) bad++; };
const pops = Object.values(R.pops);
const qRms = Math.min(...pops.map((x) => x.rms)), qHp = Math.min(...pops.map((x) => x.hp)), qPk = Math.min(...pops.map((x) => x.peak));
const lPk = Math.max(...pops.map((x) => x.peak));
const bonks = Object.entries(R.bonk);
const worst = bonks.map(([k, r]) => ({ k, m: Math.min(qRms - r.rms, qHp - r.hp, qPk - r.peak) })).sort((x, y) => x.m - y.m)[0];
bar(worst.m >= 10, 'b1', `the loudest bump, bonk(${worst.k}), is ${f1(worst.m)} dB under the quietest pop on its closest measure (bar 10 dB)`);
bar(R.bonk[4].zc < R.bonk[1].zc, 'b2', `bonk(4) at ${R.bonk[4].zc.toFixed(0)} Hz against bonk(1) at ${R.bonk[1].zc.toFixed(0)} Hz — ${R.bonk[4].zc < R.bonk[1].zc ? 'lower for the bigger prop' : 'NOT lower for the bigger prop'}`);
{
  const FLOOR = 250;
  const mod = await loadSynth();
  const why = [];
  let voices = 0;
  for (const w of ALL_WORLDS) {
    for (const [k, fn] of [['bonk(1)', (a) => a.bonk(1)], ['bonk(4)', (a) => a.bonk(4)],
      ['outgrow()', (a) => a.outgrow()], ['sparkle()', (a) => a.sparkle()]]) {
      const r = await rig(mod, w);
      const name = k.replace(/\(.*/, '');
      if (typeof r.a[name] !== 'function') { why.push(`${w}: ${k} does not exist`); continue; }
      const vs = r.run(() => fn(r.a));
      voices += vs.length;
      if (!vs.length) why.push(`${w}: ${k} built no voice`);
      for (const v of vs) {
        const nm = `${w}: ${k} ${v.kind === 'osc' ? `a ${v.type}` : 'a noise voice'}`;
        if (!v.toMaster) why.push(`${nm} does not reach master`);
        if (v.everSquare) why.push(`${nm} set to square`);
        if (v.kind === 'osc' && v.fMin < FLOOR) why.push(`${nm} at ${v.fMin.toFixed(0)} Hz`);
        if (v.kind !== 'osc' && !v.filters.some((f) => (f.type === 'bandpass' || f.type === 'highpass') && f.fMin >= FLOOR))
          why.push(`${nm} behind ${v.filters.map((f) => `a ${f.type} at ${f.fMin.toFixed(0)} Hz`).join(', ') || 'no filter'}`);
      }
    }
  }
  const u = [...new Set(why)];
  bar(!u.length, 'b3', u.length ? `a thud or a stray voice: ${u.slice(0, 6).join('; ')}${u.length > 6 ? ` … (${u.length})` : ''}`
    : `${voices} voices on ${ALL_WORLDS.length} worlds: nothing under ${FLOOR} Hz, no square, no low-passed noise, all on master`);
}
if (!R.outgrow) { bar(false, 'o1', 'createAudio() has no outgrow() — the moment a sibling becomes food has no sound'); bar(false, 'o2', 'no outgrow() to read'); }
else {
  bar(R.outgrow.peak >= lPk - 3, 'o1', `outgrow() peaks at ${f1(R.outgrow.peak)} dBFS against the loudest pop's ${f1(lPk)} (bar: no more than 3 dB under)`);
  const e = R.outgrow.ends;
  bar(!!e && e.last > e.first, 'o2', e ? `outgrow() goes from ${e.first.toFixed(0)} Hz to ${e.last.toFixed(0)} Hz over ${e.n} sounding windows` : 'outgrow() never sounded');
}
if (!R.sparkle) { bar(false, 's1', 'createAudio() has no sparkle() — a wave of props turns back to colour in silence'); bar(false, 's2', 'no sparkle() to read'); }
else {
  bar(R.sparkle.peak <= lPk && R.sparkle.peak >= qPk - 12, 's1', `sparkle() peaks at ${f1(R.sparkle.peak)} dBFS, between the quietest pop's ${f1(qPk)} - 12 and the loudest pop's ${f1(lPk)}`);
  const e = R.sparkle.ends;
  bar(!!e && e.last > e.first, 's2', e ? `sparkle() goes from ${e.first.toFixed(0)} Hz to ${e.last.toFixed(0)} Hz over ${e.n} sounding windows` : 'sparkle() never sounded');
}
if (bad) console.log(`\nFAIL — ${bad} of ${bars} bar(s)`);
else console.log(`\nPASS — ${bars} bar(s): the bump is the wall's "not yet", softer and lower for bigger; the outgrow and the sparkle rise and sit above 250 Hz`);
process.exit(bad ? 1 : 0);
