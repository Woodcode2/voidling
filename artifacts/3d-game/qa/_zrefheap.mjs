// REFUTE probe: (1) dedupe vertex bytes by UNDERLYING ArrayBuffer identity, not
// by geometry uuid — if attributes share buffers the 432MB is over-counted.
// (2) watch renderer.info.memory.geometries (= GPU-uploaded geometry count)
// across a real match, to test the "a second 432MB in VBOs" claim.
// (3) watch heap across a rematch, to test for accumulation.
import { chromium } from 'playwright';
const W = process.argv[2] || 'gameday';
const PORT = process.argv[3] || 4188;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info','--js-flags=--expose-gc'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const cdp = await ctx.newCDPSession(p);
await cdp.send('HeapProfiler.enable');
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'commit' });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(10000);
await cdp.send('HeapProfiler.collectGarbage');
await p.waitForTimeout(600);

const dedupe = await p.evaluate(() => {
  const byUuid = new Set(), byBuf = new Set();
  let uuidBytes = 0, bufBytes = 0, attrObjs = new Set(), attrShared = 0, nAttr = 0;
  const add = (a) => {
    if (!a || !a.array) return;
    nAttr++;
    if (attrObjs.has(a)) { attrShared++; return; }
    attrObjs.add(a);
    const ab = a.array.buffer;
    if (!byBuf.has(ab)) { byBuf.add(ab); bufBytes += ab.byteLength; }
  };
  window.__scene.traverse((o) => {
    const g = o.geometry;
    if (!g || byUuid.has(g.uuid)) return;
    byUuid.add(g.uuid);
    for (const k in g.attributes) { uuidBytes += g.attributes[k].array.byteLength; add(g.attributes[k]); }
    if (g.index) { uuidBytes += g.index.array.byteLength; add(g.index); }
  });
  const m = performance.memory || {};
  const r = window.__renderer;
  return { geos: byUuid.size, uuidMB: +(uuidBytes/1048576).toFixed(1),
    uniqueArrayBuffers: byBuf.size, uniqueBufMB: +(bufBytes/1048576).toFixed(1),
    attrsTotal: nAttr, attrsShared: attrShared, uniqueAttrObjects: attrObjs.size,
    heapMB: +(m.usedJSHeapSize/1048576).toFixed(1),
    heapLimitMB: +(m.jsHeapSizeLimit/1048576).toFixed(1),
    gpuGeoms: r.info.memory.geometries, gpuTex: r.info.memory.textures };
});
console.log('MENU', JSON.stringify(dedupe));

// ---- play a match, sample GPU-resident geometry count + heap against match t
const started = await p.evaluate(() => {
  const el = [...document.querySelectorAll('button,div,span')].find(e => /SOLO RUN|PLAY|START/i.test(e.textContent||'') && e.offsetParent);
  if (el) { el.click(); return el.textContent.trim().slice(0,20); }
  return null;
});
console.log('clicked', started);
await p.waitForTimeout(4000);
// drive the void around so the camera sweeps the map
const samples = [];
for (let i = 0; i < 26; i++) {
  await p.evaluate((k) => {
    const s = window.__matchState && window.__matchState();
    // walk the void across the map so distant geometry enters the frustum
    if (window.__warpVoid) {
      const a = k * 0.9, R = 60 + (k % 5) * 22;
      try { window.__warpVoid(Math.cos(a) * R, Math.sin(a) * R); } catch {}
    }
    return s;
  }, i);
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => {
    const m = performance.memory || {}, r = window.__renderer;
    const ms = window.__matchState ? window.__matchState() : {};
    return { t: ms.t, over: ms.over, heap: +(m.usedJSHeapSize/1048576).toFixed(1),
      gpuGeo: r.info.memory.geometries, gpuTex: r.info.memory.textures,
      calls: r.info.render.calls, ed: window.__edibles.length };
  });
  samples.push(s);
  console.log('t=' + (s.t ?? '?'), 'heap', s.heap, 'gpuGeo', s.gpuGeo, 'calls', s.calls, 'ed', s.ed, s.over ? 'OVER' : '');
  if (s.over) break;
}
// final: how many of the scene geometries have GPU buffers, and what fraction
// of the 432MB has therefore been duplicated into VRAM
const fin = await p.evaluate(() => {
  const r = window.__renderer, m = performance.memory || {};
  let total = 0, geos = 0; const seen = new Set();
  window.__scene.traverse((o) => { const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
    for (const k in g.attributes) total += g.attributes[k].array.byteLength; if (g.index) total += g.index.array.byteLength; });
  return { sceneGeos: seen.size, sceneMB: +(total/1048576).toFixed(1), gpuGeoms: r.info.memory.geometries,
    heapMB: +(m.usedJSHeapSize/1048576).toFixed(1) };
});
console.log('AFTER PLAY', JSON.stringify(fin));
await b.close();
