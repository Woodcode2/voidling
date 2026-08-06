// REFUTE probe 2 — start a real match properly, grow the void to endgame so the
// camera pulls back and most of the map enters the frustum, and read how much
// of the 433MB actually gets duplicated into VRAM. Then rematch and see whether
// the world's geometry is disposed or accumulates.
import { chromium } from 'playwright';
const W = process.argv[2] || 'gameday';
const PORT = process.argv[3] || 4188;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const cdp = await ctx.newCDPSession(p);
await cdp.send('HeapProfiler.enable');
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
const snap = async (tag) => {
  await cdp.send('HeapProfiler.collectGarbage'); await p.waitForTimeout(500);
  const s = await p.evaluate(() => {
    const r = window.__renderer, m = performance.memory || {};
    let bytes = 0; const seen = new Set(); let meshes = 0;
    window.__scene.traverse((o) => { if (o.isMesh) meshes++; const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
      for (const k in g.attributes) bytes += g.attributes[k].array.byteLength; if (g.index) bytes += g.index.array.byteLength; });
    const ms = window.__matchState ? window.__matchState() : {};
    return { heap: +(m.usedJSHeapSize/1048576).toFixed(1), sceneMB: +(bytes/1048576).toFixed(1),
      sceneGeo: seen.size, meshes, gpuGeo: r.info.memory.geometries, gpuTex: r.info.memory.textures,
      t: ms.t, r: ms.r, ed: window.__edibles.length };
  });
  console.log(tag.padEnd(22), JSON.stringify(s));
  return s;
};
await p.waitForTimeout(8000);
await snap('menu');
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(3000);
await snap('match start');
// grow to endgame radius so the camera pulls all the way back
for (const R of [6, 12, 22, 34, 48]) {
  await p.evaluate((r) => window.__setVoidR(r), R);
  // sweep the void across the map at that zoom so everything enters the frustum
  for (let i = 0; i < 8; i++) {
    await p.evaluate((k) => { const a = k * 0.8, D = 40 + (k % 4) * 45; window.__warpVoid(Math.cos(a)*D, Math.sin(a)*D); }, i);
    await p.waitForTimeout(1600);
  }
  await snap('r=' + R);
}
await snap('endgame');
await b.close();
