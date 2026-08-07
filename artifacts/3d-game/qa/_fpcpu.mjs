// WHERE THE 30 ms GOES. CDP CPU profile over a window of a real match, render
// stubbed, quality pinned, folded onto self time per function. Run against the
// UNMINIFIED build (port 4232) so the names mean something.
//   node qa/_fpcpu.mjs [worlds] [port] [t0] [t1]
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple').split(',');
const PORT = process.argv[3] || '4232';
const T0 = +(process.argv[4] || 20), T1 = +(process.argv[5] || 70);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(900000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.3, null, { timeout: 900000 });
  await p.evaluate(() => {
    window.__pinQuality(0);
    window.__renderer.render = () => {};
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let bx = 0, bz = 0, bd = 1e9, ok = false;
      const E = window.__edibles;
      for (let i = 0; i < E.length; i++) { const e = E[i];
        if (e.eaten || !e.mesh || !e.mesh.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; bx = dx; bz = dz; ok = true; } }
      if (ok) { const m = Math.hypot(bx, bz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + bx / m * 110, clientY: cy + bz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(t => window.__matchState().t > t, T0, { timeout: 900000 });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
  await cdp.send('Profiler.start');
  await p.waitForFunction(t => window.__matchState().t > t, T1, { timeout: 900000 });
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map(n => [n.id, n]));
  const hits = new Map();
  let total = 0;
  for (const n of profile.nodes) {
    if (!n.hitCount) continue;
    const cf = n.callFrame;
    const k = `${cf.functionName || '(anon)'}  ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
    hits.set(k, (hits.get(k) || 0) + n.hitCount); total += n.hitCount;
  }
  console.log(`\n═══ ${wid.toUpperCase()}  match t ${T0}→${T1}s   ${total} samples @250us = ${(total * 0.25 / 1000).toFixed(1)}s of CPU`);
  for (const [k, v] of [...hits.entries()].sort((a, x) => x[1] - a[1]).slice(0, 28))
    console.log(`  ${(100 * v / total).toFixed(2).padStart(6)}%  ${String(v).padStart(6)}  ${k}`);
  await p.close();
}
await b.close();
