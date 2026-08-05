// PERF-FRAME pass 7 — WHO IS ASKING? LANTERN NIGHT makes ~2,000 biomeAt calls
// a frame and it is the world's whole frame budget; this attributes the calls to
// their callers by folding TOTAL time up the CPU profile's call tree, so the
// answer is "the crowd" or "the rivals" or "the wall", not "point-in-polygon".
// Unminified build (4178) — names matter more than absolute time here.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4178;
const WORLDS = (process.argv[2] || 'lantern').split(',');
const HOT = /pointInPoly|insideIslandWorld|lnRegionAt|gdRegionAt|bayDistrictAt|onLanternLand|onBayLand|onGameDayLand|biomeAt|insideIsland3|inDeepWater3/;
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => {};
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; } }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 150 });
  await cdp.send('Profiler.start');
  await p.waitForFunction(() => window.__matchState().t > 46, null, { timeout: 900000 });
  const { profile } = await cdp.send('Profiler.stop');

  const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const nm = n => `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber + 1}`;
  const hits = new Map(); let tot = profile.samples.length, hotTot = 0;
  const selfTot = new Map();
  for (const s of profile.samples) {
    const n = byId.get(s); if (!n) continue;
    selfTot.set(nm(n), (selfTot.get(nm(n)) || 0) + 1);
    if (!HOT.test(n.callFrame.functionName || '')) continue;
    hotTot++;
    // walk out of the geometry helpers to the first caller that is not one
    let cur = n, guard = 0;
    while (guard++ < 12) {
      const pid = parent.get(cur.id); if (!pid) break;
      const pn = byId.get(pid); if (!pn) break;
      if (!HOT.test(pn.callFrame.functionName || '')) { hits.set(nm(pn), (hits.get(nm(pn)) || 0) + 1); break; }
      cur = pn;
    }
  }
  console.log(`\n===== ${wid.toUpperCase()} — who calls the coastline/district tests =====`);
  console.log(`geometry helpers are ${(100 * hotTot / tot).toFixed(1)}% of ALL samples (idle included)`);
  for (const [k, v] of [...hits.entries()].sort((a, x) => x[1] - a[1]).slice(0, 14))
    console.log(`  ${String((100 * v / hotTot).toFixed(1)).padStart(5)}% of that   <- ${k}`);
  console.log('top self time overall:');
  for (const [k, v] of [...selfTot.entries()].sort((a, x) => x[1] - a[1]).slice(0, 10))
    console.log(`  ${String((100 * v / tot).toFixed(1)).padStart(5)}%  ${k}`);
  await p.close();
}
await b.close();
