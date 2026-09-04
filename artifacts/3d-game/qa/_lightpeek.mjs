import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidMute','1'); localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark');
  localStorage.setItem('voidMatchN', JSON.stringify({ maple: 1 }));
} catch {} });
await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1200);
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]')?.click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
const out = await p.evaluate(() => {
  const lights = [];
  window.__scene.traverse((o) => {
    if (o.isLight) lights.push({ type: o.type, i: +o.intensity.toFixed(3), hex: o.color.getHexString(), sh: !!o.castShadow });
  });
  return { lights, deal: window.__deal };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
