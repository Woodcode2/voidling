// REFUTE probe 5 — how many of the 433MB of vertex bytes ACTUALLY reach the
// GPU? That is both (a) the true size of the "second 432MB in VBOs" and (b) the
// exact ceiling on what the proposed onUpload(array=null) fix can hand back,
// since three only fires onUpload at first upload.
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
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
const snap = async (tag) => {
  const s = await p.evaluate(() => {
    let total = 0; const seen = new Set();
    window.__scene.traverse((o) => { const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
      for (const k in g.attributes) total += g.attributes[k].array.byteLength; if (g.index) total += g.index.array.byteLength; });
    const ms = window.__matchState ? window.__matchState() : {};
    return { t: +(ms.t ?? 0).toFixed(1), r: +(ms.r ?? 0).toFixed(1), sceneMB: +(total / 1048576).toFixed(1),
      uploadedMB: +((window.__upB || 0) / 1048576).toFixed(1), uploadedAttrs: window.__upN || 0,
      gpuGeo: window.__renderer.info.memory.geometries,
      heap: +((performance.memory || {}).usedJSHeapSize / 1048576).toFixed(1) };
  });
  console.log(tag.padEnd(16), `scene ${s.sceneMB}MB | uploaded ${s.uploadedMB}MB (${(100 * s.uploadedMB / s.sceneMB).toFixed(0)}%) | ${s.uploadedAttrs} attrs | gpuGeo ${s.gpuGeo} | heap ${s.heap} | t=${s.t} r=${s.r}`);
  return s;
};
await p.waitForTimeout(9000);
await snap('menu');
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(4000);
await snap('match start');
// sweep the whole map at every zoom the camera can reach
for (const R of [3, 6, 10, 12]) {
  await p.evaluate((r) => window.__setVoidR(r), R);
  for (let i = 0; i < 14; i++) {
    await p.evaluate((k) => { const a = k * 0.45, D = 25 + (k % 7) * 26; window.__warpVoid(Math.cos(a) * D, Math.sin(a) * D); }, i);
    await p.waitForTimeout(1400);
  }
  await snap('swept r=' + R);
}
await b.close();
