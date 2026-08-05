// PERF-FRAME pass 5 — IS THE COASTLINE TEST ITSELF SLOW, OR IS IT THE WAY IT
// READS ITS VERTICES?
//
// Both point-in-polygon implementations in the game destructure each vertex out
// of an array-of-arrays inside the inner loop:
//   const [xi, yi] = poly[i], [xj, yj] = poly[j];
// This benchmark runs the exact same algorithm three ways against the exact same
// data — destructured pairs, indexed pairs, and a flat Float64Array — so the
// difference is attributable to nothing but the vertex read. Minimum of many
// batches, because the host is shared.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('about:blank');
const r = await p.evaluate(() => {
  // 168 vertices: exactly MAPLE_SIL (14 control points x 12 steps)
  const N = 168, poly = [], flat = new Float64Array(N * 2);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, x = 6000 + Math.cos(a) * 5200, y = 6000 + Math.sin(a) * 5500;
    poly.push([x, y]); flat[i * 2] = x; flat[i * 2 + 1] = y;
  }
  const destr = (x, y) => { let inside = false;
    for (let i = 0, j = N - 1; i < N; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; }
    return inside; };
  const idx = (x, y) => { let inside = false;
    for (let i = 0, j = N - 1; i < N; j = i++) { const a = poly[i], c = poly[j];
      const xi = a[0], yi = a[1], xj = c[0], yj = c[1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; }
    return inside; };
  const fl = (x, y) => { let inside = false;
    for (let i = 0, j = N - 1; i < N; j = i++) {
      const xi = flat[i * 2], yi = flat[i * 2 + 1], xj = flat[j * 2], yj = flat[j * 2 + 1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; }
    return inside; };
  const M = 20000;
  const run = (f) => { let a = 0; for (let i = 0; i < M; i++) if (f(3000 + (i % 7000), 3000 + ((i * 13) % 7000))) a++; return a; };
  const mn = (f) => { let best = 1e9, keep = 0;
    for (let k = 0; k < 40; k++) { const t = performance.now(); keep += run(f); const d = performance.now() - t; if (d < best) best = d; }
    return { ms: best, keep }; };
  run(destr); run(idx); run(fl);                     // warm
  const A = mn(destr), B = mn(idx), C = mn(fl);
  // ALLOCATION. Array destructuring goes through the iterator protocol, which
  // means an iterator object per vertex per call. Measure it rather than assume.
  const alloc = (f) => { const h0 = performance.memory.usedJSHeapSize; for (let k = 0; k < 20; k++) run(f);
    return (performance.memory.usedJSHeapSize - h0) / (20 * M); };
  const aD = alloc(destr), aI = alloc(idx);
  return { destrNs: A.ms * 1e6 / M, idxNs: B.ms * 1e6 / M, flatNs: C.ms * 1e6 / M,
    same: A.keep === B.keep && B.keep === C.keep, allocDestr: aD, allocIdx: aI };
});
console.log(`168-vertex point-in-polygon, identical algorithm, identical data (results agree: ${r.same})`);
console.log(`  const [xi,yi] = poly[i]   ${r.destrNs.toFixed(0)} ns/call   <- what SHIPS (island.ts:331, bay.ts:109)`);
console.log(`  const a = poly[i]; a[0]   ${r.idxNs.toFixed(0)} ns/call   (${(r.destrNs / r.idxNs).toFixed(2)}x faster)`);
console.log(`  flat Float64Array         ${r.flatNs.toFixed(0)} ns/call   (${(r.destrNs / r.flatNs).toFixed(2)}x faster)`);
console.log(`  heap delta per call: destructured ${r.allocDestr.toFixed(0)} bytes   indexed ${r.allocIdx.toFixed(0)} bytes`);
await b.close();
