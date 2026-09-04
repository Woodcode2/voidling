// THE TYPE SYSTEM'S CONTRACT — weights that exist, sizes a child can read.
//
//   node qa/uisystem.mjs [port]
//
// Fredoka ships 300/400/500/600/700. The CSS used to demand 800 (26x) and
// 900 (83x), and the browser synthesised fake bold from the 700 face —
// differently on every OS, which is part of "not crisp". And 40 declarations
// rendered under 12px, including all four primary nav labels and the shop's
// only call-to-action at 9px. This walks the COMPUTED styles of every visible
// element across the front-of-house screens and fails on:
//   • any font-weight the loaded faces cannot serve (only 400/500/600/700)
//   • any text under 11px (the 12px reading floor allows 11px only for
//     decorative micro-marks; below 11 nothing is defensible)
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidMute', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

const fails = [];
const SCREENS = [
  ['menu', null],
  ['picker', () => document.getElementById('btnPlay')?.click()],
  ['shop', () => { document.getElementById('worlds')?.classList.remove('show'); document.getElementById('btnShop')?.click(); }],
  ['settings', () => { document.getElementById('shop')?.classList.remove('show'); document.getElementById('btnSettings')?.click(); }],
];
for (const [name, open] of SCREENS) {
  if (open) { await p.evaluate(open); await p.waitForTimeout(600); }
  const bad = await p.evaluate(() => {
    const out = [];
    const ok = new Set(['400', '500', '600', '700']);
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!hasText) continue;
      const w = cs.fontWeight, fs = parseFloat(cs.fontSize);
      const id = el.id ? '#' + el.id : el.className && typeof el.className === 'string'
        ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase();
      if (!ok.has(w)) out.push(`${id} weight ${w}`);
      if (fs < 11) out.push(`${id} ${fs}px`);
    }
    return [...new Set(out)].slice(0, 12);
  });
  console.log(`  ${name.padEnd(9)} ${bad.length ? 'BAD: ' + bad.join(', ') : 'ok'}`);
  bad.forEach((x) => fails.push(`${name}: ${x}`));
}
await b.close();
console.log('\n  ' + (fails.length ? `FAIL — ${fails.length} violations` : 'PASS — every weight is a real face, every size is readable') + '\n');
process.exit(fails.length ? 1 : 0);
