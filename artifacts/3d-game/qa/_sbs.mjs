// Stream B helper — side-by-side half-scale composite of two frames.
// side-by-side half-scale composite of two PNGs: node sbs.mjs a.png b.png out.png
import fs from 'fs'; import { PNG } from 'pngjs';
const [a, b, out] = process.argv.slice(2);
const A = PNG.sync.read(fs.readFileSync(a)), B = PNG.sync.read(fs.readFileSync(b));
const w = A.width >> 1, h = A.height >> 1; const O = new PNG({ width: w * 2 + 4, height: h });
for (let y = 0; y < h; y++) for (let x = 0; x < w * 2 + 4; x++) {
  const o = (y * O.width + x) * 4; if (x >= w && x < w + 4) { O.data[o] = 255; O.data[o+1] = 0; O.data[o+2] = 255; O.data[o+3] = 255; continue; }
  const S = x < w ? A : B, sx = (x < w ? x : x - w - 4) * 2, sy = y * 2; let r = 0, g = 0, bl = 0;
  for (const [dx, dy] of [[0,0],[1,0],[0,1],[1,1]]) { const i = ((sy + dy) * S.width + sx + dx) * 4; r += S.data[i]; g += S.data[i+1]; bl += S.data[i+2]; }
  O.data[o] = r >> 2; O.data[o+1] = g >> 2; O.data[o+2] = bl >> 2; O.data[o+3] = 255;
}
fs.writeFileSync(out, PNG.sync.write(O)); console.log(out, O.width, O.height);
