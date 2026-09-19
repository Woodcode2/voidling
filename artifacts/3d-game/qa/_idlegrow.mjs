// DOES THE CLOCK GROW YOU FOR DOING NOTHING?
//
//   node qa/_idlegrow.mjs [port] [world]
//
// The owner, watching his own recording: "One instance when you stand still for
// some reason you grow." He is right.
//
// THE MECHANISM. prototype3d.ts computes
//     surgeT     = max(0, elapsed - matchLen*0.66) / (matchLen*0.34)
//     scoreFloor = min(lawCap, START_R*(1+(score/974)^0.57) + surgeT^2 * 2.6 * pace)
// and the frame loop PUSHES the radius up to that floor. surgeT is elapsed time
// and nothing else, so for the last third of every match the clock alone lifts
// a parked player. On a 180s match that is the final 61.2 seconds.
//
// ── THREE THINGS THIS PROBE HAD WRONG, AND WHY EACH ONE MATTERED ───────────
//
// (1) IT GRADED THE BAR. The verdict was `z.bar - a.bar` against a 1.0-point
// tolerance. The bar's width is about to stop following the clock as part of
// the growth-bar work — at which point this probe would report PASS with the
// growth law completely unchanged, silencing the exact defect it exists to
// catch. It now grades the RADIUS, which is the quantity the law moves.
//
// (2) IT SLEPT WHERE IT HAD TO POLL. FLOOR_FED lives in tClock, and tClock
// advances with the CLAMPED frame dt — measured at roughly 0.043 game-seconds
// per wall-second under the software renderer, so four of those seconds are
// about ninety of wall clock. The old 2500ms waits do not come close. Without
// polling __law().fed the arm would fail the FIXED build on a legitimate
// post-bite tail, and send the next person hunting a bug that is not there.
//
// (3) IT SUMMED A SIGNED DIFFERENCE ACROSS A BAND EDGE. formProgress restarts
// at zero at every form threshold, so a window straddling a crossing gives a
// large NEGATIVE delta and passes by sign. GROW accumulates max(0, dr) over
// consecutive pairs, and LADDER — stage + progress — is band-continuous, so
// neither can be cancelled by a rung.
//
// SCORE CONSTANCY IS THE NO-EATING TEST, and it is enforced rather than
// assumed: eating always scores, so a pair whose score moved is DISCARDED. A
// passing mover can drive into a parked void and be swallowed with no input at
// all, and one such pair read as the clock's doing would be a false finding.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
/** radius a parked player may gain before it is the defect */
const GROW_TOL = 0.005;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
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
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

const hasLaw = await p.evaluate(() => typeof window.__law === 'function');

// a child who HAS been playing, and then stops
for (let i = 0; i < 30; i++) { await p.evaluate(() => window.__eatNearest(0.05)); await p.waitForTimeout(110); }
await p.waitForTimeout(2000);
await p.evaluate(() => { const v = window.__voidState(); window.__warpVoid(v.x + 140, v.z + 140); });

// …and now WAIT until the floor considers her unfed, by POLLING the build's own
// answer. On a build without __law there is nothing to poll, so fall back to a
// long sleep and say so in the output rather than pretending.
if (hasLaw) {
  await p.waitForFunction(() => window.__law().fed === false, null, { timeout: 300000 });
} else {
  await p.waitForTimeout(8000);
}

const READ = () => {
  const v = window.__voidState(), ms = window.__matchState();
  const g = document.getElementById('growth');
  const f = g && g.querySelector('.gFill'), n = g && g.querySelector('.gNow');
  const law = typeof window.__law === 'function' ? window.__law() : {};
  return { t: ms.t ?? 0, r: v.r, score: ms.score ?? 0,
    fed: law.fed === undefined ? null : law.fed,
    bar: parseFloat((f && f.style.width) || '0') || 0,
    form: (n && n.textContent) || '?',
    cer: (window.__stages && window.__stages().ceremonies) ?? 0 };
};

const rows = [];
console.log(' clock left    radius      bar    fed    form           score   ceremonies');
for (const left of [130, 110, 90, 70, 61, 50, 35, 22]) {
  await p.evaluate((L) => window.__rushClock(L), left);
  await p.waitForTimeout(2600);
  const s = await p.evaluate(READ);
  rows.push({ left, ...s });
  console.log(`${String(left).padStart(10)} ${s.r.toFixed(4).padStart(10)} ${s.bar.toFixed(2).padStart(7)}% ${String(s.fed).padStart(6)}  ${s.form.padEnd(13)} ${String(s.score).padStart(7)} ${String(s.cer).padStart(10)}`);
}
await b.close();

// ── THE STATISTIC ─────────────────────────────────────────────────────────
// Consecutive PAIRS only, counted only when the score is identical at both ends
// and the floor is unfed at both ends. Positive moves only, so a band edge or a
// downward nudge cannot cancel the growth being measured.
let grow = 0, pairs = 0, dropped = 0;
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], c = rows[i];
  if (a.score !== c.score) { dropped++; continue; }
  if (a.fed !== null && (a.fed || c.fed)) { dropped++; continue; }
  pairs++;
  grow += Math.max(0, c.r - a.r);
}
const cerRise = Math.max(...rows.map(r => r.cer)) - rows[0].cer;
console.log('');
if (!hasLaw) console.log('NOTE — this build has no __law hook, so "fed" could not be read and the');
if (!hasLaw) console.log('       unfed wait was a fixed sleep. Pairs were gated on score alone.');
console.log(`counted ${pairs} pair(s), dropped ${dropped} (score moved, or the floor was still fed)`);
if (pairs < 3) { console.log(`FAIL — only ${pairs} usable pair(s); something kept feeding the void and this run measured nothing`); process.exit(1); }
console.log(`  radius gained while parked   ${grow.toFixed(4)}   (tolerance ${GROW_TOL})`);
console.log(`  ceremonies fired while parked ${cerRise}`);
const bad = [];
if (grow > GROW_TOL) bad.push(`the radius rose ${grow.toFixed(4)} with the score flat and the floor unfed — the clock grew a parked player`);
if (cerRise > 0) bad.push(`${cerRise} evolution ceremony(s) fired while the phone was down`);
if (bad.length) { for (const m of bad) console.log(`FAIL — ${m}`); process.exit(1); }
console.log(`\nPASS — parked, unfed, score flat: the radius moved ${grow.toFixed(4)} and no ceremony fired`);
