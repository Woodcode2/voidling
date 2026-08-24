// DO THE LOCKED WORLDS STILL LOOK LIKE DIFFERENT PLACES? — the picker probe.
//
//   node qa/lockedcards.mjs [port]
//
// unlocks.ts:18-21 states the intent in its own words:
//
//   "LOCKED IS NOT HIDDEN. The picker still shows every world, desaturated,
//    with the reason spelled out on the card. […] The art is the
//    advertisement for the next one."
//
// index.html then runs that advertisement through
// `filter: saturate(0.28) brightness(0.62)`. TEAM FIRST GLANCE measured what
// that does and I reproduced it: minimum pairwise squint deltaE across the five
// posters collapses from 15.8 open to 6.1 locked, with four of the five inside
// 10.3 of each other. The world whose NAME is its lanterns shows unlit grey
// baubles; the snow world goes from 40% bright pixels to 0.8%.
//
// ── WHY THIS RENDERS THE PAGE ────────────────────────────────────────────
// The team's own qa/_distinct.mjs reads pre-made locked-*.png snapshots from a
// scratchpad, so it cannot see a CSS change — the third probe this session
// found carrying its own copy of the thing it measures. This one opens the real
// picker in the state a real new player is in and reads the pixels the browser
// actually painted, so the filter under test is by definition the shipped one.
//
// THE STATE THAT MATTERS: session 1 auto-plays Maple with no menu
// (prototype3d.ts), and finishing it opens Pirate (unlocks.ts). So a child's
// FIRST sight of this screen is two live cards and three locked ones — not the
// all-unlocked view every other probe seeds.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '4177';

// THE BAR. Squint deltaE between two posters reduced to a 4x5 mosaic: "at
// thumbnail size, do these read as different places?" 10 is the bar — under it
// two cards are the same grey rectangle to a six-year-old. The OPEN posters
// manage 15.8 at their closest, so this is not asking locked art to match open
// art; it is asking it to stay distinguishable at all.
const MIN_LOCKED_DE = 10;

const sr = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function lab(r, g, b) {
  const R = sr(r), G = sr(g), B = sr(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.9505;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.089;
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
// TWO unlocked, three locked — a real child's first sight of this screen.
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible', timeout: 400000 });
await p.waitForTimeout(2200);

const cards = await p.evaluate(() => [...document.querySelectorAll('#worldRow .wCard[data-world]')].map((c) => {
  const art = c.querySelector('.wArt');
  const r = art.getBoundingClientRect();
  return { world: c.dataset.world, locked: c.classList.contains('locked'),
    box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } };
}));
const shot = await p.screenshot({ type: 'png' });
// Keep the frame. The numbers below say whether the posters are separable;
// only the picture says whether they still read as LOCKED.
mkdirSync('qa/out/locked', { recursive: true });
writeFileSync('qa/out/locked/picker.png', shot);
await b.close();

const { PNG } = await import('pngjs');
const img = PNG.sync.read(shot);
const S = img.width / 430;   // device pixels per css pixel
const NX = 4, NY = 5;
/** The poster reduced to a 4x5 mosaic of mean colours — squinting, numerically.
 *  Only the top 58%: below that is the scrim and the type, which is identical
 *  on every card and would drag every pair toward each other. */
function mosaic(box) {
  const x0 = box.x * S, y0 = box.y * S, w = box.w * S, h = box.h * S * 0.58;
  const m = [];
  for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) {
    let r = 0, g = 0, bl = 0, n = 0;
    for (let y = (y0 + cy * h / NY) | 0; y < (y0 + (cy + 1) * h / NY) | 0; y++)
      for (let x = (x0 + cx * w / NX) | 0; x < (x0 + (cx + 1) * w / NX) | 0; x++) {
        if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
        const i = (y * img.width + x) * 4;
        r += img.data[i]; g += img.data[i + 1]; bl += img.data[i + 2]; n++;
      }
    m.push(n ? lab(r / n, g / n, bl / n) : [0, 0, 0]);
  }
  return m;
}
const de = (a, c) => a.reduce((s, p1, i) =>
  s + Math.hypot(p1[0] - c[i][0], p1[1] - c[i][1], p1[2] - c[i][2]), 0) / a.length;

const M = {};
for (const c of cards) M[c.world] = { m: mosaic(c.box), locked: c.locked };
const lockedNames = cards.filter((c) => c.locked).map((c) => c.world);

console.log('');
for (const c of cards) {
  const L = M[c.world].m.reduce((s, x) => s + x[0], 0) / M[c.world].m.length;
  const C = M[c.world].m.reduce((s, x) => s + Math.hypot(x[1], x[2]), 0) / M[c.world].m.length;
  console.log(`  ${c.world.padEnd(9)} ${c.locked ? 'LOCKED' : 'open  '}   L ${L.toFixed(1).padStart(5)}   chroma ${C.toFixed(1).padStart(5)}`);
}

if (lockedNames.length < 2) {
  console.log('\nFAIL — fewer than two locked cards on screen, so there is no pair to compare. '
    + 'The seed did not produce a real new player’s picker');
  process.exit(1);
}
let worst = [Infinity, '', ''];
for (let i = 0; i < lockedNames.length; i++) for (let j = i + 1; j < lockedNames.length; j++) {
  const d = de(M[lockedNames[i]].m, M[lockedNames[j]].m);
  if (d < worst[0]) worst = [d, lockedNames[i], lockedNames[j]];
}
console.log('');
if (worst[0] < MIN_LOCKED_DE) {
  console.log(`  · the locked posters ${worst[1]} and ${worst[2]} differ by only ${worst[0].toFixed(1)} deltaE `
    + `at thumbnail size (bar ${MIN_LOCKED_DE}). unlocks.ts calls the locked art "the advertisement for the `
    + `next one"; at this setting the advertisements are interchangeable grey rectangles. `
    + `Cause: index.html's .wCard.locked .wArt filter`);
  console.log(`\nFAIL — a child cannot tell the locked worlds apart`);
  process.exit(1);
}
console.log(`PASS — the ${lockedNames.length} locked posters stay distinguishable at thumbnail size `
  + `(worst pair ${worst[1]}/${worst[2]} at ${worst[0].toFixed(1)} deltaE, bar ${MIN_LOCKED_DE})`);
