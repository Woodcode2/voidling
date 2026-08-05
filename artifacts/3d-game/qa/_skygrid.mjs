// IS THE SKY A LATTICE?
//
//   node qa/_skygrid.mjs <png> <x> <y> <w> <h>
//
// island.ts:483-505 says a fine ORDERED LATTICE was photographed across the
// whole sky — Chromium's dither on the canvas gradient, magnified by being
// stretched over an entire sky sphere — and that random grain at the dither's
// own amplitude was added to destroy the regularity.
//
// An ordered pattern and film grain have the SAME mean absolute
// neighbour difference, so that number cannot tell them apart. What separates
// them is AUTOCORRELATION: noise decorrelates at lag 1 and stays there;
// a period-2 lattice alternates sign with lag, and a period-N lattice spikes
// at N. This reads a rectangle of pure sky at FULL resolution and reports the
// per-row and per-column autocorrelation of the high-passed signal at lags
// 1..10, next to the value a random field must give (~0).
import { chromium } from 'playwright';
import fs from 'node:fs';

const [file, X, Y, W, H] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('about:blank');
const r = await p.evaluate(async ({ u, X, Y, W, H }) => {
  const img = new Image(); img.src = u; await img.decode();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, X, Y, W, H, 0, 0, W, H);         // 1:1, no resampling
  const d = g.getImageData(0, 0, W, H).data;
  const v = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) v[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
  let mean = 0; for (let i = 0; i < W * H; i++) mean += v[i]; mean /= W * H;
  // HIGH-PASS: subtract a 5-tap box along each axis so the underlying gradient
  // cannot masquerade as structure
  const hp = new Float32Array(W * H);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    let s = 0; for (let k = -2; k <= 2; k++) s += v[y * W + x + k];
    hp[y * W + x] = v[y * W + x] - s / 5;
  }
  const ac = (lag, axis) => {   // axis 0 = along x, 1 = along y
    let num = 0, den = 0, n = 0;
    for (let y = 3; y < H - 3 - (axis ? lag : 0); y++)
      for (let x = 3; x < W - 3 - (axis ? 0 : lag); x++) {
        const a = hp[y * W + x], c2 = axis ? hp[(y + lag) * W + x] : hp[y * W + x + lag];
        num += a * c2; den += a * a; n++;
      }
    void n; return den > 0 ? num / den : 0;
  };
  let amp = 0, nn = 0;
  for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { amp += Math.abs(hp[y * W + x]); nn++; }
  const lags = [];
  for (let l = 1; l <= 10; l++) lags.push({ l, x: +ac(l, 0).toFixed(3), y: +ac(l, 1).toFixed(3) });
  return { mean: +mean.toFixed(1), amp: +(amp / nn).toFixed(3), lags };
}, { u: 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'), X, Y, W, H });
await b.close();
console.log(`\n${file}  patch ${W}x${H} at (${X},${Y})   mean level ${r.mean}/255   high-pass amplitude ${r.amp}`);
console.log('  lag :  ' + r.lags.map(o => String(o.l).padStart(6)).join(''));
console.log('  ac_x:  ' + r.lags.map(o => o.x.toFixed(3).padStart(6)).join(''));
console.log('  ac_y:  ' + r.lags.map(o => o.y.toFixed(3).padStart(6)).join(''));
console.log('  (pure random grain -> every lag ~0.00; a period-2 lattice -> ac at lag1 strongly');
console.log('   NEGATIVE and lag2 strongly POSITIVE; a period-N lattice -> a spike at lag N)');
