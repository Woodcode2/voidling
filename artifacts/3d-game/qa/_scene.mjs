// PERF-FRAME pass 10 — THE SCENE GRAPH, and what a match does to it.
// three.js walks EVERY node twice a frame (matrix update, then frustum cull for
// the colour pass and again for the shadow pass), so the node count is a fixed
// per-frame tax that no draw-call number reveals. Also counts movers (life.ts
// updates all of them every frame with no distance gate) and watches the
// material count, because the size-gate at prototype3d.ts clones a material per
// gated mesh and never gives one back.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
  const census = () => {
    const T = window.__THREE, cam = window.__cam, vs = window.__voidState();
    let nodes = 0, drawable = 0, movers = 0, moversFar = 0, moversOff = 0;
    const mats = new Set();
    const fr = new T.Frustum().setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const bx = new T.Box3(), sz = new T.Vector3(4, 4, 4);
    window.__scene.traverse(o => {
      nodes++;
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { drawable++;
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.uuid)); }
      if (o.userData && o.userData.mover) { movers++;
        if (Math.hypot(o.position.x - vs.x, o.position.z - vs.z) > 90) moversFar++;
        bx.setFromCenterAndSize(o.position, sz);
        if (!fr.intersectsBox(bx)) moversOff++; }
    });
    // what does one scene-graph walk cost right now?
    const t0 = performance.now(); for (let i = 0; i < 5; i++) window.__scene.updateMatrixWorld(true);
    const walk = (performance.now() - t0) / 5;
    return { nodes, drawable, movers, moversFar, moversOff, mats: mats.size, walk: +walk.toFixed(2), r: vs.r };
  };
  const a = await p.evaluate(census);
  await p.evaluate(() => { window.__renderer.render = () => {};
    const cv = document.querySelector('canvas'); const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; } }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  await p.waitForFunction(() => window.__matchState().t > 120, null, { timeout: 900000 });
  const z = await p.evaluate(census);
  console.log(`\n${wid.toUpperCase()}`);
  console.log(`  scene nodes ${a.nodes} (${a.drawable} drawable) — three.js walks all of them for matrices, then again per render pass`);
  console.log(`  one scene.updateMatrixWorld(true): ${a.walk} ms`);
  console.log(`  movers (updated EVERY frame, no distance gate — life.ts:2380): ${a.movers}, of which ${a.moversFar} are >90u away and ${a.moversOff} (${(100 * a.moversOff / Math.max(1, a.movers)).toFixed(0)}%) are outside the camera frustum`);
  console.log(`  distinct materials  t=6s: ${a.mats}   t=120s: ${z.mats}   (+${z.mats - a.mats} created DURING the match, r ${a.r.toFixed(1)} -> ${z.r.toFixed(1)})`);
  await p.close();
}
await b.close();
