// IS THE HERO ACTUALLY PURPLE, AND IS THERE WHITE ON HIS FACE?
//
// The owner, on a screenshot of the live build at "VOIDLING 2m":
//   "After our voids purple faded."
//   "That white smile has to go. The white part I'm not a fan of."
//   "And there's a ring around him."
//
// All three are colour claims, so all three are measurable and none of them
// should be settled by looking. This boots a real match, pins the void to a
// given radius, stubs the world to a flat mid-grey so nothing but the character
// is in frame, and then reports what the pixels ARE:
//
//   saturation   mean HSV S over the body disc. "Faded" is a low number.
//   hue          mean hue in degrees. Purple is ~270; drifting toward 300+ is
//                pink, toward 240 is indigo.
//   white px     fraction of body pixels with S < 0.18 and V > 0.80 — the
//                definition of "looks cheap": bright and colourless.
//   ring         samples an annulus on the GROUND just outside the silhouette.
//                The ground is stubbed flat, so any deviation there is furniture.
//
// The radius matters: the shader used to widen the rim as the void got small,
// so the fade was worst at exactly the size a match starts at. Sweep it.
//
//   node qa/heroface.mjs [port] [radii]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '4173';
const RADII = (process.argv[3] || '1.25,2.5,6,12').split(',').map(Number);
const OUT = 'qa/out/heroface';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(1200);

// Flatten the world: every mesh that is not the void becomes an untextured
// mid-grey, so "what colour is the hero" is not a question about what he is
// standing on. The HUD is hidden for the same reason.
await p.evaluate(() => {
  const THREE = window.__THREE, sc = window.__scene;
  const keep = new Set();
  sc.traverse((o) => { if (/void|face|eye|mouth|body|contact|rings/i.test(o.name)) keep.add(o); });
  const grey = new THREE.MeshBasicMaterial({ color: 0x8a8a8a });
  sc.traverse((o) => {
    if (!o.isMesh || keep.has(o)) return;
    const inVoid = (() => { for (let n = o; n; n = n.parent) if (keep.has(n)) return true; return false; })();
    if (!inVoid && !/void/i.test(o.name)) o.material = grey;
  });
  document.querySelectorAll('.hud,#hud,#top,#growth,#banner,#chat,#news').forEach((e) => (e.style.display = 'none'));
});

const rgb2hsv = (r, g, bl) => {
  r /= 255; g /= 255; bl /= 255;
  const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - bl) / d) % 6);
    else if (mx === g) h = 60 * ((bl - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx ? d / mx : 0, mx];
};

console.log('  r     px    saturation   hue     white px   ring delta');
const rows = [];
for (const r of RADII) {
  await p.evaluate((rr) => window.__setVoidR?.(rr), r);
  await p.waitForTimeout(700);
  const shot = await p.screenshot();
  writeFileSync(`${OUT}/r${r}.png`, shot);
  // read the framebuffer through a canvas the page can sample
  const m = await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const w = cv.width, h = cv.height;
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    const g = c2.getContext('2d'); g.drawImage(cv, 0, 0);
    const d = g.getImageData(0, 0, w, h).data;
    // the void is centred by the follow camera; find its disc by walking out
    // from the centre until the pixels stop differing from the flat grey
    const cx = (w / 2) | 0, cy = (h / 2) | 0;
    const at = (x, y) => { const i = ((y * w) + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const isGrey = ([r, g2, b2]) => Math.abs(r - 138) < 26 && Math.abs(g2 - 138) < 26 && Math.abs(b2 - 138) < 26;
    let rad = 0;
    for (let x = 0; x < w / 2; x++) { if (isGrey(at(cx + x, cy))) { rad = x; break; } }
    const body = [], ring = [];
    for (let y = cy - rad; y <= cy + rad; y++) {
      for (let x = cx - rad; x <= cx + rad; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const dd = Math.hypot(x - cx, y - cy);
        if (dd < rad * 0.82) body.push(at(x, y));
      }
    }
    // the ground annulus just outside the silhouette, sampled BELOW him where
    // the ground actually is (the camera looks down at ~46 degrees)
    for (let a = 0; a < 360; a += 3) {
      for (const k of [1.25, 1.45, 1.7]) {
        const x = Math.round(cx + Math.cos(a * Math.PI / 180) * rad * k);
        const y = Math.round(cy + Math.sin(a * Math.PI / 180) * rad * k * 0.62 + rad * 0.5);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        ring.push(at(x, y));
      }
    }
    return { rad, body, ring, w, h };
  });
  if (!m.rad) { console.log(`  ${r}  — could not find the disc`); continue; }
  let sS = 0, sH = 0, nW = 0, sx = 0, sy = 0;
  for (const px of m.body) {
    const [h, s, v] = rgb2hsv(px[0], px[1], px[2]);
    sS += s; sx += Math.cos(h * Math.PI / 180) * s; sy += Math.sin(h * Math.PI / 180) * s;
    if (s < 0.18 && v > 0.80) nW++;
  }
  const n = Math.max(1, m.body.length);
  const satM = sS / n;
  let hueM = Math.atan2(sy, sx) * 180 / Math.PI; if (hueM < 0) hueM += 360;
  const whitePct = nW / n * 100;
  // how far the ground annulus deviates from the flat grey it was stubbed to
  let dev = 0;
  for (const px of m.ring) dev += (Math.abs(px[0] - 138) + Math.abs(px[1] - 138) + Math.abs(px[2] - 138)) / 3;
  const ringDev = dev / Math.max(1, m.ring.length);
  rows.push({ r, rad: m.rad, satM, hueM, whitePct, ringDev });
  console.log(`${String(r).padStart(5)} ${String(m.rad).padStart(6)}`
    + `      ${satM.toFixed(3)}   ${hueM.toFixed(0).padStart(4)}deg`
    + `    ${whitePct.toFixed(1).padStart(5)}%      ${ringDev.toFixed(1).padStart(5)}`);
}

console.log('\n══ READ IT LIKE THIS');
console.log('  saturation  the default body is 0x5f2ab4, S = 0.77. Anything under');
console.log('              ~0.45 averaged over the disc is the "faded" the owner saw.');
console.log('  hue         purple is ~270deg. 285+ is drifting pink/lavender.');
console.log('  white px    bright AND colourless. This is what "looks cheap" measures.');
console.log('  ring delta  the ground is stubbed flat grey, so anything above ~6 is');
console.log('              furniture drawn around him rather than the ground itself.');
const bad = rows.filter((x) => x.satM < 0.45);
if (bad.length) console.log(`\n  FADED at r = ${bad.map((x) => x.r).join(', ')}`);
else console.log('\n  saturation holds at every size sampled.');
console.log(`  frames in ${OUT}/`);
await b.close();
