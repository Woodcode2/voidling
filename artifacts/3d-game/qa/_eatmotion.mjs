// WHAT A PROP ACTUALLY DOES ON ITS WAY INTO THE MOUTH.
//
//   node qa/_eatmotion.mjs [world] [port]
//
// Three things were wrong with the eat at once, and none of them is visible in
// a screenshot — they are all about WHEN, so they need a prop sampled all the
// way down. The frame dt is clamped to 0.05 (prototype3d.ts), so under the
// software renderer one frame is 50ms of sim: a 0.6s eat is ~12 frames and
// several wall-seconds, which is enough to watch.
//
//   JAW      The mouth opened for 0.18 + 0.30 x bite (max 0.48s) while the
//            drain took 1 / (2.9 - 1.3 x mass) = up to 0.625s. Every single
//            eat in the game ended with the jaw SHUT and the meal still
//            falling. Graded on faceState().hold, the seconds still owed.
//
//            READ THE BEFORE-SIDE HONESTLY. Run against the build this
//            replaced, the jaw reads OPEN on every sample — not because the
//            bug was not there but because the probe cannot isolate it: the
//            void is pinned in a dense spot and eats its neighbours all the
//            way through the drain, and every one of those bites re-triggers
//            the mouth. The early shut only SHOWS on a single bite taken with
//            nothing else in reach, which is the landmark moment and the one
//            that matters most. The before-number for the jaw is therefore the
//            arithmetic in void3d.ts (want caps at 0.48s against a drain of up
//            to 0.625s), not a line this probe printed. What it does prove is
//            the fix: hold is handed in at capture and outlasts the fall.
//   KEEL     rotation += spin x dt with spin at 4.5-7.5 rad/s and no end
//            stop: a house turned 130-250 degrees and kept going. Graded on
//            the TOTAL TURNED — the sum of the angle between consecutive
//            sampled orientations, which does not fold at pi the way a single
//            angle-from-rest does, so a prop that pirouettes past its stop
//            cannot hide inside the bound.
//
//            The path-vs-net "one axis" line below is a GUARD, not evidence:
//            measured, it printed "one axis, one turn" for the free tumble too
//            (139 deg path against 132 deg net), because that draw happened to
//            pull a small spin.y. It catches a keel that starts wandering off
//            its axis; it does not tell the two builds apart. What does is
//            `armed` — the old build has no keel state to arm at all — and the
//            turn itself, 139 deg before against 80 deg after.
//   DESCENT  lerp(y, -R x 0.55, dt x 7) started on the capture frame, a 143ms
//            time constant: a prop was ~93% underground while the spiral still
//            had it three quarters of the way OUT. Graded on how far it has
//            fallen at the moment it is still 75% out.
//
// Nothing here is transcribed from the source. Every number is read off the
// live edible and the live face.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';

/** a prop at or above this radius is expected to go over ONCE and stop; below
 *  it the thing is round enough that "over" means nothing and it may tumble */
const BIG_R = 0.9;
/** the keel's own widest stop, plus a sampling allowance */
const TURN_MAX = 2.35;
/** how far down a prop may be while the spiral still has it 75% out */
const FALL_AT_75 = 0.12;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

// A BIG BITE IS THE ONE THAT SHOWS ALL THREE. Pin the radius so the growth law
// cannot move the goalposts mid-eat, then take the largest prop that is still
// legal food, walking the ratio down until the island offers one.
await p.evaluate(() => window.__setVoidR(3));
await p.waitForTimeout(400);

const SAMPLE = () => {
  const i = window.__eatIdx;
  const e = window.__edibles[i];
  if (!e || !e.eaten) return null;
  const v = window.__voidState();
  const q = e.mesh.quaternion, f = window.__faceState();
  return { t: e.t, y: e.mesh.position.y, dropY: e.dropY ?? null, r: e.radius, R: v.r,
    d: Math.hypot(e.mesh.position.x - v.x, e.mesh.position.z - v.z),
    q: [q.x, q.y, q.z, q.w], hold: f.hold ?? null, biting: f.biting,
    armed: !!(e.keel && e.rest) };
};

