// REFUTE probe 4 — per world: ArrayBuffer-deduped vertex bytes, how much of it
// is the UV attribute (which no prop material samples — none has a map), how
// much is the index-free penalty, and the true InstancedMesh count.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const PORT = process.argv[3] || 4188;
for (const w of WORLDS) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); } catch {} });
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}`, { waitUntil: 'commit' });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(6000);
  const s = await p.evaluate(() => {
    const seen = new Set(), bufs = new Set();
    let total = 0, uv = 0, nonIdx = 0, idxBytes = 0, insts = 0, instTotal = 0, matsWithMap = 0;
    const mats = new Set();
    window.__scene.traverse((o) => {
      if (o.isInstancedMesh) { insts++; instTotal += o.count; }
      const m = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
      for (const mm of m) { if (!mats.has(mm.uuid)) { mats.add(mm.uuid); if (mm.map) matsWithMap++; } }
      const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
      for (const k in g.attributes) {
        const a = g.attributes[k], ab = a.array.buffer;
        if (bufs.has(ab)) continue; bufs.add(ab);
        total += a.array.byteLength;
        if (k === 'uv' || k === 'uv1') uv += a.array.byteLength;
      }
      if (g.index) { if (!bufs.has(g.index.array.buffer)) { bufs.add(g.index.array.buffer); total += g.index.array.byteLength; idxBytes += g.index.array.byteLength; } }
      else nonIdx++;
    });
    const m = performance.memory || {};
    return { heap: +(m.usedJSHeapSize / 1048576).toFixed(1), totalMB: +(total / 1048576).toFixed(1),
      uvMB: +(uv / 1048576).toFixed(1), idxMB: +(idxBytes / 1048576).toFixed(1),
      geos: seen.size, nonIndexed: nonIdx, instanced: insts, instancedCount: instTotal,
      materials: mats.size, materialsWithMap: matsWithMap, edibles: window.__edibles.length };
  });
  console.log(w.padEnd(8), JSON.stringify(s));
  await b.close();
}
