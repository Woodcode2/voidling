// (1) Pirate's 17 off-district props: are they on legal ground at all?
// (2) The gate plaza's actual inventory — the design doc promises a helmet
//     tunnel there and the census says the biggest thing in it is r=4.
// (3) What a WORLD ENDER at the law cap looks like standing in each world:
//     shoot the finale, at the radius the growth law actually reaches.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const OFF = [[104, -24], [94, -91], [81, -46], [15, 170], [54.7, 78], [25.3, 173.2], [112.5, -43]];
for (const wid of (process.argv[2] || 'pirate,maple,gameday,lantern').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.waitForTimeout(6000);
  if (wid === 'pirate') {
    const r = await p.evaluate((pts) => pts.map(([x, z]) => ({ x, z,
      land: window.__insideIsland3(x, z), deep: window.__inDeepWater3?.(x, z, 0) ?? null,
      biome: String(window.__biomeAt(x, z)) })), OFF);
    console.log('  pirate off-district prop sites:');
    for (const q of r) console.log(`    (${q.x},${q.z})  insideIsland3=${q.land}  deepWater=${q.deep}  biome=${q.biome}`);
  }
  // biggest prop within reach, and travel from spawn to it
  const fin = await p.evaluate(() => {
    const big = [...window.__edibles].filter((e) => e.mesh).sort((a, b2) => b2.radius - a.radius)[0];
    const s = window.__voidState();
    return { r: +big.radius.toFixed(1), x: +big.mesh.position.x.toFixed(0), z: +big.mesh.position.z.toFixed(0),
      spawnDist: null, sx: +s.x.toFixed(0), sz: +s.z.toFixed(0) };
  });
  console.log(`  ${wid}: biggest prop r=${fin.r} at (${fin.x},${fin.z})`);
  // park a WORLD ENDER at the law-cap radius next to the biggest prop and shoot
  await p.evaluate(([x, z]) => { window.__warpVoid(x + 40, z + 40); window.__setVoidR(11.46); },
    [fin.x, fin.z]);
  await p.waitForTimeout(2500);
  await p.evaluate(() => { window.__setVoidR(11.46); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `qa-out/_finale-${wid}.png` });
  console.log(`    wrote qa-out/_finale-${wid}.png  (void R=11.46, the par-run law cap at the whistle)`);
  await p.close();
}
await b.close();
