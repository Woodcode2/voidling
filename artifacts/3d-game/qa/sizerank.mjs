// refute-board: re-derive the size-vs-score claim per FRAME on the match clock,
// shoot the HUD with real safe-area insets, shoot the end screen.
//   node refute_board.mjs <port> <shotdir>
import { chromium } from 'playwright';
import fs from 'fs';

const PORT = process.argv[2] || '4177';
const SHOTS = process.argv[3] || '.';
const INS = { top: 59, bottom: 34, left: 0, right: 0 };   // iPhone 15 Pro Max portrait, as qa/_mvhud.mjs
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
p.setDefaultTimeout(900000);
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch { } });

await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
const boardInDom = await p.evaluate(() => ({ board: !!document.getElementById('board'), timer: !!document.getElementById('timer') }));
console.log('dom:', JSON.stringify(boardInDom));
await p.waitForSelector('#btnPlay', { state: 'visible' });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible' });
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 600000 });

// driver: chase the nearest swallowable thing (qa/rivalnotice.mjs's player)
// + per-frame sampler keyed on distinct __matchState().t
await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  window.__SR = []; let lastT = -1;
  const tick = () => {
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) {
      const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true }));
    }
    const ms = window.__matchState();
    if (ms.t !== lastT && ms.t >= 20 && ms.t <= 60 && window.__SR.length < 20000) {
      lastT = ms.t;
      window.__SR.push({ t: ms.t, you: { s: ms.score, r: ms.r },
        rv: ms.rivals.filter((r) => r.joined).map((r) => ({ n: r.name, s: r.score, r: r.r, h: r.hunt })) });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
// no draw while sampling: ~9x faster (qa/solotog.mjs); the numbers are state, not pixels
await p.evaluate(() => { window.__renderer.render = () => {}; });
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 60, null, { timeout: 900000 });
const SR = await p.evaluate(() => window.__SR);
fs.writeFileSync(`${SHOTS}/board-skeptic-samples.json`, JSON.stringify(SR));

