// Mean sRGB and relative luminance of arbitrary rectangles in a frame.
//
//   node qa/_patch.mjs <png> <label>:<x>,<y>,<w>,<h> [more...]
//
// For "is the SKY brighter than the WORLD" — a question a mean-of-the-whole-
// frame cannot answer, because the frame is mostly world.
import { chromium } from 'playwright';
import fs from 'node:fs';
const file = process.argv[2];
const rects = process.argv.slice(3).map(s => {
  const [label, nums] = s.split(':');
  const [x, y, w, h] = nums.split(',').map(Number);
  return { label, x, y, w, h };
});
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.goto('about:blank');
const out = await p.evaluate(async ({ u, rects }) => {
  const img = new Image(); img.src = u; await img.decode();
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return rects.map(r => {
    const c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    const d = g.getImageData(0, 0, r.w, r.h).data;
    let R = 0, G = 0, B = 0, L = 0; const n = r.w * r.h;
    for (let i = 0; i < n; i++) {
      R += d[i * 4]; G += d[i * 4 + 1]; B += d[i * 4 + 2];
      L += 0.2126 * lin(d[i * 4]) + 0.7152 * lin(d[i * 4 + 1]) + 0.0722 * lin(d[i * 4 + 2]);
    }
    const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
    return { label: r.label, hex: '#' + hex(R) + hex(G) + hex(B), L: +(L / n).toFixed(4),
      srgb: Math.round((R + G + B) / (3 * n)) };
  });
}, { u: 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'), rects });
await b.close();
console.log(`\n${file}`);
for (const o of out) console.log(`  ${o.label.padEnd(16)} ${o.hex}   mean sRGB ${String(o.srgb).padStart(3)}/255   relative luminance ${o.L.toFixed(4)}`);
