// PERF-FRAME pass 6 — WHERE THE GARBAGE COMES FROM. The whole-match run
// measured 40-67 MB of allocation per match-second and 700-900 heap drops in a
// three-minute match; on a phone every one of those is a pause a child can feel.
// This names the allocation sites with the sampling heap profiler. Run against
// the UNMINIFIED build (port 4178) so the names are readable.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4178;
const WORLDS = (process.argv[2] || 'maple').split(',');
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
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096 });
  await p.waitForFunction(() => window.__matchState().t > 46, null, { timeout: 900000 });
  const { profile } = await cdp.send('HeapProfiler.stopSampling');

  // fold the sample tree onto self-size per call frame
  const self = new Map();
  let total = 0;
  const walk = (n) => {
    const cf = n.callFrame;
    const size = (n.selfSize ?? 0);
    if (size) { const k = `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
      self.set(k, (self.get(k) || 0) + size); total += size; }
    for (const c of n.children || []) walk(c);
  };
  walk(profile.head);
  const top = [...self.entries()].sort((a, x) => x[1] - a[1]).slice(0, 18);
  console.log(`\n===== ${wid.toUpperCase()} — allocation over ~40 match-seconds, ${(total / 1048576).toFixed(1)} MB sampled =====`);
  for (const [k, v] of top) console.log(`  ${String((100 * v / total).toFixed(1)).padStart(5)}%  ${(v / 1024).toFixed(0).padStart(8)} KB  ${k}`);
  await p.close();
}
await b.close();
