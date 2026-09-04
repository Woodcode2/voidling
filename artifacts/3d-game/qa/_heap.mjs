// SCRATCH — heap and GPU-resource footprint per world, at the MENU (before any
// match), after a forced GC. This is the number iOS jetsam cares about.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const PORT = process.argv[3] || 4188;
console.log('world     heapMB  arrayBufMB  geo   tex  prog  nodes  meshes  edibles  drawCalls  tris');
for (const w of WORLDS) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('HeapProfiler.enable');
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(12000);   // let the first frames land so GPU counters are real
  await cdp.send('HeapProfiler.collectGarbage');
  await p.waitForTimeout(800);
  const s = await p.evaluate(() => {
    const r = window.__renderer, m = performance.memory || {};
    let nodes = 0, meshes = 0, abBytes = 0;
    const seen = new Set();
    window.__scene.traverse((o) => {
      nodes++;
      if (o.isMesh) meshes++;
      const g = o.geometry;
      if (g && !seen.has(g.uuid)) { seen.add(g.uuid);
        for (const k in g.attributes) abBytes += g.attributes[k].array.byteLength;
        if (g.index) abBytes += g.index.array.byteLength; }
    });
    return { heap: +(m.usedJSHeapSize/1048576).toFixed(1), ab: +(abBytes/1048576).toFixed(1),
      geo: r.info.memory.geometries, tex: r.info.memory.textures, prog: r.info.programs.length,
      nodes, meshes, edibles: window.__edibles.length,
      calls: r.info.render.calls, tris: r.info.render.triangles, uniqGeo: seen.size };
  });
  console.log(`${w.padEnd(9)} ${String(s.heap).padStart(6)}  ${String(s.ab).padStart(10)}  ${String(s.geo).padStart(4)} ${String(s.tex).padStart(5)} ${String(s.prog).padStart(5)} ${String(s.nodes).padStart(6)} ${String(s.meshes).padStart(7)} ${String(s.edibles).padStart(8)} ${String(s.calls).padStart(10)} ${String(s.tris).padStart(7)}   uniqueGeometries=${s.uniqGeo}`);
  await b.close();
}
