// The owner's own frame (docs/owner-2026-08-29-splash.png, iPhone 440x956@3):
// contrast of the "THE CUTE" glyphs against the pixels around them, measured on
// his pixels, not ours. Glyphs = bright, low-chroma pixels inside the line's
// box; behind = the rest of the box (the hero's face).
import fs from 'fs'; import { PNG } from 'pngjs';
const P = PNG.sync.read(fs.readFileSync(process.argv[2] || 'docs/owner-2026-08-29-splash.png'));
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const box = (name, x0, y0, x1, y1, minY) => {
  const G = [], B = []; let gr = 0, gg = 0, gb = 0, br = 0, bg = 0, bb = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * P.width + x) * 4, r = P.data[i], g = P.data[i + 1], b = P.data[i + 2]; const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; const L = lum(r, g, b); if (Y > minY && Math.max(r, g, b) - Math.min(r, g, b) < 70) { G.push(L); gr += r; gg += g; gb += b; } else { B.push(L); br += r; bg += g; bb += b; } }
  G.sort((a, b) => a - b); B.sort((a, b) => a - b); const q = (a, k) => a[Math.floor(k * (a.length - 1))];
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  console.log(`  ${name.padEnd(12)} glyph px ${G.length} (mean ${Math.round(gr / G.length)},${Math.round(gg / G.length)},${Math.round(gb / G.length)})  behind px ${B.length} (mean ${Math.round(br / B.length)},${Math.round(bg / B.length)},${Math.round(bb / B.length)})  contrast glyph-median vs behind: p10 ${ratio(q(G, 0.5), q(B, 0.9)).toFixed(2)}:1 (brightest tenth of the behind)  median ${ratio(q(G, 0.5), q(B, 0.5)).toFixed(2)}:1  vs darkest tenth ${ratio(q(G, 0.5), q(B, 0.1)).toFixed(2)}:1`);
};
// boxes from the displayed 921x2000 image scaled by 1.43 to the 1320x2868 original
box('THE CUTE', Math.round(335 * 1.433), Math.round(1338 * 1.434), Math.round(575 * 1.433), Math.round(1378 * 1.434), 170);
box('WORLD ENDER', Math.round(240 * 1.433), Math.round(1378 * 1.434), Math.round(680 * 1.433), Math.round(1425 * 1.434), 200);
box('yellow line', Math.round(160 * 1.433), Math.round(1455 * 1.434), Math.round(760 * 1.433), Math.round(1490 * 1.434), 150);
