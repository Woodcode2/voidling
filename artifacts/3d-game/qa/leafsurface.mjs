// LEAVES GO ON GRASS — the leaf-drift stain probe (studio round 4, Job 3 / I-6)
//
//   node qa/leafsurface.mjs [port] [--out=qa/out/bake/maple.png]
//
// Maple's leaf drifts are painted into the ground bake by block, on the
// blocks the plan calls grassy — and a "grassy" block like the plaza is mostly
// pale stone walks. A warm translucent drift on cream stone does not read as
// leaves; it reads as a spill (island.ts says so itself, and still did it).
// The studio governor found two of them in the game's opening frame, on the
// square's walks, and blocked the push on them (B1).
//
// THE MEASURE, on the bake canvas itself — the pixels every frame samples:
// a WARM texel (R-B > 40 and R > G) is a stain when the 15x15 neighbourhood
// around it is pale stone: median luminance above 0.80 and chroma (max-min of
// the neighbourhood's mean RGB, 0-1) below 0.10. On grass the same warm texel
// has a dark green neighbourhood and is a drift doing its job.
//
// BAR: at most 20 stain texels across the whole 3072px bake. Stated by the
// governor before the fix; read on the bake before and after.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '4177';
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT = outArg ? outArg.slice(6) : null;
const BAR = 20;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
// the ground bake is the biggest canvas-backed map in the scene (as qa/_dumpbake.mjs finds it)
const dataUrl = await p.evaluate(() => {
  let best = null;
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material?.map?.image?.toDataURL) {
      const img = o.material.map.image;
      if (!best || img.width * img.height > best.width * best.height) best = img;
    }
  });
  return best ? best.toDataURL('image/png') : null;
});
await b.close();
if (!dataUrl) { console.log('FAIL — no canvas-backed ground map found; nothing was measured'); process.exit(1); }
const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
if (OUT) { mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true }); writeFileSync(OUT, buf); }
const img = PNG.sync.read(buf);
const W = img.width, H = img.height, D = img.data;

const lum = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) lum[i] = (0.2126 * D[i * 4] + 0.7152 * D[i * 4 + 1] + 0.0722 * D[i * 4 + 2]) / 255;

let warm = 0, stains = 0;
const pts = [];
const win = new Float32Array(225);
for (let y = 7; y < H - 7; y++) for (let x = 7; x < W - 7; x++) {
  const i = (y * W + x) * 4, r = D[i], g = D[i + 1], bl = D[i + 2];
  if (!(r - bl > 40 && r > g)) continue;
  warm++;
  let n = 0, sr = 0, sg = 0, sb = 0;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const k = (y + dy) * W + x + dx;
    win[n++] = lum[k]; sr += D[k * 4]; sg += D[k * 4 + 1]; sb += D[k * 4 + 2];
  }
  win.sort();
  const med = win[112];
  const mr = sr / 225, mg = sg / 225, mb = sb / 225;
  const chroma = (Math.max(mr, mg, mb) - Math.min(mr, mg, mb)) / 255;
  if (med > 0.80 && chroma < 0.10) { stains++; if (pts.length < 8) pts.push(`(${x},${y})`); }
}

console.log(`\n  LEAF SURFACE — Maple's ground bake, ${W}x${H}, on :${PORT}\n`);
console.log(`  ·    warm texels (R-B > 40, R > G): ${warm}`);
console.log(`  ·    of those on pale stone (15x15 median L > 0.80, chroma < 0.10): ${stains}${pts.length ? `  first at ${pts.join(' ')}` : ''}`);
if (OUT) console.log(`  ·    bake written to ${OUT}`);
if (stains > BAR) {
  console.log(`\nFAIL — ${stains} warm texels sit on pale stone (bar ${BAR}): leaf drifts painted onto the walks read as stains`);
  process.exit(1);
}
console.log(`\nPASS — ${stains} warm texels on pale stone (bar ${BAR}): the leaves are on the grass`);
