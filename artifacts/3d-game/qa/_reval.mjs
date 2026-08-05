// PERF-FRAME pass 9 — THE TWO SCHEDULED STALLS. prototype3d.ts:3832 runs
// validateWorld() + bakeContactShadows() at tClock+8 and tClock+22 of every
// match, inside animate(), on the main thread. validateWorld calls
// Box3.setFromObject on every un-checked prop, which walks the whole subtree and
// transforms every vertex of every geometry. This times both, per world.
// Needs the dist-count build (port 4179).
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4179;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 600000 });
  // reference: how long does a plain frame take right now, on this machine, so
  // the stall can be quoted as a MULTIPLE and the host's load cannot flatter it
  await p.evaluate(() => { window.__renderer.render = () => {};
    window.__base = []; const raw = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raw((ts) => { const t0 = performance.now(); cb(ts); window.__base.push(performance.now() - t0); }); });
  await p.waitForFunction(() => (window.__REVAL || []).length >= 2 || window.__matchState().t > 40, null, { timeout: 900000 });
  const r = await p.evaluate(() => {
    const b = window.__base.slice().sort((a, x) => a - x);
    return { reval: window.__REVAL || [], median: b[Math.floor(b.length / 2)], n: b.length,
      edibles: window.__edibles.length };
  });
  console.log(`\n${wid.toUpperCase()} — ${r.edibles} edibles, median ordinary frame ${r.median.toFixed(1)}ms (${r.n} frames sampled)`);
  for (const v of r.reval)
    console.log(`  at match t=${v.t.toFixed(1)}s   validateWorld ${String(v.validate).padStart(7)}ms   bakeContactShadows ${String(v.bake).padStart(6)}ms   = ${((v.validate + v.bake) / r.median).toFixed(0)}x an ordinary frame`);
  await p.close();
}
await b.close();
