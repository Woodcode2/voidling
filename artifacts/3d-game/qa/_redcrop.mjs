// Red-surface shading check: within a region of two frames, take the pixels that
// read as red (r > 1.6g, r > 1.6b, r > 70) and report their count and luminance
// P5/P50/P95 — a surface that cannot shade has a narrow spread. Optional crop
// image at 2x, side by side.   node redcrop.mjs a.png b.png [x y w h out.png]
import fs from 'fs'; import { PNG } from 'pngjs';
const [a, b, X, Y, W, H, out] = process.argv.slice(2);
const stat = (f) => {
  const P = PNG.sync.read(fs.readFileSync(f)); const x0 = X ? +X : 0, y0 = Y ? +Y : 0, w = W ? +W : P.width, h = H ? +H : P.height; const L = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const i = (y * P.width + x) * 4, r = P.data[i], g = P.data[i + 1], bl = P.data[i + 2]; if (r > 70 && r > 1.6 * g && r > 1.6 * bl) L.push(0.2126 * r + 0.7152 * g + 0.0722 * bl); }
  L.sort((p, q) => p - q); const q = (k) => L.length ? Math.round(L[Math.floor(k * (L.length - 1))]) : 0;
  return { P, n: L.length, p5: q(0.05), p50: q(0.5), p95: q(0.95) };
};
const A = stat(a), B = stat(b);
console.log(`  red px  P5/P50/P95   ${a.split('/').pop()}: ${A.n}  ${A.p5}/${A.p50}/${A.p95}    ${b.split('/').pop()}: ${B.n}  ${B.p5}/${B.p50}/${B.p95}   spread ${A.p95 - A.p5} -> ${B.p95 - B.p5}`);
if (out) {
  const x0 = +X, y0 = +Y, w = +W, h = +H, O = new PNG({ width: w * 4 + 4, height: h * 2 });
  for (let y = 0; y < h * 2; y++) for (let x = 0; x < w * 4 + 4; x++) { const o = (y * O.width + x) * 4; if (x >= w * 2 && x < w * 2 + 4) { O.data[o] = 255; O.data[o + 1] = 0; O.data[o + 2] = 255; O.data[o + 3] = 255; continue; } const S = x < w * 2 ? A.P : B.P, sx = x0 + ((x < w * 2 ? x : x - w * 2 - 4) >> 1), sy = y0 + (y >> 1), i = (sy * S.width + sx) * 4; O.data[o] = S.data[i]; O.data[o + 1] = S.data[i + 1]; O.data[o + 2] = S.data[i + 2]; O.data[o + 3] = 255; }
  fs.writeFileSync(out, PNG.sync.write(O)); console.log('  crop', out, O.width, O.height);
}
