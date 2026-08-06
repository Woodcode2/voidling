// SCRATCH — WHEN DOES THE TUTORIAL CARD ACTUALLY APPEAR?
//
// The claim under test: a genuinely fresh install auto-starts a match
// (prototype3d.ts:2657) and that path never writes `voidTut`, so the one card
// that teaches the danger loop is shown on session TWO — after the child has
// already played a whole match without it.
//
// Runs a REAL session 1 (empty localStorage, autoplay), waits for the flags the
// game itself writes, then reloads the same origin and walks the menu path a
// returning child walks.
import { chromium } from 'playwright';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
const KILL = () => { Object.defineProperty(window, '__renderer', { configurable: true,
  set(v) { try { v.render = () => {}; } catch {} Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
  get() { return undefined; } }); };
await ctx.addInitScript(KILL);

// ── SESSION 1: the true fresh install ────────────────────────────────────────
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });
await p.waitForFunction(() => (window.__matchState().t ?? 0) > 0.1, null, { timeout: 600000 });
const s1 = await p.evaluate(() => ({
  tutShown: document.getElementById('tut')?.classList.contains('show') ?? null,
  menuVisible: getComputedStyle(document.getElementById('menu')).display !== 'none',
  store: Object.fromEntries(Object.entries(localStorage)),
}));
console.log('── SESSION 1 (fresh install) at match t>0.1 ──');
console.log('  tutorial card shown:', s1.tutShown);
console.log('  menu ever visible  :', s1.menuVisible);
console.log('  localStorage       :', JSON.stringify(s1.store));

// let session 1 run a little so the child has genuinely "played"
await p.waitForFunction(() => window.__matchState().t > 25, null, { timeout: 600000 });

// ── SESSION 2: same device, same storage, the menu path ──────────────────────
await p.goto('http://127.0.0.1:4177/', { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const menuUp = await p.evaluate(() => getComputedStyle(document.getElementById('menu')).display !== 'none');
console.log('\n── SESSION 2 ──');
console.log('  menu shown on launch:', menuUp);
await p.click('#btnPlay');
await p.waitForTimeout(900);
const pickerUp = await p.evaluate(() => document.getElementById('worlds')?.classList.contains('show'));
console.log('  world picker after PLAY:', pickerUp);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForTimeout(900);
const s2 = await p.evaluate(() => {
  const t = document.getElementById('tut');
  return { shown: t?.classList.contains('show'),
    text: (t?.innerText || '').replace(/\s+/g, ' ').trim(),
    words: (t?.innerText || '').split(/\s+/).filter(w => /[a-z]/i.test(w)).length };
});
console.log('  TUTORIAL CARD after picking a world:', s2.shown);
console.log('  card text:', JSON.stringify(s2.text));
console.log('  readable words on the card:', s2.words);
console.log('\nVERDICT:', s1.tutShown === false && s2.shown === true
  ? 'CONFIRMED — the tutorial is shown on session 2, never on session 1.'
  : 'not reproduced');
await b.close();
