// one-off: write the baked ground texture to a PNG so it can be looked at
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const W = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(3000);
const info = await p.evaluate(() => {
  const found = [];
  window.__scene.traverse((o) => {
    if (o.isMesh && o.material && o.material.map && o.material.map.image) {
      const img = o.material.map.image;
      found.push({ name: o.name || '(unnamed)', w: img.width, h: img.height,
        isCanvas: !!img.toDataURL, geo: o.geometry?.type,
        verts: o.geometry?.attributes?.position?.count || 0 });
    }
  });
  return found.slice(0, 12);
});
console.log(JSON.stringify(info, null, 1));
// dump the biggest canvas-backed map
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
if (dataUrl) {
  mkdirSync('qa/out/bake', { recursive: true });
  writeFileSync(`qa/out/bake/${W}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`wrote qa/out/bake/${W}.png`);
} else console.log('no canvas-backed map found');
await b.close();