// ── THE PROP MUST BE PINNED BY IDENTITY, NOT BY A PREDICATE ────────────────
// `findIndex(e => e.eaten && e.t < 0.2)` looked right and was not: the void
// eats on its own for the six seconds before this runs, so the first array
// entry matching "eaten and early" can easily be a DIFFERENT prop, mid-drain
// from a bite taken a moment ago. Every number below would then describe that
// prop while the header described this one, and the jaw would be read off a
// mouth that opened for something else. Pick the candidate FIRST, by the same
// rule __eatNearest uses, then confirm that is the one it took. Both halves
// run in one evaluate, so no frame can slip between them.
let meal = null;
for (const rel of [0.85, 0.7, 0.55, 0.4, 0.3, 0.2]) {
  meal = await p.evaluate((rl) => {
    const es = window.__edibles, v = window.__voidState();
    let bi = -1, bd = 1e9;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.eaten || !e.mesh.visible || e.radius < v.r * rl || e.radius > v.r) continue;
      const d = Math.hypot(e.mesh.position.x - v.x, e.mesh.position.z - v.z);
      if (d < bd) { bd = d; bi = i; }
    }
    if (bi < 0) return null;
    const got = window.__eatNearest(rl);
    if (!got || !es[bi].eaten || es[bi].t !== 0) return null;
    window.__eatIdx = bi;
    // …and the jaw is read HERE, in the same turn as the capture, because a
    // single frame between the two is 50ms off a 0.22-0.48s envelope.
    const f = window.__faceState();
    return { ...got, hold0: f.hold ?? null, biting0: f.biting };
  }, rel);
  if (meal) break;
}
if (!meal) { console.log('FAIL — no prop on the island was eligible food at any ratio'); await b.close(); process.exit(1); }

// …and now watch it go down.
const S = [];
for (let i = 0; i < 260; i++) {
  const s = await p.evaluate(SAMPLE);
  if (!s) break;
  S.push(s);
  if (s.t >= 1) break;
  await p.waitForTimeout(60);
}
await b.close();

if (S.length < 4) { console.log(`FAIL — only ${S.length} samples; the eat was over before it could be watched`); process.exit(1); }

const bite = Math.min(1, Math.max(0.12, meal.r / Math.max(0.4, meal.R)));
const dot4 = (a, c) => Math.abs(a[0] * c[0] + a[1] * c[1] + a[2] * c[2] + a[3] * c[3]);
let turned = 0;
for (let i = 1; i < S.length; i++) turned += 2 * Math.acos(Math.min(1, dot4(S[i - 1].q, S[i].q)));
// …and the NET angle from where it started, which folds at pi where the path
// length does not. On a single-axis keel under its own stop the two agree; a
// free three-axis tumble makes them diverge, so printing both says WHICH kind
// of motion this was and not merely how much of it there was.
const net = 2 * Math.acos(Math.min(1, dot4(S[0].q, S[S.length - 1].q)));

// ── THE 75%-OUT SAMPLE HAS TO BE ONE THE SIM HAS MOVED ───────────────────
// S[0] is taken in the same JS turn as the capture, BEFORE a frame has run, so
// its d/d0 is 1.0 and its y is untouched by definition. Letting it win `at75`
// makes the descent check compare a sample against itself and report 0.0%
// fallen on ANY build, broken or fixed. Only samples the frame loop has
// actually stepped into can answer the question, and d0 is the radius the
// spiral starts from (capture clamps it to 0.9 x R), not the raw distance the
// prop happened to be sitting at when it was grabbed.
const moved = S.filter(s => s.t > 0);
if (!moved.length) { console.log('FAIL — the sim never stepped; nothing to measure'); process.exit(1); }
const d0 = moved[0].d || 1;
// ── THE DENOMINATOR IS THE DROP THAT WAS OBSERVED, NOT ONE FROM SOURCE ─────
// -R x 0.55 is the target the descent aims at, and it is not where a prop ends
// up: R is read fresh each frame, so the floor moves, and the old build was
// measured "110% fallen" — past a total it could not exceed. A percentage over
// 100 is the probe telling you its own denominator is wrong. Normalising by
// the drop this eat ACTUALLY made needs no constant off any build and cannot
// exceed 100, so the two builds are compared on the same scale.
const y0s = S[0].dropY ?? S[0].y;
const span = y0s - moved[moved.length - 1].y;
let at75 = null;
for (const s of moved) { if (s.d / d0 >= 0.75) at75 = s; }
if (!at75) at75 = moved[0];
const fell = ((at75.dropY ?? y0s) - at75.y) / (span || 1);

