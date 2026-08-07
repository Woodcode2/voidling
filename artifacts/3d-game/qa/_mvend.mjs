// THE RESULTS SCREEN, MEASURED — the one screen every match ends on.
// Three things the screenshots suggested and this settles with numbers:
//   1. is the verdict headline wider than the screen?
//   2. does the wallet chip paint ON TOP of it? (#coins is z-index 11 at
//      index.html:1111, #end is z-index 9 at :498 — same stacking context)
//   3. does the sticky PLAY AGAIN row sit on top of live quest text?
// Headlines are pulled from the shipped verdict table rather than played for,
// so every one of them is measured, not just whichever one this run produced.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4237';
const DEVICES = [
  [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, 'SE3'],
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, '13mini'],
  [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, '14'],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, '15PM'],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

// every verdict headline in the bundle
const HEADS = await (async () => {
  const fs = await import('fs');
  const src = fs.readFileSync('src/prototype3d.ts', 'utf8');
  const out = new Set();
  const m = src.match(/endHd[\s\S]{0,4000}/g) || [];
  return out;
})();

for (const [W, H, INS, LABEL] of DEVICES) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__pinQuality(0); } catch { } });
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click('#worldRow .wCard[data-world="maple"]');
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 2, null, { timeout: 600000 });
  await p.evaluate(() => { window.__renderer.render = () => { }; window.__setVoidR(14); window.__rushClock(4); });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout: 900000 });
  await p.waitForTimeout(1500);

  const r = await p.evaluate(() => {
    const VW = innerWidth, VH = innerHeight;
    const end = document.getElementById('end');
    const hd = document.getElementById('endHd');
    const coins = document.getElementById('coins');
    const go = end.querySelector('.endGo');
    const quests = document.getElementById('endQuests');
    const next = document.getElementById('endNext');
    const ink = (el) => { const rg = document.createRange(); rg.selectNodeContents(el);
      const b = rg.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; };
    // is the wallet chip PAINTED, i.e. does it win the hit test at its centre?
    const cr = coins.getBoundingClientRect();
    const topAt = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
    const csC = getComputedStyle(coins), csE = getComputedStyle(end);
    const overlap = (a, c) => {
      const w = Math.min(a.right, c.right) - Math.max(a.left, c.left);
      const h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      return w > 0 && h > 0 ? Math.round(w * h) : 0;
    };
    const questOv = quests && getComputedStyle(quests).display !== 'none' && go
      ? overlap(quests.getBoundingClientRect(), go.getBoundingClientRect()) : 0;
    const nextOv = next && getComputedStyle(next).display !== 'none' && go
      ? overlap(next.getBoundingClientRect(), go.getBoundingClientRect()) : 0;
    // headline overflow, per candidate headline
    const cands = ['TIME!', 'VOID SWEET VOID', 'CHOMPION OF THE ISLE', '#2 · OUT-NOMMED!',
      'THE WHOLE TOWN BELONGS TO THE VOID', 'YOU ATE THE ISLAND'];
    const orig = hd.textContent;
    const widths = cands.map((t) => { hd.textContent = t; const i = ink(hd);
      return { t, w: i.w, l: i.l, r: i.r, over: i.r > VW || i.l < 0, lines: Math.round(hd.getBoundingClientRect().height / parseFloat(getComputedStyle(hd).lineHeight || '1')) }; });
    hd.textContent = orig;
    const hr = hd.getBoundingClientRect();
    return { VW, VH, headline: orig.trim(), hdInk: ink(hd), hdBox: { x: Math.round(hr.x), y: Math.round(hr.y), w: Math.round(hr.width), h: Math.round(hr.height) },
      hdFs: getComputedStyle(hd).fontSize,
      coins: { z: csC.zIndex, txt: coins.textContent.trim(), x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height),
        display: csC.display, painted: topAt === coins || coins.contains(topAt), topAt: topAt ? (topAt.id || topAt.tagName) : null },
      endZ: csE.zIndex,
      coinsOverHd: overlap(cr, hr),
      questOv, nextOv,
      goBox: go ? (() => { const g = go.getBoundingClientRect(); return { x: Math.round(g.x), y: Math.round(g.y), w: Math.round(g.width), h: Math.round(g.height), pos: getComputedStyle(go).position }; })() : null,
      scrollH: end.scrollHeight, clientH: end.clientHeight,
      widths,
    };
  });
  await p.screenshot({ path: `qa-out/mv/end-${LABEL}.png` });
  // IS THE WALLET CHIP PAINTED OVER THE RESULTS CARD? elementFromPoint cannot
  // answer it — #coins is pointer-events:none, so the hit test always returns
  // what is underneath whether or not the chip is on top. Diff the pixels
  // instead: shoot the chip's own rect with the chip shown and with it hidden.
  const cr = await p.evaluate(() => { const c = document.getElementById('coins').getBoundingClientRect();
    return { x: Math.round(c.x), y: Math.round(c.y), width: Math.round(c.width), height: Math.round(c.height) }; });
  const withChip = await p.screenshot({ clip: cr });
  await p.evaluate(() => { document.getElementById('coins').style.display = 'none'; });
  await p.waitForTimeout(250);
  const noChip = await p.screenshot({ clip: cr });
  await p.evaluate(() => { document.getElementById('coins').style.display = ''; });
  let diff = 0;
  for (let i = 0; i < Math.min(withChip.length, noChip.length); i++) if (withChip[i] !== noChip[i]) diff++;
  console.log(`  wallet-chip pixel diff over the results card: ${diff} differing bytes in a ${cr.width}x${cr.height} crop  ${diff > 200 ? '<-- THE CHIP IS PAINTED ON TOP OF #end' : '(chip is behind the overlay)'}`);
  console.log(`\n${LABEL} ${W}x${H}`);
  console.log(`  headline "${r.headline}"  ${r.hdFs}  ink ${r.hdInk.l}..${r.hdInk.r} (${r.hdInk.w}px) in ${r.VW}px  box ${r.hdBox.w}x${r.hdBox.h}`);
  console.log(`  #coins z=${r.coins.z} vs #end z=${r.endZ}  "${r.coins.txt}" @${r.coins.x},${r.coins.y} ${r.coins.w}x${r.coins.h}  topmost-at-centre=${r.coins.topAt}  PAINTED OVER #end: ${r.coins.painted}`);
  console.log(`  wallet chip ∩ headline box: ${r.coinsOverHd}px²`);
  console.log(`  sticky .endGo ${r.goBox?.pos} @${r.goBox?.y} ${r.goBox?.w}x${r.goBox?.h}   ∩ #endQuests ${r.questOv}px²   ∩ #endNext ${r.nextOv}px²`);
  console.log(`  #end content ${r.scrollH}px in ${r.clientH}px`);
  for (const w of r.widths) console.log(`     ${w.over ? 'OVERFLOW' : '   fits '}  ${String(w.w).padStart(4)}px ink (${w.l}..${w.r})  "${w.t}"`);
  await p.close();
}
await b.close();
console.log('\nshots in qa-out/mv/end-*.png');
