// WHAT DOES A CHILD WHO TAPS WILDLY ACTUALLY DO TO THE GAME?
//
//   node qa/_wild2.mjs [world] [taps-per-burst]
//
// _wild.mjs found that after 852 real touch taps at random screen points the
// match clock read 0 — `__matchState().t` is `started ? matchElapsed() : 0`,
// so the match was NOT RUNNING. Something the taps hit took the child out of
// their first ever match. This probe finds out what, by screenshotting and
// dumping the visible overlay stack the moment the clock stops.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
mkdirSync('./qa-out/first90', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.01, null, { timeout: 400000 });
// NOT stubbed: this run needs pixels for the screenshot, and every number
// below is a match-clock number or a count, never a wall clock.
const IDS = ['pause', 'gate', 'worlds', 'shop', 'daily', 'settings', 'trophies',
  'topvoids', 'policy', 'tut', 'end', 'book', 'menu', 'skinPrev', 'gift'];
const state = () => p.evaluate((ids) => ({
  t: window.__matchState?.().t ?? 0,
  up: ids.filter((i) => { const e = document.getElementById(i); return e && (e.classList.contains('show')
    || (i === 'menu' && getComputedStyle(e).display !== 'none')); }),
  focus: (document.activeElement || {}).id || '',
}), IDS);

let taps = 0, stopped = null;
for (let burst = 0; burst < 200; burst++) {
  for (let i = 0; i < 10; i++) {
    await p.touchscreen.tap(8 + Math.random() * 374, 30 + Math.random() * 800);
    taps++;
  }
  const s = await state();
  if (s.t === 0 || s.up.length) { stopped = { ...s, taps }; break; }
}
const s2 = await state();
console.log(`\n═══ ${WORLD.toUpperCase()} — WILD TAPPER, cold first launch ═══`);
if (stopped) {
  console.log(`  after ${stopped.taps} random taps the match clock reads ${stopped.t}`);
  console.log(`  overlays/screens visible: ${stopped.up.join(', ') || '(none — the match simply stopped)'}`);
  console.log(`  focused element: "${stopped.focus}"`);
} else {
  console.log(`  survived ${taps} random taps; clock ${s2.t}; overlays ${s2.up.join(', ') || 'none'}`);
}
await p.screenshot({ path: './qa-out/first90/wildtap.png' });
console.log('  screenshot -> qa-out/first90/wildtap.png');

// …and now the SPECIFIC hypothesis: two taps, the home chip then LEAVE.
const box = await p.evaluate(() => {
  const q = document.getElementById('btnQuit'); const r = q.getBoundingClientRect();
  const pq = document.getElementById('pauseQuit'); const r2 = pq.getBoundingClientRect();
  return { quit: { x: r.x, y: r.y, w: r.width, h: r.height },
    leave: { x: r2.x, y: r2.y, w: r2.width, h: r2.height } };
});
console.log(`  #btnQuit  ${Math.round(box.quit.w)}x${Math.round(box.quit.h)} at (${Math.round(box.quit.x)},${Math.round(box.quit.y)})`);
console.log(`  #pauseQuit "LEAVE THE MATCH" ${Math.round(box.leave.w)}x${Math.round(box.leave.h)} at (${Math.round(box.leave.x)},${Math.round(box.leave.y)})`);
console.log(`  screen is 390x844 = 329,160 px²; those two targets are `
  + `${Math.round(box.quit.w * box.quit.h)} px² and ${Math.round(box.leave.w * box.leave.h)} px² `
  + `(${((box.quit.w * box.quit.h) / 329160 * 100).toFixed(2)}% and ${((box.leave.w * box.leave.h) / 329160 * 100).toFixed(2)}% of the screen)`);
await b.close();
