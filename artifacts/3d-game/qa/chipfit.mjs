// ── DOES THE HUD'S TOP BAND CLEAR ITSELF, AT EVERY WIDTH? ───────────────────
//
// MENU-BRIEF §6 day 12. Promoted from a diagnostic (`qa/_chipfit.mjs`) to a
// registered bar, because the hole it found is still open in the suite: NOTHING
// in the push gate measures top-band geometry at more than one width.
//
// WHAT IT CAUGHT WHEN IT WAS WRITTEN. Day 4 shipped a #goal chip parked at a
// flat `top: 58px`, a number read off one 430px phone. #timer's font-size is
// clamp(26px, 8vw, 40px), so its line box GROWS with the viewport and stops
// growing at the clamp ceiling. MEASURED, four viewports: the clock's bottom
// edge is 47 / 54 / 60 / 60 at 360 / 430 / 834 / 1024 px wide — so the chip
// cleared by 11px and 4px on the phones and OVERLAPPED BY 2px on both tablets.
// Fixed by deriving the offset from --timer-bottom instead of a constant.
//
// A number read off one screen is a guess about every other screen, and this is
// the one bar that says so.
//
//   node qa/chipfit.mjs [port]
import { chromium } from 'playwright';

// A THROW MUST BECOME A VERDICT. gate.mjs judges a `pf` step by scanning stdout
// for the two tokens, so a probe that dies silently is read as neither — and a
// probe that prints a PASS and then dies is read as a PASS. See
// qa/idiomguard.mjs guard 2.
process.on('uncaughtException', (e) => {
  console.log(`\nFAIL — chipfit threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
process.on('unhandledRejection', (e) => {
  console.log(`\nFAIL — chipfit rejected: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); });
const PORT = process.argv[2] || '4177';
const VIEWS = [[360, 780, 'small phone'], [430, 932, 'iPhone 16 Pro Max'],
  [834, 1194, 'iPad 11"'], [1024, 1366, 'iPad Pro landscape-ish']];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let worst = 1e9, bad = 0;
for (const [w, h, name] of VIEWS) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.clear(); localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
  } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple&g=1&len=60`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1, null, { timeout: 600000 }).catch(() => { });
  const r = await p.evaluate(() => {
    const g = document.getElementById('goal'), t = document.getElementById('timer');
    const c = document.getElementById('coins');
    const box = (e) => { const b = e.getBoundingClientRect();
      return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1),
        right: +b.right.toFixed(1), h: +b.height.toFixed(1), fs: getComputedStyle(e).fontSize }; };
    return { goal: box(g), timer: box(t), coins: box(c),
      goalVis: getComputedStyle(g).display !== 'none', text: g.textContent };
  });
  await p.close();
  const gap = +(r.goal.top - r.timer.bottom).toFixed(1);
  const overlapsCoins = !(r.goal.right < r.coins.left || r.goal.left > r.coins.right
    || r.goal.bottom < r.coins.top || r.goal.top > r.coins.bottom);
  worst = Math.min(worst, gap);
  if (gap < 0 || overlapsCoins) bad++;
  console.log(`  ${String(w).padStart(4)}x${h}  ${name.padEnd(22)} timer fs ${r.timer.fs.padStart(6)} bottom ${String(r.timer.bottom).padStart(6)}  ·  goal top ${String(r.goal.top).padStart(6)} h ${r.goal.h}  ·  GAP ${String(gap).padStart(6)}px${overlapsCoins ? '  ·  OVERLAPS #coins' : ''}${r.goalVis ? '' : '  ·  CHIP HIDDEN'}`);
}
await b.close();
console.log('');
if (bad) {
  console.log(`FAIL — the goal chip collides on ${bad} of ${VIEWS.length} viewports (tightest gap ${worst}px)`);
  process.exit(1);
}
console.log(`PASS — the goal chip clears the clock on all ${VIEWS.length} viewports (tightest gap ${worst}px)`);
