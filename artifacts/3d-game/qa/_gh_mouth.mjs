// IS THERE A SMILE? Run over the portraits _gh_hero.mjs already wrote.
//
//   node qa/_gh_mouth.mjs
//
// The mouth is a plum half-disc (VOID.mouth 0x4a1a68, palette.ts:38) with a
// pink tongue (0xff6f91, void3d.ts:601) inside it, and it sits on the belly —
// which is exactly where the shader paints the abyss (void3d.ts:176-182). This
// finds the tongue by colour, then measures the plum lip against the body
// immediately around it, so "the smile is a pink pill with no mouth around it"
// becomes a contrast ratio instead of an impression.
import { chromium } from 'playwright';
import fs from 'node:fs';

const files = fs.readdirSync('qa-out/gh').filter((f) => /-r[\d.]+\.png$/.test(f)).sort();
if (!files.length) { console.log('no qa-out/gh/*-r*.png — run _gh_hero.mjs first'); process.exit(1); }
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 800, height: 600 } });
const rows = files.map((f) => ({ f, b64: fs.readFileSync('qa-out/gh/' + f).toString('base64') }));
const out = await p.evaluate(async (rows) => {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (r, g, bl) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  const wcag = (a, b2) => (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05);
  const res = [];
  for (const row of rows) {
    const im = new Image(); im.src = 'data:image/png;base64,' + row.b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, im.width, im.height).data;
    const w = im.width, h = im.height, n = w * h;
    // TONGUE: 0xff6f91 is the only strongly warm pink in the frame that sits
    // inside the void; require a big red-green split and a real red.
    let tn = 0, tx = 0, ty = 0, tl = 0;
    const isT = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 4, r = d[j], g = d[j + 1], bl = d[j + 2];
      if (r > 150 && r - g > 55 && bl > 70 && bl < r) {
        isT[i] = 1; tn++; tx += i % w; ty += (i / w) | 0; tl += lum(r, g, bl);
      }
    }
    if (tn < 6) { res.push({ f: row.f, tonguePx: tn, note: 'no tongue found' }); continue; }
    const cx = tx / tn, cy = ty / tn;
    const tr = Math.sqrt(tn / Math.PI);
    // the plum LIP: the annulus just outside the tongue, and the BODY just
    // outside that. If the smile reads, the lip is darker than both.
    let lipL = 0, lipN = 0, bodyL = 0, bodyN = 0, lipMinL = 1;
    for (let i = 0; i < n; i++) {
      if (isT[i]) continue;
      const px = i % w, py = (i / w) | 0;
      const dd = Math.hypot(px - cx, py - cy);
      const j = i * 4, L = lum(d[j], d[j + 1], d[j + 2]);
      if (dd > tr * 1.15 && dd < tr * 2.0) { lipL += L; lipN++; if (L < lipMinL) lipMinL = L; }
      else if (dd > tr * 2.6 && dd < tr * 4.2) { bodyL += L; bodyN++; }
    }
    const lipMean = lipL / Math.max(1, lipN), bodyMean = bodyL / Math.max(1, bodyN);
    res.push({ f: row.f,
      tonguePx: tn, tongueDiamDevPx: +(tr * 2).toFixed(1), tongueDiamCssPx: +((tr * 2) / 3).toFixed(1),
      tongueL: +(tl / tn).toFixed(4), lipRingL: +lipMean.toFixed(4), lipDarkestL: +lipMinL.toFixed(4),
      bodyAroundL: +bodyMean.toFixed(4),
      tongueVsBody: +wcag(tl / tn, bodyMean).toFixed(2),
      lipVsBody: +wcag(lipMean, bodyMean).toFixed(2) });
  }
  return res;
}, rows);
await b.close();
console.log('file'.padEnd(22) + 'tongueØ(CSS) tongueL  lipRingL bodyL   tongue:body  lip:body');
for (const r of out) {
  if (r.note) { console.log(r.f.padEnd(22) + r.note); continue; }
  console.log(r.f.padEnd(22)
    + String(r.tongueDiamCssPx).padEnd(13)
    + String(r.tongueL).padEnd(9) + String(r.lipRingL).padEnd(9)
    + String(r.bodyAroundL).padEnd(8) + String(r.tongueVsBody).padEnd(13) + r.lipVsBody);
}
console.log('\nlip:body near 1.00 means the plum smile has no edge against the belly it is drawn on —');
console.log('the only thing the player sees is the tongue.');
