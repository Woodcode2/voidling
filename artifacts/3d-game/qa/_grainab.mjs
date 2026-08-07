// Ground grain A/B with NOTHING moving: same spot, same camera, same frame,
// only uGrain.z differs. qa/ground.mjs drives the void and samples wherever it
// lands, and that variance (Lantern moved 10% between runs with no change to
// Lantern) is bigger than the effect being judged.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });
await p.evaluate(() => window.__pinQuality(0));

for (const z of [0.0, 0.18, 0.34, 0.5]) {
  const e = await p.evaluate(async (zz) => {
    // hide every prop so the frame IS the ground, then set the grain weight
    const hidden = [];
    window.__scene.traverse((o) => {
      if (o.isMesh && o.userData && o.userData.fade !== undefined && o.visible) { o.visible = false; hidden.push(o); }
    });
    let mat = null;
    window.__scene.traverse((o) => {
      const m = o.material;
      if (m && m.userData && m.userData.grainU) mat = m.userData.grainU;
    });
    if (mat) mat.value.z = zz;
    for (let i = 0; i < 20; i++) await new Promise((r) => requestAnimationFrame(r));
    // high-pass the middle of the frame at 3px, the way ground.mjs does
    const cv = document.querySelector('canvas');
    const g = document.createElement('canvas'); g.width = 260; g.height = 260;
    const cx2 = g.getContext('2d');
    cx2.drawImage(cv, (cv.width - 520) / 2, (cv.height - 520) / 2, 520, 520, 0, 0, 260, 260);
    const d = cx2.getImageData(0, 0, 260, 260).data;
    const lum = (i) => (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    let acc = 0, n = 0, mean = 0;
    for (let y = 3; y < 257; y++) for (let x = 3; x < 257; x++) {
      const i = (y * 260 + x) * 4;
      const c = lum(i);
      const nb = (lum(i - 12) + lum(i + 12) + lum(i - 260 * 4 * 3) + lum(i + 260 * 4 * 3)) / 4;
      acc += Math.abs(c - nb); mean += c; n++;
    }
    for (const o of hidden) o.visible = true;
    return { detail: acc / n, mean: mean / n, found: !!mat };
  }, z);
  console.log(`uGrain.z ${String(z).padEnd(5)}  mid-detail ${e.detail.toFixed(5)}  mean ${e.mean.toFixed(3)}${e.found ? '' : '   <-- uniform not reachable'}`);
}
await b.close();
