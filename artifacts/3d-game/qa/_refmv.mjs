// REFUTATION probe — what does the mover loop actually COST, in milliseconds,
// on this CPU, with the software rasteriser taken out of the picture?
// life.ts is instrumented at the loop (window.__MV = per-frame ms).
// Render is stubbed exactly as every other perf probe here does it, so the
// frame callback time IS the game's per-frame JS.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const UNTIL = +(process.argv[3] || 60);
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });

  const cen = await p.evaluate(() => {
    const T = window.__THREE, cam = window.__cam, vs = window.__voidState();
    let movers = 0, off = 0, far = 0;
    const fr = new T.Frustum().setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const bx = new T.Box3(), sz = new T.Vector3(4, 4, 4);
    window.__scene.traverse(o => {
      if (o.userData && o.userData.mover) {
        movers++;
        if (Math.hypot(o.position.x - vs.x, o.position.z - vs.z) > 90) far++;
        bx.setFromCenterAndSize(o.position, sz);
        if (!fr.intersectsBox(bx)) off++;
      }
    });
    return { moversInScene: movers, far90: far, offFrustum: off,
      loopLen: window.__MVN, peds: window.__MVP, d: window.__MVD ? window.__MVD() : null };
  });

  await p.evaluate(() => {
    window.__renderer.render = () => {};
    window.__MV.length = 0;
    window.__FR = [];
    const raw = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raw((ts) => {
      const t0 = performance.now(); cb(ts);
      window.__FR.push(performance.now() - t0);
    });
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; } }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      raw(tick); };
    raw(tick);
  });
  await p.waitForFunction((u) => window.__matchState().t > u, UNTIL, { timeout: 1800000 });
  const R = await p.evaluate(() => ({ mv: window.__MV.slice(), fr: window.__FR.slice(),
    d: window.__MVD ? window.__MVD() : null, r: window.__voidState().r }));
  const q = (a, f) => { const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const n = Math.min(R.mv.length, R.fr.length);
  const mv = R.mv.slice(-n), fr = R.fr.slice(-n);
  console.log(`\n===== ${wid.toUpperCase()} =====`);
  console.log(`  census t=5s: scene movers ${cen.moversInScene}, loop length ${cen.loopLen}, peds(addWanderer) ${cen.peds}`);
  console.log(`               >90u ${cen.far90} (${(100 * cen.far90 / cen.moversInScene).toFixed(0)}%), off-frustum ${cen.offFrustum} (${(100 * cen.offFrustum / cen.moversInScene).toFixed(0)}%)`);
  console.log(`               peds alive ${cen.d?.pedsAlive}  >140u ${cen.d?.pedFar140}  <=140u ${cen.d?.pedNear140}`);
  console.log(`  frames sampled ${n} (t=5 -> ${UNTIL}s, r=${R.r.toFixed(1)})`);
  console.log(`  MOVER LOOP ms : mean ${mean(mv).toFixed(3)}  p50 ${q(mv, .5).toFixed(3)}  p95 ${q(mv, .95).toFixed(3)}  p99 ${q(mv, .99).toFixed(3)}  MAX ${q(mv, 1).toFixed(2)}`);
  console.log(`  WHOLE FRAME JS: mean ${mean(fr).toFixed(3)}  p50 ${q(fr, .5).toFixed(3)}  p95 ${q(fr, .95).toFixed(3)}  MAX ${q(fr, 1).toFixed(2)}   (render stubbed)`);
  console.log(`  mover share of per-frame JS: ${(100 * mean(mv) / mean(fr)).toFixed(1)}%`);
  console.log(`  end census: peds alive ${R.d?.pedsAlive} >140u ${R.d?.pedFar140} <=140u ${R.d?.pedNear140}`);
  await p.close();
}
await b.close();
