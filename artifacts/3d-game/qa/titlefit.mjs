// ── DOES EVERY WORLD'S NAME SIT ON ITS PLATE, ON ONE LINE, AT EVERY WIDTH? ──
//
//   node qa/titlefit.mjs [port]
//
// The picker card is a poster with its type in a footer band (index.html's
// .wArt::after scrim, opaque from 78% down), and .wBody is anchored to the
// bottom of the card. So anything that makes the body TALLER pushes the title
// UP, out of the band and onto bare artwork — the failure qa/pickerfit.mjs's
// header describes for .wBest, and the reason the tagline reserves two lines.
// Nothing reserved anything for the title, because until world 6's re-theme
// every name was one line: the longest, LANTERN NIGHT and SKYLARK FIELD, were
// 13 characters.
//
// BELLCLOUD HEIGHTS is 17. At 430 px it broke into "BELLCLOUD / HEIGHTS",
// and "BELLCLOUD" sat a line above the plate. qa/pickerfit.mjs measured what
// that cost: the title's contrast went from 7.7:1 (SKYLARK FIELD, one line)
// to 4.53:1 against a bar of 4.5 — on the card's current backdrop, before the
// cloud kingdom's paler one lands. pickerfit gates contrast at ONE width and
// cannot see a wrap that has not yet cost contrast; this sweeps the widths.
//
// THE BAR: at 360, 390, 430, 834 and 1024 px wide, every card's title renders
// as ONE line box, inside its card. Line boxes are counted with a Range over
// the text (one client rect per rendered line), the way pickerfit counts
// .wBest, so reserved space cannot pass for a wrap or hide one.
//
// MEASURED 2026-09-25 on the words branch before the fix: FAIL, skylark two
// lines at 360, 390, 430 and 1024 px (it fits at 834, where the card is
// widest); the other five one line everywhere.
//
// One page, resized: the card sizes are CSS (vw and a minmax grid), so a
// viewport change re-lays them out without a reload.
import { chromium } from 'playwright';
import { ALL_WORLDS } from './worlds.mjs';
import { openPicker } from './_enter.mjs';

// A THROW MUST BECOME A VERDICT (qa/idiomguard.mjs guard 2).
process.on('uncaughtException', (e) => {
  console.log(`\nFAIL — titlefit threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => {
  console.log(`\nFAIL — titlefit rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });

const PORT = process.argv[2] || '4177';
const WIDTHS = [[360, 780], [390, 844], [430, 932], [834, 1194], [1024, 1366]];

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
// a fresh profile with every world open, as pickerfit seeds it, so every card
// renders its full body rather than the locked one-liner
await p.addInitScript((worlds) => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', worlds.join(','));
  for (const w of worlds) localStorage.removeItem(`voidBest_${w}`);
} catch {} }, ALL_WORLDS);
await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await openPicker(p);

const fails = [];
for (const [w, h] of WIDTHS) {
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(600);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#worldRow .wCard[data-world]')].map((c) => {
    const t = c.querySelector('b');
    const cr = c.getBoundingClientRect();
    if (!t) return { world: c.dataset.world, missing: true };
    const rg = document.createRange();
    rg.selectNodeContents(t);
    const rects = [...rg.getClientRects()].filter((q) => q.width > 1 && q.height > 1);
    const tops = new Set(rects.map((q) => Math.round(q.top)));
    const left = Math.min(...rects.map((q) => q.left)), right = Math.max(...rects.map((q) => q.right));
    return {
      world: c.dataset.world, text: (t.textContent || '').trim(),
      lines: Math.max(1, tops.size), font: parseFloat(getComputedStyle(t).fontSize),
      textW: Math.round(right - left), cardW: Math.round(cr.width),
      inside: left >= cr.left - 0.5 && right <= cr.right + 0.5,
    };
  }));
  if (cards.length < ALL_WORLDS.length) fails.push(`${w}px: ${cards.length} cards, the game has ${ALL_WORLDS.length} worlds`);
  console.log(`  ${w} px`);
  for (const c of cards) {
    if (c.missing) { fails.push(`${w}px ${c.world}: no title element`); continue; }
    const ok = c.lines === 1 && c.inside;
    console.log(`    ${ok ? 'ok  ' : 'BAD '} ${c.world.padEnd(8)} ${c.lines} line${c.lines > 1 ? 's' : ' '}  ${c.font.toFixed(1)}px  `
      + `text ${String(c.textW).padStart(3)} of card ${c.cardW}  "${c.text}"`);
    if (c.lines !== 1) fails.push(`${w}px ${c.world}: "${c.text}" breaks onto ${c.lines} lines, so its first line sits above the plate`);
    else if (!c.inside) fails.push(`${w}px ${c.world}: "${c.text}" runs out of its card`);
  }
}
await b.close();
if (fails.length) {
  console.log(`\nFAIL — titlefit: ${fails.length} title(s) off the plate:\n  ${fails.join('\n  ')}`);
  process.exit(1);
}
console.log(`\nPASS — titlefit: every world's name is one line on its plate at ${WIDTHS.map(([w]) => w).join(', ')} px`);
