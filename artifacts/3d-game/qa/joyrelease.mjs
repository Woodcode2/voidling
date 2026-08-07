// EVERY WAY A DRIVE ENDS. The joystick is a latch — joy.mag survives until
// something clears it — and for a long time only "the finger lifted" did.
// This drives the void with a real pointer, then takes the thumb away in each
// of the four ways a phone actually does it, and asks whether the void stops.
//
// Distance is sampled against the MATCH CLOCK, not wall time: under a software
// renderer the sim runs at a fraction of real speed, so a wall-clock window
// would report "it stopped" for a void that is merely slow.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
await p.evaluate(() => { window.__renderer.render = () => {}; });

/** World units travelled over `dt` seconds of MATCH time, after skipping
 *  `skip` seconds first. THE SKIP IS NOT OPTIONAL on a release test: velocity
 *  is smoothed downstream of the stick, so a void whose input went to zero
 *  still coasts a couple of units. Measuring from the instant of release would
 *  score a perfectly-working release as "still moving" and a broken one as
 *  working, which is the same number either way. */
const travel = (dt, skip = 0) => p.evaluate(async ([secs, lead]) => {
  const t0 = window.__matchState().t;
  while (window.__matchState().t - t0 < lead) await new Promise((r) => requestAnimationFrame(r));
  const t1 = window.__matchState().t;
  const a = window.__voidState();
  while (window.__matchState().t - t1 < secs) await new Promise((r) => requestAnimationFrame(r));
  const c = window.__voidState();
  return Math.hypot(c.x - a.x, c.z - a.z);
}, [dt, skip]);
const after = () => travel(1.5, 1.2);

/** put a thumb on the glass and pull it a full ring left */
const thumbDown = async () => {
  await p.mouse.move(215, 600); await p.mouse.down();
  await p.mouse.move(215, 600, { steps: 1 });
  for (let i = 1; i <= 8; i++) await p.mouse.move(215 - i * 14, 600, { steps: 1 });
};

const rows = [];
const check = (name, moving, stopped) => {
  const ok = moving > 2 && stopped < 0.6;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(26)} driving ${moving.toFixed(2)}u  after ${stopped.toFixed(2)}u`);
};

// 1. the baseline: a thumb on the glass drives, lifting it stops
await thumbDown();
let moving = await travel(1.2);
await p.mouse.up();
check('pointerup', moving, await after());

// 2. the app is backgrounded mid-drag (call banner, control centre, Cmd-Tab)
await thumbDown();
moving = await travel(1.2);
await p.evaluate(() => window.dispatchEvent(new Event('blur')));
check('window blur', moving, await after());
await p.mouse.up();

// 3. The tab is hidden mid-drag. Backgrounding ALSO raises the pause sheet,
// which freezes the match clock — so the tab has to come back and the sheet
// has to be dismissed BEFORE anything is measured, or travel() waits forever
// on a clock that is not running. The stick was cleared while hidden; resume
// does not put it back.
await thumbDown();
moving = await travel(1.2);
await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  document.getElementById('pauseResume').click();
});
check('document hidden', moving, await after());
await p.mouse.up();

// 4. The pause sheet comes up with the thumb still down, and RESUME is hit
// with it STILL down — which is what a child holding the phone one-handed
// actually does. The thumb never lifts, so no pointerup can rescue this one:
// either the sheet cleared the stick or the void is off again the instant the
// match unfreezes, before its owner has decided anything.
await thumbDown();
moving = await travel(1.2);
await p.evaluate(() => document.getElementById('btnQuit').click());
await p.evaluate(() => document.getElementById('pauseResume').click());
check('pause held + resume', moving, await after());
await p.mouse.up();

for (const r of rows) console.log(r);
console.log(rows.every((r) => r.startsWith('PASS')) ? '\nALL PASS' : '\nFAILURES ABOVE');
await b.close();
process.exit(rows.every((r) => r.startsWith('PASS')) ? 0 : 1);