// ── analysis, per frame ──
let frames = 0, orderDis = 0, meWrong = 0, pairs = 0, inv = 0, ties = 0, sumAbs = 0;
const trans = {}; let biggest = 0;
for (const f of SR) {
  if (!f.rv.length) continue;
  frames++;
  const all = [{ n: 'You', s: f.you.s, r: f.you.r, me: true }, ...f.rv];
  const byS = [...all].sort((a, c) => c.s - a.s), byR = [...all].sort((a, c) => c.r - a.r);
  if (byS.some((x, i) => x !== byR[i])) orderDis++;
  const sRank = byS.findIndex((x) => x.me) + 1, rRank = byR.findIndex((x) => x.me) + 1;
  if (sRank !== rRank) meWrong++;
  sumAbs += Math.abs(sRank - rRank);
  const k = `${sRank}->${rRank}`; trans[k] = (trans[k] || 0) + 1;
  if (rRank === 1) biggest++;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], c = all[j]; pairs++;
    if (a.s === c.s) continue;
    const hi = a.s > c.s ? a : c, lo = a.s > c.s ? c : a;
    if (hi.r < lo.r) inv++; else if (hi.r === lo.r) ties++;
  }
}
const pct = (x, n) => (100 * x / Math.max(1, n)).toFixed(1) + '%';
const last = SR[SR.length - 1];
console.log(`\nSIZE vs SCORE — Maple, driven, per frame, t=20..60 on __matchState().t`);
console.log(`  distinct frames sampled           ${SR.length} (with >=1 joined rival: ${frames}); first t=${SR[0]?.t.toFixed(2)} last t=${last?.t.toFixed(2)}`);
console.log(`  rivals joined at t=60             ${last?.rv.length}`);
console.log(`  size order != score order         ${pct(orderDis, frames)} of frames`);
console.log(`  player's rank read off size wrong ${pct(meWrong, frames)} of frames; mean |dRank| ${(sumAbs / Math.max(1, frames)).toFixed(2)}`);
console.log(`  strict pair inversions            ${pct(inv, pairs)} of ${pairs} pairs; size-ties w/ different score ${pct(ties, pairs)}`);
console.log(`  player is the biggest void        ${pct(biggest, frames)} of frames`);
console.log(`  score rank -> size rank           ${Object.entries(trans).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k} ${pct(v, frames)}`).join(' · ')}`);
console.log(`  final frame t=${last?.t.toFixed(1)}: You ${Math.round(last?.you.s)} r${last?.you.r.toFixed(2)} | ` + last?.rv.map((r) => `${r.n} ${Math.round(r.s)} r${r.r.toFixed(2)}${r.h ? ' (hunting)' : ''}`).join(' | '));

// ── HUD frame with render back on ──
await p.evaluate(() => { delete window.__renderer.render; });
await p.waitForTimeout(2500);
const hud = await p.evaluate((ins) => {
  const r = (id) => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), bo: Math.round(b.bottom),
      cx: +(b.left + b.width / 2).toFixed(1), display: cs.display, left: cs.left, right: cs.right, top: cs.top, ta: cs.textAlign, txt: e.textContent.trim().slice(0, 12) }; };
  const timer = r('timer'), coins = r('coins'), quit = r('btnQuit'), growth = r('growth');
  const ov = (a, c) => a && c ? Math.max(0, Math.min(a.r, c.r) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.bo, c.bo) - Math.max(a.y, c.y)) : -1;
  // the text itself, not the full-width box: measure the glyph run with a Range
  const te = document.getElementById('timer'); const rg = document.createRange(); rg.selectNodeContents(te); const tb = rg.getBoundingClientRect();
  return { vw: innerWidth, vh: innerHeight, screenCx: innerWidth / 2, timer, timerText: { x: Math.round(tb.left), r: Math.round(tb.right), w: Math.round(tb.width), cx: +(tb.left + tb.width / 2).toFixed(1), y: Math.round(tb.top) },
    coins, quit, growth, ovTimerBoxCoins: ov(timer, coins), ovTimerBoxQuit: ov(timer, quit),
    ovTimerTextCoins: coins ? Math.max(0, Math.min(tb.right, coins.r) - Math.max(tb.left, coins.x)) * Math.max(0, Math.min(tb.bottom, coins.bo) - Math.max(tb.top, coins.y)) : -1,
    ovTimerTextQuit: quit ? Math.max(0, Math.min(tb.right, quit.r) - Math.max(tb.left, quit.x)) * Math.max(0, Math.min(tb.bottom, quit.bo) - Math.max(tb.top, quit.y)) : -1,
    notchInset: ins.top, timerTopClearsNotch: tb.top >= ins.top, t: window.__matchState().t, body: document.body.className };
}, INS);
console.log('\nHUD @ 430x932, safe-area top 59:', JSON.stringify(hud, null, 1));
await p.screenshot({ path: `${SHOTS}/board-skeptic-hud.png` });

// ── end screen ──
await p.evaluate(() => { window.__rushClock(6); });
await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
await p.waitForTimeout(3000);
const end = await p.evaluate(() => {
  const ms = window.__matchState();
  const rows = [...document.querySelectorAll('#endList .er')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
  const vis = (id) => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); return cs.display !== 'none' && +cs.opacity > 0.05; };
  return { hd: document.getElementById('endHd')?.textContent, sub: document.getElementById('endSub')?.textContent?.slice(0, 80), rows,
    joined: ms.rivals.filter((r) => r.joined).map((r) => `${r.name} ${Math.round(r.score)}`), you: Math.round(ms.score),
    endListVisible: vis('endList'), timerVisible: vis('timer'), listRect: (() => { const e = document.getElementById('endList'); const b = e.getBoundingClientRect(); return { y: Math.round(b.top), h: Math.round(b.height) }; })() };
});
console.log('\nEND SCREEN:', JSON.stringify(end, null, 1));
await p.screenshot({ path: `${SHOTS}/board-skeptic-end.png` });
console.log('\npage errors:', errs.length ? errs : 'none');
await b.close();

