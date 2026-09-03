// Where did two frames of the same shot diverge? Pixels whose Rec.709 luminance moved by more
// than T; their share of the frame, and what those pixels looked like in frame A (mean RGB,
// share that read as red/orange, share dark) — so a global tone shift and a lifted albedo
// can be told apart.   node qa/_pxdiff.mjs a.png b.png [T=6] [out.png]
import fs from 'fs'; import { PNG } from 'pngjs';
const [a, b, T = '6', out] = process.argv.slice(2), th = +T;
const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
const Y = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
let n = 0, up = 0, dn = 0, red = 0, dark = 0, sr = 0, sg = 0, sb = 0, dsum = 0; const N = A.width * A.height;
const O = out ? new PNG({ width: A.width >> 1, height: A.height >> 1 }) : null;
for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
  const i = (y * A.width + x) * 4, ya = Y(A.data, i), yb = Y(B.data, i), d = yb - ya;
  const hit = Math.abs(d) > th; if (hit) { n++; if (d > 0) up++; else dn++; dsum += d; const r = A.data[i], g = A.data[i + 1], bl = A.data[i + 2]; sr += r; sg += g; sb += bl; if (r > 1.4 * g && r > 1.4 * bl) red++; if (ya < 40) dark++; }
  if (O && !(x & 1) && !(y & 1)) { const o = ((y >> 1) * O.width + (x >> 1)) * 4; const g = Math.round(ya * 0.35); O.data[o] = hit ? (d > 0 ? 255 : g) : g; O.data[o + 1] = hit ? (d > 0 ? 40 : 255) : g; O.data[o + 2] = g; O.data[o + 3] = 255; }
}
console.log(`  ${(100 * n / N).toFixed(1)}% of pixels moved >${th} (${(100 * up / N).toFixed(1)}% up, ${(100 * dn / N).toFixed(1)}% down), mean move ${(dsum / Math.max(1, n)).toFixed(1)}; of the moved: ${(100 * red / Math.max(1, n)).toFixed(0)}% were red/orange in A, ${(100 * dark / Math.max(1, n)).toFixed(0)}% were dark (Y<40) in A, mean A colour ${Math.round(sr / Math.max(1, n))},${Math.round(sg / Math.max(1, n))},${Math.round(sb / Math.max(1, n))}`);
if (O) { fs.writeFileSync(out, PNG.sync.write(O)); console.log('  map', out, '(red = brighter in B, green = darker)'); }
