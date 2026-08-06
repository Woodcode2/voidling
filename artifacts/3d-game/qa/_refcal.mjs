// CALIBRATION — how fast is THIS box's JS, in the same Chromium the perf
// probes use? Without this, "the mover loop is 6.3 ms" is a number with no
// denominator. Three fixed workloads with known desktop costs, plus a direct
// re-implementation of the pedestrian's hot inner test (a 240-vertex
// point-in-polygon) so the per-call cost can be priced independently of the game.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage();
await p.goto('about:blank');
const r = await p.evaluate(() => {
  const out = {};
  // 1) plain arithmetic loop, 50M iterations
  let t = performance.now(); let s = 0;
  for (let i = 0; i < 50e6; i++) s += i * 0.5;
  out.arith50M = +(performance.now() - t).toFixed(1); out._s = s;
  // 2) Math.hypot, 10M
  t = performance.now(); let h = 0;
  for (let i = 0; i < 10e6; i++) h += Math.hypot(i * 0.001, i * 0.002);
  out.hypot10M = +(performance.now() - t).toFixed(1); out._h = h;
  // 3) 240-vertex point-in-polygon, 1M calls — the pedestrian's hot test
  const N = 240, poly = [];
  for (let i = 0; i < N; i++) poly.push([Math.cos(i / N * 6.283) * 1000, Math.sin(i / N * 6.283) * 1000]);
  const pip = (wx, wy) => { let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], c = poly[j];
      const xi = a[0], yi = a[1], xj = c[0], yj = c[1];
      if ((yi > wy) !== (yj > wy) && wx < ((xj - xi) * (wy - yi)) / (yj - yi) + xi) inside = !inside;
    } return inside; };
  t = performance.now(); let k = 0;
  for (let i = 0; i < 1e6; i++) k += pip(i % 900, (i * 7) % 900) ? 1 : 0;
  out.pip240_1M = +(performance.now() - t).toFixed(1); out._k = k;
  out.pip240_us_each = +((performance.now() - t) / 1e6 * 1000).toFixed(3);
  out.cores = navigator.hardwareConcurrency;
  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
