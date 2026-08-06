// CONTENT CENSUS — one page load per world, dump EVERY edible with everything
// the level audit needs: radius, position, district, mover/building flags, the
// mesh key, sticker id. Waits for __edibles to stop growing first, because
// glb() registers model-backed props inside a promise and an early snapshot
// counts a different world every run.
//
//   node qa/_content.mjs [worlds] > qa-out/content.json
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
const worlds = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const out = {};
for (const wid of worlds) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.removeItem('voidStickers'); } catch { } });
  p.on('pageerror', (e) => console.error(`[${wid}] PAGE ERROR: ${e.message}`));
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // enter the match so anything that populates on start exists
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1500);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  // wait for a stable edible count (async glb fallbacks)
  let prev = -1, stable = 0;
  for (let i = 0; i < 60 && stable < 4; i++) {
    await p.waitForTimeout(900);
    const n = await p.evaluate(() => window.__edibles.length);
    if (n === prev) stable++; else { stable = 0; prev = n; }
  }
  const r = await p.evaluate(() => {
    const es = [];
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      es.push({ r: +(e.radius || 0).toFixed(3),
        x: +m.position.x.toFixed(1), z: +m.position.z.toFixed(1),
        d: String(window.__biomeAt(m.position.x, m.position.z) ?? 'off'),
        mv: !!m.userData.mover, bl: !!m.userData.building,
        qk: m.userData.qk || '', st: m.userData.sticker || '' });
    }
    // legal-ground Monte Carlo, per district
    const areaD = {}; let hits = 0; const N = 240000, SPAN = 700;
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * SPAN, z = (Math.random() - 0.5) * SPAN;
      const d = window.__biomeAt(x, z);
      if (!d) continue; hits++; areaD[d] = (areaD[d] || 0) + 1;
    }
    const cell = (SPAN * SPAN) / N;
    const aD = {}; for (const k in areaD) aD[k] = +(areaD[k] * cell).toFixed(0);
    return { es, area: +(hits * cell).toFixed(0), aD };
  });
  out[wid] = r;
  console.error(`${wid}: ${r.es.length} edibles, ${r.area} u² legal ground, ${Object.keys(r.aD).length} districts`);
  await p.close();
}
mkdirSync('qa-out', { recursive: true });
writeFileSync('qa-out/content.json', JSON.stringify(out));
console.error('wrote qa-out/content.json');
await b.close();
