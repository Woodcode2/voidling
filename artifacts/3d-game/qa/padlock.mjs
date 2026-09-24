// DOES A PADLOCK SOUND LIKE A MEAL? — the locked-tap probe.
//
//   node qa/padlock.mjs
//
// Studio round 4, Job 10 (AUDIO + PLAY). A tapped locked level dot and a
// tapped locked world card played audio.alert(), the sound of a charge. The
// job's first cut moved them to audio.pop(0) — and pop() is the EAT, the
// game's reward, heard forty times a match. audio3d.ts's interface notes
// record two cues already moved off it for this reason: tick() (the
// countdown and the coin count-up ticked on pop(), and its 75 ms gate then
// swallowed a real bite) and bonk() (the wall "used to be a pop(), an eat, on
// a thing she could not eat"). A padlock is a thing she cannot have yet, which
// is bonk()'s meaning, so both taps play bonk().
//
// ── WHAT IT DOES ───────────────────────────────────────────────────────────
// Node only; nothing is rendered and no browser is launched.
//
//   (a) THE HANDLERS. Reads the two locked-tap branches in src/prototype3d.ts
//       (the level dot's, found by its track('level_locked_tap') call, and the
//       world card's, by track('world_locked_tap')): from the `if (…) {` that
//       opens each to its `return;`, the code outside comments makes exactly
//       one audio.*() call, and it is audio.bonk(). Fails on pop() (the eat)
//       and on alert() (the charge) by name. qa/dangerchannel.mjs (e) reads
//       the same taps in a real page, through __audioCalls(); that probe is a
//       browser one and is not in the push profile.
//   (b) A TAP, NOT A MEAL. Runs the REAL createAudio() on every world
//       (qa/_synthgraph.mjs: audio3d.ts bundled into node, on a context that
//       records every node, frequency and start/stop and renders nothing) —
//       on the fallback score, and again with the world's track playing where
//       public/ ships one — and calls bonk(). Every voice it builds reaches
//       master and has ended by END s after the call; no oscillator is ever
//       set to square; no oscillator is ever asked for a frequency below
//       FLOOR Hz; and every noise voice passes a bandpass or highpass whose
//       lowest cutoff is at or above FLOOR Hz. A noise burst behind only a
//       lowpass is a thump: pop()'s "BITE — a 20ms low-passed thump".
//   (c) THE BARS CAN TELL THEM APART. pop(0) — the cue the taps played on
//       c79d36b — is read on the same worlds and must FAIL (b), and bonk()'s
//       voices (type and frequency span) must match neither pop(0)'s nor
//       alert()'s on that world. A bar that pop(0) passes could not have
//       caught the defect this probe exists for.
//
// NOT GRADED: loudness and spectrum. Nothing is rendered; a level for bonk()
// at the menu belongs to qa/chomp.mjs on the browser's own renderer.
import { readFileSync } from 'node:fs';
import { loadSynth, rig, shipsTrack } from './_synthgraph.mjs';
import { ALL_WORLDS } from './worlds.mjs';

const CUE = 'bonk';        // the padlock's answer: the wall's "you can't have that"
const FLOOR = 250;         // Hz: nothing a phone speaker renders as a thud
const END = 0.2;           // s after the call by which every voice has stopped
const HANDLERS = [
  { what: 'locked level dot', anchor: "track('level_locked_tap'" },
  { what: 'locked world card', anchor: "track('world_locked_tap'" },
];

const fails = [];
const die = (m) => { console.log(`FAIL — ${m}`); process.exit(1); };

