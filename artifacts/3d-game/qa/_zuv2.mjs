// REFUTE pass on "uv + Float32 colour are ~160MB of dead bytes".
// Four questions, all measured:
//  1. Does the uv attribute ever reach the GPU? (hook gl.bufferData + read the
//     ACTIVE attribute list of every compiled three program)
//  2. What is the real JS heap, and how much headroom is left?
//  3. Would Uint8-normalized vertex colour change a pixel? Quantize every
//     distinct colour actually present in the scene and report the sRGB error.
//  4. Does deleteAttribute('uv') before merge actually survive mergeGeometries?
import { chromium } from 'playwright';
const W = process.argv[2] || 'gameday';
const PORT = process.argv[3] || 4291;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
  try { localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {}
  // ---- hook every bufferData so we see EXACTLY what is uploaded to the GPU
  window.__gl = { arrayBytes: 0, elemBytes: 0, calls: 0 };
  for (const P of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!P) continue;
    const orig = P.prototype.bufferData;
    P.prototype.bufferData = function (target, data, usage, ...rest) {
      try {
        const n = (typeof data === 'number') ? data : (data && data.byteLength) || 0;
        window.__gl.calls++;
        if (target === this.ARRAY_BUFFER) window.__gl.arrayBytes += n;
        else if (target === this.ELEMENT_ARRAY_BUFFER) window.__gl.elemBytes += n;
      } catch {}
      return orig.call(this, target, data, usage, ...rest);
    };
  }
});
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const cdp = await ctx.newCDPSession(p);
await cdp.send('HeapProfiler.enable');
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { const t = m.text(); if (/mergeGeometries|BufferGeometryUtils/.test(t)) console.log('CONSOLE', t); });
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.waitForTimeout(6000);

// ---- play, and grow the void so the camera pulls back and the whole map draws
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${W}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(4000);
for (const R of [8, 20, 40]) {
  await p.evaluate((r) => window.__setVoidR(r), R);
  for (let i = 0; i < 6; i++) {
    await p.evaluate((k) => { const a = k * 1.1, D = 40 + (k % 4) * 50; window.__warpVoid(Math.cos(a)*D, Math.sin(a)*D); }, i);
    await p.waitForTimeout(1500);
  }
}
await cdp.send('HeapProfiler.collectGarbage'); await p.waitForTimeout(700);

const out = await p.evaluate(() => {
  const R = window.__renderer, gl = R.getContext();
  // ---- 1. scene byte census, split by attribute
  const seen = new Set();
  let total = 0, uvB = 0, colB = 0, posB = 0, nrmB = 0, idxB = 0, verts = 0;
  window.__scene.traverse((o) => {
    const g = o.geometry; if (!g || seen.has(g.uuid)) return; seen.add(g.uuid);
    verts += g.attributes.position?.count || 0;
    for (const k in g.attributes) {
      const n = g.attributes[k].array.byteLength; total += n;
      if (k === 'uv' || k === 'uv1') uvB += n;
      else if (k === 'color') colB += n;
      else if (k === 'position') posB += n;
      else if (k === 'normal') nrmB += n;
    }
    if (g.index) { total += g.index.array.byteLength; idxB += g.index.array.byteLength; }
  });
  // ---- 2. ACTIVE attributes of every compiled program
  const progs = R.info.programs.map((pr) => {
    let names = [];
    try { names = Object.keys(pr.getAttributes()); } catch {}
    return { name: pr.name, usedTimes: pr.usedTimes, attrs: names.sort().join('+') };
  });
  // ---- 3. colour quantization error, over the DISTINCT colours in prop geometry
  const lin2srgb = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  const cols = new Map();
  const seen2 = new Set();
  window.__scene.traverse((o) => {
    const g = o.geometry; if (!g || seen2.has(g.uuid)) return; seen2.add(g.uuid);
    const a = g.attributes.color; if (!a) return;
    const arr = a.array, step = Math.max(1, Math.floor(a.count / 40));   // sample
    for (let i = 0; i < a.count; i += step) {
      const r = arr[i*3], gg = arr[i*3+1], bb = arr[i*3+2];
      const key = `${r.toFixed(5)},${gg.toFixed(5)},${bb.toFixed(5)}`;
      if (!cols.has(key)) cols.set(key, [r, gg, bb]);
    }
  });
  let maxErr = 0, sumErr = 0, n = 0, worst = null, over1 = 0, over2 = 0, over4 = 0;
  for (const [, c] of cols) {
    let e = 0;
    for (let k = 0; k < 3; k++) {
      const q = Math.round(Math.max(0, Math.min(1, c[k])) * 255) / 255;
      const d = Math.abs(lin2srgb(q) - lin2srgb(Math.max(0, Math.min(1, c[k])))) * 255;
      if (d > e) e = d;
    }
    sumErr += e; n++;
    if (e > 1) over1++; if (e > 2) over2++; if (e > 4) over4++;
    if (e > maxErr) { maxErr = e; worst = c.map(x => +x.toFixed(4)); }
  }
  // ---- 4. does deleteAttribute('uv') survive the real merge path?
  let mergeOK = 'not-tested', mergeAttrs = '';
  try {
    const U = window.__BGU;   // may not be exposed
    if (U && U.mergeGeometries) {
      const T = window.__THREE;
      const mk = () => { const g = new T.BoxGeometry(1,1,1).toNonIndexed();
        const c = new Float32Array(g.attributes.position.count*3).fill(0.5);
        g.setAttribute('color', new T.BufferAttribute(c,3)); g.deleteAttribute('uv'); return g; };
      const m = U.mergeGeometries([mk(), mk(), mk()], false);
      mergeOK = m ? 'ok' : 'FAILED';
      if (m) mergeAttrs = Object.keys(m.attributes).sort().join('+');
    }
  } catch (e) { mergeOK = 'threw: ' + e.message; }

  const mem = performance.memory || {};
  return {
    sceneGeos: seen.size, verts,
    MB: { total: +(total/1048576).toFixed(1), pos: +(posB/1048576).toFixed(1),
      nrm: +(nrmB/1048576).toFixed(1), uv: +(uvB/1048576).toFixed(1),
      color: +(colB/1048576).toFixed(1), index: +(idxB/1048576).toFixed(1) },
    gpuUploadMB: +(window.__gl.arrayBytes/1048576).toFixed(1),
    gpuIndexMB: +(window.__gl.elemBytes/1048576).toFixed(1),
    gpuCalls: window.__gl.calls,
    gpuGeoms: R.info.memory.geometries, gpuTex: R.info.memory.textures,
    heapMB: +(mem.usedJSHeapSize/1048576).toFixed(1),
    heapTotalMB: +(mem.totalJSHeapSize/1048576).toFixed(1),
    heapLimitMB: +(mem.jsHeapSizeLimit/1048576).toFixed(1),
    programs: progs,
    colour: { distinct: n, meanErr255: +(sumErr/Math.max(1,n)).toFixed(2),
      maxErr255: +maxErr.toFixed(2), worstLinear: worst, over1, over2, over4 },
    mergeOK, mergeAttrs,
    drawCalls: R.info.render.calls, tris: R.info.render.triangles,
    t: window.__matchState?.().t, r: window.__matchState?.().r,
  };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
