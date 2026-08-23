import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst, sx, sy, sw, sh, scale] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const S = +scale || 1, X = +sx, Y = +sy, W = +sw, H = +sh;
const out = new PNG({ width: W * S, height: H * S });
for (let y = 0; y < H * S; y++) for (let x = 0; x < W * S; x++) {
  const si = ((Y + Math.floor(y / S)) * p.width + (X + Math.floor(x / S))) * 4;
  const di = (y * out.width + x) * 4;
  out.data[di] = p.data[si]; out.data[di+1] = p.data[si+1];
  out.data[di+2] = p.data[si+2]; out.data[di+3] = 255;
}
writeFileSync(dst, PNG.sync.write(out));
console.log(`${dst}  from ${src} @ ${X},${Y} ${W}x${H} scaled ${S}x`);
