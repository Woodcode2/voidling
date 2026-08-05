// Why is there no shadow in the mid-match frame? Read the live shadow state at
// the same match times qa/_worldshots.mjs shoots.
//
//   node qa/_shadowstate.mjs [world] [port]
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4191';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.evaluate(() => {
  window.__RR = window.__renderer.render.bind(window.__renderer);
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
});
const read = () => {
  const R = window.__renderer, S = window.__scene;
  let sun = null; S.children.forEach(o => { if (o.isDirectionalLight) sun = o; });
  let casters = 0, meshes = 0, inBox = 0;
  const T = window.__THREE; const bb = new T.Box3();
  const L = Math.abs(sun.shadow.camera.left);
  S.traverse(o => { if (o.isMesh && o.visible) { meshes++; if (o.castShadow) {
    casters++;
    try { bb.setFromObject(o);
      const dx = (bb.min.x + bb.max.x) / 2 - sun.target.position.x;
      const dz = (bb.min.z + bb.max.z) / 2 - sun.target.position.z;
      if (Math.hypot(dx, dz) < L) inBox++; } catch { /* ignore */ }
  } } });
  return { t: +window.__matchState().t.toFixed(1), camR: +window.__voidState().r.toFixed(2),
    shadowMapEnabled: R.shadowMap.enabled, shadowType: R.shadowMap.type,
    autoUpdate: R.shadowMap.autoUpdate, pixelRatio: R.getPixelRatio(),
    sunCastShadow: sun.castShadow, sunI: +sun.intensity.toFixed(3),
    box: L, near: sun.shadow.camera.near, far: sun.shadow.camera.far,
    mapSize: sun.shadow.mapSize.x, hasMap: !!sun.shadow.map,
    meshes, casters, castersInBox: inBox };
};
for (const mark of [6, 88, 163]) {
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, mark, { timeout: 900000 });
  await p.evaluate(() => { window.__renderer.render = window.__RR; });
  await p.waitForTimeout(1600);
  console.log(`\n── ${WORLD} t≈${mark} ──`);
  console.log(JSON.stringify(await p.evaluate(read), null, 1));
}
await b.close();
