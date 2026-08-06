// A/B rig for the uv+u8-colour patch: deterministic world, fixed camera,
// screenshot + per-attribute byte census + heap. Run once before the patch and
// once after; the tag is argv[2].
import { chromium } from 'playwright';
const TAG = process.argv[2] || 'base';
const W = process.argv[3] || 'maple';
const PORT = process.argv[4] || 4291;
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
p.on('console', m => { const t = m.text(); if (/BufferGeometryUtils|failed/i.test(t)) console.log('CONSOLE', t); });
const t0 = Date.now();
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
const bootMs = Date.now() - t0;
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
// settle the async props
await p.waitForFunction(() => {
  const n = window.__edibles.length;
  if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
  return performance.now() - (window.__stableSince || 0) > 2500;
}, null, { timeout: 400000 });
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(3000);
// PIN the camera: fixed void position and radius so the two runs frame the same thing
await p.evaluate(() => { window.__setVoidR(14); window.__warpVoid(0, 0); });
await p.waitForTimeout(6000);
await p.evaluate(() => { window.__setVoidR(14); window.__warpVoid(0, 0); });
await p.waitForTimeout(6000);
await p.evaluate(() => document.querySelectorAll('#news,#ticker,#hud,.newsline').forEach(e => e.style.visibility='hidden'));
await p.screenshot({ path: `qa-out/_zab_${TAG}.png` });
await cdp.send('HeapProfiler.collectGarbage'); await p.waitForTimeout(700);
const s = await p.evaluate(() => {
  const seen = new Set(); let total=0,uv=0,col=0,pos=0,nrm=0,verts=0;
  window.__scene.traverse((o)=>{ const g=o.geometry; if(!g||seen.has(g.uuid))return; seen.add(g.uuid);
    verts += g.attributes.position?.count||0;
    for(const k in g.attributes){ const n=g.attributes[k].array.byteLength; total+=n;
      if(k==='uv'||k==='uv1')uv+=n; else if(k==='color')col+=n; else if(k==='position')pos+=n; else if(k==='normal')nrm+=n; }
    if(g.index) total+=g.index.array.byteLength; });
  const m = performance.memory||{}, R = window.__renderer;
  const attrs = {}; const s2 = new Set();
  window.__scene.traverse((o)=>{const g=o.geometry; if(!g||s2.has(g.uuid))return; s2.add(g.uuid);
    const k=Object.keys(g.attributes).join('+'); attrs[k]=(attrs[k]||0)+1;});
  return { geos: seen.size, verts, totalMB:+(total/1048576).toFixed(1), uvMB:+(uv/1048576).toFixed(1),
    colorMB:+(col/1048576).toFixed(1), posMB:+(pos/1048576).toFixed(1), nrmMB:+(nrm/1048576).toFixed(1),
    heapMB:+(m.usedJSHeapSize/1048576).toFixed(1), edibles: window.__edibles.length,
    calls: R.info.render.calls, tris: R.info.render.triangles, attrs };
});
console.log(TAG, 'bootMs=' + bootMs, JSON.stringify(s));
await b.close();
