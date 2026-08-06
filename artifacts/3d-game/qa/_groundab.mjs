// REFUTATION PROBE: does the bottom quality rung actually leave props ungrounded,
// and can you see it? Census of prop-level grounding + an A/B screenshot of the
// SAME frame with the shadow map forced on and forced off.
//
//   node qa/_groundab.mjs [world] [port] [markT]
import { chromium } from 'playwright';
import fs from 'node:fs';
const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4237';
const MARK = +(process.argv[4] || 34);
const OUT = process.argv[5] || '/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad';
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(600000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 400000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1600);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 600000 });

// drive toward the nearest edible so the match progresses like a real one
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

const census = () => {
  const S = window.__scene;
  let sun = null; S.children.forEach(o => { if (o.isDirectionalLight) sun = o; });
  const R = window.__renderer;
  const T = window.__THREE;
  const bb = new T.Box3();
  const cam = window.__cam;
  const vs = window.__voidState();
  // what the camera can actually see this frame
  const frustum = new T.Frustum();
  cam.updateMatrixWorld();
  frustum.setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));

  const rows = { total: 0, casts: 0, disc: 0, both: 0, neither: 0, castNoDisc: 0 };
  const vis = { total: 0, castNoDisc: 0, disc: 0, neither: 0 };
  const bigCastNoDiscVisible = [];
  for (const e of window.__edibles) {
    if (e.eaten) continue;
    const ud = e.mesh.userData || {};
    let casts = false;
    e.mesh.traverse(o => { if (o.isMesh && o.castShadow) casts = true; });
    let disc = ud.shIdx !== undefined;
    if (!disc) e.mesh.traverse(o => { if (o.userData && o.userData.cshadow) disc = true; });
    rows.total++;
    if (casts) rows.casts++;
    if (disc) rows.disc++;
    if (casts && disc) rows.both++;
    if (!casts && !disc) rows.neither++;
    if (casts && !disc) rows.castNoDisc++;
    // visible-on-screen slice
    let onScreen = false;
    try { bb.setFromObject(e.mesh); onScreen = e.mesh.visible && frustum.intersectsBox(bb); } catch {}
    if (onScreen) {
      vis.total++;
      if (casts && !disc) { vis.castNoDisc++;
        if (bigCastNoDiscVisible.length < 12) bigCastNoDiscVisible.push({ r: +e.radius.toFixed(1), k: e.mesh.name || (e.mesh.userData && e.mesh.userData.qk) || '' }); }
      if (disc) vis.disc++;
      if (!casts && !disc) vis.neither++;
    }
  }
  return { t: +window.__matchState().t.toFixed(1), voidR: +vs.r.toFixed(2),
    shadowMapEnabled: R.shadowMap.enabled, sunCastShadow: sun.castShadow,
    mapSize: sun.shadow.mapSize.x, hasMap: !!sun.shadow.map, pr: R.getPixelRatio(),
    props: rows, onScreen: vis, sample: bigCastNoDiscVisible };
};

// early census
console.log('── early ──');
console.log(JSON.stringify(await p.evaluate(census), null, 1));

await p.evaluate(() => { window.__renderer.render = () => {}; });
await p.waitForFunction(t => (window.__matchState?.().t ?? 0) > t, MARK, { timeout: 1500000 });
await p.evaluate(() => { window.__renderer.render = window.__RR; });
await p.waitForTimeout(2500);

console.log(`── t≈${MARK} as-shipped ──`);
const st = await p.evaluate(census);
console.log(JSON.stringify(st, null, 1));
await p.screenshot({ path: `${OUT}/${WORLD}-noshadow.png` });

// freeze the sim, then force shadows ON at the SAME frame
await p.evaluate(() => {
  window.__FREEZE = true;
  const R = window.__renderer, S = window.__scene;
  let sun = null; S.children.forEach(o => { if (o.isDirectionalLight) sun = o; });
  window.__sun = sun;
  R.shadowMap.enabled = true; sun.castShadow = true;
  S.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { mm.needsUpdate = true; }); });
});
await p.waitForTimeout(3500);
console.log(`── t≈${MARK} shadows FORCED ON ──`);
console.log(JSON.stringify(await p.evaluate(census), null, 1));
await p.screenshot({ path: `${OUT}/${WORLD}-shadow.png` });

// and back off, same frame, for a clean pair
await p.evaluate(() => {
  const R = window.__renderer, S = window.__scene;
  R.shadowMap.enabled = false; window.__sun.castShadow = false;
  S.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { mm.needsUpdate = true; }); });
});
await p.waitForTimeout(3500);
await p.screenshot({ path: `${OUT}/${WORLD}-noshadow2.png` });
await b.close();
console.log('shots in', OUT);