// ── (a) THE HANDLERS ────────────────────────────────────────────────────────
const SRC_PATH = 'src/prototype3d.ts';
let src;
try { src = readFileSync(SRC_PATH, 'utf8').split('\n'); } catch (e) {
  die(`cannot read ${SRC_PATH} (${String(e.message).split('\n')[0]}) — run from artifacts/3d-game`);
}
/** a line with its // comment removed (the branches hold no '//' in a string) */
const code = (l) => l.replace(/(^|\s)\/\/.*$/, '');
const handlerCues = [];
for (const h of HANDLERS) {
  const at = src.map((l, i) => (code(l).includes(h.anchor) ? i : -1)).filter((i) => i >= 0);
  if (at.length !== 1) die(`(a) expected one ${h.anchor}…) in ${SRC_PATH}, found ${at.length} — the ${h.what}'s branch moved and this probe cannot read it`);
  let open = -1;
  for (let i = at[0]; i >= Math.max(0, at[0] - 40); i--) if (/\bif\s*\(.*\)\s*\{\s*$/.test(code(src[i]))) { open = i; break; }
  let ret = -1;
  for (let i = at[0]; i < Math.min(src.length, at[0] + 60); i++) if (/^\s*return;\s*$/.test(code(src[i]))) { ret = i; break; }
  if (open < 0 || ret < 0) die(`(a) the ${h.what}'s branch around ${SRC_PATH}:${at[0] + 1} has no \`if (…) {\` above it or no \`return;\` below it within reach`);
  const calls = [];
  for (let i = open; i <= ret; i++) for (const m of code(src[i]).matchAll(/\baudio\.(\w+)\s*\(/g)) calls.push(m[1]);
  handlerCues.push({ ...h, from: open + 1, to: ret + 1, calls });
  console.log(`  ${h.what.padEnd(17)} ${SRC_PATH}:${open + 1}-${ret + 1} calls ${calls.length ? calls.map((c) => `audio.${c}()`).join(', ') : 'no audio'}`);
}
for (const h of handlerCues) {
  const named = h.calls.filter((c) => c === 'pop' || c === 'alert');
  if (named.length) fails.push(`(a) the ${h.what} plays ${named.map((c) => `${c}()`).join(' and ')} — ${named.includes('pop') ? 'pop() is the eat' : ''}${named.length > 1 ? ', ' : ''}${named.includes('alert') ? 'alert() is the charge' : ''}`);
  else if (h.calls.length !== 1 || h.calls[0] !== CUE) fails.push(`(a) the ${h.what} makes ${h.calls.length} audio call(s) [${h.calls.join(', ')}], not one ${CUE}()`);
}
if (!fails.length) console.log(`  ok   (a) both locked taps make one audio call, ${CUE}(), and neither plays pop() or alert()`);

// ── (b) + (c) THE GRAPH ─────────────────────────────────────────────────────
const mod = await loadSynth();
const read = async (w, recording, fn) => {
  const r = await rig(mod, w, { recording });
  if (typeof r.a[CUE] !== 'function') die(`createAudio() has no ${CUE}() — the padlock's cue is gone`);
  return r.run(() => fn(r.a));
};
/** why a cue is not a soft tap, or [] */
const notATap = (vs) => {
  const why = [];
  if (!vs.length) why.push('built no voice');
  for (const v of vs) {
    const nm = v.kind === 'osc' ? `a ${v.type}` : 'a noise voice';
    if (!v.toMaster) why.push(`${nm} does not reach master`);
    if (v.everSquare) why.push(`${nm} set to square`);
    if (v.kind === 'osc' && v.fMin < FLOOR) why.push(`${nm} at ${v.fMin.toFixed(0)} Hz`);
    if (v.kind !== 'osc' && !v.filters.some((f) => (f.type === 'bandpass' || f.type === 'highpass') && f.fMin >= FLOOR))
      why.push(`${nm} behind ${v.filters.length ? v.filters.map((f) => `a ${f.type} at ${f.fMin.toFixed(0)} Hz`).join(', ') : 'no filter'} (a thump)`);
    if (v.stop === null || v.stop > END) why.push(`${nm} still sounding at ${v.stop === null ? 'no stop' : `${v.stop.toFixed(3)} s`}`);
  }
  return why;
};
const sig = (vs) => vs.map((v) => (v.kind === 'osc' ? `${v.type}:${v.fMin.toFixed(0)}-${v.fMax.toFixed(0)}` : `noise:${v.filters.map((f) => `${f.type}@${f.fMin.toFixed(0)}`).join('+')}`)).sort().join(' ');
const fmt = (vs) => vs.map((v) => (v.kind === 'osc'
  ? `${v.type} ${v.fFirst.toFixed(0)}->${v.fLast.toFixed(0)} Hz`
  : `noise via ${v.filters.map((f) => `${f.type} ${f.fMin.toFixed(0)} Hz`).join(', ') || 'nothing'}`)
  + ` to ${v.stop === null ? '?' : v.stop.toFixed(2)} s`).join(' + ');

const rows = [];
for (const w of ALL_WORLDS) {
  for (const recording of shipsTrack(w) ? [false, true] : [false]) {
    const cue = await read(w, recording, (a) => a[CUE]());
    const pop = await read(w, recording, (a) => a.pop(0));
    const alert = await read(w, recording, (a) => a.alert());
    rows.push({ w: `${w}${recording ? '+rec' : ''}`, cue, pop, alert });
  }
}
console.log(`  ${CUE}() on ${rows[0].w}: ${fmt(rows[0].cue)}`);
console.log(`  pop(0) on ${rows[0].w}: ${fmt(rows[0].pop)}`);

// (b)
const bBad = rows.flatMap((x) => notATap(x.cue).map((why) => `${x.w}: ${why}`));
if (bBad.length) fails.push(`(b) ${CUE}() is not a soft tap: ${[...new Set(bBad)].slice(0, 6).join('; ')}${bBad.length > 6 ? ' …' : ''}`);
else console.log(`  ok   (b) ${CUE}() on ${rows.length} reads (${ALL_WORLDS.length} worlds, fallback and recording): nothing under ${FLOOR} Hz, `
  + `no square, no low-passed thump, every voice on master and ended by ${Math.max(...rows.flatMap((x) => x.cue.map((v) => v.stop))).toFixed(3)} s (bar ${END} s)`);

// (c)
const popPasses = rows.filter((x) => !notATap(x.pop).length).map((x) => x.w);
const sameAsPop = rows.filter((x) => sig(x.cue) === sig(x.pop)).map((x) => x.w);
const sameAsAlert = rows.filter((x) => sig(x.cue) === sig(x.alert)).map((x) => x.w);
if (popPasses.length) fails.push(`(c) pop(0) passes (b) on ${popPasses.join(', ')} — these bars cannot tell the eat from a tap there`);
if (sameAsPop.length) fails.push(`(c) ${CUE}() builds the same voices as pop(0) on ${sameAsPop.join(', ')}`);
if (sameAsAlert.length) fails.push(`(c) ${CUE}() builds the same voices as alert() on ${sameAsAlert.join(', ')}`);
if (!popPasses.length && !sameAsPop.length && !sameAsAlert.length) {
  const eg = notATap(rows[0].pop);
  console.log(`  ok   (c) pop(0) fails (b) on all ${rows.length} reads (${rows[0].w}: ${eg.slice(0, 3).join('; ')}), `
    + `and ${CUE}() matches neither pop(0) nor alert() on any`);
}

if (fails.length) {
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\nFAIL — a tapped padlock does not answer with a soft "not yet" (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`\nPASS — both locked taps play ${CUE}(), a tap above ${FLOOR} Hz with no square and no thump on every world, and not the eat or the alarm`);
process.exit(0);
