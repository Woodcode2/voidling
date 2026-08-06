// REFUTE pass — "the size-gate clones a material per gated mesh and never gives
// one back: 828 new materials in a Maple match, 57% of all in-play allocation".
// Two questions the original evidence never separated:
//   (a) how many of the new materials are actually gate clones? (count them by
//       userData.gateMat, not by subtracting two totals across a match in which
//       props are also eaten OUT of the scene and others spawn IN)
//   (b) what does one clone actually COST in bytes? measure it, don't assume.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple').split(',');
const UNTIL = +(process.argv[3] || 120);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--js-flags=--expose-gc'] });
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
    const vs = window.__voidState();
    const mats = new Set(); const gateMats = new Set();
    let drawable = 0, meshesWithGate = 0, gatedNow = 0, propMeshes = 0;
    window.__scene.traverse(o => {
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) {
        drawable++;
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.uuid));
      }
      if (o.userData && o.userData.gateMat) { meshesWithGate++; gateMats.add(o.userData.gateMat.uuid); }
    });
    for (const e of (window.__edibles || [])) {
      if (e.eaten) continue;
      e.mesh.traverse(o => { if (o.isMesh) propMeshes++; });
      if (e.mesh.userData.gated) gatedNow++;
    }
    return { mats: mats.size, gateMats: gateMats.size, meshesWithGate, gatedNow, drawable, propMeshes,
      r: +vs.r.toFixed(2), edibles: (window.__edibles || []).filter(e => !e.eaten).length,
      heapMB: +(performance.memory ? performance.memory.usedJSHeapSize / 1048576 : -1).toFixed(1) };
  };

  const a = await p.evaluate(census);
  // ── what does ONE MeshStandardMaterial.clone() cost? measure, don't guess ──
  const cost = await p.evaluate(async () => {
    const T = window.__THREE;
    const src = new T.MeshStandardMaterial({ color: 0x884422, roughness: 0.8 });
    const N = 20000; const keep = [];
    if (window.gc) window.gc();
    await new Promise(r => setTimeout(r, 300));
    const h0 = performance.memory.usedJSHeapSize;
    for (let i = 0; i < N; i++) keep.push(src.clone());
    const h1 = performance.memory.usedJSHeapSize;
    const bytes = (h1 - h0) / N;
    // also time it
    const t0 = performance.now(); for (let i = 0; i < 2000; i++) keep.push(src.clone());
    const ms = (performance.now() - t0) / 2000;
    keep.length = 0;
    return { bytesPerClone: Math.round(bytes), msPerClone: +ms.toFixed(4) };
  });

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

  await p.waitForFunction((U) => window.__matchState().t > U, UNTIL, { timeout: 1800000 });
  const z = await p.evaluate(census);
  console.log(`\n===== ${wid.toUpperCase()} =====`);
  console.log(`  one MeshStandardMaterial.clone(): ${cost.bytesPerClone} bytes, ${cost.msPerClone} ms`);
  console.log(`  t=6s    mats ${a.mats}  gateClones ${a.gateMats}  meshesFlagged ${a.meshesWithGate}  gatedProps ${a.gatedNow}  liveEdibles ${a.edibles}  propMeshes ${a.propMeshes}  drawable ${a.drawable}  r ${a.r}  heap ${a.heapMB}MB`);
  console.log(`  t=${UNTIL}s  mats ${z.mats}  gateClones ${z.gateMats}  meshesFlagged ${z.meshesWithGate}  gatedProps ${z.gatedNow}  liveEdibles ${z.edibles}  propMeshes ${z.propMeshes}  drawable ${z.drawable}  r ${z.r}  heap ${z.heapMB}MB`);
  console.log(`  delta mats ${z.mats - a.mats}; of which gate clones account for ${z.gateMats - a.gateMats}`);
  console.log(`  gate-clone bytes at t=${UNTIL}: ${((z.gateMats * cost.bytesPerClone) / 1048576).toFixed(2)} MB of a ${z.heapMB} MB heap`);
  await p.close();
}
await b.close();
