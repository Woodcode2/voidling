// WHICH PACK MESHES DOES EACH WORLD ACTUALLY PLACE? Reads the __glbCount
// counter in glb(); grep cannot answer this because island.ts passes `name`
// as a variable at four call sites.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const seen = new Set();
for (const wid of ALL_WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForTimeout(2500);
  const c = await p.evaluate(() => window.__glbCount || {});
  const names = Object.keys(c).sort();
  names.forEach((n) => seen.add(n));
  console.log(`${wid.padEnd(8)} ${names.length} names, ${Object.values(c).reduce((a, x) => a + x, 0)} placements`);
  console.log(`  ${names.map((n) => `${n}x${c[n]}`).join(' ') || '(none)'}`);
  await p.close();
}
console.log(`\nplaced by at least one world (${seen.size}): ${[...seen].sort().join(', ')}`);
await b.close();
