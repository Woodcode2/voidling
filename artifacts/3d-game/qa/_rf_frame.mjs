// REFUTATION PROBE: what is ACTUALLY in the opening frame?
//   node qa/_rf_frame.mjs [worlds] [port]
//
// qa/_onscreen.mjs counts an edible only if its CENTRE projects inside the
// viewport, and measures "coverage" as the sum of PI*r^2 over the gameplay eat
// radius. On a 430x932 portrait both choices misbehave:
//   * the biggest props in a frame are the ones whose centre is most likely to
//     be past an edge — a tree filling the top third is not counted at all;
//   * eat radius is not a visual footprint, and PI*r^2 double-counts overlaps,
//     so ONE r=6 prop is 28 points of "coverage" on a 406 u2 quad. With 15-25
//     props in frame the number swings by tens of points run to run.
// This one uses a real frustum-vs-bounding-sphere test and also rasterises the
// props' screen-space bounding boxes into a coverage mask, so "how much of the
// picture is stuff" is measured in pixels, not in gameplay radii.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,gameday,pirate,lantern').split(',');
const PORT = process.argv[3] || '4177';
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5.5, null, { timeout: 900000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.waitForTimeout(4000);
  const out = await p.evaluate(() => {
    const T = window.__THREE, cam = window.__cam;
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const fr = new T.Frustum().setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const bb = new T.Box3(), sph = new T.Sphere(), v = new T.Vector3();
    const W = 86, H = 187;                     // 5x-downsampled coverage mask
    const mask = new Uint8Array(W * H);
    let centreIn = 0, frustumIn = 0, bigCentre = 0, bigFrustum = 0;
    const bigList = [];
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible) continue;
      v.copy(e.mesh.position).project(cam);
      const cIn = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      if (cIn) { centreIn++; if (e.radius >= 3) bigCentre++; }
      try { bb.setFromObject(e.mesh); } catch { continue; }
      if (!isFinite(bb.min.x)) continue;
      bb.getBoundingSphere(sph);
      if (!fr.intersectsSphere(sph)) continue;
      frustumIn++;
      if (e.radius >= 3) { bigFrustum++; bigList.push(+e.radius.toFixed(1)); }
      // screen-space bbox of the 8 world-box corners
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, any = false;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
        v.project(cam);
        if (v.z > 1) continue;
        any = true;
        const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      if (!any) continue;
      x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W - 1, Math.ceil(x1));
      y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(H - 1, Math.ceil(y1));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * W + x] = 1;
    }
    let filled = 0; for (let i = 0; i < mask.length; i++) filled += mask[i];
    bigList.sort((a, c) => c - a);
    return { centreIn, frustumIn, bigCentre, bigFrustum, big: bigList.slice(0, 8),
      screenCover: +(filled / mask.length * 100).toFixed(1) };
  });
  console.log(`\n══ ${wid.toUpperCase()} ══ opening frame, 430x932`);
  console.log(`  centre-in-viewport (what _onscreen.mjs counts): ${out.centreIn}   of which r>=3: ${out.bigCentre}`);
  console.log(`  ACTUALLY INTERSECTING THE FRUSTUM:              ${out.frustumIn}   of which r>=3: ${out.bigFrustum}  ${out.big.join(', ')}`);
  console.log(`  SCREEN AREA covered by prop bounding boxes:     ${out.screenCover}%`);
  await p.close();
}
await b.close();
