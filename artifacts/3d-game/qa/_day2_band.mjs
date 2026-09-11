import { chromium } from 'playwright';
import { ALL_WORLDS, initScript } from './worlds.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
console.log('\n  CANDIDATE LANDMARKS — props standing at r 3.2-6.0, the band a child reaches with time to spare\n');
for (const w of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(initScript(7));
  await p.goto(`http://127.0.0.1:4177/?w=${w}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__landmarkProbe, null, { timeout: 420000 });
  await p.waitForFunction(() => { const n = window.__edibles.length;
    if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
    return performance.now() - (window.__stableSince || 0) > 2000; }, null, { timeout: 300000, polling: 250 });
  const { band, nearHero, biggest } = await p.evaluate(() => window.__landmarkProbe());
  const rows = Object.entries(band).sort((a, c) => c[1].n - a[1].n);
  console.log(`  ${w.toUpperCase().padEnd(9)} hero ${(nearHero||biggest) ? `r ${(nearHero||biggest).radius} (needs R ${(nearHero||biggest).needR})` : 'none'}`);
  console.log(`            in-band: ${rows.length ? rows.map(([k,v]) => `${k} x${v.n} (r ${v.rMin}-${v.rMax})`).join(' · ') : 'NOTHING in r 3.2-6.0'}`);
  await p.close();
}
await b.close();
