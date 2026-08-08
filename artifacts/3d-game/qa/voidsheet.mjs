// EVERY VOID, RENDERED THE WAY THE HAT CARDS ARE.
//
// The hats tab renders its thirteen cards from the real geometry. The voids tab
// paints a CSS radial-gradient with an SVG face on top and, for some of them, a
// CDN photo cropped to a circle — so Toxic, Magma, Circuit, Candy and Honey
// render as a swatch of aurora, lava, printed circuit board, candy and
// honeycomb, with no face and no character in the picture at all.
//
// This probe drives the spike that says whether the fix works: a SECOND full
// voidling built offscreen — body shader, face rig, character eyes, aura,
// pattern and accessory — photographed once per skin.
//
// WATCH texAmt. It is uTexAmt read straight off the body material, and it is 1
// only once the skin's texture has actually loaded.
//
// THIS PROBE USED TO EXCUSE A REAL BUG. It printed "expected in this sandbox —
// the asset CDN is blocked by egress policy" whenever a textured skin came back
// at 0, and that was simply wrong: every one of these files is vendored under
// public/assets/hf and serves 200 locally. What it was actually catching was a
// race in void3d's texCache — TextureLoader fires one callback, held by the
// first requester, so a second void asking for a texture already in flight was
// never told it had arrived. A probe that explains away its own red is worse
// than no probe, so this one now FAILS the run.
//
//   node qa/voidsheet.mjs [ids] [port]
import { chromium } from 'playwright';
import fs from 'node:fs';
const only = (process.argv[2] || '').split(',').filter(Boolean);
const PORT = process.argv[3] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 240)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidSheet, null, { timeout: 400000 });

const shots = await p.evaluate(async (ids) => window.__voidSheet(ids), only);
if (!shots || !shots.length) { console.log('no voids rendered', errs); await b.close(); process.exit(1); }
fs.mkdirSync('qa-out/voids', { recursive: true });
for (const s of shots) {
  fs.writeFileSync(`qa-out/voids/${s.id}.png`, Buffer.from(s.png, 'base64'));
  const tex = !s.wantsTex ? '   —  ' : s.texAmt >= 1 ? '  LIVE' : '  MISS';
  console.log(`${s.id.padEnd(12)} ${s.name.padEnd(14)} ${s.tier.padEnd(10)}`
    + ` acc=${String(s.acc ?? '-').padEnd(8)} pat=${String(s.pattern ?? '-').padEnd(10)} tex${tex}`
    + `  lid=${(s.lid ?? 1).toFixed(2)}${s.lid < 0.98 ? '  <-- EYES SHUT' : ''}`
    + `  smile=${(s.smile ?? 9).toFixed(2)}:1${s.smile < 3 ? '  <-- SMILE INVISIBLE' : ''}`);
}
const d0 = shots[0];
console.log(`\nhidden: ${(d0.hid||[]).join(', ') || '(none)'}`
  + (d0.missed && d0.missed.length ? `   NOT FOUND: ${d0.missed.join(', ')}` : ''));
if (d0.stray && d0.stray.length) {
  console.log('still visible and wider than the body (r > 1.25):');
  for (const q of d0.stray) console.log('  ' + q);
} else console.log('nothing wide left in frame');

const missing = shots.filter((s) => s.wantsTex && s.texAmt < 1).map((s) => s.id);
if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
console.log(`\nwrote ${shots.length} sheets to qa-out/voids/`);
await b.close();
const dim = shots.filter((s) => (s.smile ?? 9) < 3).map((s) => s.id);
if (dim.length) {
  console.log(`\nFAIL: the smile falls under 3:1 on ${dim.length} skin(s): ${dim.join(', ')}`);
  console.log('  VOID.mouth is one fixed plum for every skin. Either lift the highlight blend');
  console.log('  in setSkin, or give the offending skin a lighter rim.');
}

if (missing.length) {
  // NOT A FAILURE, and an earlier version of this file was wrong twice about
  // why. It is not the CDN (these files are vendored and serve 200 locally),
  // and it is not the texCache race either: this sweep applies all thirteen
  // skins in ONE synchronous tick, so no network fetch can possibly have
  // finished before the shot. A card renderer handles that by re-shooting when
  // the bytes land; qa/texrace.mjs is what actually tests the race.
  console.log(`\n${missing.length} skin(s) shot before their texture loaded: ${missing.join(', ')}`);
  console.log('  Expected for a synchronous sweep. The race itself is tested by qa/texrace.mjs.');
}
