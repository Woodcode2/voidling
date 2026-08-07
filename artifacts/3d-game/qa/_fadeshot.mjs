import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of ['maple', 'lantern']) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });
  await p.evaluate(() => window.__pinQuality(0));
  // park the void right behind the densest thing we can find in front of the camera
  await p.evaluate(async () => {
    window.__setVoidR(2.2); window.__setMood('frenzy');
    const T = window.__THREE, cam = window.__cam;
    // find a tall prop and stand the void directly behind it from the camera
    let best = null, bestH = 0;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible) continue;
      const bb = new T.Box3().setFromObject(e.mesh);
      const h = bb.max.y - bb.min.y;
      if (h > bestH && h < 30) { bestH = h; best = e.mesh; }
    }
    if (best) {
      const dir = new T.Vector3(best.position.x - cam.position.x, 0, best.position.z - cam.position.z).normalize();
      window.__warpVoid(best.position.x + dir.x * 7, best.position.z + dir.z * 7);
    }
    for (let i = 0; i < 120; i++) await new Promise((r) => requestAnimationFrame(r));
  });
  await p.screenshot({ path: `qa-out/fade-${wid}.png`, clip: { x: 40, y: 240, width: 350, height: 400 } });
  console.log(`${wid}: shot behind its tallest prop`);
  await p.close();
}
await b.close();
