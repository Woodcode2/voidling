// REFUTATION PROBE for "the scene graph is 16-22k nodes and three.js walks all of
// it every frame". Measures the things the original finding did not:
//  1. the NATURAL per-frame scene.updateMatrixWorld() cost (no force), captured
//     from inside real frames by wrapping the method the renderer calls;
//  2. how much of the graph projectObject actually reaches (it early-returns on
//     object.visible === false WITHOUT recursing, three.module.js:17827);
//  3. the same numbers at t=6 and late in the match, since the world is eaten;
//  4. a hardware calibration: N raw Matrix4 compose+multiply in the same page,
//     so the walk cost can be expressed in matrix-ops, not in contended ms;
//  5. the game's own per-frame JS on the SAME page in the SAME conditions, so
//     the ratio is contention-free.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const out = {};
const show = (tag, c, f) => {
  console.log(`  ${tag}  t=${c.t.toFixed(0)}s r=${c.r.toFixed(1)}`);
  console.log(`    nodes ${c.nodes}  drawable ${c.drawable}  geos ${c.geos}  mats ${c.mats}  matrixAutoUpdate-on ${c.autoUp}`);
  console.log(`    projectObject REACH (visible subtree only) ${c.reach} nodes / ${c.reachDraw} drawable  -> skips ${c.nodes - c.reach} (${(100 * (c.nodes - c.reach) / c.nodes).toFixed(0)}%)`);
  console.log(`    drawables passing frustum ${c.inFrustum}   actual draw calls ${c.calls}  tris ${c.tris}  shadows ${c.shadowsOn}  pr ${c.pr}`);
  console.log(`    forced updateMatrixWorld(true) ${c.forced} ms | bare recursion only ${c.bare} ms | ${c.nodes} raw compose+multiply ${c.calib} ms`);
  if (f.mw) console.log(`    NATURAL per-frame updateMatrixWorld(): n=${f.mw.n} mean ${f.mw.mean} p50 ${f.mw.p50} p90 ${f.mw.p90} max ${f.mw.max} ms  (forced calls seen: ${f.forcedCalls})`);
  if (f.render) console.log(`    renderer.render() total: mean ${f.render.mean} p50 ${f.render.p50} ms   whole rAF frame: mean ${f.frame.mean} p50 ${f.frame.p50} ms`);
  if (f.mw && f.frame) console.log(`    => matrix walk is ${(100 * f.mw.mean / f.frame.mean).toFixed(1)}% of the whole frame, ${(100 * f.mw.mean / f.render.mean).toFixed(1)}% of render()`);
};
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type() === 'error') console.log('  [page error]', m.text().slice(0, 160)); });
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

  // ── instrument: time the REAL per-frame updateMatrixWorld the renderer calls,
  //    and the whole animate() callback, without stubbing anything ───────────
  await p.evaluate(() => {
    const S = window.__scene;
    window.__MW = [];            // ms per natural scene.updateMatrixWorld() call
    window.__RN = [];            // ms per renderer.render() call
    window.__FR = [];            // ms per rAF callback (whole frame incl. render)
    const proto = Object.getPrototypeOf(S);
    const orig = proto.updateMatrixWorld;
    S.updateMatrixWorld = function (force) {
      const t = performance.now();
      orig.call(this, force);
      window.__MW.push([performance.now() - t, force === true ? 1 : 0]);
    };
    const R = window.__renderer, origR = R.render.bind(R);
    R.render = (sc, cam) => { const t = performance.now(); origR(sc, cam); window.__RN.push(performance.now() - t); };
    const raw = window.requestAnimationFrame.bind(window);
    window.__rawRAF = raw;
    window.requestAnimationFrame = (cb) => raw(ts => {
      const t = performance.now(); cb(ts); window.__FR.push(performance.now() - t);
    });
  });

  const census = async () => await p.evaluate(() => {
    const T = window.__THREE, S = window.__scene;
    let nodes = 0, drawable = 0, geos = new Set(), mats = new Set();
    S.traverse(o => { nodes++;
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { drawable++;
        if (o.geometry) geos.add(o.geometry.uuid);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m.uuid)); } });
    // what projectObject ACTUALLY reaches: it returns on visible===false
    // without recursing into children (three.module.js:17827)
    let reach = 0, reachDraw = 0, castable = 0;
    (function walk(o) { if (o.visible === false) return; reach++;
      if (o.isMesh || o.isPoints || o.isLine || o.isSprite) { reachDraw++; if (o.castShadow) castable++; }
      for (const c of o.children) walk(c); })(S);
    // frustum-visible drawables (what actually enters the render list)
    const cam = window.__cam;
    const fr = new T.Frustum().setFromProjectionMatrix(
      new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let inFrustum = 0;
    (function walk(o) { if (o.visible === false) return;
      if ((o.isMesh || o.isPoints || o.isLine) && o.frustumCulled !== false) {
        if (o.geometry?.boundingSphere === null) o.geometry.computeBoundingSphere();
        if (fr.intersectsObject(o)) inFrustum++;
      } else if (o.isMesh || o.isPoints || o.isLine) inFrustum++;
      for (const c of o.children) walk(c); })(S);
    // how many nodes still have matrixAutoUpdate on (three recomposes those)
    let autoUp = 0; S.traverse(o => { if (o.matrixAutoUpdate) autoUp++; });
    // ── forced walk, the way _scene.mjs measured it ──
    let t0 = performance.now(); for (let i = 0; i < 5; i++) S.updateMatrixWorld(true);
    const forced = (performance.now() - t0) / 5;
    // ── bare traversal, no math at all: the irreducible recursion tax ──
    t0 = performance.now(); let n = 0;
    for (let i = 0; i < 5; i++) (function w(o) { n++; for (const c of o.children) w(c); })(S);
    const bare = (performance.now() - t0) / 5;
    // ── CALIBRATION: raw Matrix4 compose+multiply, same count as nodes ──
    const m = new T.Matrix4(), pm = new T.Matrix4(), pos = new T.Vector3(1, 2, 3),
      q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1);
    t0 = performance.now();
    for (let i = 0; i < nodes * 5; i++) { m.compose(pos, q, sc); pm.multiplyMatrices(m, m); }
    const calib = (performance.now() - t0) / 5;   // ms for `nodes` compose+multiply
    return { nodes, drawable, geos: geos.size, mats: mats.size, reach, reachDraw, castable,
      inFrustum, autoUp, forced: +forced.toFixed(2), bare: +bare.toFixed(2), calib: +calib.toFixed(2),
      shadowsOn: window.__renderer.shadowMap.enabled, pr: window.__renderer.getPixelRatio(),
      t: window.__matchState().t, r: window.__voidState().r,
      calls: window.__renderer.info.render.calls, tris: window.__renderer.info.render.triangles };
  });

  const drain = async () => await p.evaluate(() => {
    const f = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y);
      return { n: a.length, p50: +s[s.length >> 1].toFixed(3), p90: +s[Math.floor(s.length * .9)].toFixed(3),
        mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3), max: +s[s.length - 1].toFixed(3) }; };
    const mw = window.__MW.filter(x => x[1] === 0).map(x => x[0]);
    const forcedCalls = window.__MW.filter(x => x[1] === 1).length;
    const r = { mw: f(mw), forcedCalls, render: f(window.__RN), frame: f(window.__FR) };
    window.__MW = []; window.__RN = []; window.__FR = [];
    return r;
  });

  // let ~60 natural frames pass so the wrappers collect real data
  await p.evaluate(() => new Promise(res => { let n = 0;
    const t = () => (++n < 60 ? window.__rawRAF(t) : res()); window.__rawRAF(t); }));
  const early = await census(); const earlyF = await drain();
  console.log(`\n===== ${wid.toUpperCase()} =====`); show('EARLY', early, earlyF);

  // autopilot to late match
  await p.evaluate(() => {
    const cv = document.querySelector('canvas'); const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = { dx, dz }; } }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      window.__rawRAF(tick); };
    window.__rawRAF(tick); });
  await p.waitForFunction(() => window.__matchState().t > 140, null, { timeout: 900000 });
  await p.evaluate(() => { window.__MW = []; window.__RN = []; window.__FR = []; });
  await p.evaluate(() => new Promise(res => { let n = 0;
    const t = () => (++n < 60 ? window.__rawRAF(t) : res()); window.__rawRAF(t); }));
  const late = await census(); const lateF = await drain();

  out[wid] = { early, earlyF, late, lateF };
  show('LATE ', late, lateF);
  await p.close();
}
writeFileSync('qa-out/_refute_graph.json', JSON.stringify(out, null, 1));
await b.close();
