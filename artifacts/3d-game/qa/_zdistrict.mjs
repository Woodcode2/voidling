// Walk the void across LANTERN NIGHT's districts at mid-match size and measure,
// for each stop, how flat the ground reads and how much emissive light is on
// screen. One frame proved nothing; ten districts is the level.
import { chromium } from 'playwright';
const PORT = '4177';
const STOPS = [
  ['gate',      5900, 10050],
  ['stalls-S',  6300, 9200],
  ['stalls-M',  6300, 8000],
  ['stalls-N',  6300, 6900],
  ['shrine',    4400, 8200],
  ['teahouse',  8200, 8200],
  ['bridge',    6300, 5800],
  ['garden',    6100, 4600],
  ['bath-S',    6280, 3700],
  ['bath-mid',  6280, 3050],
  ['bath-C',    6280, 2500],
  ['onsen',     7900, 2500],
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="lantern"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
await p.evaluate(() => window.__setVoidR(5));
await p.waitForTimeout(1500);

// world units -> 3D coords. lantern.ts uses world units; find the mapper.
const conv = await p.evaluate(() => ({ has: typeof window.__lnW2S }));
for (const [name, wx, wy] of STOPS) {
  await p.evaluate(([x, y]) => {
    // world (0..12000-ish) -> scene: probe both, prefer whatever biomeAt agrees with
    window.__warpVoid((x-6000)*0.05, (y-6000)*0.05);
  }, [wx, wy]);
  await p.waitForTimeout(900);
  const st = await p.evaluate(() => { const s = window.__voidState(); return { x: s.x, z: s.z, biome: window.__biomeAt(s.x, s.z) }; });
  const png = `qa-out/zd/lantern-${name}.png`;
  await p.screenshot({ path: png });
  console.log(name, JSON.stringify(st), png);
}
await p.close(); await b.close();
