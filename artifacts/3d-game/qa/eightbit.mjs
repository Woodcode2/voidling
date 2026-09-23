// IS THE DANGER SOUND A TOY OR A VIDEO GAME FROM 1985? — the square-wave probe.
//
//   node qa/eightbit.mjs
//
// Studio round 4, Job 10 (AUDIO + PLAY). audio3d.ts opens by promising "pops
// and whooshes, no harsh 8-bit edges", and the two sounds a child hears when
// the family comes for her broke it:
//
//   hit()    getting bitten — tone(140, 60, 0.16, 'square', 0.16) plus a noise
//            burst low-passed 700 -> 200 Hz: a square wave falling to 60 Hz,
//            the pattern the ledger already called "a drum hit in all but
//            name" when bigEat() did it with a sine (AAA-BRIEF.md:1358-1360),
//            and it also plays in the shop and on the parental gate's wrong
//            answer;
//   alert()  on every world but Pirate and Lantern, two bare square beeps at
//            660 and 880 Hz — the sound of a sibling joining, a charge, a lost
//            lead and a tapped padlock.
//
// A square wave carries every odd harmonic at 1/n; nothing else in the file
// needs that edge. The governor's bar: "14 square oscillators today, 0 after".
//
// ── WHAT IT DOES ───────────────────────────────────────────────────────────
// Runs the REAL createAudio() (qa/_synthgraph.mjs: audio3d.ts bundled and run
// in node on a context that records every node it is handed, and renders
// nothing) and calls hit() and alert() on every world — with no recording, and
// again with the world's track playing, because Lantern's alert() takes a
// different branch under a recording (see qa/lnalert.mjs).
//
//   (a) NO SQUARE. No oscillator either cue builds is ever set to 'square'.
//   (b) THE BITE GOES UP. Every voice hit() builds is an oscillator — no noise
//       burst — none is ever asked to sound below 200 Hz, and none falls
//       (its last frequency is at or above its first). The owner's veto on
//       the "8-bit thud" (audio3d.ts, bigEat()) is a veto on DOWN; chomp()
//       answered it by building up, and the bite answers it the same way.
//   (c) THE ALARM STILL SOUNDS. alert() puts at least one voice on master on
//       every world, in both states. Taking the square out must not take the
//       warning out with it.
//
// Loudness and spectrum are NOT graded here — nothing is rendered. They belong
// to qa/chomp.mjs on the browser's own renderer.
import { readFileSync } from 'node:fs';
import { loadSynth, rig } from './_synthgraph.mjs';
import { ALL_WORLDS } from './worlds.mjs';

const mod = await loadSynth();
const rows = [];
for (const w of ALL_WORLDS) {
  for (const recording of [false, true]) {
    const r1 = await rig(mod, w, { recording });
    const hit = r1.run(() => r1.a.hit());
    const r2 = await rig(mod, w, { recording });
    const alert = r2.run(() => r2.a.alert());
    rows.push({ w, recording, hit, alert });
  }
}

const sq = (vs) => vs.filter((v) => v.everSquare).length;
console.log('  squares built per cue (fallback score / recording playing)');
console.log('    world       hit()    alert()   alert() voices to master');
for (const w of ALL_WORLDS) {
  const [f, r] = [rows.find((x) => x.w === w && !x.recording), rows.find((x) => x.w === w && x.recording)];
  console.log(`    ${w.padEnd(10)}  ${String(sq(f.hit)).padStart(2)} / ${sq(r.hit)}   ${String(sq(f.alert)).padStart(2)} / ${sq(r.alert)}     `
    + `${f.alert.filter((v) => v.toMaster).length} / ${r.alert.filter((v) => v.toMaster).length}`);
}
const total = (rec) => rows.filter((x) => x.recording === rec).reduce((s, x) => s + sq(x.hit) + sq(x.alert), 0);
const fallbackTotal = total(false), recTotal = total(true);
console.log(`  hit() + alert() once each on ${ALL_WORLDS.length} worlds: ${fallbackTotal} square oscillator(s) with no recording, `
  + `${recTotal} with the world's track playing`);

