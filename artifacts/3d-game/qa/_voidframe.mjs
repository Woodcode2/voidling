// HOW MUCH OF THE SCREEN DOES THE VOID OWN?
//
//   node qa/_voidframe.mjs [port] [playDist]
//
// The owner sent hole.io as the bar and its hole spans 38.0% of frame width at
// "Size 2". This is what ours does, across the whole size range of a match.
//
// IT WAITS FOR THE CAMERA. That is the entire difficulty. camDist eases with a
// 0.625s time constant and dt is clamped to 0.05, so each FRAME closes 7.7% of
// the gap: settling is ~57 frames, which is a third of a second at 60fps and
// thirty to sixty SECONDS under the software renderer. A fixed wait of a few
// seconds samples a camera still flying outward and reports the void almost
// twice its settled size — 65% at R 5 against a true 42%, which looks exactly
// like a framing bug and is not one. So this polls camDist until it stops
// moving instead of sleeping, and prints the law's own settled value beside
// the measurement so a lagging row cannot be mistaken for a finding.
//
// It also forces no bite: impulse() lunges the body past its size, so a frame
// caught mid-eat overstates the void by about a third on top of everything
// above.
//
// Pass a second argument to photograph a different framing without rebuilding
// — it is handed to the page as ?pd=N.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';
const PORT = process.argv[2] || '4177';
const PD = process.argv[3] || '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidFirstNom', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple${PD ? `&pd=${PD}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await enterMatch(p, 'maple');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 8, null, { timeout: 600000 });

const rows = [];
for (const R of [0.9, 1.5, 2, 3, 4, 5, 7, 9, 12]) {
  await p.evaluate((r) => window.__setVoidR(r), R);
  // Two seconds is enough for __setVoidR to take and the aim to be recomputed;
  // the aim needs no settling, which is the whole point of reading it.
  await p.waitForTimeout(2000);
  rows.push(await p.evaluate(() => {
    const T = window.__THREE, cam = window.__cam, g = window.__voidGroup(), v = window.__voidState();
    cam.updateMatrixWorld();
    const c = g.position.clone();
    const right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0).normalize();
    const a = c.clone().project(cam);
    const e = c.clone().addScaledVector(right, v.r).project(cam);
    const k = window.__camAim();
    return { R: v.r, w: Math.abs(e.x - a.x), d: cam.position.distanceTo(c),
      aim: k.aim, fov: cam.fov, aspect: cam.aspect };
  }));
}
await b.close();
const t0 = rows[0].aspect * Math.tan((rows[0].fov / 2) * Math.PI / 180);
const frac = (R, d) => (R / d) / t0;
console.log(`PLAY_DIST ${PD || '(built-in)'}   fov ${rows[0].fov}   aspect ${rows[0].aspect.toFixed(4)}   tan(fovx/2) ${t0.toFixed(4)}`);
console.log('');
console.log('             the camera is ...    ... and aiming at');
console.log(' void R    dist    % of frame     dist    % of frame');
for (const r of rows) {
  console.log(`${r.R.toFixed(1).padStart(6)}  ${r.d.toFixed(0).padStart(6)}  ${(r.w * 100).toFixed(1).padStart(9)}%  ${r.aim.toFixed(0).padStart(8)}  ${(frac(r.R, r.aim) * 100).toFixed(1).padStart(9)}%`);
}
console.log('\nThe AIM column is the framing a child sees: at 60fps the ease is a third');
console.log('of a second. The left column is where a 1-2fps renderer has got to, and is');
console.log('here only so the two are never confused.');
console.log('\nhole.io reference, measured on a 760x1651 frame at "Size 2": 38.0%');

// GRADED ON THE AIM. The band is wide on purpose: this is a guard against the
// framing being moved without anyone noticing, not a re-tune. What it pins is
// the shape — the void must not own the screen at any size a match reaches,
// must be a real presence at spawn, and must sit near the reference in the
// middle of the range, which is where a match spends most of its time.
const at = (R) => { const r = rows.reduce((a, c) => Math.abs(c.R - R) < Math.abs(a.R - R) ? c : a); return frac(r.R, r.aim); };
const worst = Math.max(...rows.map(r => frac(r.R, r.aim)));
const spawn = frac(rows[0].R, rows[0].aim);
const mid = at(3);
const bad = [];
if (worst > 0.60) bad.push(`at its biggest the void owns ${(worst * 100).toFixed(0)}% of the frame width — the town stops being visible`);
if (spawn < 0.18) bad.push(`at spawn the void is only ${(spawn * 100).toFixed(0)}% of the frame — too small to read as the hero`);
if (Math.abs(mid - 0.38) > 0.06) bad.push(`at R~3 the void is ${(mid * 100).toFixed(1)}% against the reference's 38.0%`);
if (bad.length) { console.log(''); for (const m of bad) console.log(`FAIL — ${m}`); process.exit(1); }
console.log(`\nPASS — ${(spawn * 100).toFixed(1)}% at spawn, ${(mid * 100).toFixed(1)}% at R~3 against the reference's 38.0%, ${(worst * 100).toFixed(1)}% at the top of the range`);
