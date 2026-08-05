// RAW PIXELS from a sky patch — is the "lattice" in the game, or in the
// downscaler I looked at it with?
//
//   node qa/_skydump.mjs <png> <x> <y>
//
// Prints a 20x14 window of the green channel at 1:1, the patch's min/max/sd
// over a larger box, and the vertical autocorrelation out to lag 48 so a
// coarse period cannot hide between the short lags.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [file, X, Y] = [process.argv[2], +process.argv[3], +process.argv[4]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('about:blank');
const r = await p.evaluate(async ({ u, X, Y }) => {
  const img = new Image(); img.src = u; await img.decode();
  const W = 400, H = 400;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, X, Y, W, H, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const v = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) v[i] = d[i * 4 + 1];
  let mn = 999, mx = -999, m = 0;
  for (let i = 0; i < W * H; i++) { mn = Math.min(mn, v[i]); mx = Math.max(mx, v[i]); m += v[i]; }
  m /= W * H;
  let sd = 0; for (let i = 0; i < W * H; i++) sd += (v[i] - m) ** 2; sd = Math.sqrt(sd / (W * H));
  const rows = [];
  for (let y = 0; y < 14; y++) rows.push(Array.from({ length: 20 }, (_, x) => v[(y + 40) * W + x + 40]));
  // vertical autocorrelation of the column-demeaned signal, long lags
  const col = new Float32Array(H);
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) s += v[y * W + x]; col[y] = s / W; }
  let cm = 0; for (let y = 0; y < H; y++) cm += col[y]; cm /= H;
  const acs = [];
  for (let l = 1; l <= 48; l++) {
    let num = 0, den = 0;
    for (let y = 0; y + l < H; y++) { num += (col[y] - cm) * (col[y + l] - cm); }
    for (let y = 0; y < H; y++) den += (col[y] - cm) ** 2;
    acs.push(+(num / den).toFixed(2));
  }
  return { m: +m.toFixed(2), mn, mx, sd: +sd.toFixed(3), rows, acs };
}, { u: 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'), X, Y });
await b.close();
console.log(`\n${file} 400x400 patch at (${X},${Y})  green: mean ${r.m}  min ${r.mn}  max ${r.mx}  sd ${r.sd}`);
console.log('  raw 20x14 window (green channel, 1:1):');
for (const row of r.rows) console.log('   ' + row.map(v => String(v).padStart(4)).join(''));
console.log('  row-mean autocorrelation, lags 1..48:');
console.log('   ' + r.acs.join(' '));
