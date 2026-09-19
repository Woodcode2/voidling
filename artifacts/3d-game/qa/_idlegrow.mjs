// DOES THE CLOCK GROW YOU FOR DOING NOTHING?
//
//   node qa/_idlegrow.mjs [port] [world]
//
// The owner, watching his own recording: "One instance when you stand still for
// some reason you grow." He is right, and it matters more than it looks: if the
// growth bar fills without eating then the bar is a clock, and every other
// improvement to it is decoration on a lie.
//
// THE MECHANISM. prototype3d.ts computes
//     surgeT    = max(0, elapsed - matchLen*0.66) / (matchLen*0.34)
//     scoreFloor= min(lawCap, START_R*(1+(score/974)^0.57) + surgeT^2 * 2.6 * pace)
// and then, in the frame loop, `if (radius < scoreFloor) setRadius(scoreFloor)`.
// The floor PUSHES. surgeT is elapsed time and nothing else, so for the last
// third of every match the clock alone lifts the radius — and the bar with it.
// On a 180s match that is the final 61.2 seconds.
//
// HOW THIS IS MEASURED HONESTLY. Only one variable moves: the clock. A score is
// earned first (pace must not be zero — a child who has never scored is not the
// case being described), then the void is warped clear of anything edible and
// NO further input is ever sent. __rushClock walks the clock down.
//
// SCORE CONSTANCY IS THE NO-EATING TEST. Eating always scores, so any row whose
// score differs from the first row is discarded rather than trusted — a passing
// mover can still drive into the void and be swallowed with no input at all,
// and one such row would otherwise be read as the clock's doing. The verdict
// uses only the clean prefix, and says how many rows it dropped.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
/** how much bar growth, with the score frozen, counts as the bug */
const BAR_TOL = 1.0;   // percentage points

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

// a child who HAS been playing, and then stops
for (let i = 0; i < 30; i++) { await p.evaluate(() => window.__eatNearest(0.05)); await p.waitForTimeout(110); }
await p.waitForTimeout(2500);
await p.evaluate(() => { const v = window.__voidState(); window.__warpVoid(v.x + 140, v.z + 140); });
await p.waitForTimeout(2500);

const READ = () => {
  const v = window.__voidState(), ms = window.__matchState();
  const g = document.getElementById('growth');
  const f = g && g.querySelector('.gFill'), n = g && g.querySelector('.gNow');
  return { t: ms.t ?? 0, r: v.r, score: ms.score ?? 0,
    bar: parseFloat((f && f.style.width) || '0') || 0,
    form: (n && n.textContent) || '?' };
};

const rows = [];
console.log(' clock left    radius      bar     form           score');
for (const left of [130, 110, 90, 70, 50, 35, 22]) {
  await p.evaluate((L) => window.__rushClock(L), left);
  await p.waitForTimeout(2600);
  const s = await p.evaluate(READ);
  rows.push({ left, ...s });
  console.log(`${String(left).padStart(10)} ${s.r.toFixed(3).padStart(10)} ${s.bar.toFixed(2).padStart(8)}% ${s.form.padEnd(13)} ${String(s.score).padStart(7)}`);
}
await b.close();

const base = rows[0].score;
const clean = [];
for (const r of rows) { if (r.score !== base) break; clean.push(r); }
const dropped = rows.length - clean.length;
console.log('');
if (dropped) console.log(`dropped the last ${dropped} row(s): the score moved, so something was eaten there`);
if (clean.length < 4) {
  console.log(`FAIL — only ${clean.length} clean row(s); something kept feeding the void and this run measured nothing`);
  process.exit(1);
}
const a = clean[0], z = clean[clean.length - 1];
const dBar = z.bar - a.bar, dR = (z.r / a.r - 1) * 100;
console.log(`across ${a.left}s -> ${z.left}s remaining, score frozen at ${base}, no input sent:`);
console.log(`  radius  ${a.r.toFixed(3)} -> ${z.r.toFixed(3)}  (+${dR.toFixed(1)}%)`);
console.log(`  bar     ${a.bar.toFixed(2)}% -> ${z.bar.toFixed(2)}%  (+${dBar.toFixed(2)} points)`);
console.log(`  form    ${a.form} -> ${z.form}`);
if (dBar > BAR_TOL) {
  console.log(`\nFAIL — the bar gained ${dBar.toFixed(2)} points for doing nothing. The surge term in`);
  console.log('       scoreFloor is a function of elapsed time, so the last third of every match');
  console.log('       grows a child who has put the phone down.');
  process.exit(1);
}
console.log(`\nPASS — with the score frozen the bar moved ${dBar.toFixed(2)} points, inside the ${BAR_TOL}-point tolerance`);
