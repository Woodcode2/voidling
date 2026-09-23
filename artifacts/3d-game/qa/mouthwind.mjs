// DOES THE BITE WIND UP WHERE A CHILD CAN SEE IT? — the anticipation probe.
//
//   node qa/mouthwind.mjs                 the envelope, read out of void3d.ts (node only)
//   node qa/mouthwind.mjs [port] [world]  …and a real bite on the live rig, off
//                                         faceState().uniformK, frame by frame
//
// Studio round 4, Job 8 (HERO). AAA-BRIEF absence #2 was "no anticipation, no
// settle", and chomp() answered it with a jaw envelope in three phases: about
// 45 ms of wind-up in which the jaw barely parts, a spring open with an
// overshoot, then the settle. The settle is real. The wind-up is not visible:
// during it the gape is `mouthMax · (mouthAge / 0.045) · 0.12` — at most 0.12 of
// a full jaw even on the biggest bite — and the gape is not drawn at all below
// MOUTH_HIDES_AT, 0.25. So for the whole wind-up the maw is hidden and the grin
// stays up, and the first frame anything changes is the frame the jaw springs.
// The anticipation exists in the numbers and nowhere on the screen.
//
// The spec's fix puts it on the one surface that is always drawn — the body.
// For the first 60 ms of a bite from a closed mouth, uniformK dips by
// 0.04·g·sin(π·mouthAge/0.06): the void gathers in, graded by the meal, and is
// back to his own size as the jaw appears. uniformK is the same pure size term
// the evolution pop uses (qa/evolvepop.mjs), so the dip cannot shear the hat or
// the face; they ride it.
//
// ── THE BARS, AND WHERE EACH NUMBER COMES FROM ─────────────────────────────
// All read out of void3d.ts; none is a copy.
//   1. VISIBLE. During the wind-up, either the jaw is drawn (its envelope
//      reaches MOUTH_HIDES_AT) or the body moves by more than his own idle
//      breathing (`breathe`'s amplitude). A change smaller than the breath is
//      lost inside a motion the body is already making all the time. Graded at
//      a full bite (g = 1): the snack's wind-up is allowed to be small.
//   2. A GATHER, not a swell. Anticipation contracts before the action.
//   3. OVER BY THE JAW. The body is back to exactly 1 within one 60 Hz frame of
//      the maw first being drawn, so the dip never stacks on the gape.
//   4. GRADED. A snack (g at chomp's own floor) winds up less than a full bite:
//      chomp() grades the jaw, the hold and the wobble by the meal, and a
//      hydrant winding up like a hotel would be the one thing in it that does
//      not.
//   5. FED. The grade the wind-up reads must be written by chomp(), on the
//      same branch that restarts mouthAge — a closed mouth. A hoover spree
//      must not re-anticipate mid-chew.
//
// The live half forces one real bite through the game's own capture() path
// (__eatNearest) at a frozen radius, samples faceState().uniformK on every
// animation frame until the jaw has spent 0.1 s of its hold, and requires a
// frame below 1. dt is clamped to 0.05, so under swiftshader the 60 ms wind-up
// is one or two frames; that is why it samples every frame and never sleeps.
// An evolution in the window would dip uniformK on its own (the pop's
// anticipation), so a bite that also evolved is inconclusive, not a pass.
import { readFileSync } from 'node:fs';

const PORT = process.argv[2] || null;
const WORLD = process.argv[3] || 'maple';
const SRC = readFileSync('src/proto3d/void3d.ts', 'utf8');
const fail = (msg) => { console.log(`FAIL — ${msg}`); process.exit(1); };
const need = (re, what) => {
  const m = SRC.match(re);
  if (!m) fail(`could not find ${what} in void3d.ts. The call site moved; re-point this probe `
    + 'rather than letting it pass on nothing');
  return m;
};

