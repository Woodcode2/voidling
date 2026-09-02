// DOES THE FIGURE-8 HAND RUN ON MAPLE FOR A CHILD WITH HISTORY?
//
// The owner, 2026-08-29: "Maple isle should always be sort of that intro
// level. When you start it should be showing that figure 8 with a finger etc.
// on a fresh start it shows it but once you have history it gets rid of it."
//
// FAILS BEFORE THE FIX: the hand hung off `firstRun`, which is
// `!localStorage.voidPlayed`, and voidPlayed is written at match START — so it
// died about a second into the first match a child ever played and never
// returned on any world. This probe seeds a profile WITH history, which is the
// exact state in which the old build shows nothing.
//
// It checks both directions, because "always on" would be its own defect:
//   MAPLE with history  -> the hand MUST appear
//   PIRATE with history -> the hand must NOT appear (only Maple teaches)
// and it drags, and requires the hand to go away — a lesson that will not
// leave is worse than one that never came.
//
//   node qa/mapleteach.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const run = async (world, via = 'pointer') => {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(600000);
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear();
    // A CHILD WITH HISTORY. This is the state the owner is describing and the
    // state the old build showed nothing in.
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // comma-joined, NOT JSON — the seed shape that hid four worlds from seven
    // probes in a row (GOVERNOR.md, the voidUnlocked retraction).
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => !!window.__voidState);
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1200);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), world);
  // MATCH seconds — the intro damps movement and the hand only arrives once the
  // controls are live, which is after introLen (2.2-3.6s depending on world).
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5);
  const shown = await p.evaluate(() => document.getElementById('hand')?.classList.contains('show') ?? false);
  // now DRAG — or, on the third leg, STEER WITH A KEY (refute-hand C1/C2: a
  // keyboard steer is a drag the hand must also count) — and it must leave
  if (via === 'keys') {
    await p.keyboard.down('KeyD');
  } else {
    await p.evaluate(() => {
      const cv = document.querySelector('canvas');
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 215, clientY: 500, bubbles: true }));
      cv.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 300, clientY: 560, bubbles: true }));
    });
  }
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 7);
  const after = await p.evaluate(() => document.getElementById('hand')?.classList.contains('show') ?? false);
  if (via === 'keys') await p.keyboard.up('KeyD');
  await p.close();
  return { shown, after };
};

const maple = await run('maple');
const pirate = await run('pirate');
const mapleKeys = await run('maple', 'keys');
await b.close();

console.log(`  MAPLE  with history: hand ${maple.shown ? 'SHOWN' : 'absent'}, after a drag: ${maple.after ? 'still up' : 'gone'}`);
console.log(`  PIRATE with history: hand ${pirate.shown ? 'SHOWN' : 'absent'}`);
console.log(`  MAPLE  with history, keyboard steer: hand ${mapleKeys.shown ? 'SHOWN' : 'absent'}, after KeyD: ${mapleKeys.after ? 'still up' : 'gone'}`);
const bad = [];
if (!maple.shown) bad.push('Maple did not teach a returning child — the owner asked for exactly this');
if (maple.after) bad.push('the hand did not leave after a real drag — a lesson that will not go away');
if (mapleKeys.after) bad.push('the hand did not leave after a keyboard steer (refute-hand C1)');
if (pirate.shown) bad.push('Pirate taught too; only Maple is the intro level');
console.log(bad.length ? 'MAPLETEACH: FAIL — ' + bad.join('; ')
  : 'MAPLETEACH: PASS — Maple teaches every time, the drag ends it, and no other world nags');
process.exit(bad.length ? 1 : 0);
