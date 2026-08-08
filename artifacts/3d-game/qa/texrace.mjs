// TWO VOIDS, ONE TEXTURE.
//
// void3d caches skin textures in a module-level map, and TextureLoader fires
// exactly one callback — held by whoever asked first. Before the fix, the
// SECOND void to ask for a texture already in flight got a cache hit on a
// Texture with no image yet, read uTexAmt 0, and was never told the load had
// finished. It stayed on a flat colour gradient for ever.
//
// With one void in the world that was unreachable, so it sat there harmlessly.
// The shop's card renderer is a second void and it warms the cache from the
// menu screen — so the shop can win the race and strand the HERO. A child
// spends 1,000 coins on Honey and plays a whole match as a flat brown ball.
//
//   node qa/texrace.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 600, height: 600 } });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__texRace, null, { timeout: 400000 });

let bad = 0;
for (const id of ['toxic', 'sunset', 'ocean', 'candy', 'honey']) {
  const r = await p.evaluate((s) => window.__texRace(s), id);
  if (r.error) { console.log(`${id}: ${r.error}`); bad++; continue; }
  const ok = r.afterA >= 1 && r.afterB >= 1;
  if (!ok) bad++;
  console.log(`${id.padEnd(8)} first-asker ${r.beforeA}->${r.afterA}   second-asker ${r.beforeB}->${r.afterB}`
    + (ok ? '   ok' : '   <-- STRANDED'));
}
if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 3));
await b.close();
if (bad) { console.log(`\nFAIL: ${bad} skin(s) never reached uTexAmt 1.`); process.exit(1); }
console.log('\nboth voids reach the texture on every skin');
