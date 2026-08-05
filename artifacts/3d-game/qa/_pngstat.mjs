// Value structure / colour / detail statistics for frames already on disk.
//
//   node qa/_pngstat.mjs qa-out/gw/*.png
//
// preserveDrawingBuffer is off so the live canvas cannot be read; this decodes
// the SCREENSHOTS instead, in a page, which is the only way to get pixels here.
//
// Reports, per image:
//   mean / p05 / p50 / p95 luminance (Rec.709 on sRGB, gamma-decoded)
//   VALUE SPREAD  p95-p05 — the number behind "flat"
//   %dark (<0.18), %mid, %light (>0.66)  — is there a dark end at all?
//   mean chroma (HSL S at L-weighting), and the top hue buckets by area
//   DETAIL: mean |laplacian| at full res — texture and silhouette density
//   SKY: the same, restricted to the top 18% of the frame
import { chromium } from 'playwright';
import fs from 'node:fs';

const files = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('about:blank');

const rows = [];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log(`missing ${f}`); continue; }
  const dataUrl = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const r = await p.evaluate(async (u) => {
    const img = new Image(); img.src = u; await img.decode();
    const W = Math.min(img.width, 645), H = Math.round(img.height * W / img.width);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = new Float32Array(W * H);
    const hues = new Array(12).fill(0);
    let sat = 0, n = W * H;
    for (let i = 0; i < n; i++) {
      const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
      L[i] = 0.2126 * lin(R) + 0.7152 * lin(G) + 0.0722 * lin(B);
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 510;
      const s = mx === mn ? 0 : (mx - mn) / 255 / (1 - Math.abs(2 * l - 1) + 1e-6);
      sat += Math.min(s, 1);
      if (mx !== mn) {
        let h;
        if (mx === R) h = ((G - B) / (mx - mn) + 6) % 6;
        else if (mx === G) h = (B - R) / (mx - mn) + 2;
        else h = (R - G) / (mx - mn) + 4;
        hues[Math.floor(h * 2) % 12] += (mx - mn) / 255;   // weight by chroma
      }
    }
    const sorted = Float32Array.from(L).sort();
    const q = (f) => sorted[Math.floor(f * (n - 1))];
    let dark = 0, light = 0;
    for (let i = 0; i < n; i++) { if (L[i] < 0.18) dark++; else if (L[i] > 0.66) light++; }
    // laplacian magnitude — detail density
    let lap = 0, lapN = 0, skyLap = 0, skyN = 0, skyL = 0;
    const skyRows = Math.floor(H * 0.18);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const v = Math.abs(4 * L[i] - L[i - 1] - L[i + 1] - L[i - W] - L[i + W]);
      lap += v; lapN++;
      if (y < skyRows) { skyLap += v; skyN++; skyL += L[i]; }
    }
    const hueNames = ['red', 'orange', 'yellow', 'yel-grn', 'green', 'spring', 'cyan', 'azure', 'blue', 'violet', 'magenta', 'rose'];
    const top = hues.map((v, i) => ({ h: hueNames[i], v })).sort((a, c2) => c2.v - a.v).slice(0, 4)
      .map(o => `${o.h} ${(o.v / (sat || 1) * 100).toFixed(0)}%`);
    let m = 0; for (let i = 0; i < n; i++) m += L[i];
    return { W, H, mean: m / n, p05: q(0.05), p50: q(0.5), p95: q(0.95),
      dark: dark / n, light: light / n, sat: sat / n, lap: lap / lapN,
      skyLap: skyLap / (skyN || 1), skyL: skyL / (skyN || 1), top };
  }, dataUrl);
  rows.push({ f, ...r });
}
await b.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('frame', 26) + ['mean', 'p05', 'p50', 'p95', 'sprd', '%dk', '%lt', 'sat', 'detail', 'skyDet', 'skyL'].map(s => s.padStart(7)).join(''));
for (const r of rows) {
  const nm = r.f.split('/').pop().replace('.png', '');
  console.log(pad(nm, 26) +
    [r.mean, r.p05, r.p50, r.p95, r.p95 - r.p05].map(v => v.toFixed(3).padStart(7)).join('') +
    [(r.dark * 100).toFixed(1), (r.light * 100).toFixed(1)].map(v => v.padStart(7)).join('') +
    r.sat.toFixed(3).padStart(7) + r.lap.toFixed(4).padStart(7) + r.skyLap.toFixed(4).padStart(7) +
    r.skyL.toFixed(3).padStart(7) + '   ' + r.top.join(' · '));
}
