// EVERY HAT, ON THE ACTUAL VOID, BIG ENOUGH TO JUDGE.
//
// A hat is the closest and largest thing on screen — it rides the hero, and at
// WORLD ENDER it is hundreds of pixels tall, not the forty a background prop
// gets. So it cannot be signed off by a triangle count or by reading the
// source; it has to be looked at, at a size a child will actually see it.
//
// Renders each hat on a real void body with the game's own lighting, from
// three angles, into one contact sheet. Three angles because a hat that reads
// beautifully head-on can be a flat cardboard cutout from the side, and the
// play camera is a 3/4 view that never sees it head-on.
//
//   node qa/hatsheet.mjs [ids] [port]
import { chromium } from 'playwright';
import fs from 'node:fs';
const only = (process.argv[2] || '').split(',').filter(Boolean);
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__hatSheet, null, { timeout: 400000 });

const shots = await p.evaluate(async (ids) => window.__hatSheet(ids), only);
if (!shots || !shots.length) { console.log('no hats rendered', errs); await b.close(); process.exit(1); }
fs.mkdirSync('qa-out/hats', { recursive: true });
for (const s of shots) {
  fs.writeFileSync(`qa-out/hats/${s.id}.png`, Buffer.from(s.png, 'base64'));
  const g = s.graze || [];
  console.log(`${s.id.padEnd(10)} ${String(s.meshes).padStart(2)} meshes ${String(s.tris).padStart(5)} tris`
    + `  top ${s.top.toFixed(2)}  width ${s.wide.toFixed(2)}  closest ${s.closest.toFixed(2)}`
    + (g.length ? `  <-- ${g.length} GRAZING` : ''));
  // Name the offenders. "the hat fails" is not actionable; "torus#3 spans
  // 1.02..1.19" says which part to move and by how much.
  for (const q of g.slice(0, 6)) console.log(`             ${q}`);
  if (g.length > 6) console.log(`             …and ${g.length - 6} more`);
}
if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 3));
console.log(`\nwrote ${shots.length} sheets to qa-out/hats/`);
await b.close();
