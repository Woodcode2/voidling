// THREE CHEAP FACTS ABOUT THE PLAY FRAME.
//   node qa/_gsky.mjs [worlds] [port]
//
// 1. SKY COVERAGE. scene.background is a 3168x1344 painted nebula (5.9 MB on
//    the wire, ~22 MB of VRAM). The play camera is a fixed 53-degree downward
//    rig with a 32-degree fov, so the question of whether any of it is ever on
//    screen has an arithmetic answer — but arithmetic has been wrong here
//    before, so this casts a grid of camera rays at three void sizes and counts
//    the ones that hit no geometry at all. Those are the sky pixels.
// 2. PIXEL RATIO. What the drawing buffer actually is against the panel.
// 3. THE EAT PUFF on screen: PointsMaterial size is 2.1 WORLD units with size
//    attenuation, so its pixel size falls as the camera pulls back. This
//    converts it at each stage.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  p.setDefaultTimeout(300000);
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
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.evaluate(() => window.__pinQuality(0));
  await p.waitForTimeout(2500);
  const out = await p.evaluate(async () => {
    const T = window.__THREE, R = window.__renderer, cam = window.__cam;
    const res = { dpr: devicePixelRatio, pr: R.getPixelRatio(),
      css: [innerWidth, innerHeight], buf: [R.domElement.width, R.domElement.height],
      panel: [innerWidth * devicePixelRatio, innerHeight * devicePixelRatio], sky: [] };
    // buffer size is read above; from here the probe is geometry-only, so stop
    // drawing — swiftshader at DPR 3 is otherwise minutes per sample
    R.render = () => {};
    const list = []; window.__scene.traverse(o => { if (o.isMesh && o.visible && o.geometry) list.push(o); });
    for (const r of [1.2, 5, 12]) {
      window.__setVoidR(r);
      // WAIT FOR THE CAMERA, not for a stopwatch. camDist lerps toward
      // 38*(R/0.9)^0.82 — 318 units at WORLD ENDER — and a 900 ms wait left it
      // at 46, so the first cut of this measured the sky at the OPENING camera
      // three times and called it a sweep.
      {
        const vs0 = window.__voidState();
        let last = -1, stable = 0;
        for (let i = 0; i < 400 && stable < 8; i++) {
          await new Promise(res2 => setTimeout(res2, 60));
          const v = window.__voidState();
          const d0 = cam.position.distanceTo(new T.Vector3(v.x, 0, v.z));
          if (Math.abs(d0 - last) < 0.5) stable++; else stable = 0;
          last = d0;
        }
        void vs0;
      }
      const rc = new T.Raycaster(); rc.far = 4000;
      let hit = 0, miss = 0;
      const N = 21;
      for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
        const ndc = new T.Vector2((ix / (N - 1)) * 2 - 1, (iy / (N - 1)) * 2 - 1);
        rc.setFromCamera(ndc, cam);
        if (rc.intersectObjects(list, false).length) hit++; else miss++;
      }
      // puff: a 2.1-unit sprite at the void's distance from the camera
      const vs = window.__voidState();
      const d = cam.position.distanceTo(new T.Vector3(vs.x, 0, vs.z));
      // three's points shader: gl_PointSize = size * (scale / -mvPosition.z), scale = h/2
      const px = 2.1 * ((innerHeight * R.getPixelRatio()) / 2) / d;
      if (r === 5) {
        // the biggest (geometry,material) repeat group in the world, and how
        // many of its members are actually inside the play frustum — the only
        // form in which "instance the repeated props" could pay
        const pairs = new Map();
        window.__scene.traverse(o => {
          if (!o.isMesh || !o.visible || !o.geometry || o.isInstancedMesh) return;
          const k = o.geometry.uuid + '|' + (Array.isArray(o.material) ? o.material.map(m => m.uuid).join(',') : o.material?.uuid);
          const a = pairs.get(k) || []; a.push(o); pairs.set(k, a);
        });
        const big = [...pairs.values()].sort((a, c) => c.length - a.length)[0] || [];
        cam.updateMatrixWorld();
        const fr = new T.Frustum().setFromProjectionMatrix(
          new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
        let inFrame = 0; const bb2 = new T.Box3();
        for (const o of big) { bb2.setFromObject(o); if (fr.intersectsBox(bb2)) inFrame++; }
        res.repeat = { n: big.length, inFrame,
          tris: big[0] ? (big[0].geometry.index ? big[0].geometry.index.count : big[0].geometry.attributes.position.count) / 3 : 0,
          name: big[0]?.name || big[0]?.parent?.name || 'unnamed',
          mat: big[0] ? (Array.isArray(big[0].material) ? big[0].material[0].type : big[0].material.type) : '' };
      }
      res.sky.push({ r, skyPct: +(100 * miss / (hit + miss)).toFixed(1), camDist: +d.toFixed(0),
        puffPx: +px.toFixed(1), puffCssPx: +(px / R.getPixelRatio()).toFixed(1) });
    }
    return res;
  });
  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log(`  device pixel ratio ${out.dpr}, renderer pixel ratio ${out.pr}`);
  console.log(`  CSS ${out.css.join('x')}  ->  drawing buffer ${out.buf.join('x')}  vs panel ${out.panel.join('x')}`);
  console.log(`  the 3D is rendered at ${(100 * out.buf[0] * out.buf[1] / (out.panel[0] * out.panel[1])).toFixed(0)}% of the panel's pixels and upscaled ${(out.panel[0] / out.buf[0]).toFixed(2)}x`);
  for (const s of out.sky)
    console.log(`  r=${String(s.r).padEnd(4)} camDist ${String(s.camDist).padStart(3)}u   SKY ${String(s.skyPct).padStart(5)}% of the frame   eat puff ${s.puffCssPx} CSS px (${s.puffPx} device px)`);
  if (out.repeat) console.log(`  biggest repeat group: ${out.repeat.n} identical meshes (${out.repeat.tris} tris, ${out.repeat.mat}, "${out.repeat.name}") — ${out.repeat.inFrame} of them inside the play frustum at r=5`);
  await p.close();
}
await b.close();
