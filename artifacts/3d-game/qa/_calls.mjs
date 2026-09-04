// PERF-FRAME pass 2 — HOW MANY TIMES A FRAME. The CPU profile named
// insideIslandWorld as the hottest function in the game; this counts the calls
// so the number is a cause and not a correlation. Requires the dist-count build,
// which carries PERFCOUNT lines in island.ts and prototype3d.ts.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4179;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => {
    window.__renderer.render = () => {};
    window.__CS = [];
    const raw = window.requestAnimationFrame.bind(window);
    window.__rawRAF = raw;
    let fi = 0;
    window.requestAnimationFrame = (cb) => raw((ts) => {
      const t0 = performance.now(); cb(ts); const t1 = performance.now();
      const c = window.__CF; if (!c) return;
      const ms = window.__matchState(); const vs = window.__voidState();
      window.__CS.push({ ms: +(t1 - t0).toFixed(2), t: +ms.t.toFixed(1), r: +vs.r.toFixed(2),
        iiw: c.iiw, biome: c.biome, deep: c.deep, solid: c.solid, dirscan: c.dirscan, nEd: c.nEd });
      fi++;
    });
    // autopilot, on the RAW rAF so it is not counted as a frame
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      raw(tick);
    };
    raw(tick);
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
  const S = await p.evaluate(() => window.__CS);
  const sum = k => S.reduce((a, x) => a + x[k], 0);
  const q = (k, f) => { const a = S.map(x => x[k]).sort((u, v) => u - v); return a[Math.min(a.length - 1, Math.floor(a.length * f))]; };
  const corr = () => { // does frame ms track iiw calls?
    const n = S.length, mx = sum('iiw') / n, my = sum('ms') / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const s of S) { const a = s.iiw - mx, c = s.ms - my; sxy += a * c; sxx += a * a; syy += c * c; }
    return sxy / Math.sqrt(sxx * syy || 1);
  };
  const worst = [...S].sort((a, x) => x.ms - a.ms).slice(0, 5);
  console.log(`\n===== ${wid.toUpperCase()} =====  frames ${S.length}, edibles ${S[0]?.nEd}`);
  console.log(`insideIslandWorld / frame:  mean ${(sum('iiw') / S.length).toFixed(0)}   p50 ${q('iiw', .5)}   p95 ${q('iiw', .95)}   p99 ${q('iiw', .99)}   MAX ${q('iiw', 1)}`);
  console.log(`biomeAt          / frame:  mean ${(sum('biome') / S.length).toFixed(0)}   p95 ${q('biome', .95)}   MAX ${q('biome', 1)}`);
  console.log(`inDeepWater3     / frame:  mean ${(sum('deep') / S.length).toFixed(0)}   p95 ${q('deep', .95)}   MAX ${q('deep', 1)}`);
  console.log(`solid()          / frame:  mean ${(sum('solid') / S.length).toFixed(1)}   p95 ${q('solid', .95)}   MAX ${q('solid', 1)}`);
  console.log(`dirScan()        / frame:  mean ${(sum('dirscan') / S.length).toFixed(2)}  MAX ${q('dirscan', 1)}   (frames with one: ${S.filter(s => s.dirscan > 0).length}, ${(100 * S.filter(s => s.dirscan > 0).length / S.length).toFixed(1)}%)`);
  console.log(`frame ms: mean ${(sum('ms') / S.length).toFixed(1)} p95 ${q('ms', .95)} MAX ${q('ms', 1)}   corr(ms, iiw) = ${corr().toFixed(3)}`);
  console.log('worst frames:');
  for (const w of worst) console.log(`  ${String(w.ms).padStart(7)}ms t=${w.t} r=${w.r}  iiw=${w.iiw} solid=${w.solid} dirscan=${w.dirscan} biome=${w.biome}`);
  await p.close();
}
await b.close();
