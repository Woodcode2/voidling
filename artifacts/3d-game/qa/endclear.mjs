// DOES ANYTHING ON THE RESULTS SCREEN COLLIDE?
//
// The owner's screenshot of a finished Lantern match had the D of "MARKET:
// DEVOURED" sitting behind the fixed coin pill. #coins is z-index 11 and #end
// is 9, so the chip paints over the headline whenever the card is tall enough
// to pin its first child to the top instead of centring it.
//
// This stages the real results screen at a real phone size, then compares
// bounding boxes rather than eyeballing a screenshot: the headline against the
// coin chip, and every stat card against the pinned PLAY AGAIN row. It also
// checks nothing is cut off past the bottom of the scrollport.
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const SIZES = [[430, 932], [390, 844], [320, 568]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];
for (const [w, h] of SIZES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidCoins', '13393');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=lantern`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1000);
  await p.click('#worldRow .wCard[data-world="lantern"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  // grow the void so the card carries a long headline, evolve rows and
  // stickers — the tall case, which is the one that collides
  await p.evaluate(() => { window.__setVoidR(9); window.__rushClock(2); });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 600000 });
  await p.waitForTimeout(2500);

  const r = await p.evaluate(() => {
    const box = (el) => { const b = el.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right, w: b.width, h: b.height }; };
    const hit = (a, c) => !(a.r <= c.l || a.l >= c.r || a.b <= c.t || a.t >= c.b);
    const end = document.getElementById('end');
    const hd = end.querySelector('.hd');
    const coins = document.getElementById('coins');
    const go = end.querySelector('.endGo');
    const coinsShown = coins && getComputedStyle(coins).display !== 'none';
    const overlap = (coinsShown && hd) ? hit(box(hd), box(coins)) : false;
    // how far past the bottom of the scrollport the content runs
    const overflow = Math.max(0, end.scrollHeight - end.clientHeight);
    return {
      title: hd ? hd.textContent.trim().slice(0, 40) : '(none)',
      hd: hd ? box(hd) : null, coins: coinsShown ? box(coins) : null,
      overlap, overflow, goH: go ? box(go).h : 0,
      atBottomAll: end.scrollHeight <= end.clientHeight,
    };
  });
  const ok = !r.overlap;
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${String(w) + 'x' + h}  headline "${r.title}"`
    + `  hd.top=${r.hd ? r.hd.t.toFixed(0) : '-'}  coin.bottom=${r.coins ? r.coins.b.toFixed(0) : 'hidden'}`
    + `  overlap=${r.overlap}  scroll overflow=${r.overflow.toFixed(0)}px`);
  await p.screenshot({ path: `qa-out/end-${w}.png` });
  await p.close();
}
for (const r of rows) console.log(r);
const allOk = rows.every((r) => r.startsWith('PASS'));
console.log(allOk ? '\nALL PASS' : '\nFAILURES ABOVE');
await b.close();
process.exit(allOk ? 0 : 1);
