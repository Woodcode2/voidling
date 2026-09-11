// Does the goal chip touch the clock? #goal is parked at top 58px and is 44px
// tall; #timer's font-size is clamp(26px, 8vw, 40px), so its line box grows
// with the viewport and at the clamp ceiling may reach past 58. Measured rather
// than reasoned about: the real rects, at the three widths that matter.
import { chromium } from 'playwright';
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
if (bad) console.log(`FAIL — the goal chip collides on ${bad} of ${VIEWS.length} viewports (tightest gap ${worst}px)`);
else console.log(`PASS — the goal chip clears the clock on all ${VIEWS.length} viewports (tightest gap ${worst}px)`);
