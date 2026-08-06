// CODE-HEALTH: the cost of the shoreline containment search.
// animate() builds solid() / dirScan() / landDir() fresh every frame, and when
// the void is off the land landDir() spirals 65 rings x 16 spokes calling
// solid() at each one — 10 spatial queries per call. Measure the real per-call
// cost of those queries and the worst case of one landDir().
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const W = process.argv[2] || 'pirate';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.goto(`http://127.0.0.1:${PORT}/?w=${W}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const r = await p.evaluate(() => {
  const s = window.__spawn();
  const N = 20000;
  let t0 = performance.now(); let acc = 0;
  for (let i = 0; i < N; i++) acc += window.__insideIsland3(s.x + (i % 200) - 100, s.z + (i % 137) - 68) ? 1 : 0;
  const inside = (performance.now() - t0) / N * 1000;   // microseconds
  t0 = performance.now();
  for (let i = 0; i < N; i++) acc += window.__biomeAt(s.x + (i % 200) - 100, s.z + (i % 137) - 68) ? 1 : 0;
  const biome = (performance.now() - t0) / N * 1000;
  t0 = performance.now();
  for (let i = 0; i < N; i++) acc += window.__inDeepWater3(s.x + (i % 200) - 100, s.z + (i % 137) - 68, 4) ? 1 : 0;
  const deep = (performance.now() - t0) / N * 1000;
  return { inside: +inside.toFixed(3), biome: +biome.toFixed(3), deep: +deep.toFixed(3), acc };
});
// one solid() = 1 biomeAt + 1 inDeepWater3 + 8 insideIsland3
const solidUs = r.biome + r.deep + 8 * r.inside;
console.log(`per-call microseconds:  insideIsland3=${r.inside}  biomeAt=${r.biome}  inDeepWater3=${r.deep}`);
console.log(`one solid()  = 1 biomeAt + 1 inDeepWater3 + 8 insideIsland3 = ${solidUs.toFixed(2)} us`);
console.log(`heading sweep worst case (12 solid())            = ${(12 * solidUs / 1000).toFixed(2)} ms`);
console.log(`landDir() worst case: dirScan(solid) 65x16 = 1040 solid()  = ${(1040 * solidUs / 1000).toFixed(1)} ms`);
console.log(`  + fallback dirScan(biomeAt) 1040 calls                    = ${(1040 * r.biome / 1000).toFixed(1)} ms`);
console.log(`  TOTAL one off-land frame                                 = ${((1040 * solidUs + 1040 * r.biome) / 1000).toFixed(1)} ms`);
console.log('(this container is a software renderer, but these are pure-JS point tests — the number is real CPU work)');
await b.close();
