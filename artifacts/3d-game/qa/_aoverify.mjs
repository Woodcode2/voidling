// IS THE BAKE EVEN RUNNING? Read a real prop's vertex colours at runtime and
// compare the darkest-lit vertex near its base against one near its top. If
// contact shading is applied, the base must be measurably darker in the
// buffer — no rendering, no camera, no animation involved.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(4000);
const r = await p.evaluate(() => {
  let checked = 0, shaded = 0; const samples = [];
  for (const e of window.__edibles) {
    const m = e.mesh;
    const g = m?.geometry;
    const col = g?.getAttribute?.('color'), pos = g?.getAttribute?.('position');
    if (!col || !pos || pos.count < 30) continue;
    g.computeBoundingBox();
    const bb = g.boundingBox, base = bb.min.y, h = bb.max.y - base;
    if (h < 0.4) continue;
    // mean luminance of the lowest 10% of vertices vs the highest 10%
    let lo = 0, ln = 0, hi = 0, hn = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = (pos.getY(i) - base) / h;
      const l = col.getX(i) * 0.299 + col.getY(i) * 0.587 + col.getZ(i) * 0.114;
      if (y < 0.10) { lo += l; ln++; } else if (y > 0.90) { hi += l; hn++; }
    }
    if (!ln || !hn) continue;
    checked++;
    const ratio = (lo / ln) / (hi / hn || 1);
    if (ratio < 0.93) shaded++;
    if (samples.length < 6) samples.push({ h: +h.toFixed(1), base: +(lo / ln).toFixed(3), top: +(hi / hn).toFixed(3), ratio: +ratio.toFixed(3) });
  }
  return { checked, shaded, samples };
});
console.log(`props inspected: ${r.checked}   with a darker base: ${r.shaded} (${(100 * r.shaded / (r.checked || 1)).toFixed(0)}%)`);
for (const s of r.samples) console.log(`   h=${String(s.h).padStart(5)}  base ${s.base}  top ${s.top}  ratio ${s.ratio}`);
await b.close();