// A BUILD WITHOUT THE `hold` FIELD MUST STILL BE GRADED, NOT JUST FAIL.
// faceState() only started reporting the seconds owed with this change, so on
// the build being compared against it is undefined — and `Math.min(... ?? -1)`
// would report "the jaw shut" for a build where the probe simply cannot see
// the jaw. That is a probe failing, dressed up as a finding. `biting` is on
// both builds and answers the actual question (is the mouth open while the
// meal is still falling); `hold` only sharpens it into seconds when it is there.
const live = moved.filter(s => s.t < 0.95);
const hasHold = live.some(s => s.hold !== null && s.hold !== undefined);
const minHold = hasHold ? Math.min(...live.map(s => s.hold ?? 0)) : null;
const shutAt = live.find(s => (hasHold ? (s.hold ?? 0) <= 0 : !s.biting));

if (process.argv.includes('--dump')) {
  console.log('     t      d/d0        y   fallen  turned   jaw  biting');
  let cum = 0, prev = null;
  for (const s of moved) {
    if (prev) cum += 2 * Math.acos(Math.min(1, Math.abs(prev.q[0] * s.q[0] + prev.q[1] * s.q[1] + prev.q[2] * s.q[2] + prev.q[3] * s.q[3])));
    prev = s;
    console.log(`  ${s.t.toFixed(3)}  ${(s.d / d0).toFixed(3)}  ${s.y.toFixed(4).padStart(8)}  ${(((s.dropY ?? y0s) - s.y) / (span || 1) * 100).toFixed(1).padStart(5)}%  ${cum.toFixed(2).padStart(5)}  ${s.hold === null || s.hold === undefined ? '  n/a' : s.hold.toFixed(2).padStart(5)}  ${s.biting}`);
  }
  console.log('');
}
console.log(`world ${WORLD} · meal r=${meal.r.toFixed(2)} void R=${meal.R.toFixed(2)} · bite ${bite.toFixed(2)} · ${S.length} samples, t ${S[0].t.toFixed(2)} -> ${S[S.length - 1].t.toFixed(2)}`);
console.log(`  jaw at the capture frame   ${meal.hold0 === null ? (meal.biting0 ? 'open' : 'SHUT') : meal.hold0.toFixed(3) + 's'}   (the meal needs ${(1 / (2.9 - 1.3 * bite)).toFixed(3)}s to fall)`);
console.log('');
console.log(`  keel armed at capture      ${S[0].armed ? 'yes' : 'no'}`);
console.log(`  total turned               ${turned.toFixed(2)} rad  (${(turned * 57.3).toFixed(0)} deg), net ${(net * 57.3).toFixed(0)} deg — ${Math.abs(turned - net) < 0.22 ? 'one axis, one turn' : 'a free tumble'}`);
console.log(`  fallen while 75% out       ${(fell * 100).toFixed(1)}%  of the drop it actually made`);
console.log(`  jaw while the meal falls   ${minHold === null ? 'open on every sample (no seconds reported by this build)' : minHold.toFixed(3) + 's to spare'}${shutAt ? `  — SHUT at t=${shutAt.t.toFixed(2)}` : ''}`);
console.log('');

const bad = [];
if (!S[0].armed) bad.push('capture() did not arm the keel');
if (shutAt) bad.push(`the jaw shut with the meal still falling (t=${shutAt.t.toFixed(2)})`);
if (meal.r >= BIG_R && turned > TURN_MAX) bad.push(`a ${meal.r.toFixed(2)}-radius prop turned ${(turned * 57.3).toFixed(0)} deg — past any end stop`);
if (!(fell <= FALL_AT_75)) bad.push(`it was ${(fell * 100).toFixed(0)}% of the way down while still 75% out from the void`);
if (meal.r >= BIG_R && Math.abs(turned - net) >= 0.22) bad.push(`the turn was a free tumble, not a keel — path ${(turned * 57.3).toFixed(0)} deg vs net ${(net * 57.3).toFixed(0)} deg`);

if (bad.length) { for (const m of bad) console.log(`FAIL — ${m}`); process.exit(1); }
console.log(`PASS — the jaw held${minHold === null ? '' : ` ${minHold.toFixed(3)}s to spare`}, the prop went over ONCE on one axis (${(turned * 57.3).toFixed(0)} deg) and stayed at the height it was taken from (${(fell * 100).toFixed(1)}% fallen) until the mouth was under it`);
