// IN-MATCH HUD vs THE PHONE'S PHYSICAL EDGES.
// Real safe-area insets via CDP Emulation.setSafeAreaInsetsOverride, a real
// match, sampled against __matchState().t (never wall clock).
//
// Reports, per device and per match moment:
//   the rect of every fixed HUD element,
//   how much of it sits in the notch band / home-indicator band / corner rails,
//   every pairwise overlap between HUD elements,
//   tap targets under 44pt.
// Then screenshots.
import { chromium } from 'playwright';
import fs from 'fs';

const PORT = process.argv[3] || '4237';
const WORLD = process.argv[2] || 'maple';

const DEVICES = [
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, 'iPhone-13mini-P'],
  [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, 'iPhone-14-P'],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, 'iPhone-15PM-P'],
  [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, 'iPhone-SE3-P'],
];

const HUD = ['timer', 'board', 'coins', 'quests', 'growth', 'news', 'banner',
  'guide', 'hunger', 'hungerlbl', 'powers', 'evolve', 'btnQuit', 'titlecard', 'joy'];

const SNAP = (arg) => {
  const { insets, ids } = arg;
  const VW = innerWidth, VH = innerHeight;
  const S = { l: insets.left, r: VW - insets.right, t: insets.top, b: VH - insets.bottom };
  const seen = [];
  const push = (name, el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    const area = b.width * b.height;
    const inter = (l, t, r, bo) => Math.max(0, Math.min(r, b.right) - Math.max(l, b.left))
      * Math.max(0, Math.min(bo, b.bottom) - Math.max(t, b.top));
    seen.push({
      name, pos: cs.position,
      x: Math.round(b.left), y: Math.round(b.top),
      w: Math.round(b.width), h: Math.round(b.height),
      r: Math.round(b.right), bo: Math.round(b.bottom),
      notch: Math.round(inter(0, 0, VW, S.t) / area * 1000) / 10,
      home: Math.round(inter(0, S.b, VW, VH) / area * 1000) / 10,
      lrail: Math.round(inter(0, 0, S.l, VH) / area * 1000) / 10,
      rrail: Math.round(inter(S.r, 0, VW, VH) / area * 1000) / 10,
      off: Math.round((1 - inter(0, 0, VW, VH) / area) * 1000) / 10,
      fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
    });
  };
  for (const id of ids) { const el = document.getElementById(id); if (el) push(id, el); }
  document.querySelectorAll('.vb').forEach((el, i) => push('bubble' + i, el));
  document.querySelectorAll('#powers button, #btnQuit').forEach((el, i) => push('btn:' + (el.id || el.textContent.trim().slice(0, 8) || i), el));
  // pairwise overlaps
  const ov = [];
  for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
    const a = seen[i], c = seen[j];
    if (a.name.startsWith('btn:') || c.name.startsWith('btn:')) continue;
    const w = Math.min(a.r, c.r) - Math.max(a.x, c.x);
    const h = Math.min(a.bo, c.bo) - Math.max(a.y, c.y);
    if (w > 1 && h > 1) ov.push({ a: a.name, b: c.name, px: Math.round(w * h),
      pctA: Math.round(w * h / (a.w * a.h) * 100), pctB: Math.round(w * h / (c.w * c.h) * 100) });
  }
  return { VW, VH, seen, ov, t: window.__matchState?.().t ?? -1 };
};

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});
fs.mkdirSync('qa-out/mv', { recursive: true });
const all = [];

