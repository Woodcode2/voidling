// ARE THE STICKER CURIOS PLACED ON THE COLD FIRST-LAUNCH PATH?
//
//   node qa/_stkcold.mjs [world]
//
// qa/finds.mjs finds 6 on maple with a WARM profile going through the menu.
// qa/_evoearly.mjs found 0 on a genuine cold install that auto-starts. Two
// explanations: the curios are not placed on the auto-start path, or the two
// autopilots differ. Count the curios directly rather than guess.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const PORT = 4237;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const mode of ['cold', 'warm']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript((m) => {
    try {
      localStorage.clear();
      if (m === 'warm') {
        localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
        localStorage.setItem('voidBookSeen', '1');
        localStorage.setItem('voidDailyLast', new Date().toDateString());
      }
    } catch { }
  }, mode);
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  if (mode === 'warm') {
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    const play = p.locator('#btnPlay');
    if (await play.count() && await play.isVisible()) {
      await play.click(); await p.waitForTimeout(1500);
      await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
    }
  }
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.5, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const cur = window.__edibles.filter((e) => e.mesh.userData.sticker);
    const vs = window.__voidState();
    return {
      total: window.__edibles.length,
      curios: cur.length,
      ids: cur.map((e) => e.mesh.userData.sticker),
      dist: cur.map((e) => Math.round(Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z))).sort((a, b) => a - b),
      radii: cur.map((e) => +e.radius.toFixed(2)),
      ls: Object.keys(localStorage),
    };
  });
  console.log(`\n${mode.toUpperCase()}  edibles ${r.total}   CURIOS PLACED ${r.curios}`);
  console.log(`  ids: ${r.ids.join(', ')}`);
  console.log(`  curio radius: ${[...new Set(r.radii)].join(', ')}`);
  console.log(`  distance from spawn (sorted): ${r.dist.join(', ')}`);
  await p.close();
}
await b.close();