const fails = [];
// (a)
if (fallbackTotal + recTotal > 0) {
  const where = rows.filter((x) => !x.recording).flatMap((x) => [['hit', x.hit], ['alert', x.alert]]
    .filter(([, vs]) => sq(vs)).map(([k, vs]) => `${x.w} ${k}() ${sq(vs)}`));
  fails.push(`(a) ${fallbackTotal} square oscillator(s) in the danger cues with no recording (${where.join(', ')}), `
    + `${recTotal} with one playing`);
} else console.log('  ok   (a) no square oscillator in hit() or alert() on any world, with or without a recording');

// (b) hit() has no world branch today, but every world is read so one cannot be added unseen
const hitBad = [];
for (const x of rows) {
  const noise = x.hit.filter((v) => v.kind !== 'osc').length;
  const low = x.hit.filter((v) => v.kind === 'osc' && v.fMin < 200);
  const falls = x.hit.filter((v) => v.kind === 'osc' && v.fLast < v.fFirst);
  if (!x.hit.length) hitBad.push(`${x.w}${x.recording ? '+rec' : ''}: hit() built nothing`);
  if (noise) hitBad.push(`${x.w}${x.recording ? '+rec' : ''}: ${noise} noise burst(s)`);
  for (const v of low) hitBad.push(`${x.w}${x.recording ? '+rec' : ''}: a ${v.type} reaching ${v.fMin.toFixed(0)} Hz`);
  for (const v of falls) hitBad.push(`${x.w}${x.recording ? '+rec' : ''}: a ${v.type} falling ${v.fFirst.toFixed(0)} -> ${v.fLast.toFixed(0)} Hz`);
}
const h0 = rows[0].hit.map((v) => (v.kind === 'osc' ? `${v.type} ${v.fFirst.toFixed(0)}->${v.fLast.toFixed(0)} Hz` : 'a noise burst')).join(' + ');
console.log(`  hit() on ${rows[0].w}: ${h0 || 'nothing'}`);
if (hitBad.length) fails.push(`(b) the bite still drops: ${[...new Set(hitBad)].slice(0, 6).join('; ')}${hitBad.length > 6 ? ' …' : ''}`);
else console.log('  ok   (b) hit() is oscillators only, none below 200 Hz, none falling, on every world');

// (c)
const mute = rows.filter((x) => !x.alert.some((v) => v.toMaster)).map((x) => `${x.w}${x.recording ? '+rec' : ''}`);
if (mute.length) fails.push(`(c) alert() puts nothing on master in: ${mute.join(', ')}`);
else console.log('  ok   (c) alert() sounds on every world, with or without a recording');

// ── A NOTE, NOT A BAR: the square voices this job does not own ──────────────
// Printed so the next reader can see them without grepping. They are score
// instruments and end-of-match whistles, not answers to danger.
{
  const src = readFileSync('src/proto3d/audio3d.ts', 'utf8').split('\n');
  const hits = [];
  src.forEach((l, i) => {
    if (!/'square'/.test(l) || /^\s*\/\//.test(l)) return;
    // the enclosing `function name(` or object method `name(…) {` — keywords
    // that share the method's shape (for, if, while…) are skipped
    let owner = '?';
    for (let j = i; j >= 0; j--) {
      const f = /^\s*function\s+(\w+)\s*\(/.exec(src[j]);
      if (f) { owner = `function ${f[1]}`; break; }
      const m = /^\s*(\w+)\s*\([^)]*\)\s*\{\s*$/.exec(src[j]);
      if (m && !/^(for|if|while|switch|catch|else)$/.test(m[1])) { owner = `.${m[1]}()`; break; }
    }
    hits.push(`${owner} :${i + 1}`);
  });
  console.log(`  note: 'square' elsewhere in audio3d.ts — ${hits.length ? hits.join(', ') : 'none'}`);
}

if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — the danger cues still carry 8-bit edges (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`\nPASS — hit() and alert() build no square oscillator on ${ALL_WORLDS.length} worlds, the bite rises from 200 Hz up, and the alarm still sounds`);
process.exit(0);
