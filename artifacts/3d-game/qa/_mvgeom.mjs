// MOBILE VIEWPORT GEOMETRY SWEEP — menu-side screens.
// Every screen, at every iPhone size, portrait AND landscape, with REAL
// safe-area insets injected through CDP Emulation.setSafeAreaInsetsOverride
// (Chromium 141 supports it — env(safe-area-inset-top) actually resolves; this
// is not a text rewrite of the stylesheet, it is the same code path a device
// takes).
//
// Only the ACTIVE screen is audited (topmost `.show` overlay, else #menu), so
// the menu sitting behind a modal does not pollute every row.
//
// Flags:
//   CLIP  — <99.5% of the box is inside the viewport
//   SAFE  — a NON-full-bleed box overlaps the notch / home indicator / corner
//   TAP   — an outermost interactive element whose smaller side is <44 CSS px
//   TEXT  — rendered text under 11 px
//   CUT   — a scroll container whose content overflows with no way to scroll
import { chromium } from 'playwright';
import fs from 'fs';

const PORT = process.argv[3] || '4237';
const ONLY = process.argv[2] || '';

const DEVICES = [
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, 'iPhone-13mini-P'],
  [390, 844, { top: 47, bottom: 34, left: 0, right: 0 }, 'iPhone-14-P'],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, 'iPhone-15PM-P'],
  [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, 'iPhone-SE3-P'],
  [812, 375, { top: 0, bottom: 21, left: 44, right: 44 }, 'iPhone-13mini-L'],
  [844, 390, { top: 0, bottom: 21, left: 47, right: 47 }, 'iPhone-14-L'],
  [932, 430, { top: 0, bottom: 21, left: 59, right: 59 }, 'iPhone-15PM-L'],
];

const SCREENS = [
  ['menu', null],
  ['worlds', async (p) => { await p.click('#btnPlay'); }],
  ['book', async (p) => { await p.click('#btnBook'); }],
  ['shop', async (p) => { await p.click('#btnShop'); }],
  ['trophies', async (p) => { await p.click('#btnTrophies'); }],
  ['topvoids', async (p) => { await p.click('#btnTop'); }],
  ['settings', async (p) => { await p.click('#btnSettings'); }],
  ['tut', async (p) => { await p.evaluate(() => document.getElementById('tut').classList.add('show')); }],
  ['daily', async (p) => { await p.evaluate(() => document.getElementById('daily').classList.add('show')); }],
  ['gate', async (p) => { await p.evaluate(() => document.getElementById('gate').classList.add('show')); }],
  ['pause', async (p) => { await p.evaluate(() => document.getElementById('pause').classList.add('show')); }],
];

const OVERLAYS = ['worlds', 'book', 'shop', 'trophies', 'topvoids', 'settings',
  'tut', 'daily', 'gate', 'policy', 'pause', 'skinPrev', 'end', 'loadScr'];

const AUDIT = (arg) => {
  const { insets, overlays } = arg;
  const VW = innerWidth, VH = innerHeight;
  const S = { l: insets.left, r: VW - insets.right, t: insets.top, b: VH - insets.bottom };
  // active screen = topmost shown overlay, else #menu
  let root = null, rootName = 'menu';
  for (const id of overlays) {
    const e = document.getElementById(id);
    if (e && getComputedStyle(e).display !== 'none' && e.classList.contains('show')) { root = e; rootName = id; }
  }
  if (!root) root = document.getElementById('menu');
  const out = [];
  const els = [root, ...root.querySelectorAll('*')];
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    const ownText = [...el.childNodes].filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim()).join(' ').trim();
    const tag = el.tagName.toLowerCase();
    const painty = ownText || ['img', 'svg', 'canvas', 'input', 'button'].includes(tag)
      || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')
      || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) > 0;
    if (!painty) continue;
    const selfIx = tag === 'button' || tag === 'input' || tag === 'a'
      || el.getAttribute('role') === 'button'
      || ['wCard', 'navCard', 'setRow', 'bkTab', 'sCard', 'tab', 'dCell', 'tCard']
        .some(c => el.classList.contains(c));
    // only the OUTERMOST interactive box is a tap target — a <span> inside a
    // button inherits cursor:pointer and is not a separate thing to hit
    let anc = el.parentElement, nested = false;
    while (anc && anc !== root.parentElement) {
      const t = anc.tagName.toLowerCase();
      if (t === 'button' || t === 'a' || anc.getAttribute('role') === 'button'
        || ['wCard', 'navCard', 'setRow', 'bkTab', 'sCard', 'tab', 'dCell', 'tCard']
          .some(c => anc.classList.contains(c))) { nested = true; break; }
      anc = anc.parentElement;
    }
    const interactive = selfIx && !nested;
    const fullBleed = b.width >= VW - 2 && b.height >= VH - 2;
    const ix = Math.max(0, Math.min(VW, b.right) - Math.max(0, b.left));
    const iy = Math.max(0, Math.min(VH, b.bottom) - Math.max(0, b.top));
    const inView = (ix * iy) / (b.width * b.height);
    const sx = Math.max(0, Math.min(S.r, b.right) - Math.max(S.l, b.left));
    const sy = Math.max(0, Math.min(S.b, b.bottom) - Math.max(S.t, b.top));
    const inSafe = (sx * sy) / (b.width * b.height);
    out.push({
      sel: tag + (el.id ? '#' + el.id : '')
        + (el.className && typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      txt: (ownText || el.getAttribute('title') || '').replace(/\s+/g, ' ').slice(0, 40),
      x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
      fs: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      inView: Math.round(inView * 1000) / 1000,
      inSafe: Math.round(inSafe * 1000) / 1000,
      interactive, hasText: !!ownText, fullBleed,
      ovY: el.scrollHeight - el.clientHeight,
      ovX: el.scrollWidth - el.clientWidth,
      canScrollY: /auto|scroll/.test(cs.overflowY),
      canScrollX: /auto|scroll/.test(cs.overflowX),
    });
  }
  return {
    rootName, VW, VH, els: out,
    docScrollW: document.documentElement.scrollWidth,
    docScrollH: document.documentElement.scrollHeight,
  };
};

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});

