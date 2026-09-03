// TONAL K FOR A FRAME — the rung-3 kill gate's number (round 5, Stream B).
// The brief's "median tonal K" was never defined on disk, so here it is:
//   K        median luminance (Rec.709 Y, 0-255) of the whole canvas frame
//   Y05/Y95  the 5th and 95th luminance percentiles (the frame's tonal range)
//   C        mean chroma (max(R,G,B) - min(R,G,B)) — a desaturating environment
//            map moves this even when K holds
// Measured on qa/lookpair.mjs frames (a named, fixed world position, SEED
// pinned), so two builds differ by the build alone.
//   node qa/kmetric.mjs <png> [<png> ...]      prints one JSON line per file
import fs from 'fs';
import { PNG } from 'pngjs';
for (const f of process.argv.slice(2)) {
  const png = PNG.sync.read(fs.readFileSync(f));
  const Y = new Uint8Array(png.width * png.height); let C = 0;
  for (let i = 0, j = 0; i < png.data.length; i += 4, j++) {
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    Y[j] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    C += Math.max(r, g, b) - Math.min(r, g, b);
  }
  const s = Y.slice().sort();
  const q = (p) => s[Math.floor(p * (s.length - 1))];
  console.log(JSON.stringify({ file: f, K: q(0.5), Y05: q(0.05), Y95: q(0.95), C: +(C / Y.length).toFixed(2) }));
}
