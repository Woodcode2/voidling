import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src, sx, sy, sw, sh] = process.argv.slice(2);
const p = PNG.sync.read(readFileSync(src));
const X = +sx, Y = +sy, W = +sw, H = +sh;
const m = new Map();
let n = 0;
for (let y = Y; y < Y + H; y++) for (let x = X; x < X + W; x++) {
  const i = (y * p.width + x) * 4;
  const k = `${p.data[i]},${p.data[i+1]},${p.data[i+2]}`;
  m.set(k, (m.get(k) || 0) + 1); n++;
}
const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
console.log(`region ${X},${Y} ${W}x${H}  px=${n}  distinct=${m.size}`);
for (const [k, c] of top) {
  const [r, g, b] = k.split(',').map(Number);
  console.log(`  ${(c / n * 100).toFixed(2).padStart(6)}%  rgb(${k})  #${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}  L=${(0.2126*r+0.7152*g+0.0722*b).toFixed(1)}`);
}
