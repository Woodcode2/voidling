// HUD audit: measures every on-screen element in a live match instead of
// reading the stylesheet. Geometry, computed type, contrast-relevant colours,
// tap-target sizes, and screenshots of menu / match / results.
import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv[2] || 4188;
const WORLD = process.argv[3] || 'maple';
const OUT = 'qa-out';
fs.mkdirSync(OUT, { recursive: true });

// iPhone 15 Pro logical viewport
const VP = { width: 393, height: 852 };

const MEASURE = () => {
  const seen = [];
  const walk = (root) => {
    for (const n of root.querySelectorAll('*')) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = n.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      // only things that are actually on screen
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const txt = (n.textContent || '').trim().slice(0, 60);
      seen.push({
        id: n.id || null,
        cls: n.className && typeof n.className === 'string' ? n.className : null,
        tag: n.tagName.toLowerCase(),
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        z: cs.zIndex, pos: cs.position,
        fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily.split(',')[0].replace(/"/g, ''),
        ls: cs.letterSpacing, color: cs.color, bg: cs.backgroundColor,
        radius: cs.borderRadius, opacity: cs.opacity,
        clickable: cs.pointerEvents !== 'none' && (n.tagName === 'BUTTON' || n.onclick != null),
        txt,
      });
    }
  };
  walk(document.body);
  // is Fredoka actually rendering at the weight the CSS asks for?
  const probe = document.createElement('span');
  probe.style.cssText = 'position:fixed;font-family:Fredoka;font-weight:900;font-size:40px';
  probe.textContent = 'VOIDLING';
  document.body.appendChild(probe);
  const w900 = probe.getBoundingClientRect().width;
  probe.style.fontWeight = '700';
  const w700 = probe.getBoundingClientRect().width;
  probe.style.fontWeight = '400';
  const w400 = probe.getBoundingClientRect().width;
  probe.remove();
  const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.status}`);
  return { seen, weights: { w400, w700, w900 }, fonts: [...new Set(fonts)] };
};

const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: VP, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'load' });

  // wait for the boot cover to lift
  await p.waitForFunction(() => {
    const l = document.getElementById('loadScr');
    return l && !l.classList.contains('boot') && !l.classList.contains('show');
  }, null, { timeout: 180000 }).catch(() => console.log('! boot cover never lifted'));
  await p.waitForTimeout(2500);

  const menu = await p.evaluate(MEASURE);
  await p.screenshot({ path: `${OUT}/hud-menu.png` });
  console.log('=== FONT ===');
  console.log(JSON.stringify(menu.weights), menu.fonts.join(' | '));
  console.log('\n=== MENU (on screen) ===');
  for (const e of menu.seen) console.log(fmt(e));

  // dismiss any first-run modals, then play
  await p.evaluate(() => {
    for (const id of ['tut', 'daily']) document.getElementById(id)?.classList.remove('show');
    document.getElementById('btnGotIt')?.click();
    document.getElementById('dailyClaim')?.click();
  });
  await p.waitForTimeout(500);
  await p.click('#btnPlay').catch(() => {});
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('btnGotIt')?.click());
  // world picker may have opened
  await p.evaluate((w) => {
    const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`);
    if (c && document.getElementById('worlds')?.classList.contains('show')) c.dispatchEvent(new Event('click', { bubbles: true }));
  }, WORLD);
  await p.waitForTimeout(6000);

  // grow the void so the late-game HUD is what we measure, and fire a headline
  await p.evaluate(() => { window.__setVoidR?.(4.2); });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__news?.(); });
  await p.waitForTimeout(1200);

  const ms = await p.evaluate(() => window.__matchState?.());
  console.log('\n=== MATCH STATE ===\n', JSON.stringify(ms));

  const match = await p.evaluate(MEASURE);
  await p.screenshot({ path: `${OUT}/hud-match.png` });
  console.log('\n=== IN MATCH (on screen) ===');
  for (const e of match.seen) console.log(fmt(e));

  // run the clock out -> results screen
  await p.evaluate(() => window.__rushClock?.(0.4));
  await p.waitForTimeout(9000);
  const end = await p.evaluate(MEASURE);
  await p.screenshot({ path: `${OUT}/hud-end.png` });
  console.log('\n=== RESULTS (on screen) ===');
  for (const e of end.seen) console.log(fmt(e));

  // tap targets under 44pt anywhere in the three states
  console.log('\n=== TAP TARGETS < 44pt ===');
  const all = [['menu', menu], ['match', match], ['end', end]];
  for (const [state, snap] of all) {
    for (const e of snap.seen) {
      if (!e.clickable) continue;
      if (e.w < 44 || e.h < 44) console.log(`${state}: ${e.id || e.cls} ${e.w}x${e.h} "${e.txt}"`);
    }
  }
  await b.close();
};

const fmt = (e) => `${(e.id ? '#' + e.id : '.' + (e.cls || e.tag)).padEnd(26)} `
  + `${String(e.x).padStart(6)},${String(e.y).padStart(6)} ${String(e.w).padStart(6)}x${String(e.h).padStart(5)} `
  + `z${(e.z || '-').padEnd(4)} ${e.fs.padStart(7)}/${e.fw.padEnd(3)} ls${e.ls.padEnd(7)} `
  + `${e.color.padEnd(22)} ${e.txt ? '"' + e.txt.replace(/\s+/g, ' ') + '"' : ''}`;

run().catch((e) => { console.error(e); process.exit(1); });
