// WHAT DOES CROSSING THE SHADOW RUNG COST, AND HOW OFTEN CAN IT HAPPEN?
//
//   node qa/qualcost.mjs [world] [port]
//
// three bakes shadow support into the compiled program, so flipping
// shadowMap.enabled invalidates every material and rebuilds every shader
// program in a 10,869-mesh scene. It was measured at a 1,677 ms frame with
// 3,190 ms of follow-on work — fired BY the frame rate dropping, in both
// directions, roughly every 14 seconds. That is a feedback loop, not a
// safeguard.
//
// This drives the ladder by hand and times the frame the crossing lands on,
// then checks the latch: after shadows have gone off once, climbing back must
// not cross the boundary again.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

const r = await p.evaluate(async () => {
  const frame = () => new Promise((res) => requestAnimationFrame(() => res(performance.now())));
  const settle = async (n) => { let last = await frame(); const d = []; for (let i = 0; i < n; i++) { const t = await frame(); d.push(t - last); last = t; } d.sort((a, x) => a - x); return d[Math.floor(d.length / 2)]; };
  const out = { steady: 0, down: 0, up: 0, latched: null, shadowsAfter: null };
  window.__pinQuality(2);
  await settle(24);
  out.steady = await settle(24);
  // rung 2 -> 3 is the shadows-off crossing
  const t0 = await frame();
  window.__pinQuality(3);
  const t1 = await frame();
  out.down = t1 - t0;
  await settle(30);
  // hand it back to the adapter and ask it to climb: the latch must hold
  window.__pinQuality(null);
  out.shadowsAfter = window.__quality().shadows;
  return out;
});
console.log(`${WORLD}`);
console.log(`  steady frame            ${r.steady.toFixed(1)} ms`);
console.log(`  frame that crosses 2->3 ${r.down.toFixed(1)} ms   (${(r.down / r.steady).toFixed(1)}x steady)`);
console.log(`  shadows after handback  ${r.shadowsAfter}`);
await b.close();
