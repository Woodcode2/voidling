// Snow-pixel colour, on two frames. Classifier stated rather than hidden:
// a pixel counts as SNOW if blue exceeds red by more than 8 codes (the world's
// authored blue-shadow rule, alpine.ts) and its max channel is 120..245
// (bright, not clipped). Prints mean rgb, b-r, and the whole-frame mean.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
for (const f of process.argv.slice(2)) {
  const p = PNG.sync.read(readFileSync(f));
  let n = 0, r = 0, g = 0, b = 0, all = 0, N = 0;
  for (let i = 0; i < p.data.length; i += 4) {
    const R = p.data[i], G = p.data[i + 1], B = p.data[i + 2];
    all += 0.2126 * R + 0.7152 * G + 0.0722 * B; N++;
    const mx = Math.max(R, G, B);
    if (B - R > 8 && mx >= 120 && mx <= 245) { n++; r += R; g += G; b += B; }
  }
  console.log(`${f.padEnd(46)} snow px ${String(n).padStart(8)} (${(n / N * 100).toFixed(1)}%)  `
    + `mean rgb (${(r / n).toFixed(1)}, ${(g / n).toFixed(1)}, ${(b / n).toFixed(1)})  b-r ${((b - r) / n).toFixed(2)}  `
    + `frame meanL ${(all / N / 255).toFixed(4)}`);
}
