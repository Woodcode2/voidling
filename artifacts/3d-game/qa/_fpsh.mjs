// THE HALF-RATE SHADOW PASS, measured after the intro. prototype3d.ts:104 sets
// shadowMap.autoUpdate=false and :4767 raises needsUpdate on every other frame,
// so by construction alternate frames carry a whole extra depth pass. The
// earlier attempt at this binned on draw-call count and caught the INTRO
// instead — :4530 turns shadows off for the opening camera move, which is why
// half the sample had 104 calls and half had ~550. This one starts at t=20.
// Absolute ms are swiftshader; the EVEN/ODD ratio is the property that carries.
//   node qa/_fpsh.mjs [world] [port]
import { chromium } from 'playwright';
const WID = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4231';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
p.setDefaultTimeout(900000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WID}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WID}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 20, null, { timeout: 900000 });
const counts = await p.evaluate(() => {
  window.__pinQuality(0);
  let mover = 0, shadowCasters = 0, meshes = 0;
  for (const e of window.__edibles) if (e.mesh?.userData?.mover) mover++;
  window.__scene.traverse(o => { if (o.isMesh) { meshes++; if (o.castShadow) shadowCasters++; } });
  // synchronous localStorage: count it and time it for the rest of the match
  const orig = Storage.prototype.setItem;
  window.__LS = { n: 0, ms: 0, keys: {} };
  Storage.prototype.setItem = function (k, v) { const a = performance.now();
    const r = orig.call(this, k, v);
    window.__LS.ms += performance.now() - a; window.__LS.n++;
    window.__LS.keys[k] = (window.__LS.keys[k] || 0) + 1; return r; };
  const R = window.__renderer, o2 = R.render.bind(R);
  window.__P = [];
  R.render = (s, c) => { const a = performance.now(); o2(s, c);
    window.__P.push({ r: performance.now() - a, c: R.info.render.calls, t: R.info.render.triangles }); };
  return { edibles: window.__edibles.length, mover, meshes, shadowCasters,
    kids: window.__scene.children.length, geo: R.info.memory.geometries, tex: R.info.memory.textures };
});
console.log(`\n═══ ${WID.toUpperCase()}  edibles ${counts.edibles} (${counts.mover} flagged mover)  meshes ${counts.meshes}  castShadow ${counts.shadowCasters}  scene children ${counts.kids}  geometries ${counts.geo}  textures ${counts.tex}`);
await p.waitForFunction(() => window.__P.length > 240, null, { timeout: 900000 });
const P = (await p.evaluate(() => window.__P)).slice(20, 240);
const ev = P.filter((_, i) => i % 2 === 0), od = P.filter((_, i) => i % 2 === 1);
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const A = med(ev.map(x => x.r)), B = med(od.map(x => x.r));
const cA = med(ev.map(x => x.c)), cB = med(od.map(x => x.c));
const tA = med(ev.map(x => x.t)), tB = med(od.map(x => x.t));
console.log(`  render() median, frames at even index: ${A.toFixed(1)} ms   ${cA} draw calls   ${tA} tris`);
console.log(`  render() median, frames at odd  index: ${B.toFixed(1)} ms   ${cB} draw calls   ${tB} tris`);
console.log(`  ALTERNATION: heavier/lighter = ${(Math.max(A, B) / Math.min(A, B)).toFixed(2)}x on time, ${(Math.max(cA, cB) / Math.min(cA, cB)).toFixed(2)}x on draw calls, ${(Math.max(tA, tB) / Math.min(tA, tB)).toFixed(2)}x on triangles`);
console.log(`  (swiftshader ms — the RATIO is the device-portable part)`);
// how much of the world is even on screen
const fr = await p.evaluate(() => {
  const T = window.__THREE, cam = window.__cam; cam.updateMatrixWorld();
  const f = new T.Frustum().setFromProjectionMatrix(new T.Matrix4()
    .multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  const bb = new T.Box3(), sp = new T.Sphere(); let vis = 0, tot = 0;
  for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible) continue; tot++;
    try { bb.setFromObject(e.mesh); } catch { continue; }
    if (!isFinite(bb.min.x)) continue; bb.getBoundingSphere(sp);
    if (f.intersectsSphere(sp)) vis++; }
  return { vis, tot };
});
console.log(`  props alive ${fr.tot}, inside the camera frustum ${fr.vis} (${(100 * fr.vis / fr.tot).toFixed(1)}%)`);
await p.waitForFunction(() => window.__matchState().t > 120, null, { timeout: 1800000 });
const ls = await p.evaluate(() => window.__LS);
console.log(`  SYNCHRONOUS localStorage.setItem between t=20 and t=120: ${ls.n} calls, ${ls.ms.toFixed(1)} ms total`);
console.log(`    by key: ${Object.entries(ls.keys).map(([k, v]) => `${k}×${v}`).join('  ')}`);
await p.close(); await b.close();
