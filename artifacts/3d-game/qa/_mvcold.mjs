// COLD BOOT ON THE SMALLEST SUPPORTED PHONE.
// No localStorage at all — the screens a child sees on the very first launch,
// which the returning-player probes never render: the boot loader, the daily
// gift, the DRAG TO MOVE card, the in-match guide pill, and the first results
// screen. Real safe-area insets via CDP.
//
// Also: the top band with a FAT wallet. #timer lives in `left: 42vw; right: 8px`
// and #coins is `right: 12px + inset` — two boxes in one lane whose widths both
// depend on content, so the collision only exists once the child has coins.
import { chromium } from 'playwright';
import fs from 'fs';

const PORT = process.argv[2] || '4237';
const DEVICES = [
  [375, 667, { top: 20, bottom: 0, left: 0, right: 0 }, 'SE3'],
  [375, 812, { top: 44, bottom: 34, left: 0, right: 0 }, '13mini'],
  [430, 932, { top: 59, bottom: 34, left: 0, right: 0 }, '15PM'],
];

const SHOT = async (p, INS, tag, label) => {
  await p.screenshot({ path: `qa-out/mv/cold-${label}-${tag}.png` });
  return p.evaluate((insets) => {
    const VW = innerWidth, VH = innerHeight;
    const S = { l: insets.left, r: VW - insets.right, t: insets.top, b: VH - insets.bottom };
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
      if (cs.position !== 'fixed' && cs.position !== 'absolute' && cs.position !== 'sticky') continue;
      const b = el.getBoundingClientRect();
      if (b.width < 3 || b.height < 3) continue;
      if (b.width >= VW - 2 && b.height >= VH - 2) continue;
      const area = b.width * b.height;
      const I = (l, t, r, bo) => Math.max(0, Math.min(r, b.right) - Math.max(l, b.left))
        * Math.max(0, Math.min(bo, b.bottom) - Math.max(t, b.top));
      const rec = {
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
          + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''),
        txt: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
        x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
        off: Math.round((1 - I(0, 0, VW, VH) / area) * 1000) / 10,
        notch: Math.round(I(0, 0, VW, S.t) / area * 1000) / 10,
        home: Math.round(I(0, S.b, VW, VH) / area * 1000) / 10,
      };
      if (rec.off > 0.5 || rec.notch > 0.5 || rec.home > 0.5) out.push(rec);
    }
    return { VW, VH, out };
  }, INS);
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
fs.mkdirSync('qa-out/mv', { recursive: true });

for (const [W, H, INS, LABEL] of DEVICES) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: INS });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  console.log(`\n════ ${LABEL} ${W}x${H} insets T${INS.top} B${INS.bottom} — COLD, no localStorage`);

  await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  // boot loader: shoot it before __voidState exists
  await p.waitForTimeout(900);
  let r = await SHOT(p, INS, 'boot', LABEL);
  console.log(`  boot loader ${r.out.length ? '' : 'clean'}`);
  for (const e of r.out) console.log(`     ${e.sel.padEnd(22)} off${e.off}% notch${e.notch}% home${e.home}%  "${e.txt}"`);

  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => { try { window.__pinQuality(0); } catch { } });
  await p.waitForTimeout(2500);
  r = await SHOT(p, INS, 'firstmenu', LABEL);
  const modals = await p.evaluate(() => [...document.querySelectorAll('.show')].map(e => e.id || e.className).filter(Boolean));
  console.log(`  first menu — showing: ${modals.join(', ') || '(nothing)'}`);
  for (const e of r.out) console.log(`     ${e.sel.padEnd(22)} off${e.off}% notch${e.notch}% home${e.home}%  "${e.txt}"`);

  // FIRST LAUNCH AUTO-STARTS A MATCH — there is no menu on session one
  // (prototype3d.ts:2735). So the cold path is loader -> titlecard -> match.
  const tutUp = await p.evaluate(() => !!document.getElementById('tut')?.classList.contains('show'));
  console.log(`  tutorial card up: ${tutUp}`);
  if (tutUp) {
    r = await SHOT(p, INS, 'tut', LABEL);
    for (const e of r.out) console.log(`     ${e.sel.padEnd(22)} off${e.off}% notch${e.notch}% home${e.home}%  "${e.txt}"`);
    await p.click('#btnGotIt'); await p.waitForTimeout(800);
  }
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout: 900000 });
  r = await SHOT(p, INS, 'guide', LABEL);
  const guide = await p.evaluate(() => {
    const g = document.getElementById('guide');
    const gr = document.getElementById('growth');
    const rb = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bo: Math.round(b.bottom) }; };
    return { txt: (g?.textContent || '').trim().slice(0, 60), shown: g?.classList.contains('show'),
      guide: g ? rb(g) : null, growth: gr && getComputedStyle(gr).display !== 'none' ? rb(gr) : null };
  });
  console.log(`  guide pill: shown=${guide.shown} "${guide.txt}" ${guide.guide ? `@${guide.guide.x},${guide.guide.y} ${guide.guide.w}x${guide.guide.h}` : ''}`);
  console.log(`  growth bar: ${guide.growth ? `@${guide.growth.x},${guide.growth.y} ${guide.growth.w}x${guide.growth.h}` : '(hidden)'}`);
  for (const e of r.out) console.log(`     ${e.sel.padEnd(22)} off${e.off}% notch${e.notch}% home${e.home}%  "${e.txt}"`);

  // FAT WALLET — the top band with a five-figure coin count
  const band = await p.evaluate(() => {
    const c = document.getElementById('coins'), t = document.getElementById('timer');
    const read = () => {
      const a = c.getBoundingClientRect(), b = t.getBoundingClientRect();
      // the clock's INK, not its lane: #timer is a right:8px block, text-align:centre
      const rng = document.createRange(); rng.selectNodeContents(t);
      const ink = rng.getBoundingClientRect();
      return { coinL: Math.round(a.left), coinR: Math.round(a.right),
        inkL: Math.round(ink.left), inkR: Math.round(ink.right),
        gap: Math.round(a.left - ink.right), text: c.textContent.trim() };
    };
    const before = read();
    c.textContent = '✦ 128,400';
    const after = read();
    return { before, after };
  });
  console.log(`  top band: coins "${band.before.text}" left@${band.before.coinL}, clock ink ends @${band.before.inkR}, gap ${band.before.gap}px`);
  console.log(`            coins "✦ 128,400" left@${band.after.coinL}, gap ${band.after.gap}px ${band.after.gap < 0 ? '<-- OVERLAP' : ''}`);
  await p.screenshot({ path: `qa-out/mv/cold-${LABEL}-fatwallet.png` });
  await p.close();
}
await b.close();
console.log('\nshots in qa-out/mv/cold-*.png');
