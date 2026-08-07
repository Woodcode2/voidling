// BEFORE/AFTER FOR THE PER-VERTEX SPECULAR. Same seeded layout, same pinned
// camera, same frozen crowd, two ports. Run one build on 4177 and the other on
// 4178 and the only thing that can differ between the two PNGs is the shading.
//   node qa/_glossshot.mjs <port> <tag> [worlds]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const TAG = process.argv[3] || 'after';
const worlds = (process.argv[4] || 'gameday,lantern,pirate,maple').split(',');
// where to stand in each world, and how big the void is: a small void in a
// dense place, so the frame is scenery rather than hero.
const SPOT = {
  gameday: [-40, 40, 3.0],
  lantern: [0, 30, 3.0],
  pirate: [30, -20, 3.0],
  maple: [-63, 70, 3.0],
};
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  p.on('pageerror', (e) => errs.push(`PAGEERROR ${e.message}`.slice(0, 200)));
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
  await p.evaluate(async (spot) => {
    window.__pinQuality(0);
    window.__setVoidR(spot[2]);
    window.__warpVoid(spot[0], spot[1]);
    window.__scene.traverse((o) => {
      if (o.userData && (o.userData.mover || o.userData.ped)) o.visible = false;
      if (o.isSprite || o.isPoints) o.visible = false;
    });
    for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
  }, SPOT[wid]);
  await p.screenshot({ path: `qa-out/gloss-${wid}-${TAG}.png`, clip: { x: 0, y: 60, width: 430, height: 620 } });
  // a shader that fails to compile is the failure mode this whole change has,
  // and it is silent in a screenshot that still contains an island.
  const bad = errs.filter((e) => !/hf3d|\/assets\/hf|403|404|net::/.test(e));
  console.log(`${wid.padEnd(8)} wrote qa-out/gloss-${wid}-${TAG}.png` + (bad.length ? `  ERRORS: ${bad.join(' | ')}` : ''));
  await p.close();
}
await b.close();