for (const [W, H, INS, LABEL] of DEVICES) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch { }
  });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__pinQuality(0); } catch { } });
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });

  // MOMENT 1 — opening, small void, guide pill up
  let s = await p.evaluate(SNAP, { insets: INS, ids: HUD });
  await p.screenshot({ path: `qa-out/mv/hud-${LABEL}-open.png` });
  all.push({ dev: LABEL, moment: 'open', INS, ...s });

  // MOMENT 2 — big void, mid match, five rivals on the board
  // __rushClock sets the COUNTDOWN, not the elapsed time: __matchState().t is
  // matchLen - matchClock. rushClock(138) is therefore t = 42s in.
  await p.evaluate(() => { window.__setVoidR(9); window.__rushClock(138); });
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 40, null, { timeout: 600000 });
  await p.waitForTimeout(600);
  s = await p.evaluate(SNAP, { insets: INS, ids: HUD });
  await p.screenshot({ path: `qa-out/mv/hud-${LABEL}-mid.png` });
  all.push({ dev: LABEL, moment: 'mid', INS, ...s });

  // MOMENT 3 — the last ten seconds: red clock, finale banner
  await p.evaluate(() => { window.__setVoidR(20); window.__rushClock(8); });   // 8s left on the clock
  await p.waitForFunction(() => {
    const t = window.__matchState?.().t ?? 0;
    return (t > 171 && t < 180) || document.getElementById('end')?.classList.contains('show');
  }, null, { timeout: 600000 });
  s = await p.evaluate(SNAP, { insets: INS, ids: HUD });
  await p.screenshot({ path: `qa-out/mv/hud-${LABEL}-end10.png` });
  all.push({ dev: LABEL, moment: 'end10', INS, ...s });

  // MOMENT 4 — results
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 600000 });
  await p.waitForTimeout(1800);
  const endRes = await p.evaluate((insets) => {
    const VW = innerWidth, VH = innerHeight;
    const S = { t: insets.top, b: VH - insets.bottom };
    const e = document.getElementById('end');
    const go = e.querySelector('.endGo');
    const rects = {};
    for (const [k, el] of [['end', e], ['endGo', go], ['again', document.getElementById('btnAgain')],
    ['home', document.getElementById('btnHome')], ['hd', document.getElementById('endHd')]]) {
      if (!el) continue; const r = el.getBoundingClientRect();
      rects[k] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        inView: Math.round((Math.max(0, Math.min(VW, r.right) - Math.max(0, r.left))
          * Math.max(0, Math.min(VH, r.bottom) - Math.max(0, r.top))) / (r.width * r.height) * 100),
        home: Math.round((Math.max(0, Math.min(VW, r.right) - Math.max(0, r.left))
          * Math.max(0, Math.min(VH, r.bottom) - Math.max(S.b, r.top))) / (r.width * r.height) * 100),
        pos: getComputedStyle(el).position };
    }
    return { VW, VH, scrollH: e.scrollHeight, clientH: e.clientHeight, scrollTop: e.scrollTop, rects };
  }, INS);
  await p.screenshot({ path: `qa-out/mv/hud-${LABEL}-end.png` });
  // and after scrolling to the very bottom
  await p.evaluate(() => { const e = document.getElementById('end'); e.scrollTop = e.scrollHeight; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `qa-out/mv/hud-${LABEL}-endbot.png` });
  all.push({ dev: LABEL, moment: 'results', INS, end: endRes });
  await p.close();
}
await b.close();
fs.writeFileSync('qa-out/mv/hud.json', JSON.stringify(all));

for (const R of all) {
  if (R.moment === 'results') {
    console.log(`\n${R.dev}  RESULTS  ${R.end.VW}x${R.end.VH}  content ${R.end.scrollH}px in ${R.end.clientH}px`);
    for (const [k, r] of Object.entries(R.end.rects))
      console.log(`   ${k.padEnd(7)} ${r.pos.padEnd(8)} @${r.x},${r.y} ${r.w}x${r.h}  inView ${r.inView}%  homeIndicatorBand ${r.home}%`);
    continue;
  }
  console.log(`\n${R.dev}  ${R.moment}  t=${Math.round(R.t)}s  ${R.VW}x${R.VH}  insets T${R.INS.top} B${R.INS.bottom}`);
  for (const e of R.seen) {
    const f = [];
    if (e.off > 0.5) f.push(`OFFSCREEN ${e.off}%`);
    if (e.notch > 0.5) f.push(`NOTCH ${e.notch}%`);
    if (e.home > 0.5) f.push(`HOME ${e.home}%`);
    if (e.lrail > 0.5) f.push(`LRAIL ${e.lrail}%`);
    if (e.rrail > 0.5) f.push(`RRAIL ${e.rrail}%`);
    if (e.name.startsWith('btn:') && Math.min(e.w, e.h) < 44) f.push(`TAP ${e.w}x${e.h}`);
    if (f.length) console.log(`   ${e.name.padEnd(12)} @${e.x},${e.y} ${e.w}x${e.h}   ${f.join('  ')}`);
  }
  for (const o of R.ov) console.log(`   OVERLAP ${o.a} × ${o.b}  ${o.px}px²  (${o.pctA}% of ${o.a}, ${o.pctB}% of ${o.b})`);
}
console.log('\nshots in qa-out/mv/hud-*.png');