// ── the jaw ────────────────────────────────────────────────────────────────
const HIDES = Number(need(/const MOUTH_HIDES_AT = ([\d.]+);/, 'MOUTH_HIDES_AT')[1]);
const wind = need(/if \(mouthAge < ([\d.]+)\) openEnv = \(mouthAge \/ ([\d.]+)\) \* ([\d.]+);/, "the jaw's wind-up");
const WIND = Number(wind[1]), WIND_PEAK = Number(wind[3]);
const spring = need(/const t2 = mouthAge - ([\d.]+);\s*openEnv = (.+?);/, "the jaw's spring");
const springF = new Function('t2', 'Math', `return (${spring[2]});`);
const openEnv = (a) => (a < WIND ? (a / Number(wind[2])) * WIND_PEAK : springF(a - Number(spring[1]), Math));
const gM = need(/const g = Math\.min\(1, Math\.max\(([\d.]+), k\)\);/, "chomp()'s grade");
const G_MIN = Number(gM[1]);
const wideF = new Function('g', `return (${need(/const wide = (.+?);/, "chomp()'s jaw width")[1]});`);
// ── the body ───────────────────────────────────────────────────────────────
const BREATH = Number(need(/const breathe = Math\.sin\(s\.t \* [\d.]+ \* slow\) \* ([\d.]+);/, 'the idle breath')[1]);
const bodyM = SRC.match(/(?:if \((mouthAge < [\d.]+)\) )?uniformK -= ([^;\n]*mouthAge[^;\n]*);/);
let dipF = null, gName = null;
if (bodyM) {
  const free = [...new Set((bodyM[2].match(/(?<![.\w])[A-Za-z_]\w*/g) || [])
    .filter((n) => !['Math', 'mouthAge'].includes(n)))];
  if (free.length !== 1) fail(`the body's wind-up reads ${free.length ? free.join(', ') : 'nothing'} besides mouthAge — `
    + 'this probe expects exactly one grade and will not guess at more');
  gName = free[0];
  dipF = new Function('mouthAge', gName, 'Math', `return (${bodyM[1] ? `(${bodyM[1]}) ? (${bodyM[2]}) : 0` : bodyM[2]});`);
  // bar 5: chomp() writes that grade from g, and on the closed-mouth branch
  const chompBody = need(/chomp\(k = [\d.]+, hold = 0\) \{([\s\S]*?)\n {4}\},/, 'chomp()')[1];
  if (!new RegExp(`if \\(cur < [\\d.]+\\) \\{[^}]*mouthAge = 0;[^}]*\\b${gName} = g;[^}]*\\}`).test(chompBody)) {
    fail(`the body's wind-up reads \`${gName}\`, and chomp() does not write it from g on the closed-mouth `
      + 'branch — the wind-up would play with a stale grade, or mid-chew');
  }
}
const dip = (a, g) => (dipF ? dipF(a, g, Math) : 0);

// ── sweep ──────────────────────────────────────────────────────────────────
const STEP = 1 / 2400;
const sweep = (g) => {
  let peak = 0, at = 0, maxGrow = 0, jawAt = null, jawPeakInWind = 0;
  for (let a = 0; a <= 0.3; a += STEP) {
    const d = dip(a, g);
    if (d > peak) { peak = d; at = a; }
    if (-d > maxGrow) maxGrow = -d;
    const mo = wideF(g) * openEnv(a);
    if (a < WIND) jawPeakInWind = Math.max(jawPeakInWind, mo);
    if (jawAt === null && mo >= HIDES) jawAt = a;
  }
  let residual = 0;
  for (let a = (jawAt ?? 0.3) + 1 / 60; a <= 0.3; a += STEP) residual = Math.max(residual, Math.abs(dip(a, g)));
  return { peak, at, maxGrow, jawAt, jawPeakInWind, residual };
};
const full = sweep(1), snack = sweep(G_MIN);

console.log('');
console.log(`  jaw during the wind-up (first ${(WIND * 1000).toFixed(0)} ms): peaks at ${full.jawPeakInWind.toFixed(3)} of a full gape; `
  + `drawn from ${HIDES} — ${full.jawPeakInWind >= HIDES ? 'VISIBLE' : 'never drawn'}`);
console.log(`  jaw first drawn at mouthAge ${full.jawAt === null ? 'never' : `${(full.jawAt * 1000).toFixed(1)} ms`} (full bite)`);
console.log(`  body wind-up term: ${bodyM ? bodyM[0].trim() : 'none — uniformK has no term that reads mouthAge'}`);
console.log(`  body dip, full bite (g 1):     ${(full.peak * 100).toFixed(2)}% at ${(full.at * 1000).toFixed(1)} ms`
  + `   residual after the jaw ${(full.residual * 100).toFixed(3)}%`);
console.log(`  body dip, snack (g ${G_MIN}):     ${(snack.peak * 100).toFixed(2)}% at ${(snack.at * 1000).toFixed(1)} ms`);
console.log(`  idle breath amplitude:         ${(BREATH * 100).toFixed(2)}%`);
console.log('');

