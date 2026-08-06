// CODE-HEALTH: `started` is set true in beginMatch (prototype3d.ts:2518) and
// set false in exactly ONE place — doQuit, the pause->LEAVE path (:3212). The
// results screen's HOME button (:3152) leaves it true. __matchState().t is
// `started ? matchElapsed() : 0`, so it reads the flag for us: a menu with t>0
// is a menu the game still thinks is a live match. Attract mode (:4029), the
// size-gate sweep (:4201) and audio.setZone (:4635) all key off !started /
// started.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const W = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
console.log('menu, before any match: started =', await p.evaluate(() => window.__matchState().t > 0));

await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 900000 });
await p.evaluate(() => window.__rushClock(1.2));
await p.waitForFunction(() => document.getElementById('end').classList.contains('show'),
  null, { timeout: 900000 });
await p.evaluate(() => document.getElementById('btnHome').click());
await p.waitForTimeout(2000);
const after = await p.evaluate(() => ({
  onMenu: document.body.classList.contains('menu'),
  started: window.__matchState().t > 0,
  t: +window.__matchState().t.toFixed(1),
}));
console.log('menu, after results -> HOME:', JSON.stringify(after));

// and how far the void travels on that menu over 240 frames — attract mode is
// gated on !started, so a true flag means the menu backdrop is frozen
const travel = await p.evaluate(async () => {
  const s0 = window.__voidState(); let px = s0.x, pz = s0.z, d = 0;
  for (let i = 0; i < 240; i++) {
    await new Promise(r => requestAnimationFrame(r));
    const s = window.__voidState(); d += Math.hypot(s.x - px, s.z - pz); px = s.x; pz = s.z;
  }
  return +d.toFixed(2);
});
console.log('void travel over 240 menu frames after results -> HOME:', travel, 'units');
await b.close();
