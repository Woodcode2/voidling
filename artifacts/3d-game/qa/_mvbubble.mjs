// SPEECH BUBBLES vs THE HUD AND THE HOME INDICATOR.
// bubbles.ts clamps with two hard-coded constants:
//   HUD_TOP = 206            (bubbles.ts:40)  — no env(safe-area-inset-top)
//   y = Math.min(h - 26, …)  (bubbles.ts:256) — comment claims "never under the
//                                               iOS home indicator"; the inset
//                                               is 34pt, the constant is 26.
// and it dodges HUD_AVOID = ['form', 'guide'] — `form` is an id that exists
// nowhere in the bundle (the size chip it named was replaced by #growth), so
// the only element actually dodged from that list is the guide pill.
//
// This samples the live bubble rects over a real match, against __matchState().t,
// with the renderer stubbed so the sim runs at its proper rate.
import { chromium } from 'playwright';

const PORT = process.argv[3] || '4237';
const WORLD = process.argv[2] || 'maple';
const DEVICES = [
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, '13mini'],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, '15PM'],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const [W, H, INS, LABEL] of DEVICES) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  // now that the match is running, stub the draw: the sim runs ~9x faster and
  // nothing here reads pixels
  await p.evaluate(() => { window.__renderer.render = () => { }; });
  await p.evaluate(() => { window.__setVoidR(7); });

  await p.evaluate((insets) => {
    window.__bs = { frames: 0, samples: 0, growth: 0, board: 0, homeBand: 0,
      worstGrowth: 0, worstHome: 0, minTopGap: 1e9, lowest: 0, seen: [] };
    const S = { b: innerHeight - insets.bottom, t: insets.top };
    const tick = () => {
      const s = window.__bs; s.frames++;
      const growth = document.getElementById('growth');
      const board = document.getElementById('board');
      const gr = growth && getComputedStyle(growth).display !== 'none' ? growth.getBoundingClientRect() : null;
      const br = board && getComputedStyle(board).display !== 'none' ? board.getBoundingClientRect() : null;
      for (const el of document.querySelectorAll('.vb')) {
        if (!el.classList.contains('show') || el.style.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 3) continue;
        s.samples++;
        s.lowest = Math.max(s.lowest, r.bottom);
        const area = r.width * r.height;
        const ov = (o) => Math.max(0, Math.min(o.right, r.right) - Math.max(o.left, r.left))
          * Math.max(0, Math.min(o.bottom, r.bottom) - Math.max(o.top, r.top));
        if (gr) { const a = ov(gr); if (a > 1) { s.growth++; s.worstGrowth = Math.max(s.worstGrowth, a / area); } }
        if (br) { const a = ov(br); if (a > 1) { s.board++; s.worstBoard = Math.max(s.worstBoard || 0, a / area); } }
        const hb = Math.max(0, r.bottom - S.b) * r.width;
        if (hb > 1) { s.homeBand++; s.worstHome = Math.max(s.worstHome, hb / area); }
        if (s.seen.length < 6000) s.seen.push([Math.round(r.top), Math.round(r.bottom)]);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, INS);

  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 150, null, { timeout: 900000 });
  const s = await p.evaluate(() => { const x = { ...window.__bs }; delete x.seen; return { ...x, t: window.__matchState().t }; });
  console.log(`\n${LABEL} ${W}x${H} insets T${INS.top} B${INS.bottom} — ${Math.round(s.t)}s of match, ${s.frames} frames, ${s.samples} bubble-frames`);
  console.log(`   over #growth      : ${s.growth} bubble-frames (${(s.growth / Math.max(1, s.samples) * 100).toFixed(1)}%), worst ${(s.worstGrowth * 100).toFixed(0)}% of the bubble`);
  console.log(`   over #board       : ${s.board} bubble-frames (${(s.board / Math.max(1, s.samples) * 100).toFixed(1)}%), worst ${((s.worstBoard || 0) * 100).toFixed(0)}%`);
  console.log(`   in home-indicator : ${s.homeBand} bubble-frames (${(s.homeBand / Math.max(1, s.samples) * 100).toFixed(1)}%), worst ${(s.worstHome * 100).toFixed(0)}%`);
  console.log(`   lowest bubble edge: ${Math.round(s.lowest)}px  (safe bottom is ${H - INS.bottom}px, viewport ${H}px)`);
  await p.close();
}
await b.close();