const fails = [];
const seen = full.jawPeakInWind >= HIDES || full.peak > BREATH;
if (!seen) fails.push(`nothing a child can see moves during the wind-up: the jaw peaks at ${full.jawPeakInWind.toFixed(3)} `
  + `against a draw threshold of ${HIDES}, and the body ${full.peak > 0 ? `dips ${(full.peak * 100).toFixed(2)}%, inside his own `
  + `${(BREATH * 100).toFixed(1)}% breath` : 'does not move at all'}`);
if (full.maxGrow > 1e-9) fails.push(`the wind-up SWELLS the body by ${(full.maxGrow * 100).toFixed(2)}% — anticipation gathers in`);
if (bodyM && full.residual > 1e-9) fails.push(`the body is still ${(full.residual * 100).toFixed(3)}% off its size a frame after `
  + 'the jaw is drawn — the dip is stacking on the gape');
if (bodyM && !(snack.peak < full.peak)) fails.push(`a snack winds up ${(snack.peak * 100).toFixed(2)}% against a full bite's `
  + `${(full.peak * 100).toFixed(2)}% — the wind-up is not graded by the meal`);

// ── the live rig ───────────────────────────────────────────────────────────
if (PORT && !fails.length) {
  const { chromium } = await import('playwright');
  const { enterMatch } = await import('./_enter.mjs');
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log('PAGEERR ' + String(e).slice(0, 140)));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidMute', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { /* private mode */ } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5, null, { timeout: 900000 });
  // A frozen radius: a bite at spawn size can evolve him, and the evolution's
  // own anticipation would dip uniformK for reasons that are not this one.
  await p.evaluate(() => window.__setVoidR(3));
  const t0 = await p.evaluate(() => window.__matchState().tClock);
  await p.waitForFunction((t) => window.__matchState().tClock > t + 0.3 && !window.__faceState().biting, t0, { timeout: 900000 });
  const live = await p.evaluate(() => new Promise((res) => {
    const f0 = window.__faceState();
    if (typeof f0.uniformK !== 'number') { res({ noHook: true }); return; }
    const ev0 = window.__stages().ceremonies;
    const ate = window.__eatNearest(0.3);
    if (!ate) { res({ noFood: true }); return; }
    const rows = [];
    let hold0 = null;
    const tick = () => {
      const f = window.__faceState();
      rows.push({ uk: f.uniformK, hold: f.hold, biting: f.biting });
      if (hold0 === null && f.biting) hold0 = f.hold;
      const spent = hold0 !== null && hold0 - f.hold >= 0.1;
      if (spent || rows.length >= 40) res({ base: f0.uniformK, ate, rows, evolved: window.__stages().ceremonies !== ev0 });
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await b.close();
  if (live.noHook) fail('faceState() does not report uniformK, so the body cannot be read back. This build predates Job 8');
  if (live.noFood) fail('no edible between 0.3 and 1.0 of the void\'s radius anywhere in the world — nothing to bite');
  if (live.evolved) fail('the forced bite also evolved him, and the evolution pop dips uniformK on its own. Inconclusive; '
    + 'this is a FAIL until a run is clean, never a pass');
  const minUk = Math.min(...live.rows.map((r) => r.uk));
  console.log(`  LIVE ${WORLD}: bite r ${live.ate.r.toFixed(2)} on R ${live.ate.R.toFixed(2)}, uniformK ${live.base.toFixed(4)} before, `
    + `min ${minUk.toFixed(4)} over ${live.rows.length} frame(s): ${live.rows.map((r) => r.uk.toFixed(3)).join(' ')}`);
  console.log('');
  if (!(minUk < live.base - 1e-4)) fails.push(`live: uniformK never dipped below ${live.base.toFixed(4)} in the `
    + `${live.rows.length} frames after a real bite — the wind-up the table promises did not reach the rig`);
}

if (fails.length) {
  for (const x of fails) console.log(`  · ${x}`);
  console.log(`\nFAIL — the bite has no anticipation a child can see (${fails.length} finding(s))`);
  process.exit(1);
}
console.log(`PASS — a full bite gathers ${(full.peak * 100).toFixed(2)}% (breath ${(BREATH * 100).toFixed(1)}%) and is whole again `
  + `as the jaw appears at ${(full.jawAt * 1000).toFixed(0)} ms; a snack gathers ${(snack.peak * 100).toFixed(2)}%`
  + (PORT ? `; the live rig dipped on a real bite (${WORLD})` : ' (envelope only; pass a port for the live rig)'));
