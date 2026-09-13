// HOW MANY PROPS DOES THE FADE TOUCH? The blast radius of widening
// fadeOccluders' along-axis test to allow the prop's own radius.
//
// The widening can only ADD props whose centre sits within their own radius past
// the hero. For a 1-unit prop that is a 1-unit band and nothing changes; for a
// 10-unit building it is the ten units that were the bug. But "can only add" is
// an argument, and this is a count.
//
// Sampled across a real match, not on the menu, because the match is where the
// cost lives and where over-fading would be seen as props blinking.
//
//   node qa/_fadecount.mjs [port] [world]
import { chromium } from 'playwright';
import { enterAndStart } from './_enter.mjs';
const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'powder';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
p.on('pageerror', (e) => console.log('  [pageerror] ' + e.message.split('\n')[0]));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear();
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 420000 });
await enterAndStart(p, WORLD);
await p.waitForTimeout(4000);

// Count, each sample, how many edibles are NOT at fade 1 — i.e. how many the
// mechanism is currently holding down.
const samples = [];
for (let i = 0; i < 14; i++) {
  const n = await p.evaluate(() => {
    const eds = window.__edibles;
    let fading = 0, floor = 0, big = 0;
    for (const e of eds) {
      if (!e.fadeTo) continue;
      let f = 1;
      for (const o of e.fadeTo) f = Math.min(f, o.userData.fade ?? 1);
      if (f < 0.999) { fading++; if (f <= 0.63) floor++; if ((e.radius || 1) >= 5) big++; }
    }
    return { fading, floor, big, t: window.__matchState ? +window.__matchState().t.toFixed(1) : -1 };
  }).catch(() => null);
  if (n) samples.push(n);
  await p.waitForTimeout(2500);
}
await b.close();
if (!samples.length) { console.log('FAIL — no samples'); process.exit(1); }
const mean = (k) => (samples.reduce((s, x) => s + x[k], 0) / samples.length).toFixed(1);
const max = (k) => Math.max(...samples.map((x) => x[k]));
console.log(`${WORLD}: ${samples.length} samples over a live match`);
console.log(`  props being held below solid : mean ${mean('fading')}, max ${max('fading')}`);
console.log(`  of those, at the 0.62 floor  : mean ${mean('floor')}, max ${max('floor')}`);
console.log(`  of those, radius >= 5 (big)  : mean ${mean('big')}, max ${max('big')}`);
