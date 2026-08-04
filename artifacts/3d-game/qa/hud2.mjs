// HUD audit pass 2: real menu (no ?w= auto-launch), opacity-aware, and it
// actually waits for #end.show instead of guessing at the software renderer's
// clock rate.
import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv[2] || 4188;
const OUT = 'qa-out';
fs.mkdirSync(OUT, { recursive: true });
const VP = { width: 393, height: 852 };

const MEASURE = () => {
  const out = [];
  const vis = (n) => {
    // an element is only "on screen" if it and every ancestor is paintable
    let e = n;
    while (e && e !== document.documentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
      e = e.parentElement;
    }
    return true;
  };
  for (const n of document.body.querySelectorAll('*')) {
    if (n.tagName === 'SVG' || n.closest('svg')) continue;
    if (!vis(n)) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(n);
    out.push({
      id: n.id || null, cls: typeof n.className === 'string' ? n.className : null, tag: n.tagName.toLowerCase(),
      x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      cx: +(r.x + r.width / 2).toFixed(1),
      z: cs.zIndex, fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing,
      color: cs.color, bg: cs.backgroundColor, radius: cs.borderRadius,
      btn: n.tagName === 'BUTTON' || cs.cursor === 'pointer',
      txt: (n.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 58),
    });
  }
  return out;
};

const fmt = (e) => `${(e.id ? '#' + e.id : '.' + (e.cls || e.tag)).slice(0, 24).padEnd(25)}`
  + `${String(e.x).padStart(6)},${String(e.y).padStart(6)} ${String(e.w).padStart(6)}x${String(e.h).padStart(5)} `
  + `cx${String(e.cx).padStart(6)} z${(e.z || '-').padEnd(4)} ${e.fs.padStart(7)}/${e.fw.padEnd(3)} `
  + `${e.color.padEnd(21)} ${e.txt ? '"' + e.txt + '"' : ''}`;

const dump = (title, arr) => { console.log(`\n=== ${title} ===`); for (const e of arr) console.log(fmt(e)); };

const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: VP, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await p.waitForFunction(() => {
    const l = document.getElementById('loadScr');
    return l && !l.classList.contains('boot') && !l.classList.contains('show');
  }, null, { timeout: 240000 }).catch(() => console.log('! boot never lifted'));
  await p.waitForTimeout(2000);

  dump('MENU (first run, cold)', await p.evaluate(MEASURE));
  await p.screenshot({ path: `${OUT}/hud2-menu.png` });

  // what modals gate the first play?
  const gates = await p.evaluate(() => ['tut', 'daily', 'worlds', 'settings', 'gate']
    .filter((id) => document.getElementById(id)?.classList.contains('show')));
  console.log('\nFIRST-RUN MODALS OPEN:', gates.join(',') || 'none');

  await p.evaluate(() => { document.getElementById('dailyClaim')?.click(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => { document.getElementById('btnGotIt')?.click(); });
  await p.waitForTimeout(400);
  await p.click('#btnPlay').catch(() => {});
  await p.waitForTimeout(2000);
  await p.evaluate(() => { document.getElementById('btnGotIt')?.click(); });
  await p.waitForTimeout(1000);
  const tutShown = await p.evaluate(() => document.getElementById('tut')?.classList.contains('show'));
  console.log('TUTORIAL AFTER PLAY:', tutShown);
  await p.evaluate(() => { document.getElementById('btnGotIt')?.click(); });

  // let the match get going and rivals arrive
  await p.waitForTimeout(20000);
  await p.evaluate(() => { window.__setVoidR?.(4.2); window.__news?.(); });
  await p.waitForTimeout(2500);

  // hold a drag so the joystick is on screen, then measure
  await p.touchscreen.tap(196, 600).catch(() => {});
  const dragged = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: 1, clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerType: 'touch' }));
    ev('pointerdown', 150, 640); ev('pointermove', 190, 690);
    return getComputedStyle(document.getElementById('joy')).display;
  });
  console.log('\nJOYSTICK display while dragging:', dragged);
  dump('IN MATCH (drag held)', await p.evaluate(MEASURE));
  await p.screenshot({ path: `${OUT}/hud2-match.png` });

  await p.evaluate(() => {
    const c = document.querySelector('canvas');
    c.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 190, clientY: 690, bubbles: true, isPrimary: true, pointerType: 'touch' }));
  });

  // drive the clock to zero and WAIT for the results overlay
  for (let i = 0; i < 40 && !(await p.evaluate(() => document.getElementById('end')?.classList.contains('show'))); i++) {
    await p.evaluate(() => window.__rushClock?.(0.2));
    await p.waitForTimeout(1500);
  }
  const endUp = await p.evaluate(() => document.getElementById('end')?.classList.contains('show'));
  console.log('\nRESULTS SHOWN:', endUp);
  await p.waitForTimeout(2500);
  dump('RESULTS', await p.evaluate(MEASURE));
  await p.screenshot({ path: `${OUT}/hud2-end.png`, fullPage: false });
  // the results panel is scrollable — capture what is below the fold too
  const scroll = await p.evaluate(() => {
    const e = document.getElementById('end');
    return { scrollH: e.scrollHeight, clientH: e.clientHeight };
  });
  console.log('RESULTS SCROLL:', JSON.stringify(scroll));
  if (scroll.scrollH > scroll.clientH + 4) {
    await p.evaluate(() => { document.getElementById('end').scrollTop = 9999; });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/hud2-end-bottom.png` });
    dump('RESULTS (scrolled to bottom)', await p.evaluate(MEASURE));
  }
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
