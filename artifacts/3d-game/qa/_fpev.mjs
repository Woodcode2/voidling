// EVENT COST, from an _fp2.mjs capture. Finds the frames on which a rival
// JOINED and the frames on which the void crossed a FORM threshold, and
// compares them against the surrounding baseline. "Does the game hitch when a
// rival arrives" is answerable from the capture already taken.
//   node qa/_fpev.mjs qa-out/fp2-<world>-js.json
import { readFileSync } from 'fs';
const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
const NAMES = ['VOIDLING', 'MUNCHER', 'GOBBLER', 'DEVOURER', 'COLOSSUS', 'WORLD ENDER'];
const stage = r => { let s = 0; for (let i = 0; i < FORM_MIN.length; i++) if (r >= FORM_MIN[i]) s = i; return s; };
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const js = d.js, n = d.n;
const base = (i, w = 40) => { const a = [];
  for (let k = Math.max(1, i - w); k < i - 2; k++) a.push(js[k]);
  a.sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };
const win = (i, k) => { let m = 0, s = 0; for (let j = i; j < Math.min(n, i + k); j++) { m = Math.max(m, js[j]); s += js[j]; } return { m, s }; };
console.log(`\n── ${process.argv[2]}`);
const sorted = [...js.slice(30)].sort((a, x) => a - x);
console.log(`   match p50 ${sorted[sorted.length >> 1].toFixed(2)} ms`);
console.log(`   EVENT                       t     baseline   that frame   worst of next 10   sum of next 10`);
// LATCH the form the way the game does (prototype3d.ts:4619 `if (ns > curStage)`).
// Without the latch the eat LUNGE — voidling.impulse() overshoots the new radius
// by ~4% for one frame — re-crosses the threshold dozens of times and the probe
// reports thirty evolutions in a match that has five.
let cur = 0, overshoot = 0, overshootMax = 0;
for (let i = 1; i < n; i++) {
  let label = null;
  if (d.join[i] > d.join[i - 1]) label = `rival #${d.join[i]} joins`;
  const s1 = stage(d.r[i]);
  if (s1 > cur) {
    label = `EVOLVE → ${NAMES[s1]}`;
    // did the radius fall back UNDER the threshold it just crossed?
    // only the next THREE frames: a hunter bite also drops you a form, and over
    // thirty frames the two are indistinguishable.
    let fellBack = 0;
    for (let k = i + 1; k < Math.min(n, i + 4); k++) fellBack = Math.max(fellBack, FORM_MIN[s1] - d.r[k]);
    if (fellBack > 0) { overshoot++; overshootMax = Math.max(overshootMax, fellBack); }
    cur = s1;
  }
  if (!label) continue;
  const b = base(i), w = win(i, 10);
  console.log(`   ${label.padEnd(24)} ${d.t[i].toFixed(1).padStart(6)}  ${b.toFixed(1).padStart(7)}ms ${js[i].toFixed(1).padStart(10)}ms ${w.m.toFixed(1).padStart(15)}ms ${w.s.toFixed(0).padStart(14)}ms`);
}
// last-20-seconds vs the rest — the WORLD ENDER finale window
const late = [], rest = [];
for (let i = 30; i < n; i++) (d.t[i] >= 158 ? late : rest).push(js[i]);
late.sort((a, x) => a - x); rest.sort((a, x) => a - x);
const q = (a, p) => a.length ? a[Math.floor(a.length * p)] : 0;
console.log(`   FINALE (t>=158s): p50 ${q(late, .5).toFixed(1)} p95 ${q(late, .95).toFixed(1)} max ${late[late.length - 1].toFixed(1)} ms  (n=${late.length})`);
console.log(`   rest of match   : p50 ${q(rest, .5).toFixed(1)} p95 ${q(rest, .95).toFixed(1)} max ${rest[rest.length - 1].toFixed(1)} ms  (n=${rest.length})`);
console.log(`   evolutions promoted on a LUNGE the radius then fell back under: ${overshoot} (deepest fall-back ${overshootMax.toFixed(3)} r)`);