fs.mkdirSync('qa-out/mv', { recursive: true });
const report = [];

for (const [W, H, INS, LABEL] of DEVICES) {
  if (ONLY && !LABEL.includes(ONLY)) continue;
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      localStorage.setItem('voidCoins', '2500');
    } catch { }
  });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__renderer.render = () => { }; } catch { } });
  await p.waitForTimeout(1500);

  for (const [name, open] of SCREENS) {
    await p.evaluate((ids) => { for (const id of ids) document.getElementById(id)?.classList.remove('show'); }, OVERLAYS);
    await p.waitForTimeout(120);
    if (open) { try { await open(p); } catch (e) { console.log(`  !! ${LABEL}/${name}: ${e.message.split('\n')[0]}`); continue; } }
    await p.waitForTimeout(450);
    const r = await p.evaluate(AUDIT, { insets: INS, overlays: OVERLAYS });
    if (r.rootName !== name && !(name === 'menu' && r.rootName === 'menu'))
      console.log(`  !! ${LABEL}/${name}: active screen is ${r.rootName}`);
    await p.screenshot({ path: `qa-out/mv/${LABEL}__${name}.png` });
    report.push({ device: LABEL, W, H, INS, screen: name, ...r });
  }
  await p.close();
}
await b.close();
fs.writeFileSync('qa-out/mv/geom.json', JSON.stringify(report, null, 0));

let total = 0;
for (const R of report) {
  const clip = R.els.filter(e => e.inView < 0.995);
  const unsafe = R.els.filter(e => !e.fullBleed && e.inSafe < 0.995 && e.inView >= 0.5 && (e.hasText || e.interactive));
  const tap = R.els.filter(e => e.interactive && Math.min(e.w, e.h) < 44);
  const tiny = R.els.filter(e => e.hasText && e.fs < 11);
  const cut = R.els.filter(e => (e.ovY > 2 && !e.canScrollY) || (e.ovX > 2 && !e.canScrollX));
  const bits = [];
  if (clip.length) bits.push(`CLIP ${clip.length}`);
  if (tap.length) bits.push(`TAP ${tap.length}`);
  if (tiny.length) bits.push(`TEXT ${tiny.length}`);
  if (unsafe.length) bits.push(`SAFE ${unsafe.length}`);
  if (cut.length) bits.push(`CUT ${cut.length}`);
  total += clip.length + tap.length + tiny.length + unsafe.length + cut.length;
  console.log(`\n${R.device.padEnd(17)} ${R.screen.padEnd(9)} ${String(R.els.length).padStart(3)} els  ${bits.join('  ') || 'clean'}`);
  for (const e of clip) console.log(`    CLIP ${String(Math.round(e.inView * 100)).padStart(3)}%  ${e.sel.slice(0, 46).padEnd(46)} "${e.txt}"  @${e.x},${e.y} ${e.w}x${e.h}`);
  for (const e of tap) console.log(`    TAP  ${e.w}x${e.h}`.padEnd(18) + `  ${e.sel.slice(0, 46).padEnd(46)} "${e.txt}"`);
  for (const e of tiny) console.log(`    TEXT ${e.fs}px`.padEnd(18) + `  ${e.sel.slice(0, 46).padEnd(46)} "${e.txt}"`);
  for (const e of unsafe) console.log(`    SAFE ${String(Math.round(e.inSafe * 100)).padStart(3)}%  ${e.sel.slice(0, 46).padEnd(46)} "${e.txt}"  @${e.x},${e.y} ${e.w}x${e.h}`);
  for (const e of cut) console.log(`    CUT  ${e.ovY > 2 ? 'y+' + e.ovY : 'x+' + e.ovX}`.padEnd(18) + `  ${e.sel.slice(0, 46).padEnd(46)} "${e.txt}" ${e.w}x${e.h}`);
}
console.log(`\n${total} flags total. shots in qa-out/mv/, raw in qa-out/mv/geom.json`);
