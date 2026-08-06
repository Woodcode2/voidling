// REFUTATION PROBE: is the opening frame representative of the MATCH?
//   node qa/_rf_framerun.mjs [worlds] [port]
// Drives the void at the nearest edible exactly as qa/_worldshots.mjs does and
// counts what is genuinely in the frustum at several marks across the 180 s
// match. A hand-authored spawn tells you nothing about minute two.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday').split(',');
const PORT = process.argv[3] || '4177';
const MARKS = [6, 40, 90, 150];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
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
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__renderer.render = () => {};      // sim at its proper rate
  });
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  for (const t of MARKS) {
    await p.waitForFunction(tt => (window.__matchState?.().t ?? 0) > tt, t, { timeout: 900000 });
    const out = await p.evaluate(() => {
      const T = window.__THREE, cam = window.__cam;
      cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const fr = new T.Frustum().setFromProjectionMatrix(
        new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const bb = new T.Box3(), sph = new T.Sphere(), v = new T.Vector3();
      const W = 86, H = 187; const mask = new Uint8Array(W * H);
      let inFr = 0, big = 0, eatable = 0;
      const vs = window.__voidState();
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        try { bb.setFromObject(e.mesh); } catch { continue; }
        if (!isFinite(bb.min.x)) continue;
        bb.getBoundingSphere(sph);
        if (!fr.intersectsSphere(sph)) continue;
        inFr++; if (e.radius >= 3) big++;
        if (e.radius <= vs.r * 1.11) eatable++;
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, any = false;
        for (let i = 0; i < 8; i++) {
          v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
          v.project(cam); if (v.z > 1) continue; any = true;
          const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H;
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
        if (!any) continue;
        x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W - 1, Math.ceil(x1));
        y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * W + x] = 1;
      }
      let f = 0; for (let i = 0; i < mask.length; i++) f += mask[i];
      return { inFr, big, eatable, cover: +(f / mask.length * 100).toFixed(1),
        r: +vs.r.toFixed(2), t: +window.__matchState().t.toFixed(0) };
    });
    console.log(`  t=${String(out.t).padStart(3)}  void r=${String(out.r).padStart(5)}  IN FRAME ${String(out.inFr).padStart(3)}  (r>=3: ${String(out.big).padStart(2)}, eatable now: ${String(out.eatable).padStart(3)})  screen cover ${out.cover}%`);
  }
  await p.close();
}
await b.close();
