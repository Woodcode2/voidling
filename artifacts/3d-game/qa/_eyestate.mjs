import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto('http://127.0.0.1:4177/?w=maple', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1200);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
for (const m of ['cruise', 'sleepy', 'cruise']) {
  const r = await p.evaluate(async (mood) => {
    window.__setVoidR(6); window.__setMood(mood);
    for (let i = 0; i < 110; i++) await new Promise((r) => requestAnimationFrame(r));
    const out = [];
    window.__scene.traverse((o) => {
      if (o.isMesh && o.material && o.material.map && o.renderOrder === 3) {
        out.push({ vis: o.visible, parentVis: o.parent?.visible, sy: +(o.parent?.scale.y ?? 0).toFixed(3), op: o.material.opacity });
      }
    });
    return out.slice(0, 2);
  }, m);
  console.log(`${m.padEnd(7)} pupils: ${JSON.stringify(r)}`);
}
await b.close();
