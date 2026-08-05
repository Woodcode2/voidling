// DOES THE BOOK ACTUALLY SHOW THE ART?
//
//   npm run build && npx vite preview --port 4177 --host 127.0.0.1
//   node qa/bookshot.mjs [port]
//
// The 48 cards landing in public/ proves the CI job worked. It does not prove
// the book renders them: the path could be wrong, and the <img> onerror
// fallback would swallow every card silently — that is exactly what it is
// designed to do. The page would look *fine*, full of tier glyphs, with no
// console error and no failed test. So this unlocks every sticker, opens the
// book, and counts <img class="stkArt"> elements that reached
// naturalWidth > 0. A glyph fallback is a FAILURE here even though it is
// correct behaviour in the product.
//
// It also shoots each world's page, because "the art loads" and "the page
// looks good" are different questions and only one of them is countable.
import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv[2] || '4177';
fs.mkdirSync('qa-out', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
// DPR 2: the book is chrome, not a 3D frame, so a crisp grab costs nothing
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

// Seed BEFORE the first script runs, so there is no reload dance and the book
// reads the same localStorage key the game writes.
const IDS = [...fs.readFileSync('src/game/stickers.ts', 'utf8').matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1]);
await p.addInitScript(([ids]) => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidBookSeen', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // the real format: a comma-joined id list, not JSON. Writing JSON here
    // produced a book of twelve locked cells and a probe that reported the art
    // as broken — the seed has to be the shape stickers.ts actually parses.
    localStorage.setItem('voidStickers', ids.join(','));
  } catch { }
}, [IDS]);

await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForTimeout(1500);

const btn = p.locator('#btnBook');
if (!(await btn.count())) { console.error('FAIL: #btnBook is not in the DOM'); await b.close(); process.exit(1); }
await btn.click({ force: true });
await p.waitForTimeout(800);

const WORLDS = ['maple', 'pirate', 'gameday', 'lantern'];
let bad = 0;
for (const w of WORLDS) {
  await p.evaluate((wid) => document.querySelector(`#bookTabs button[data-w="${wid}"]`)?.click(), w);
  await p.waitForTimeout(700);
  // lazy images only fetch when near the viewport; decode() forces the issue
  await p.evaluate(() => Promise.all(
    [...document.querySelectorAll('#bookGrid img.stkArt')].map((i) => i.decode().catch(() => { }))));
  await p.waitForTimeout(500);

  const r = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll('#bookGrid img.stkArt')];
    return { imgs: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      glyphs: document.querySelectorAll('#bookGrid i').length,
      cells: document.querySelectorAll('#bookGrid .bkCell').length };
  });
  const ok = r.imgs === r.loaded && r.glyphs === 0 && r.cells === 12 && r.imgs === 12;
  if (!ok) bad++;
  console.log(`${w.padEnd(8)} cells ${r.cells}  art ${r.loaded}/${r.imgs}  glyph-fallback ${r.glyphs}  ${ok ? 'ok' : 'FAIL'}`);
  // clip to the panel: a full-page grab under swiftshader composites the live
  // 3D canvas behind the modal and regularly blows the 30s screenshot budget
  await p.locator('#book').screenshot({ path: `qa-out/book-${w}.png`, timeout: 120000 });
}

await b.close();
console.log(bad ? `\n${bad} world(s) failed` : '\nall four pages render painted art, no fallbacks');
process.exit(bad ? 1 : 0);
