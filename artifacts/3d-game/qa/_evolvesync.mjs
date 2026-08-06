// SCRATCH — DOES THE EVOLUTION BANNER AGREE WITH THE HUD?
//
// _first60 child showed "MUNCHER EVOLVED" at t=8.22 while the stage chip still
// read VOIDLING, and then "MUNCHER EVOLVED" AGAIN at t=18.79. Either the
// banner fires on a different threshold from the chip, or it fires twice for
// one rank. This samples both at ~8 Hz of MATCH time for a whole match and
// prints every banner event beside the chip text at that instant.
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {}
  Object.defineProperty(window, '__renderer', { configurable: true,
    set(v) { try { v.render = () => {}; } catch {}
      Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; } });
});
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });

// drive the void so it actually grows: a slow orbit drag
await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true }));
  ev('pointerdown', 215, 500);
  let a = 0;
  setInterval(() => { a += 0.06; ev('pointermove', 215 + Math.cos(a) * 120, 500 + Math.sin(a * 0.7) * 150); }, 40);
});

const seen = [];
let lastBanner = '', lastChip = '';
const T_END = 175;
while (true) {
  const s = await p.evaluate(() => {
    const g = (id) => document.getElementById(id);
    const e = g('evolve');
    const banner = e && e.classList.contains('show') ? (e.innerText || '').replace(/\s+/g, ' ').trim() : '';
    const chip = (g('growth')?.innerText || '').replace(/\s+/g, ' ').trim();
    const ms = window.__matchState ? window.__matchState() : null;
    const vs = window.__voidState ? window.__voidState() : null;
    return { banner, chip, t: ms ? +ms.t.toFixed(2) : -1, r: vs ? +vs.r.toFixed(3) : -1 };
  }).catch(() => null);
  if (!s) break;
  if (s.banner && s.banner !== lastBanner) seen.push({ kind: 'BANNER', t: s.t, r: s.r, txt: s.banner, chipThen: s.chip });
  if (s.chip !== lastChip && s.chip) seen.push({ kind: 'chip  ', t: s.t, r: s.r, txt: s.chip });
  lastBanner = s.banner; lastChip = s.chip;
  if (s.t > T_END || s.t < 0) break;
}
// … and what the match actually PAID a player who drags in a lazy circle,
// which is the only economy number that means anything for a six-year-old.
await p.waitForTimeout(4000);
const end = await p.evaluate(() => {
  const g = (id) => document.getElementById(id);
  return { end: (g('endCard')?.innerText || g('endScr')?.innerText || document.body.innerText.match(/[^\n]*✦[^\n]*/g)?.join(' | ') || '').replace(/\s+/g, ' ').slice(0, 300),
    coins: localStorage.getItem('voidCoins'), xp: localStorage.getItem('voidXP') };
});
console.log('\n══ WHAT THE MATCH PAID ══');
console.log('  wallet after one match: ' + end.coins + '✦   xp ' + end.xp);
console.log('  end screen: ' + end.end);

console.log(`\n══ ${WORLD.toUpperCase()} — banner vs chip, in MATCH seconds ══`);
for (const e of seen) console.log(`  t=${String(e.t).padStart(6)}  r=${String(e.r).padStart(6)}  ${e.kind}  ${e.txt}${e.chipThen !== undefined ? `   [chip said: ${e.chipThen}]` : ''}`);
const banners = seen.filter(e => e.kind === 'BANNER');
const dupes = {};
for (const bn of banners) dupes[bn.txt] = (dupes[bn.txt] || 0) + 1;
console.log('\n  banner fires:', banners.length);
for (const [k, v] of Object.entries(dupes)) console.log(`    ${v}x  ${k}${v > 1 ? '   <-- REPEATED' : ''}`);
await b.close();
